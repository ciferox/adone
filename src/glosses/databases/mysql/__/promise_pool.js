const {
    event: { EventEmitter },
    database: { mysql: { __ } }
} = adone;

const makeDoneCb = (resolve, reject) => (err, rows, columns) => {
    if (err) {
        reject(err);
    } else {
        resolve([rows, columns]);
    }
};

const inheritEvents = (source, target, events) => {
    for (const eventName of events) {
        source.on(eventName, (...args) => {
            args.unshift(eventName);
            target.emit.apply(target, args);
        });
    }
};

export default class PromisePool extends EventEmitter {
    constructor(pool) {
        super();
        this.pool = pool;
        inheritEvents(pool, this, ["acquire", "connection", "enqueue", "release"]);
    }

    getConnection() {
        return new Promise((resolve, reject) => {
            this.pool.getConnection((err, connection) => {
                err ? reject(err) : new __.PromiseConnection(connection);
            });
        });
    }

    query(sql, args) {
        return new Promise((resolve, reject) => {
            const done = makeDoneCb(resolve, reject);
            if (args) {
                this.pool.query(sql, args, done);
            } else {
                this.pool.query(sql, done);
            }
        });
    }

    execute(sql, values) {
        return new Promise((resolve, reject) => {
            this.pool.execute(sql, values, makeDoneCb(resolve, reject));
        });
    }

    end() {
        return new Promise((resolve, reject) => {
            this.pool.end((err) => {
                err ? reject(err) : resolve();
            });
        });
    }

    get config() {
        return this.pool.config;
    }
}
