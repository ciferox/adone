import promisify from "./promisify";

const {
    error: { DatabaseWriteException },
    database: { level: { getCallback, getOptions } }
} = adone;

export default class Batch {
    constructor(db) {
        this._levelup = db;
        this.batch = db.db.batch();
        this.ops = [];
        this.length = 0;
    }

    put(key, value) {
        try {
            this.batch.put(key, value);
        } catch (e) {
            throw new DatabaseWriteException(e);
        }

        this.ops.push({ type: "put", key, value });
        this.length++;

        return this;
    }

    del(key) {
        try {
            this.batch.del(key);
        } catch (err) {
            throw new DatabaseWriteException(err);
        }

        this.ops.push({ type: "del", key });
        this.length++;

        return this;
    }

    clear() {
        try {
            this.batch.clear();
        } catch (err) {
            throw new DatabaseWriteException(err);
        }

        this.ops = [];
        this.length = 0;

        return this;
    }

    write(options, callback) {
        const levelup = this._levelup;
        const ops = this.ops;
        let promise;

        callback = getCallback(options, callback);

        if (!callback) {
            callback = promisify();
            promise = callback.promise;
        }

        options = getOptions(options);

        try {
            this.batch.write(options, (err) => {
                if (err) {
                    return callback(new DatabaseWriteException(err));
                }
                levelup.emit("batch", ops);
                callback();
            });
        } catch (err) {
            throw new DatabaseWriteException(err);
        }

        return promise;
    }
}
