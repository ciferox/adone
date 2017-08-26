const {
    event: { EventEmitter }
} = adone;

const makeDoneCb = (resolve, reject) => (err, rows, columns) => {
    if (err) {
        reject(err);
    } else {
        resolve([rows, columns]);
    }
};

const inheritEvents = (source, target, events) => {
    const listeners = {};
    target.on("newListener", (eventName) => {
        if (events.includes(eventName) && !target.listenerCount(eventName)) {
            const listener = function (...args) {
                args.unshift(eventName);
                target.emit(...args);
            };
            listeners[eventName] = listener;
            source.on(eventName, listener);
        }
    }).on("removeListener", (eventName) => {
        if (events.includes(eventName) && !target.listenerCount(eventName)) {
            source.removeListener(eventName, listeners[eventName]);
            delete listeners[eventName];
        }
    });
};

class PromisePreparedStatementInfo {
    constructor(statement) {
        this.statement = statement;
    }

    get query() {
        return this.statement.query;
    }

    get id() {
        return this.statement.id;
    }

    get columns() {
        return this.statement.columns;
    }

    get parameters() {
        return this.statement.parameters;
    }

    execute(parameters) {
        return new Promise((resolve, reject) => {
            const done = makeDoneCb(resolve, reject);
            if (parameters) {
                this.statement.execute(parameters, done);
            } else {
                this.statement.execute(done);
            }
        });
    }

    close() {
        return new Promise((resolve) => {
            this.statement.close();
            resolve();
        });
    }
}

// note: the callback of "changeUser" is not called on success
// hence there is no possibility to call "resolve"

// patching PromiseConnection
// create facade functions for prototype functions on "Connection" that are not yet
// implemented with PromiseConnection

export default class PromiseConnection extends EventEmitter {
    constructor(connection, connectParams) {
        super();
        this.connection = connection;
        this.params = connectParams;

        inheritEvents(connection, this, ["error", "drain", "connect", "end", "enqueue"]);
    }

    release() {
        return this.connection.release();
    }

    query(query, params) {
        const c = this.connection;
        return new Promise((resolve, reject) => {
            const done = makeDoneCb(resolve, reject);
            if (params) {
                c.query(query, params, done);
            } else {
                c.query(query, done);
            }
        });
    }

    execute(query, params) {
        const c = this.connection;
        return new Promise((resolve, reject) => {
            const done = makeDoneCb(resolve, reject);
            if (params) {
                c.execute(query, params, done);
            } else {
                c.execute(query, done);
            }
        });
    }

    end() {
        const c = this.connection;
        return new Promise((resolve) => {
            c.end(() => {
                resolve();
            });
        });
    }

    changeUser(options) {
        const c = this.connection;
        return new Promise((resolve, reject) => {
            c.changeUser(options, (err) => {
                err ? reject(err) : resolve();
            });
        });
    }

    unprepare(sql) {
        return this.connection.unprepare(sql);
    }

    prepare(options) {
        return new Promise((resolve, reject) => {
            this.connection.prepare(options, (err, statement) => {
                if (err) {
                    return reject(err);
                }
                resolve(new PromisePreparedStatementInfo(statement));
            });
        });
    }

    close() {
        return this.connection.close();
    }

    createBinlogStream(opts) {
        return this.connection.createBinlogStream(opts);
    }

    destroy() {
        return this.connection.destroy();
    }

    pause() {
        return this.connection.pause();
    }

    resume() {
        return this.connection.resume();
    }

    pipe() {
        return this.connection.pipe();
    }

    escape(value) {
        return this.connection.escape(value);
    }

    format(sql, values) {
        return this.connection.format(sql, values);
    }

    beginTransaction() {
        return new Promise((resolve, reject) => {
            this.connection.beginTransaction((err, rows, fields) => {
                err ? reject(err) : resolve([rows, fields]);
            });
        });
    }

    commit() {
        return new Promise((resolve, reject) => {
            this.connection.commit((err, rows, fields) => {
                err ? reject(err) : resolve([rows, fields]);
            });
        });
    }

    rollback() {
        return new Promise((resolve, reject) => {
            this.connection.rollback((err, rows, fields) => {
                err ? reject(err) : resolve([rows, fields]);
            });
        });
    }

    ping() {
        return new Promise((resolve) => {
            this.connection.ping(resolve);
        });
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.connection.connect((err, param) => {
                err ? reject(err) : resolve(param);
            });
        });
    }

    get _statements() {
        return this.connection._statements;
    }

    get config() {
        return this.connection.config;
    }

    get stream() {
        return this.connection.stream;
    }
}
