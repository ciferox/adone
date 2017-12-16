const MongooseCollection = require("../../collection");
const { Collection } = adone.private(adone.database.mongo);
const utils = require("../../utils");

const {
    is
} = adone;

/**
 * A [node-mongodb-native](https://github.com/mongodb/node-mongodb-native) collection implementation.
 *
 * All methods methods from the [node-mongodb-native](https://github.com/mongodb/node-mongodb-native) driver are copied and wrapped in queue management.
 *
 * @inherits Collection
 * @api private
 */

function NativeCollection() {
    this.collection = null;
    MongooseCollection.apply(this, arguments);
}

/*!
 * Inherit from abstract Collection.
 */

NativeCollection.prototype.__proto__ = MongooseCollection.prototype;

/**
 * Called when the connection opens.
 *
 * @api private
 */

NativeCollection.prototype.onOpen = function () {
    const _this = this;


    const callback = (err, collection) => {
        if (err) {
            // likely a strict mode error
            _this.conn.emit("error", err);
        } else {
            _this.collection = collection;
            MongooseCollection.prototype.onOpen.call(_this);
        }
    };

    // always get a new collection in case the user changed host:port
    // of parent db instance when re-opening the connection.
    if (!_this.opts.capped.size) {
        // non-capped
        callback(null, _this.conn.db.collection(_this.name));
        return _this.collection;
    }

    // capped
    const c = _this.conn.db.collection(_this.name);

    // discover if this collection exists and if it is capped
    const p = _this.conn.db.listCollections({ name: _this.name }).toArray();

    adone.promise.nodeify(p, (err, docs) => {
        if (err) {
            return callback(err);
        }
        const doc = docs[0];
        const exists = Boolean(doc);

        if (exists) {
            if (doc.options && doc.options.capped) {
                callback(null, c);
            } else {
                const msg = `A non-capped collection exists with the name: ${_this.name}\n\n`
                    + " To use this collection as a capped collection, please "
                    + "first convert it.\n"
                    + " http://www.mongodb.org/display/DOCS/Capped+Collections#CappedCollections-Convertingacollectiontocapped";
                err = new Error(msg);
                callback(err);
            }
        } else {
            // create
            const opts = utils.clone(_this.opts.capped);
            opts.capped = true;
            adone.promise.nodeify(_this.conn.db.createCollection(_this.name, opts), callback);
        }
    });
};

/**
 * Called when the connection closes
 *
 * @api private
 */

NativeCollection.prototype.onClose = function (force) {
    MongooseCollection.prototype.onClose.call(this, force);
};

/*!
 * Copy the collection methods and make them subject to queues
 */

const iter = (i) => {
    NativeCollection.prototype[i] = function (...args) {
        const collection = this.collection;

        // If user force closed, queueing will hang forever. See #5664
        if (this.opts.$wasForceClosed) {
            return this.conn.db.collection(this.name)[i].apply(collection, args);
        }
        if (this.buffer) {
            if (args.length > 0 && is.function(args[args.length - 1])) {
                this.addQueue(i, args);
                return;
            }
            return new Promise((resolve) => {
                this.addQueue(resolve, []);
            }).then(() => this[i](...args));
        }

        const _this = this;
        const debug = _this.conn.base.options.debug;

        if (debug) {
            if (is.function(debug)) {
                debug.apply(_this,
                    [_this.name, i].concat(utils.args(args, 0, args.length - 1)));
            } else {
                this.$print(_this.name, i, args);
            }
        }
        try {
            if (args.length > 0 && is.function(args[args.length - 1])) {
                const cb = args.pop();
                return adone.promise.nodeify(collection[i](...args), cb);
            }
            return collection[i].apply(collection, args);
        } catch (error) {
            // Collection operation may throw because of max bson size, catch it here
            // See gh-3906
            if (args.length > 0 &&
                is.function(args[args.length - 1])) {
                args[args.length - 1](error);
            } else {
                throw error;
            }
        }
    };
};

for (const i of adone.util.keys(Collection.prototype, { all: true })) {
    // Janky hack to work around gh-3005 until we can get rid of the mongoose
    // collection abstraction
    try {
        if (!is.function(Collection.prototype[i])) {
            continue;
        }
    } catch (e) {
        continue;
    }

    iter(i);
}

/**
 * Debug print helper
 *
 * @api public
 * @method $print
 */

NativeCollection.prototype.$print = function (name, i, args) {
    const moduleName = "\x1B[0;36mMongoose:\x1B[0m ";
    const functionCall = [name, i].join(".");
    const _args = [];
    for (let j = args.length - 1; j >= 0; --j) {
        if (this.$format(args[j]) || _args.length) {
            _args.unshift(this.$format(args[j]));
        }
    }
    const params = `(${_args.join(", ")})`;

    console.error(moduleName + functionCall + params);
};

/**
 * Formatter for debug print args
 *
 * @api public
 * @method $format
 */

NativeCollection.prototype.$format = function (arg) {
    const type = typeof arg;
    if (type === "function" || type === "undefined") {
        return "";
    }
    return format(arg);
};

/*!
 * Debug print helper
 */

function map(o) {
    return format(o, true);
}
function formatObjectId(x, key) {
    const representation = `ObjectId("${x[key].toHexString()}")`;
    x[key] = {
        inspect() {
            return representation;
        }
    };
}
function formatDate(x, key) {
    const representation = `new Date("${x[key].toUTCString()}")`;
    x[key] = {
        inspect() {
            return representation;
        }
    };
}
function format(obj, sub) {
    if (obj && is.function(obj.toBSON)) {
        obj = obj.toBSON();
    }
    let x = utils.clone(obj, { retainKeyOrder: 1, transform: false });
    let representation;

    if (!is.nil(x)) {
        if (x.constructor.name === "Binary") {
            x = `BinData(${x.subType}, "${x.toString("base64")}")`;
        } else if (x.constructor.name === "ObjectId") {
            representation = `ObjectId("${x.toHexString()}")`;
            x = {
                inspect() {
                    return representation;
                }
            };
        } else if (x.constructor.name === "Date") {
            representation = `new Date("${x.toUTCString()}")`;
            x = {
                inspect() {
                    return representation;
                }
            };
        } else if (x.constructor.name === "Object") {
            const keys = Object.keys(x);
            const numKeys = keys.length;
            let key;
            for (let i = 0; i < numKeys; ++i) {
                key = keys[i];
                if (x[key]) {
                    if (is.function(x[key].toBSON)) {
                        x[key] = x[key].toBSON();
                    }
                    if (x[key].constructor.name === "Binary") {
                        x[key] = `BinData(${x[key].subType}, "${
                            x[key].buffer.toString("base64")}")`;
                    } else if (x[key].constructor.name === "Object") {
                        x[key] = format(x[key], true);
                    } else if (x[key].constructor.name === "ObjectId") {
                        formatObjectId(x, key);
                    } else if (x[key].constructor.name === "Date") {
                        formatDate(x, key);
                    } else if (is.array(x[key])) {
                        x[key] = x[key].map(map);
                    }
                }
            }
        }
        if (sub) {
            return x;
        }
    }

    return require("util")
        .inspect(x, false, 10, true)
        .replace(/\n/g, "")
        .replace(/\s{2,}/g, " ");
}

/**
 * Retreives information about this collections indexes.
 *
 * @param {Function} callback
 * @method getIndexes
 * @api public
 */

NativeCollection.prototype.getIndexes = NativeCollection.prototype.indexInformation;

/*!
 * Module exports.
 */

module.exports = NativeCollection;
