import adone from "../../..";
import * as Commands from "./commands";

const {
    std: {
        net: Net,
        tls: Tls,
        timers: Timers,
    },
    EventEmitter,
    collection: { LRU }
} = adone;

var SqlString = require("../sqlstring");
var PacketParser = require("./packet_parser.js");
var Packets = require("./packets/index.js");
var ConnectionConfig = require("./connection_config.js");
var CharsetToEncoding = require("./constants/charset_encodings.js");

var _connectionId = 0;

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
                this.stream = Net.connect(opts.config.socketPath);
            } else {
                this.stream = Net.connect(opts.config.port, opts.config.host);
            }
        } else {
            // if stream is a function, treat it as "stream agent / factory"
            if (typeof opts.config.stream == "function") {
                this.stream = opts.config.stream(opts);
            } else {
                this.stream = opts.config.stream;
            }
        }
        this._internalId = _connectionId++;

        this._commands = new adone.collection.LinkedList;
        this._command = null;

        this._paused = false;
        this._paused_packets = new adone.collection.LinkedList;

        this._statements = new LRU(this.config.maxPreparedStatements, {
            dispose: (key, statement) => {
                statement.close();
            }
        });

        // TODO: make it lru cache
        // https://github.com/mercadolibre/node-simple-lru-cache
        // or https://github.com/rsms/js-lru
        // or https://github.com/monsur/jscache
        // or https://github.com/isaacs/node-lru-cache
        //
        // key is field.name + ":" + field.columnType + ":" field.flags + "/"
        this.textProtocolParsers = {};

        // TODO: not sure if cache should be separate (same key as with textProtocolParsers)
        // or part of prepared statements cache (key is sql query)
        this.binaryProtocolParsers = {};

        this.serverCapabilityFlags = 0;
        this.authorized = false;

        var connection = this;
        this.sequenceId = 0;

        this.threadId = null;
        this._handshakePacket = null;
        this._fatalError = null;
        this._protocolError = null;
        this._outOfOrderPackets = [];

        this.clientEncoding = CharsetToEncoding[this.config.charsetNumber];

        this.stream.once("error", connection._handleNetworkError.bind(this));

        // see https://gist.github.com/khoomeister/4985691#use-that-instead-of-bind
        this.packetParser = new PacketParser((p) => {
            connection.handlePacket(p);
        });

        this.stream.on("data", function (data) {
            if (connection.connectTimeout) {
                Timers.clearTimeout(connection.connectTimeout);
                connection.connectTimeout = null;
            }
            connection.packetParser.execute(data);
        });

        this.stream.on("end", function () {
            // we need to set this flag everywhere where we want connection to close
            if (connection._closing) {
                return;
            }

            if (!connection._protocolError) { // no particular error message before disconnect
                connection._protocolError = new Error("Connection lost: The server closed the connection.");
                connection._protocolError.fatal = true;
                connection._protocolError.code = "PROTOCOL_CONNECTION_LOST";
            }

            connection._notifyError(connection._protocolError);
        });
        var handshakeCommand;
        if (!this.config.isServer) {
            handshakeCommand = new Commands.ClientHandshake(this.config.clientFlags);
            handshakeCommand.on("end", function () {
                connection._handshakePacket = handshakeCommand.handshake;
                connection.threadId = handshakeCommand.handshake.connectionId;
                connection.emit("connect", handshakeCommand.handshake);
            });
            handshakeCommand.on("error", function (err) {
                connection._notifyError(err);
            });
            this.addCommand(handshakeCommand);
        }

        // in case there was no initiall handshake but we need to read sting, assume it utf-8
        // most common example: "Too many connections" error ( packet is sent immediately on connection attempt, we don"t know server encoding yet)
        // will be overwrittedn with actial encoding value as soon as server handshake packet is received
        this.serverEncoding = "utf8";

        if (this.config.connectTimeout) {
            var timeoutHandler = this._handleTimeoutError.bind(this);
            this.connectTimeout = Timers.setTimeout(timeoutHandler, this.config.connectTimeout);
        }
    }

    _addCommandClosedState(cmd) {
        var err = new Error("Can\"t add new command when connection is in closed state");
        err.fatal = true;
        if (cmd.onResult) {
            cmd.onResult(err);
        } else {
            this.emit("error", err);
        }
    }

    _handleNetworkError(err) {
        var connection = this;
        err.fatal = true;
        // stop receiving packets
        connection.stream.removeAllListeners("data");
        connection.addCommand = connection._addCommandClosedState;
        connection.write = function () {
            connection.emit("error", new Error("Can\"t write in closed state"));
        };
        connection._notifyError(err);
        connection._fatalError = err;
    }

    _handleTimeoutError() {
        if (this.connectTimeout) {
            Timers.clearTimeout(this.connectTimeout);
            this.connectTimeout = null;
        }

        this.stream.destroy && this.stream.destroy();

        var err = new Error("connect ETIMEDOUT");
        err.errorno = "ETIMEDOUT";
        err.code = "ETIMEDOUT";
        err.syscall = "connect";

        this._handleNetworkError(err);
    }


    // notify all commands in the queue and bubble error as connection "error"
    // called on stream error or unexpected termination
    _notifyError(err) {
        var connection = this;

        // prevent from emitting "PROTOCOL_CONNECTION_LOST" after EPIPE or ECONNRESET
        if (connection._fatalError) {
            return;
        }

        var command;

        // if there is no active command, notify connection
        // if there are commands and all of them have callbacks, pass error via callback
        var bubbleErrorToConnection = !connection._command;
        if (connection._command && connection._command.onResult) {
            connection._command.onResult(err);
            connection._command = null;
        } else {
            bubbleErrorToConnection = true;
        }
        while ((command = connection._commands.shift())) {
            if (command.onResult) {
                command.onResult(err);
            } else {
                bubbleErrorToConnection = true;
            }
        }
        // notify connection if some comands in the queue did not have callbacks
        // or if this is pool connection ( so it can be removed from pool )
        if (bubbleErrorToConnection || connection._pool) {
            connection.emit("error", err);
        }
    }

    write(buffer) {
        this.stream.write(buffer, function (err) {
            if (err) {
                this._handleNetworkError(err);
            }
        });
    }

    writePacket(packet) {
        packet.writeHeader(this.sequenceId);
        if (this.config.debug) {
            console.log(this._internalId + " " + this.connectionId + " <== " + this._command._commandName + "#" + this._command.stateName() + "(" + [this.sequenceId, packet._name, packet.length()].join(",") + ")");
            console.log(this._internalId + " " + this.connectionId + " <== " + packet.buffer.toString("hex"));
        }
        this.sequenceId++;
        if (this.sequenceId == 256) {
            this.sequenceId = 0;
        }
        this.write(packet.buffer);
    }

    startTLS(onSecure) {
        if (this.config.debug) {
            console.log("Upgrading connection to TLS");
        }
        var connection = this;
        var secureContext = Tls.createSecureContext({
            ca: this.config.ssl.ca,
            cert: this.config.ssl.cert,
            ciphers: this.config.ssl.ciphers,
            key: this.config.ssl.key,
            passphrase: this.config.ssl.passphrase
        });

        var rejectUnauthorized = this.config.ssl.rejectUnauthorized;
        var secureEstablished = false;
        var secureSocket = new Tls.TLSSocket(connection.stream, {
            rejectUnauthorized,
            requestCert: true,
            secureContext,
            isServer: false
        });

        // error handler for secure socket
        secureSocket.on("_tlsError", function (err) {
            if (secureEstablished) {
                connection._handleNetworkError(err);
            } else {
                onSecure(err);
            }
        });

        secureSocket.on("secure", function () {
            secureEstablished = true;
            onSecure(rejectUnauthorized ? this.ssl.verifyError() : null);
        });
        secureSocket.on("data", function (data) {
            connection.packetParser.execute(data);
        });
        connection.write = function (buffer) {
            secureSocket.write(buffer);
        };
        // start TLS communications
        secureSocket._start();
    }

    pipe() {
        var connection = this;
        if (this.stream instanceof Net.Stream) {
            this.stream.ondata = function (data, start, end) {
                connection.packetParser.execute(data, start, end);
            };
        } else {
            this.stream.on("data", function (data) {
                connection.packetParser.execute(data.parent, data.offset, data.offset + data.length);
            });
        }
    }

    protocolError(message, code) {
        var err = new Error(message);
        err.fatal = true;
        err.code = code || "PROTOCOL_ERROR";
        this.emit("error", err);
    }

    handlePacket(packet) {
        if (this._paused) {
            this._paused_packets.push(packet);
            return;
        }

        // TODO: check packet sequenceId here
        if (packet) {
            this.sequenceId = packet.sequenceId + 1;
        }

        if (this.config.debug) {
            if (packet) {
                console.log(" raw: " + packet.buffer.slice(packet.offset, packet.offset + packet.length()).toString("hex"));
                console.trace();
                var commandName = this._command ? this._command._commandName : "(no command)";
                var stateName = this._command ? this._command.stateName() : "(no command)";
                console.log(this._internalId + " " + this.connectionId + " ==> " + commandName + "#" + stateName + "(" + [packet.sequenceId, packet.type(), packet.length()].join(",") + ")");
            }
        }
        if (!this._command) {
            this.protocolError("Unexpected packet while no commands in the queue", "PROTOCOL_UNEXPECTED_PACKET");
            this.close();
            return;
        }

        var done = this._command.execute(packet, this);
        if (done) {
            // console.log("RESET SEQUENCE ID")
            this.sequenceId = 0;
            this._command = this._commands.shift();
            if (this._command) {
                this.handlePacket();
            }
        }
    }

    addCommand(cmd) {
        if (this.config.debug) {
            console.log("Add command: " + arguments.callee.caller.name);
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
        if (typeof this.config.queryFormat == "function") {
            return this.config.queryFormat.call(this, sql, values, this.config.timezone);
        }
        var opts = { sql, values };
        this._resolveNamedPlaceholders(opts);
        return SqlString.format(opts.sql, opts.values, this.config.stringifyObjects, this.config.timezone);
    }

    escape(value) {
        return SqlString.escape(value, false, this.config.timezone);
    }

    escapeId(value) {
        return SqlString.escapeId(value, false);
    }

    _resolveNamedPlaceholders(options) {
        var unnamed;
        if (this.config.namedPlaceholders || options.namedPlaceholders) {
            if (convertNamedPlaceholders === null) {
                convertNamedPlaceholders = require("../named-placeholders")();
            }
            unnamed = convertNamedPlaceholders(options.sql, options.values);
            options.sql = unnamed[0];
            options.values = unnamed[1];
        }
    }

    createQuery(sql, values, cb, config) {
        var options = {
            rowsAsArray: config.rowsAsArray
        };
        if (typeof sql === "object") {
            // query(options, cb)
            options = sql;
            if (typeof values === "function") {
                cb = values;
            } else if (values !== undefined) {
                options.values = values;
            }
        } else if (typeof values === "function") {
            // query(sql, cb)
            cb = values;
            options.sql = sql;
            options.values = undefined;
        } else {
            // query(sql, values, cb)
            options.sql = sql;
            options.values = values;
        }
        return new Commands.Query(options, _domainify(cb));
    }

    query(sql, values, cb) {
        var cmdQuery;
        if (sql.constructor == Commands.Query) {
            cmdQuery = sql;
        } else {
            cmdQuery = Connection.createQuery(sql, values, cb, this.config);
        }
        this._resolveNamedPlaceholders(cmdQuery);
        var rawSql = this.format(cmdQuery.sql, cmdQuery.values || []);
        cmdQuery.sql = rawSql;
        return this.addCommand(cmdQuery);
    }

    pause() {
        this._paused = true;
        this.stream.pause();
    }

    resume() {
        var packet;
        this._paused = false;
        while ((packet = this._paused_packets.shift())) {
            this.handlePacket(packet);
            // don"t resume if packet hander paused connection
            if (this._paused) {
                return;
            }
        }
        this.stream.resume();
    }

    keyFromFields(fields, options) {
        var res = (typeof options.nestTables) + "/" + options.nestTables + "/" + options.rowsAsArray
            + options.supportBigNumbers + "/" + options.bigNumberStrings + "/" + typeof options.typeCast;
        for (var i = 0; i < fields.length; ++i) {
            res += "/" + fields[i].name + ":" + fields[i].columnType + ":" + fields[i].flags;
        }
        return res;
    }

    statementKey(options) {
        return (typeof options.nestTables) +
            "/" + options.nestTables + "/" + options.rowsAsArray + options.sql;
    }

    // TODO: named placeholders support
    prepare(options, cb) {
        if (typeof options == "string") {
            options = { sql: options };
        }
        return this.addCommand(new Commands.Prepare(options, _domainify(cb)));
    }

    unprepare(sql) {
        var options = {};
        if (typeof sql === "object") {
            options = sql;
        } else {
            options.sql = sql;
        }
        var key = Connection.statementKey(options);
        var stmt = this._statements.get(key);
        if (stmt) {
            this._statements.del(key);
            stmt.close();
        }
        return stmt;
    }

    execute(sql, values, cb) {
        var options = {};
        if (typeof sql === "object") {
            // execute(options, cb)
            options = sql;
            if (typeof values === "function") {
                cb = values;
            } else {
                options.values = values;
            }
        } else if (typeof values === "function") {
            // execute(sql, cb)
            cb = values;
            options.sql = sql;
            options.values = undefined;
        } else {
            // execute(sql, values, cb)
            options.sql = sql;
            options.values = values;
        }
        cb = _domainify(cb);
        this._resolveNamedPlaceholders(options);

        var executeCommand = new Commands.Execute(options, cb);
        var prepareCommand = new Commands.Prepare(options, function (err, stmt) {
            if (err) {
                // skip execute command if prepare failed, we have main
                // combined callback here
                executeCommand.start = () => null;

                if (cb) {
                    cb(err);
                } else {
                    executeCommand.emit("error", err);
                }
                return;
            }

            executeCommand.statement = stmt;
        });

        this.addCommand(prepareCommand);
        this.addCommand(executeCommand);
        return executeCommand;
    }

    changeUser(options, callback) {
        if (!callback && typeof options === "function") {
            callback = options;
            options = {};
        }

        var charsetNumber = (options.charset) ? ConnectionConfig.getCharsetNumber(options.charset) : this.config.charsetNumber;

        return this.addCommand(new Commands.ChangeUser({
            user: options.user || this.config.user,
            password: options.password || this.config.password,
            passwordSha1: options.passwordSha1 || this.config.passwordSha1,
            database: options.database || this.config.database,
            timeout: options.timeout,
            charsetNumber,
            currentConfig: this.config
        }, _domainify(function (err) {
            if (err) {
                err.fatal = true;
            }

            if (callback) {
                callback(err);
            }
        })));
    }

    // transaction helpers
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
        return this.addCommand(new Commands.Ping(_domainify(cb)));
    }

    _registerSlave(opts, cb) {
        return this.addCommand(new Commands.RegisterSlave(opts, _domainify(cb)));
    }

    _binlogDump(opts, cb) {
        return this.addCommand(new Commands.BinlogDump(opts, _domainify(cb)));
    }

    // currently just alias to close
    destroy() {
        this.close();
    }

    close() {
        this._closing = true;
        this.stream.end();
        var connection = this;
        connection.addCommand = connection._addCommandClosedState;
    }

    createBinlogStream(opts) {
        // TODO: create proper stream class
        // TODO: use through2
        var test = 1;
        var Readable = require("stream").Readable;
        var stream = new Readable({ objectMode: true });
        stream._read = function () {
            return {
                data: test++
            };
        };
        var connection = this;
        connection._registerSlave(opts, function () {
            var dumpCmd = connection._binlogDump(opts);
            dumpCmd.on("event", function (ev) {
                stream.push(ev);
            });
            dumpCmd.on("eof", function () {
                stream.push(null);
                // if non-blocking, then close stream to prevent errors
                if (opts.flags && (opts.flags & 0x01)) {
                    connection.close();
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
        var connectCalled = 0;

        // TODO domainify this callback as well. Note that domain has to be captured
        // at the top of function due to nested callback
        function callbackOnce(isErrorHandler) {
            return function (param) {
                if (!connectCalled) {
                    if (isErrorHandler) {
                        cb(param);
                    } else {
                        cb(null, param);
                    }
                }
                connectCalled = 1;
            };
        }
        this.once("error", callbackOnce(true));
        this.once("connect", callbackOnce(false));
    }

    // ===================================
    // outgoing server connection methods
    // ===================================

    writeColumns(columns) {
        var connection = this;
        this.writePacket(Packets.ResultSetHeader.toPacket(columns.length));
        columns.forEach(function (column) {
            connection.writePacket(Packets.ColumnDefinition.toPacket(column, connection.serverConfig.encoding));
        });
        this.writeEof();
    }

    // row is array of columns, not hash
    writeTextRow(column) {
        this.writePacket(Packets.TextRow.toPacket(column, this.serverConfig.encoding));
    }

    writeTextResult(rows, columns) {
        var connection = this;
        connection.writeColumns(columns);
        rows.forEach(function (row) {
            var arrayRow = new Array(columns.length);
            columns.forEach(function (column) {
                arrayRow.push(row[column.name]);
            });
            connection.writeTextRow(arrayRow);
        });
        connection.writeEof();
    }

    writeEof(warnings, statusFlags) {
        this.writePacket(Packets.EOF.toPacket(warnings, statusFlags));
    }

    writeOk(args) {
        if (!args) {
            args = { affectedRows: 0 };
        }
        this.writePacket(Packets.OK.toPacket(args, this.serverConfig.encoding));
    }

    writeError(args) {
        // if we want to send error before initial hello was sent, use default encoding
        var encoding = this.serverConfig ? this.serverConfig.encoding : "cesu8";
        this.writePacket(Packets.Error.toPacket(args, encoding));
    }

    serverHandshake(args) {
        this.serverConfig = args;
        this.serverConfig.encoding = CharsetToEncoding[this.serverConfig.characterSet];
        return this.addCommand(new Commands.ServerHandshake(args));
    }

    // ===============================================================

    // TODO: domainify
    end(callback) {
        const connection = this;

        if (this.config.isServer) {
            connection._closing = true;
            const quitCmd = new EventEmitter();
            setImmediate(function () {
                connection.stream.end();
                quitCmd.emit("end");
            });
            return quitCmd;
        }

        // trigger error if more commands enqueued after end command
        const quitCmd = this.addCommand(new Commands.Quit(callback));
        connection.addCommand = connection._addCommandClosedState;
        return quitCmd;
    }
}

function _domainify(callback) {
    var domain = process.domain;
    if (domain && callback) {
        return process.domain.bind(callback);
    } else {
        return callback;
    }
}

var convertNamedPlaceholders = null;

Connection.createQuery = function createQuery(sql, values, cb, config) {
    var options = {
        rowsAsArray: config.rowsAsArray
    };
    if (typeof sql === "object") {
        // query(options, cb)
        options = sql;
        if (typeof values === "function") {
            cb = values;
        } else if (values !== undefined) {
            options.values = values;
        }
    } else if (typeof values === "function") {
        // query(sql, cb)
        cb = values;
        options.sql = sql;
        options.values = undefined;
    } else {
        // query(sql, values, cb)
        options.sql = sql;
        options.values = values;
    }
    return new Commands.Query(options, cb);
};

Connection.statementKey = function (options) {
    return (typeof options.nestTables) +
        "/" + options.nestTables + "/" + options.rowsAsArray + options.sql;
};
