import adone from "../../..";
import PoolConnection from "./pool_connection";
import Connection from "./connection";
var mysql = require("../index.js");
const { EventEmitter } = adone;

export default class Pool extends EventEmitter {
    constructor(options) {
        super();
        this.config = options.config;
        this.config.connectionConfig.pool = this;

        this._allConnections = new adone.algo.LinkedList;
        this._freeConnections = new adone.algo.LinkedList;
        this._connectionQueue = new adone.algo.LinkedList;
        this._closed = false;
    }

    getConnection(cb) {
        if (this._closed) {
            return process.nextTick(function () {
                return cb(new Error("Pool is closed."));
            });
        }

        var connection;

        if (this._freeConnections.length > 0) {
            connection = this._freeConnections.shift();

            return process.nextTick(function () {
                return cb(null, connection);
            });
        }

        if (this.config.connectionLimit === 0 || this._allConnections.length < this.config.connectionLimit) {
            connection = new PoolConnection(this, { config: this.config.connectionConfig });

            this._allConnections.push(connection);

            return connection.connect(function (err) {
                if (this._closed) {
                    return cb(new Error("Pool is closed."));
                }
                if (err) {
                    return cb(err);
                }

                this.emit("connection", connection);
                return cb(null, connection);
            }.bind(this));
        }

        if (!this.config.waitForConnections) {
            return process.nextTick(function () {
                return cb(new Error("No connections available."));
            });
        }

        if (this.config.queueLimit && this._connectionQueue.length >= this.config.queueLimit) {
            return cb(new Error("Queue limit reached."));
        }

        this.emit("enqueue");
        return this._connectionQueue.push(cb);
    }

    releaseConnection(connection) {
        var cb;

        if (!connection._pool) {
            // The connection has been removed from the pool and is no longer good.
            if (this._connectionQueue.length) {
                cb = this._connectionQueue.shift();

                process.nextTick(this.getConnection.bind(this, cb));
            }
        } else if (this._connectionQueue.length) {
            cb = this._connectionQueue.shift();

            process.nextTick(cb.bind(null, null, connection));
        } else {
            this._freeConnections.push(connection);
        }
    }

    end(cb) {
        this._closed = true;

        if (typeof cb != "function") {
            cb = function (err) {
                if (err) {
                    throw err;
                }
            };
        }

        var calledBack = false;
        var closedConnections = 0;

        var endCB = function (err) {
            if (calledBack) {
                return;
            }

            if (err || ++closedConnections >= this._allConnections.length) {
                calledBack = true;
                cb(err);
                return;
            }
        }.bind(this);

        if (this._allConnections.length === 0) {
            endCB();
            return;
        }

        for (let connection of this._allConnections) {
            connection._realEnd(endCB);
        }
    }

    query(sql, values, cb) {
        var cmdQuery = Connection.createQuery(sql, values, cb, this.config.connectionConfig);
        cmdQuery.namedPlaceholders = this.config.connectionConfig.namedPlaceholders;

        this.getConnection(function (err, conn) {
            if (err) {
                if (typeof cmdQuery.onResult === "function") {
                    cmdQuery.onResult(err);
                } else {
                    cmdQuery.emit("error", err);
                }
                return;
            }

            conn.query(cmdQuery).once("end", function () {
                conn.release();
            });
        });
        return cmdQuery;
    }

    execute(sql, values, cb) {
        var useNamedPlaceholders = this.config.connectionConfig.namedPlaceholders;

        this.getConnection(function (err, conn) {
            if (err) {
                return cb(err);
            }

            conn.config.namedPlaceholders = useNamedPlaceholders;
            return conn.execute(sql, values, function () {
                conn.release();
                cb.apply(this, arguments);
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
        return mysql.escape(value, this.config.connectionConfig.stringifyObjects, this.config.connectionConfig.timezone);
    }

    escapeId(value) {
        return mysql.escapeId(value, false);
    }
}

function spliceConnection(queue, connection) {
    var len = queue.length;
    if (len) {
        if (queue.back === connection) {
            queue.pop();
        } else {
            for ( ; --len; ) {
                if (queue.front === connection) {
                    queue.shift();
                    break;
                }
                queue.push(queue.shift());
            }
        }
    }
}
