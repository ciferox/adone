const {
    is,
    orm
} = adone;

const {
    dialect: {
        abstract: {
            ConnectionManager: AbstractConnectionManager
        }
    }
} = adone.private(orm);

const {
    exception
} = orm;

const debug = orm.util.getLogger().debugContext("connection:mysql");
const parserMap = new Map();

/**
 * MySQL Connection Managger
 *
 * Get connections, validate and disconnect them.
 * AbstractConnectionManager pooling use it to handle MySQL specific connections
 */
export default class ConnectionManager extends AbstractConnectionManager {
    constructor(dialect, sequelize) {
        super(dialect, sequelize);

        this.sequelize = sequelize;
        this.sequelize.config.port = this.sequelize.config.port || 3306;
        try {
            if (sequelize.config.dialectModulePath) {
                this.lib = require(sequelize.config.dialectModulePath); // remove?
            } else {
                this.lib = adone.database.mysql;
            }
        } catch (err) {
            if (err.code === "MODULE_NOT_FOUND") {
                throw new Error("Please install mysql2 package manually");
            }
            throw err;
        }

        this.refreshTypeParser(orm.type.mysql);
    }

    // Update parsing when the user has added additional, custom types
    _refreshTypeParser(dataType) {
        for (const type of dataType.types.mysql) {
            parserMap.set(type, dataType.parse);
        }
    }

    _clearTypeParser() {
        parserMap.clear();
    }

    static _typecast(field, next) {
        if (parserMap.has(field.type)) {
            return parserMap.get(field.type)(field, this.sequelize.options, next);
        }
        return next();
    }

    /**
     * Connect with MySQL database based on config, Handle any errors in connection
     * Set the pool handlers on connection.error
     * Also set proper timezone once conection is connected
     *
     * @return Promise<Connection>
     */
    async connect(config) {
        const connectionConfig = {
            host: config.host,
            port: config.port,
            user: config.username,
            flags: "-FOUND_ROWS",
            password: config.password,
            database: config.database,
            timezone: this.sequelize.options.timezone,
            typeCast: ConnectionManager._typecast.bind(this),
            bigNumberStrings: false,
            supportBigNumbers: true,
            promise: false
        };

        if (config.dialectOptions) {
            for (const key of Object.keys(config.dialectOptions)) {
                connectionConfig[key] = config.dialectOptions[key];
            }
        }

        try {
            const connection = await new Promise((resolve, reject) => {
                const connection = this.lib.createConnection(connectionConfig);

                const errorHandler = (e) => {
                    // clean up connect event if there is error
                    connection.removeListener("connect", connectHandler); // eslint-disable-line

                    if (config.pool.handleDisconnects) {
                        debug(`connection error ${e.code}`);

                        if (e.code === "PROTOCOL_CONNECTION_LOST") {
                            this.pool.destroy(connection).catch((err) => {
                                if (/Resource not currently part of this pool/.test(err.message)) {
                                    return;
                                }
                                throw err;
                            });
                            return;
                        }
                    }

                    connection.removeListener("error", errorHandler);
                    reject(e);
                };

                const connectHandler = () => {
                    if (!config.pool.handleDisconnects) {
                        // clean up error event if connected
                        connection.removeListener("error", errorHandler);
                    }
                    resolve(connection);
                };

                connection.on("error", errorHandler);
                connection.once("connect", connectHandler);
            });
            await new Promise((resolve, reject) => {
                // set timezone for this connection
                // but named timezone are not directly supported in mysql, so get its offset first
                let tzOffset = this.sequelize.options.timezone;
                tzOffset = /\//.test(tzOffset) ? adone.datetime.tz(tzOffset).format("Z") : tzOffset;
                connection.query(`SET time_zone = '${tzOffset}'`, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
            return connection;
        } catch (err) {
            switch (err.code) {
                case "ECONNREFUSED":
                    throw new exception.ConnectionRefusedError(err);
                case "ER_ACCESS_DENIED_ERROR":
                    throw new exception.AccessDeniedError(err);
                case "ENOTFOUND":
                    throw new exception.HostNotFoundError(err);
                case "EHOSTUNREACH":
                    throw new exception.HostNotReachableError(err);
                case "EINVAL":
                    throw new exception.InvalidConnectionError(err);
                default:
                    throw new exception.ConnectionError(err);
            }
        }
    }

    async disconnect(connection) {
        // Dont disconnect connections with CLOSED state
        if (connection._closing) {
            debug("connection tried to disconnect but was already at CLOSED state");
            return;
        }

        return new Promise((resolve, reject) => {
            connection.end((err) => {
                if (err) {
                    reject(new exception.ConnectionError(err));
                } else {
                    debug("connection disconnected");
                    resolve();
                }
            });
        });
    }

    validate(connection) {
        return connection
            && is.null(connection._fatalError)
            && is.null(connection._protocolError)
            && !connection._closing
            && !connection.stream.destroyed;
    }
}
ConnectionManager.prototype.defaultVersion = "5.6.0";
