const {
    is,
    database: { level: { AbstractBackend, AbstractIterator } }
} = adone;

class DeferredIterator extends AbstractIterator {
    constructor(options) {
        super(options);

        this._options = options;
        this._iterator = null;
        this._operations = [];
    }

    setDb(db) {
        const it = this._iterator = db.iterator(this._options);
        this._operations.forEach((op) => {
            it[op.method].apply(it, op.args);
        });
    }

    _operation(method, args) {
        if (this._iterator) {
            return this._iterator[method].apply(this._iterator, args);
        }
        this._operations.push({ method, args });
    }
}

"next end".split(" ").forEach((m) => {
    DeferredIterator.prototype[`_${m}`] = function () {
        this._operation(m, arguments);
    };
});



const deferrables = "put get del batch".split(" ");

const open = function (self) {
    deferrables.concat("iterator").forEach((m) => {
        self[`_${m}`] = function () {
            return this._db[m].apply(this._db, arguments);
        };
    });
    if (self._db.approximateSize) {
        self.approximateSize = function () {
            return this._db.approximateSize.apply(this._db, arguments);
        };
    }
};

const closed = function (self) {
    deferrables.forEach((m) => {
        self[`_${m}`] = function () {
            this._operations.push({ method: m, args: arguments });
        };
    });
    if (is.function(self._db.approximateSize)) {
        self.approximateSize = function () {
            this._operations.push({
                method: "approximateSize",
                args: arguments
            });
        };
    }
    self._iterator = function (options) {
        const it = new DeferredIterator(options);
        this._iterators.push(it);
        return it;
    };
};

export default class DeferredBackend extends AbstractBackend {
    constructor(db) {
        super("");
        this._db = db;
        this._operations = [];
        this._iterators = [];
        closed(this);
    }

    _open(options, callback) {
        this._db.open(options, (err) => {
            if (err) {
                return callback(err);
            }

            this._operations.forEach((op) => {
                this._db[op.method].apply(this._db, op.args);
            });
            this._operations = [];
            this._iterators.forEach((it) => {
                it.setDb(this._db);
            });
            this._iterators = [];
            open(this);
            callback();
        });
    }

    _close(callback) {
        this._db.close((err) => {
            if (err) {
                return callback(err);
            }
            closed(this);
            callback();
        });
    }

    _serializeKey(key) {
        return key;
    }

    _serializeValue(value) {
        return value;
    }
}


DeferredBackend.Iterator = DeferredIterator;
