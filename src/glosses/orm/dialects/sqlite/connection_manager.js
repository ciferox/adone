const {
    orm
} = adone;

const {
    x
} = orm;

const {
    dialect: {
        abstract: {
            ConnectionManager: AbstractConnectionManager
        }
    }
} = adone.private(orm);

const debug = orm.util.getLogger().debugContext("connection:sqlite");
const parserStore = orm.util.parserStore("sqlite");

export default class ConnectionManager extends AbstractConnectionManager {
    constructor(dialect, sequelize) {
        super(dialect, sequelize);
        this.sequelize = sequelize;
        this.config = sequelize.config;
        this.dialect = dialect;
        this.dialectName = this.sequelize.options.dialect;
        this.connections = {};

        // We attempt to parse file location from a connection uri but we shouldn't match sequelize default host.
        if (this.sequelize.options.host === "localhost") {
            delete this.sequelize.options.host;
        }

        try {
            if (sequelize.config.dialectModulePath) {
                this.lib = require(sequelize.config.dialectModulePath).verbose();
            } else {
                this.lib = require("sqlite3").verbose(); // TODO
            }
        } catch (err) {
            if (err.code === "MODULE_NOT_FOUND") {
                throw new Error("Please install sqlite3 package manually");
            }
            throw err;
        }

        this.refreshTypeParser(orm.type.sqlite);
    }

    // Expose this as a method so that the parsing may be updated when the user has added additional, custom types
    _refreshTypeParser(dataType) {
        parserStore.refresh(dataType);
    }

    _clearTypeParser() {
        parserStore.clear();
    }

    async getConnection(options) {
        options = options || {};
        options.uuid = options.uuid || "default";
        options.inMemory = (this.sequelize.options.storage || this.sequelize.options.host || ":memory:") === ":memory:" ? 1 : 0;

        const dialectOptions = this.sequelize.options.dialectOptions;
        options.readWriteMode = dialectOptions && dialectOptions.mode;

        if (this.connections[options.inMemory || options.uuid]) {
            return Promise.resolve(this.connections[options.inMemory || options.uuid]);
        }

        const connection = await new Promise((resolve, reject) => {
            this.connections[options.inMemory || options.uuid] = new this.lib.Database(
                this.sequelize.options.storage || this.sequelize.options.host || ":memory:",
                options.readWriteMode || this.lib.OPEN_READWRITE | this.lib.OPEN_CREATE, // default mode
                (err) => {
                    if (err) {
                        if (err.code === "SQLITE_CANTOPEN") {
                            return reject(new x.ConnectionError(err));
                        }
                        return reject(new x.ConnectionError(err));
                    }
                    debug(`connection acquired ${options.uuid}`);
                    resolve(this.connections[options.inMemory || options.uuid]);
                }
            );
        });

        if (this.sequelize.config.password) {
            // Make it possible to define and use password for sqlite encryption plugin like sqlcipher
            connection.run(`PRAGMA KEY=${this.sequelize.escape(this.sequelize.config.password)}`);
        }
        if (this.sequelize.options.foreignKeys !== false) {
            // Make it possible to define and use foreign key constraints unless
            // explicitly disallowed. It's still opt-in per relation
            connection.run("PRAGMA FOREIGN_KEYS=ON");
        }

        return connection;
    }

    releaseConnection(connection, force) {
        if (connection.filename === ":memory:" && force !== true) {
            return;
        }

        if (connection.uuid) {
            connection.close();
            debug(`connection released ${connection.uuid}`);
            delete this.connections[connection.uuid];
        }
    }
}
ConnectionManager.prototype.defaultVersion = "3.8.0";
