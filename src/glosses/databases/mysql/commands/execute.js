const {
    database: { mysql: { packet, compileBinaryParser, command: { Command, Query } } },
    noop
} = adone;

export default class Execute extends Command {
    constructor(options, callback) {
        super();
        this.statement = options.statement;
        this.sql = options.sql;
        this.values = options.values;
        this.onResult = callback;
        this.parameters = options.values;

        this.insertId = 0;

        this._rows = [];
        this._fields = [];
        this._result = [];
        this._fieldCount = 0;
        this._rowParser = null;
        this._executeOptions = options;
        this._resultIndex = 0;
        this._localStream = null;
        this._unpipeStream = noop;
        this._streamFactory = options.infileStreamFactory;
        this._connection = null;
    }

    buildParserFromFields(fields, connection) {
        const parserKey = connection.keyFromFields(fields, this.options);
        let parser = connection.binaryProtocolParsers[parserKey];
        if (!parser) {
            parser = compileBinaryParser(fields, this.options, connection.config);
            connection.binaryProtocolParsers[parserKey] = parser;
        }
        return parser;
    }

    start(_, connection) {
        this._connection = connection;
        this.options = Object.assign({}, connection.config, this._executeOptions);
        const executePacket = new packet.Execute(
            this.statement.id,
            this.parameters,
            connection.config.charsetNumber
        );
        connection.writePacket(executePacket.toPacket(1));
        return Execute.prototype.resultsetHeader;
    }

    readField(p, connection) {
        const field = new packet.ColumnDefinition(p, connection.clientEncoding);

        this._receivedFieldsCount++;
        this._fields[this._resultIndex].push(field);
        if (this._receivedFieldsCount === this._fieldCount) {
            const fields = this._fields[this._resultIndex];
            this.emit("fields", fields, this._resultIndex);
            return Execute.prototype.fieldsEOF;
        }
        return Execute.prototype.readField;
    }

    fieldsEOF(p, connection) {
        // check EOF
        if (!p.isEOF()) {
            return connection.protocolError("Expected EOF packet");
        }
        this._rowParser = this.buildParserFromFields(this._fields[this._resultIndex], connection);
        return Execute.prototype.row;
    }
}

Execute.prototype.done = Query.prototype.done;
Execute.prototype.doneInsert = Query.prototype.doneInsert;
Execute.prototype.resultsetHeader = Query.prototype.resultsetHeader;
Execute.prototype._findOrCreateReadStream = Query.prototype._findOrCreateReadStream;
Execute.prototype._streamLocalInfile = Query.prototype._streamLocalInfile;
Execute.prototype.row = Query.prototype.row;
Execute.prototype.stream = Query.prototype.stream;
