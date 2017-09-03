const { x } = adone;

export default class Batch {
    constructor(db) {
        this._levelup = db;
        this.batch = db.db.chainedBatch();
        this.ops = [];
        this.length = 0;
    }

    put(key, value) {
        try {
            this.batch.put(key, value);
        } catch (err) {
            throw new x.DatabaseWrite(err);
        }
        this.ops.push({ type: "put", key, value });
        this.length++;

        return this;
    }

    del(key) {
        try {
            this.batch.del(key);
        } catch (err) {
            throw new x.DatabaseWrite(err);
        }
        this.ops.push({ type: "del", key });
        this.length++;

        return this;
    }

    clear() {
        try {
            this.batch.clear();
        } catch (err) {
            throw new x.DatabaseWrite(err);
        }

        this.ops = [];
        this.length = 0;
        return this;
    }

    async write() {
        const levelup = this._levelup;
        const ops = this.ops;

        try {
            await this.batch.write();
            levelup.emit("batch", ops);
        } catch (err) {
            err = new x.DatabaseWrite(err);
            levelup.emit("error", err);
            throw err;
        }
    }
}
