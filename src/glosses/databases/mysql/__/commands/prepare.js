const {
    is,
    database: { mysql }
} = adone;

const {
    packet,
    command
} = adone.private(mysql);

const {
    Command
} = command;

class PreparedStatementInfo {
    constructor(query, id, columns, parameters, connection) {
        this.query = query;
        this.id = id;
        this.columns = columns;
        this.parameters = parameters;
        this.rowParser = null;
        this._connection = connection;
    }

    close() {
        return this._connection.addCommand(new command.CloseStatement(this.id));
    }

    execute(parameters, callback) {
        if (is.function(parameters)) {
            callback = parameters;
            parameters = [];
        }
        const cmd = new command.Execute({ statement: this, values: parameters }, callback);
        return this._connection.addCommand(cmd);
    }
}

export default class Prepare extends Command {
    constructor(options, callback) {
        super();
        this.query = options.sql;
        this.onResult = callback;

        this.id = 0;
        this.fieldCount = 0;
        this.parameterCount = 0;
        this.fields = [];
        this.parameterDefinitions = [];
        this.options = options;
    }

    start(_, connection) {
        const Connection = connection.constructor;
        this.key = Connection.statementKey(this.options);

        const statement = connection._statements.get(this.key);
        if (statement) {
            if (this.onResult) {
                this.onResult(null, statement);
            }
            return null;
        }

        const cmdPacket = new packet.PrepareStatement(this.query, connection.config.charsetNumber);
        connection.writePacket(cmdPacket.toPacket(1));
        return Prepare.prototype.prepareHeader;
    }

    prepareHeader(p, connection) {
        const header = new packet.PreparedStatementHeader(p);
        this.id = header.id;
        this.fieldCount = header.fieldCount;
        this.parameterCount = header.parameterCount;
        if (this.parameterCount > 0) {
            return Prepare.prototype.readParameter;
        } else if (this.fieldCount > 0) {
            return Prepare.prototype.readField;
        }
        return this.prepareDone(connection);

    }

    readParameter(p, connection) {
        const def = new packet.ColumnDefinition(p, connection.clientEncoding);
        this.parameterDefinitions.push(def);
        if (this.parameterDefinitions.length === this.parameterCount) {
            return Prepare.prototype.parametersEOF;
        }
        return this.readParameter;
    }

    readField(p, connection) {
        const def = new packet.ColumnDefinition(p, connection.clientEncoding);
        this.fields.push(def);
        if (this.fields.length === this.fieldCount) {
            return Prepare.prototype.fieldsEOF;
        }
        return Prepare.prototype.readField;
    }

    parametersEOF(p, connection) {
        if (!p.isEOF()) {
            return connection.protocolError("Expected EOF packet after parameters");
        }

        if (this.fieldCount > 0) {
            return Prepare.prototype.readField;
        }
        return this.prepareDone(connection);

    }

    fieldsEOF(p, connection) {
        if (!p.isEOF()) {
            return connection.protocolError("Expected EOF packet after fields");
        }
        return this.prepareDone(connection);
    }

    prepareDone(connection) {
        const self = this;
        const statement = new PreparedStatementInfo(
            self.query,
            self.id,
            self.fields,
            self.parameterDefinitions,
            connection
        );

        connection._statements.set(this.key, statement);

        if (this.onResult) {
            self.onResult(null, statement);
        }
        return null;
    }
}
