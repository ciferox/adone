const {
    event: { EventEmitter },
    is,
    x,
    util,
    database: { mysql },
    std: {
        net,
        tls,
        stream: { Readable }
    }
} = adone;

const {
    c
} = mysql;

const __ = adone.private(mysql);

const {
    packet
} = __;

let _connectionId = 0;
let convertNamedPlaceholders = null;

export default class Connection extends EventEmitter {
    constructor(opts) {
        super();
        this.config = opts.config;

        // TODO: fill defaults
        // if no params, connect to /var/lib/mysql/mysql.sock ( /tmp/mysql.sock on OSX )
        // if host is given, connect to host:3306

        // TODO: use `/usr/local/mysql/bin/mysql_config --socket` output? as default socketPath
        // if there is no host/port and no socketPath parameters?

        if (!opts.config.stream) {
            if (opts.config.socketPath) {
                this.stream = net.connect(opts.config.socketPath);
            } else {
                this.stream = net.connect(opts.config.port, opts.config.host);
            }
        } else {
            // if stream is a function, treat it as "stream agent / factory"
            if (is.function(opts.config.stream)) {
                this.stream = opts.config.stream(opts);
            } else {
                this.stream = opts.config.stream;
            }
        }
        this._internalId = _connectionId++;

        this._commands = new adone.collection.LinkedList();
        this._command = null;

        this._paused = false;
        this._pausedPackets = new adone.collection.LinkedList();

        this._statements = new adone.collection.FastLRU(this.config.maxPreparedStatements, {
            dispose: (key, statement) => {
                statement.close();
            }
        });

        // TODO: make it lru cache
        // key is field.name + ':' + field.columnType + ':' field.flags + '/'
        this.textProtocolParsers = {};

        // TODO: not sure if cache should be separate (same key as with textProtocolParsers)
        // or part of prepared statements cache (key is sql query)
        this.binaryProtocolParsers = {};

        this.serverCapabilityFlags = 0;
        this.authorized = false;

        this.sequenceId = 0;
        this.compressedSequenceId = 0;

        this.threadId = null;
        this._handshakePacket = null;
        this._fatalError = null;
        this._protocolError = null;
        this._outOfOrderPackets = [];

        this.clientEncoding = c.charsetEncoding[this.config.charsetNumber];

        this.stream.on("error", (err) => this._handleNetworkError(err));

        // see https://gist.github.com/khoomeister/4985691#use-that-instead-of-bind
        this.packetParser = new __.PacketParser((p) => {
            this.handlePacket(p);
        });

        this.stream.on("data", (data) => {
            if (this.connectTimeout) {
                clearTimeout(this.connectTimeout);
                this.connectTimeout = null;
            }
            this.packetParser.execute(data);
        });

        this.stream.on("end", () => {
            // we need to set this flag everywhere where we want connection to close
            if (this._closing) {
                return;
            }

            if (!this._protocolError) { // no particular error message before disconnect
                this._protocolError = new x.Exception("Connection lost: The server closed the connection.");
                this._protocolError.fatal = true;
                this._protocolError.code = "PROTOCOL_CONNECTION_LOST";
            }

            this._notifyError(this._protocolError);
        });
        let handshakeCommand;
        if (!this.config.isServer) {
            handshakeCommand = new __.command.ClientHandshake(this.config.clientFlags);
            handshakeCommand.on("end", () => {
                // this happens when handshake finishes early and first packet is error
                // and not server hello ( for example, 'Too many connactions' error)
                if (!handshakeCommand.handshake) {
                    return;
                }
                this._handshakePacket = handshakeCommand.handshake;
                this.threadId = handshakeCommand.handshake.connectionId;
                this.emit("connect", handshakeCommand.handshake);
            });
            handshakeCommand.on("error", (err) => {
                this._closing = true;
                this._notifyError(err);
            });
            this.addCommand(handshakeCommand);
        }

        // in case there was no initiall handshake but we need to read sting, assume it utf-8
        // most common example: "Too many connections" error ( packet is sent immediately on connection attempt, we don't know server encoding yet)
        // will be overwrittedn with actial encoding value as soon as server handshake packet is received
        this.serverEncoding = "utf8";

        if (this.config.connectTimeout) {
            const timeoutHandler = () => this._handleTimeoutError();
            this.connectTimeout = setTimeout(timeoutHandler, this.config.connectTimeout);
        }
    }

    _addCommandClosedState(cmd) {
        const err = new x.IllegalState("Can't add new command when connection is in closed state");
        err.fatal = true;
        if (cmd.onResult) {
            cmd.onResult(err);
        } else {
            this.emit("error", err);
        }
    }

    _handleFatalError(err) {
        err.fatal = true;
        // stop receiving packets
        this.stream.removeAllListeners("data");
        this.addCommand = this._addCommandClosedState;
        this.write = () => {
            this.emit("error", new x.IllegalState("Can't write in closed state"));
        };
        this._notifyError(err);
        this._fatalError = err;
    }

    _handleNetworkError(err) {
        this._handleFatalError(err);
    }

    _handleTimeoutError() {
        if (this.connectTimeout) {
            clearTimeout(this.connectTimeout);
            this.connectTimeout = null;
        }

        this.stream.destroy && this.stream.destroy();

        const err = new x.Timeout("connect ETIMEDOUT");
        err.errorno = "ETIMEDOUT";
        err.code = "ETIMEDOUT";
        err.syscall = "connect";

        this._handleNetworkError(err);
    }

    // notify all commands in the queue and bubble error as connection "error"
    // called on stream error or unexpected termination
    _notifyError(err) {
        // prevent from emitting 'PROTOCOL_CONNECTION_LOST' after EPIPE or ECONNRESET
        if (this._fatalError) {
            return;
        }

        let command;

        // if there is no active command, notify connection
        // if there are commands and all of them have callbacks, pass error via callback
        let bubbleErrorToConnection = !this._command;
        if (this._command && this._command.onResult) {
            this._command.onResult(err);
            this._command = null;
        } else {
            // connection handshake is special because we allow it to be implicit
            // if error happened during handshake, but there are others commands in queue
            // then bubble error to other commands and not to connection
            if (
                !(this._command &&
                    this._command.constructor === __.command.ClientHandshake &&
                    this._commands.length > 0)
            ) {
                bubbleErrorToConnection = true;
            }
        }
        while ((command = this._commands.shift())) {
            if (command.onResult) {
                command.onResult(err);
            } else {
                bubbleErrorToConnection = true;
            }
        }
        // notify connection if some comands in the queue did not have callbacks
        // or if this is pool connection ( so it can be removed from pool )
        if (bubbleErrorToConnection || this._pool) {
            this.emit("error", err);
        }
    }

    write(buffer) {
        this.stream.write(buffer, (err) => {
            if (err) {
                this._handleNetworkError(err);
            }
        });
    }

    // http://dev.mysql.com/doc/internals/en/sequence-id.html
    //
    // The sequence-id is incremented with each packet and may wrap around.
    // It starts at 0 and is reset to 0 when a new command
    // begins in the Command Phase.
    // http://dev.mysql.com/doc/internals/en/example-several-mysql-packets.html
    _resetSequenceId() {
        this.sequenceId = 0;
        this.compressedSequenceId = 0;
    }

    _bumpCompressedSequenceId(numPackets) {
        this.compressedSequenceId += numPackets;
        this.compressedSequenceId %= 256;
    }

    _bumpSequenceId(numPackets) {
        this.sequenceId += numPackets;
        this.sequenceId %= 256;
    }
    writePacket(packet) {
        const MAX_PACKET_LENGTH = 16777215;
        const length = packet.length();

        if (length < MAX_PACKET_LENGTH) {
            packet.writeHeader(this.sequenceId);
            if (this.config.debug) {
                adone.debug(`${this._internalId} ${this.connectionId} <== ${this._command._commandName}#${this._command.stateName()}(${this.sequenceId}, ${packet._name}, ${packet.length()})`);
                adone.debug(`${this._internalId} ${this.connectionId} <== ${packet.buffer.toString("hex")}`);
            }
            this._bumpSequenceId(1);
            this.write(packet.buffer);
        } else {
            if (this.config.debug) {
                adone.debug(`${this._internalId} ${this.connectionId} <== Writing large packet, raw content not written:`);
                adone.debug(`${this._internalId} ${this.connectionId} <== ${this._command._commandName}#${this._command.stateName()}(${this.sequenceId}, ${packet._name}, ${packet.length()})`);
            }
            for (let offset = 4; offset < 4 + length; offset += MAX_PACKET_LENGTH) {
                const chunk = packet.buffer.slice(offset, offset + MAX_PACKET_LENGTH);
                let header;
                if (chunk.length === MAX_PACKET_LENGTH) {
                    header = Buffer.from([0xff, 0xff, 0xff, this.sequenceId]);
                } else {
                    header = Buffer.from([
                        chunk.length & 0xff,
                        (chunk.length >> 8) & 0xff,
                        (chunk.length >> 16) & 0xff,
                        this.sequenceId
                    ]);
                }
                this._bumpSequenceId(1);
                this.write(header);
                this.write(chunk);
            }
        }
    }

    startTLS(onSecure) {
        if (this.config.debug) {
            adone.debug("Upgrading connection to TLS");
        }
        const secureContext = tls.createSecureContext({
            ca: this.config.ssl.ca,
            cert: this.config.ssl.cert,
            ciphers: this.config.ssl.ciphers,
            key: this.config.ssl.key,
            passphrase: this.config.ssl.passphrase
        });

        const rejectUnauthorized = this.config.ssl.rejectUnauthorized;
        let secureEstablished = false;
        const secureSocket = new tls.TLSSocket(this.stream, {
            rejectUnauthorized,
            requestCert: true,
            secureContext,
            isServer: false
        });

        // error handler for secure socket
        secureSocket.on("_tlsError", (err) => {
            if (secureEstablished) {
                this._handleworkError(err);
            } else {
                onSecure(err);
            }
        });

        secureSocket.on("secure", function secure() {
            secureEstablished = true;
            onSecure(rejectUnauthorized ? this.ssl.verifyError() : null);
        });
        secureSocket.on("data", (data) => {
            this.packetParser.execute(data);
        });
        this.write = (buffer) => secureSocket.write(buffer);
        // start TLS communications
        secureSocket._start();
    }


    pipe() {
        const connection = this;
        if (this.stream instanceof net.Stream) {
            this.stream.ondata = function (data, start, end) {
                connection.packetParser.execute(data, start, end);
            };
        } else {
            this.stream.on("data", (data) => {
                connection.packetParser.execute(
                    data.parent,
                    data.offset,
                    data.offset + data.length
                );
            });
        }
    }

    protocolError(message, code) {
        const err = new x.Exception(message);
        err.fatal = true;
        err.code = code || "PROTOCOL_ERROR";
        this.emit("error", err);
    }

    handlePacket(packet) {
        if (this._paused) {
            this._pausedPackets.push(packet);
            return;
        }
        if (packet) {
            if (this.sequenceId !== packet.sequenceId) {
                adone.warn(`Warning: got packets out of order. Expected ${this.sequenceId} but received ${packet.sequenceId}`);
            }
            this._bumpSequenceId(packet.numPackets);
        }

        if (this.config.debug) {
            if (packet) {
                adone.debug(` raw: ${packet.buffer.slice(packet.offset, packet.offset + packet.length()).toString("hex")}`);
                adone.trace();
                const commandName = this._command ? this._command._commandName : "(no command)";
                const stateName = this._command ? this._command.stateName() : "(no command)";
                adone.debug(`${this._internalId} ${this.connectionId} ==> ${commandName}#${stateName}(${packet.sequenceId}, ${packet.type()}, ${packet.length()})`);
            }
        }
        if (!this._command) {
            this.protocolError("Unexpected packet while no commands in the queue", "PROTOCOL_UNEXPECTED_PACKET");
            this.close();
            return;
        }

        const done = this._command.execute(packet, this);
        if (done) {
            this._command = this._commands.shift();
            if (this._command) {
                this.sequenceId = 0;
                this.compressedSequenceId = 0;
                this.handlePacket();
            }
        }
    }

    addCommand(cmd) {
        if (this.config.debug) {
            adone.debug(`Add command: ${arguments.callee.caller.name}`);
            cmd._commandName = arguments.callee.caller.name;
        }
        if (!this._command) {
            this._command = cmd;
            this.handlePacket();
        } else {
            this._commands.push(cmd);
        }
        return cmd;
    }

    format(sql, values) {
        if (is.function(this.config.queryFormat)) {
            return this.config.queryFormat.call(this, sql, values, this.config.timezone);
        }
        const opts = {
            sql,
            values
        };
        this._resolveNamedPlaceholders(opts);
        return util.sqlstring.format(
            opts.sql,
            opts.values,
            this.config.stringifyObjects,
            this.config.timezone
        );
    }

    escape(value) {
        return util.sqlstring.escape(value, false, this.config.timezone);
    }

    escapeId(value) {
        return util.sqlstring.escapeId(value, false);
    }
    _resolveNamedPlaceholders(options) {
        let unnamed;
        if (this.config.namedPlaceholders || options.namedPlaceholders) {
            if (is.null(convertNamedPlaceholders)) {
                convertNamedPlaceholders = __.namedPlaceholders.createCompiler();
            }
            unnamed = convertNamedPlaceholders(options.sql, options.values);
            [options.sql, options.values] = unnamed;
        }
    }

    query(sql, values, cb) {
        let cmdQuery;
        if (sql instanceof __.command.Query) {
            cmdQuery = sql;
        } else {
            cmdQuery = Connection.createQuery(sql, values, cb, this.config);
        }
        this._resolveNamedPlaceholders(cmdQuery);
        const rawSql = this.format(cmdQuery.sql, cmdQuery.values || []);
        cmdQuery.sql = rawSql;
        return this.addCommand(cmdQuery);
    }

    pause() {
        this._paused = true;
        this.stream.pause();
    }

    resume() {
        let packet;
        this._paused = false;
        while ((packet = this._pausedPackets.shift())) {
            this.handlePacket(packet);
            // don't resume if packet hander paused connection
            if (this._paused) {
                return;
            }
        }
        this.stream.resume();
    }

    keyFromFields(fields, options) {
        let res = `${typeof options.nestTables}/${options.nestTables}/${options.rowsAsArray}${options.supportBigNumbers}/${options.bigNumberStrings}/${typeof options.typeCast}`;
        for (let i = 0; i < fields.length; ++i) {
            res += `/${fields[i].name}:${fields[i].columnType}:${fields[i].flags}`;
        }
        return res;
    }

    // TODO: named placeholders support
    prepare(options, cb) {
        if (is.string(options)) {
            options = { sql: options };
        }
        return this.addCommand(new __.command.Prepare(options, cb));
    }

    unprepare(sql) {
        let options = {};
        if (is.object(sql)) {
            options = sql;
        } else {
            options.sql = sql;
        }
        const key = Connection.statementKey(options);
        const stmt = this._statements.get(key);
        if (stmt) {
            this._statements.delete(key);
            stmt.close();
        }
        return stmt;
    }

    execute(sql, values, cb) {
        let options = {};
        if (is.object(sql)) {
            // execute(options, cb)
            options = sql;
            if (is.function(values)) {
                cb = values;
            } else {
                options.values = options.values || values;
            }
        } else if (is.function(values)) {
            // execute(sql, cb)
            cb = values;
            options.sql = sql;
            options.values = undefined;
        } else {
            // execute(sql, values, cb)
            options.sql = sql;
            options.values = values;
        }
        this._resolveNamedPlaceholders(options);

        const executeCommand = new __.command.Execute(options, cb);
        const prepareCommand = new __.command.Prepare(options, (err, stmt) => {
            if (err) {
                // skip execute command if prepare failed, we have main
                // combined callback here
                executeCommand.start = function () {
                    return null;
                };

                if (cb) {
                    cb(err);
                } else {
                    executeCommand.emit("error", err);
                }
                executeCommand.emit("end");
                return;
            }

            executeCommand.statement = stmt;
        });

        this.addCommand(prepareCommand);
        this.addCommand(executeCommand);
        return executeCommand;
    }

    changeUser(options, callback) {
        if (!callback && is.function(options)) {
            [options, callback] = [{}, options];
        }

        let charsetNumber;

        if (options.charset) {
            charsetNumber = __.ConnectionConfig.getCharsetNumber(options.charset);
        } else {
            charsetNumber = this.config.charsetNumber;
        }

        return this.addCommand(new __.command.ChangeUser({
            user: options.user || this.config.user,
            password: options.password || this.config.password,
            passwordSha1: options.passwordSha1 || this.config.passwordSha1,
            database: options.database || this.config.database,
            timeout: options.timeout,
            charsetNumber,
            currentConfig: this.config
        }, (err) => {
            if (err) {
                err.fatal = true;
            }

            if (callback) {
                callback(err);
            }
        }));
    }

    beginTransaction(cb) {
        return this.query("START TRANSACTION", cb);
    }

    commit(cb) {
        return this.query("COMMIT", cb);
    }

    rollback(cb) {
        return this.query("ROLLBACK", cb);
    }

    ping(cb) {
        return this.addCommand(new __.command.Ping(cb));
    }

    _registerSlave(opts, cb) {
        return this.addCommand(new __.command.RegisterSlave(opts, cb));
    }

    _binlogDump(opts, cb) {
        return this.addCommand(new __.command.BinlogDump(opts, cb));
    }

    // currently just alias to close
    destroy() {
        this.close();
    }

    close() {
        this._closing = true;
        if (this.connectTimeout) {
            clearTimeout(this.connectTimeout);
        }
        this.stream.end();
        this.addCommand = this._addCommandClosedState;
    }

    createBinlogStream(opts) {
        // TODO: create proper stream class
        let test = 1;
        const stream = new Readable({ objectMode: true });
        stream._read = () => ({
            data: test++
        });
        this._registerSlave(opts, () => {
            const dumpCmd = this._binlogDump(opts);
            dumpCmd.on("event", (ev) => {
                stream.push(ev);
            });
            dumpCmd.on("eof", () => {
                stream.push(null);
                // if non-blocking, then close stream to prevent errors
                if (opts.flags && (opts.flags & 0x01)) {
                    this.close();
                }
            });
            // TODO: pipe errors as well
        });
        return stream;
    }

    connect(cb) {
        if (!cb) {
            return;
        }
        const onerror = (err) => {
            // eslint-disable-next-line no-use-before-define
            this.removeListener("connect", onconnect);
            cb(err);
        };

        const onconnect = (val) => {
            this.removeListener("error", onerror);
            cb(null, val);
        };

        this.once("error", onerror);
        this.once("connect", onconnect);
    }

    writeColumns(columns) {
        this.writePacket(packet.ResultSetHeader.toPacket(columns.length));
        columns.forEach((column) => {
            this.writePacket(packet.ColumnDefinition.toPacket(column, this.serverConfig.encoding));
        });
        this.writeEof();
    }

    // row is array of columns, not hash
    writeTextRow(column) {
        this.writePacket(packet.TextRow.toPacket(column, this.serverConfig.encoding));
    }

    writeTextResult(rows, columns) {
        this.writeColumns(columns);
        rows.forEach((row) => {
            const arrayRow = new Array(columns.length);
            columns.forEach((column) => {
                arrayRow.push(row[column.name]);
            });
            this.writeTextRow(arrayRow);
        });
        this.writeEof();
    }

    writeEof(warnings, statusFlags) {
        this.writePacket(packet.EOF.toPacket(warnings, statusFlags));
    }

    writeOk(args) {
        if (!args) {
            args = { affectedRows: 0 };
        }
        this.writePacket(packet.OK.toPacket(args, this.serverConfig.encoding));
    }

    writeError(args) {
        // if we want to send error before initial hello was sent, use default encoding
        const encoding = this.serverConfig ? this.serverConfig.encoding : "cesu8";
        this.writePacket(packet.Error.toPacket(args, encoding));
    }

    serverHandshake(args) {
        this.serverConfig = args;
        this.serverConfig.encoding = c.charsetEncoding[this.serverConfig.characterSet];
        return this.addCommand(new __.command.ServerHandshake(args));
    }

    end(callback) {
        if (this.config.isServer) {
            this._closing = true;
            const quitCmd = new EventEmitter();
            setImmediate(() => {
                this.stream.end();
                quitCmd.emit("end");
            });
            return quitCmd;
        }

        // trigger error if more commands enqueued after end command
        const quitCmd = this.addCommand(new __.command.Quit(callback));
        this.addCommand = this._addCommandClosedState;
        return quitCmd;
    }

    static createQuery(sql, values, cb, config) {
        let options = {
            rowsAsArray: config.rowsAsArray
        };
        if (is.object(sql)) {
            // query(options, cb)
            options = sql;
            if (is.function(values)) {
                cb = values;
            } else if (!is.undefined(values)) {
                options.values = values;
            }
        } else if (is.function(values)) {
            // query(sql, cb)
            cb = values;
            options.sql = sql;
            options.values = undefined;
        } else {
            // query(sql, values, cb)
            options.sql = sql;
            options.values = values;
        }
        return new __.command.Query(options, cb);
    }

    static statementKey(options) {
        return `${typeof options.nestTables}/${options.nestTables}/${options.rowsAsArray}${options.sql}`;
    }
}
