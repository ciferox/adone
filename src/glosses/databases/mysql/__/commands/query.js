const {
    is,
    fs,
    noop,
    lazify,
    std: {
        stream: { Readable }
    },
    database: { mysql }
} = adone;

const {
    c
} = mysql;

const __ = adone.private(mysql);

const {
    packet,
    command: { Command }
} = __;

const lazy = lazify({
    EmptyPacket: () => new packet.Packet(0, Buffer.allocUnsafe(4), 0, 4)
});

// http://dev.mysql.com/doc/internals/en/com-query.html
export default class Query extends Command {
    constructor(options, callback) {
        super();
        this.sql = options.sql;
        this.values = options.values;
        this._queryOptions = options;
        this.onResult = callback;
        this._fieldCount = 0;
        this._rowParser = null;
        this._fields = [];
        this._rows = [];
        this._receivedFieldsCount = 0;
        this._resultIndex = 0;
        this._localStream = null;
        this._unpipeStream = noop;
        this._streamFactory = options.infileStreamFactory;
        this._connection = null;
    }

    start(_, connection) {
        if (connection.config.debug) {
            adone.logDebug("        Sending query command: %s", this.sql);
        }
        this._connection = connection;
        this.options = Object.assign({}, connection.config, this._queryOptions);
        const cmdPacket = new packet.Query(this.sql, connection.config.charsetNumber);
        connection.writePacket(cmdPacket.toPacket(1));
        return Query.prototype.resultsetHeader;
    }

    done() {
        const self = this;
        this._unpipeStream();
        if (this.onResult) {
            let rows;
            let fields;
            if (this._resultIndex === 0) {
                rows = this._rows[0];
                fields = this._fields[0];
            } else {
                rows = this._rows;
                fields = this._fields;
            }
            if (fields) {
                process.nextTick(() => {
                    self.onResult(null, rows, fields);
                });
            } else {
                process.nextTick(() => {
                    self.onResult(null, rows);
                });
            }
        }
        return null;
    }

    doneInsert(rs) {
        if (this._localStreamError) {
            if (this.onResult) {
                this.onResult(this._localStreamError, rs);
            } else {
                this.emit("error", this._localStreamError);
            }
            return null;
        }
        this._rows.push(rs);
        this._fields.push(void (0));
        this.emit("fields", void (0));
        this.emit("result", rs);
        if (rs.serverStatus & c.serverStatus.SERVER_MORE_RESULTS_EXISTS) {
            this._resultIndex++;
            return this.resultsetHeader;
        }
        return this.done();
    }

    resultsetHeader(p, connection) {
        const rs = new packet.ResultSetHeader(p, connection);
        this._fieldCount = rs.fieldCount;
        if (connection.config.debug) {
            adone.logDebug(`        Resultset header received, expecting ${rs.fieldCount} column definition packets`);
        }
        if (this._fieldCount === 0) {
            return this.doneInsert(rs);
        }
        if (is.null(this._fieldCount)) {
            this._localStream = this._findOrCreateReadStream(rs.infileName);
            // start streaming, after last packet expect OK
            // http://dev.mysql.com/doc/internals/en/com-query-response.html#local-infile-data
            this._streamLocalInfile(connection);
            return this.infileOk;
        }

        this._receivedFieldsCount = 0;
        this._rows.push([]);
        this._fields.push([]);
        return this.readField;
    }

    _findOrCreateReadStream(path) {
        if (this._streamFactory) {
            return this._streamFactory(path);
        }
        return fs.createReadStream(path, {
            flag: "r",
            encoding: null,
            autoClose: true
        });
    }

    _streamLocalInfile(connection) {
        const command = this;

        const onDrain = () => {
            command._localStream.resume();
        };

        const onPause = () => {
            command._localStream.pause();
        };

        const onData = (data) => {
            const dataWithHeader = Buffer.allocUnsafe(data.length + 4);
            data.copy(dataWithHeader, 4);
            connection.writePacket(new packet.Packet(0, dataWithHeader, 0, dataWithHeader.length));
        };

        const onEnd = () => {
            connection.writePacket(lazy.EmptyPacket);
        };

        const onError = (err) => {
            command._localStreamError = err;
            connection.writePacket(lazy.EmptyPacket);
        };

        command._unpipeStream = () => {
            connection.stream.removeListener("pause", onPause);
            connection.stream.removeListener("drain", onDrain);
            command._localStream.removeListener("data", onData);
            command._localStream.removeListener("end", onEnd);
            command._localStream.removeListener("error", onError);
        };

        connection.stream.on("pause", onPause);
        connection.stream.on("drain", onDrain);
        command._localStream.on("data", onData);
        command._localStream.on("end", onEnd);
        command._localStream.on("error", onError);

        connection.once("error", () => {
            command._unpipeStream();
        });
    }

    readField(p, connection) {
        this._receivedFieldsCount++;

        if (this._fields[this._resultIndex].length !== this._fieldCount) {
            const field = new packet.ColumnDefinition(p, connection.clientEncoding);
            this._fields[this._resultIndex].push(field);
            if (connection.config.debug) {
                adone.logDebug("        Column definition:");
                adone.logDebug(`          name: ${field.name}`);
                adone.logDebug(`          type: ${field.columnType}`);
                adone.logDebug(`         flags: ${field.flags}`);
            }
        }

        if (this._receivedFieldsCount === this._fieldCount) {
            const fields = this._fields[this._resultIndex];
            this.emit("fields", fields);
            const parserKey = connection.keyFromFields(fields, this.options);
            this._rowParser = connection.textProtocolParsers[parserKey];
            if (!this._rowParser) {
                this._rowParser = __.compileTextParser(fields, this.options, connection.config);
                connection.textProtocolParsers[parserKey] = this._rowParser;
            }
            return Query.prototype.fieldsEOF;
        }
        return Query.prototype.readField;
    }

    fieldsEOF(p, connection) {
        if (!p.isEOF()) {
            return connection.protocolError("Expected EOF packet");
        }
        return this.row;
    }

    row(p) {
        if (p.isEOF()) {
            const status = p.eofStatusFlags();
            const moreResults = status & c.serverStatus.SERVER_MORE_RESULTS_EXISTS;
            if (moreResults) {
                this._resultIndex++;
                return Query.prototype.resultsetHeader;
            }
            return this.done();
        }

        const row = new this._rowParser(
            p,
            this._fields[this._resultIndex],
            this.options,
            c.charsetEncoding
        );
        if (this.onResult) {
            this._rows[this._resultIndex].push(row);
        } else {
            this.emit("result", row);
        }

        return Query.prototype.row;
    }

    infileOk(p, connection) {
        const rs = new packet.ResultSetHeader(p, connection);
        return this.doneInsert(rs);
    }

    stream(options = {}) {
        options = Object.create(options);
        options.objectMode = true;
        const stream = new Readable(options);

        stream._read = () => {
            this._connection && this._connection.resume();
        };

        this.on("result", (row) => {
            if (!stream.push(row)) {
                this._connection.pause();
            }
            stream.emit("result", row); // replicate old emitter
        });

        this.on("error", (err) => {
            stream.emit("error", err); // Pass on any errors
        });

        this.on("end", () => {
            stream.emit("close"); // notify readers that query has completed
            stream.push(null); // pushing null, indicating EOF
        });

        this.on("fields", (fields) => {
            stream.emit("fields", fields); // replicate old emitter
        });

        return stream;
    }
}
