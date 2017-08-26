const {
    is,
    x,
    event: { EventEmitter },
    database: { mysql },
    collection
} = adone;

const spliceConnection = (queue, connection) => {
    if (queue.empty) {
        return;
    }

    let { head: node } = queue;
    do {
        if (node.value === connection) {
            queue.removeNode(node);
            break;
        }
        node = queue.nextNode(node);
    } while (node);
};

export default class Pool extends EventEmitter {
    constructor(options) {
        super();
        this.config = options.config;
        this.config.connectionConfig.pool = this;

        this._allConnections = new collection.LinkedList();
        this._freeConnections = new collection.LinkedList();
        this._connectionQueue = new collection.LinkedList();
        this._closed = false;
    }

    getConnection(cb) {
        if (this._closed) {
            return process.nextTick(() => {
                return cb(new x.IllegalState("Pool is closed."));
            });
        }

        let connection;

        if (this._freeConnections.length > 0) {
            connection = this._freeConnections.shift();

            return process.nextTick(() => {
                return cb(null, connection);
            });
        }

        if (
            this.config.connectionLimit === 0 ||
            this._allConnections.length < this.config.connectionLimit
        ) {
            connection = new mysql.__.PoolConnection(this, { config: this.config.connectionConfig });

            this._allConnections.push(connection);

            return connection.connect((err) => {
                if (this._closed) {
                    return cb(new x.IllegalState("Pool is closed."));
                }
                if (err) {
                    return cb(err);
                }

                this.emit("connection", connection);
                return cb(null, connection);
            });
        }

        if (!this.config.waitForConnections) {
            return process.nextTick(() => {
                return cb(new x.Exception("No connections available."));
            });
        }

        if (this.config.queueLimit && this._connectionQueue.length >= this.config.queueLimit) {
            return cb(new x.Exception("Queue limit reached."));
        }

        this.emit("enqueue");
        return this._connectionQueue.push(cb);
    }

    releaseConnection(connection) {
        if (!connection._pool) {
            // The connection has been removed from the pool and is no longer good.
            if (this._connectionQueue.length) {
                const cb = this._connectionQueue.shift();

                process.nextTick(this.getConnection.bind(this, cb));
            }
        } else if (this._connectionQueue.length) {
            const cb = this._connectionQueue.shift();

            process.nextTick(cb.bind(null, null, connection));
        } else {
            this._freeConnections.push(connection);
        }
    }

    end(cb) {
        this._closed = true;

        if (!is.function(cb)) {
            cb = (err) => {
                if (err) {
                    throw err;
                }
            };
        }

        let fired = false;
        let closedConnections = 0;

        const endCB = (err) => {
            if (fired) {
                return;
            }

            if (err || ++closedConnections >= this._allConnections.length) {
                fired = true;
                cb(err);

            }
        };

        if (this._allConnections.length === 0) {
            endCB();
            return;
        }

        for (const connection of this._allConnections) {
            connection.end(endCB);
        }
    }

    query(sql, values, cb) {
        const cmdQuery = mysql.Connection.createQuery(
            sql,
            values,
            cb,
            this.config.connectionConfig
        );
        cmdQuery.namedPlaceholders = this.config.connectionConfig.namedPlaceholders;

        this.getConnection((err, conn) => {
            if (err) {
                if (cmdQuery.onResult) {
                    cmdQuery.onResult(err);
                } else {
                    cmdQuery.emit("error", err);
                }
                return;
            }

            conn.query(cmdQuery).once("end", () => {
                conn.release();
            });
        });
        return cmdQuery;
    }

    execute(sql, values, cb) {
        // const useNamedPlaceholders = this.config.connectionConfig.namedPlaceholders;

        // TODO construct execute command first here and pass it to connection.execute
        // so that polymorphic arguments logic is there in one place
        if (is.function(values)) {
            cb = values;
            values = [];
        }

        this.getConnection((err, conn) => {
            if (err) {
                return cb(err);
            }

            const executeCmd = conn.execute(sql, values, cb);
            executeCmd.once("end", () => {
                conn.release();
            });
        });
    }

    _removeConnection(connection) {

        // Remove connection from all connections
        spliceConnection(this._allConnections, connection);

        // Remove connection from free connections
        spliceConnection(this._freeConnections, connection);

        this.releaseConnection(connection);
    }

    escape(value) {
        return mysql.__.escape(
            value,
            this.config.connectionConfig.stringifyObjects,
            this.config.connectionConfig.timezone
        );
    }

    escapeId(value) {
        return mysql.__.escapeId(value, false);
    }
}
