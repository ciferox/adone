const { AbstractChainedBatch } = adone.database.level;

export default class ChainedBatch extends AbstractChainedBatch {
    constructor(db) {
        super(db);
        this.binding = db.binding.batch();
    }

    _put(key, value) {
        this.binding.put(key, value);
    }

    _del(key) {
        this.binding.del(key);
    }

    _clear(key) {
        this.binding.clear(key);
    }

    _write(options, callback) {
        this.binding.write(options, callback);
    }
}
