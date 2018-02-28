const {
    AbstractChainedBatch
} = adone.database.level;

export default class ChainedBatch extends AbstractChainedBatch {
    constructor(db) {
        super(db);
        this.native = db.native.batch();
    }

    _put(key, value) {
        this.native.put(key, value);
    }

    _del(key) {
        this.native.del(key);
    }

    _clear(key) {
        this.native.clear(key);
    }

    _write(options, callback) {
        this.native.write(options, callback);
    }
}
