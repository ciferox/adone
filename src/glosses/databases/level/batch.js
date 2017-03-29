const { x: { WriteError }, util: { getOptions, dispatchError } } = adone.database.level;

export default class Batch {
    constructor(db, codec) {
        this._levelup = db;
        this._codec = codec || db._codec;
        this.batch = db.db.chainedBatch();
        this.ops = [];
        this.length = 0;
    }

    put(key_, value_, options = {}) {
        const key = this._codec.encodeKey(key_, options);
        const value = this._codec.encodeValue(value_, options);

        try {
            this.batch.put(key, value);
        } catch (err) {
            throw new WriteError(err);
        }
        this.ops.push({ type: "put", key, value });
        this.length++;

        return this;
    }

    del(key_, options) {
        options = getOptions(options);

        const key = this._codec.encodeKey(key_, options);

        try {
            this.batch.del(key);
        } catch (err) {
            throw new WriteError(err);
        }
        this.ops.push({ type: "del", key });
        this.length++;

        return this;
    }

    clear() {
        try {
            this.batch.clear();
        } catch (err) {
            throw new WriteError(err);
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
            err = new WriteError(err);
            levelup.emit("error", err);
            throw err;
        }
    }
}
