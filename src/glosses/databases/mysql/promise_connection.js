const makeDoneCb = (resolve, reject) => (err, rows, columns) => {
    if (err) {
        reject(err);
    } else {
        resolve([rows, columns]);
    }
};

export default class PromiseConnection {
    constructor(connection, connectParams) {
        this.connection = connection;
        this.params = connectParams;
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

    on(event, listener) {
        return this.connection.on(event, listener);
    }

    once(event, listener) {
        return this.connection.once(event, listener);
    }

    unprepare(sql) {
        return this.connection.unprepare(sql);
    }

    prepare(sql) {
        return new Promise((resolve, reject) => {
            this.connection.prepare(sql, (err, stmt) => {
                err ? reject(err) : resolve(stmt);
            });
        });
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
