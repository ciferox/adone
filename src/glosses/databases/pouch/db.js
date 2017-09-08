const {
    is,
    util,
    event: { EventEmitter },
    database: { pouch }
} = adone;

const {
    Adapter,
    TaskQueue,
    util: pouchUtil
} = adone.private(pouch);

// OK, so here's the deal. Consider this code:
//     var db1 = new PouchDB('foo');
//     var db2 = new PouchDB('foo');
//     db1.destroy();
// ^ these two both need to emit 'destroyed' events,
// as well as the PouchDB constructor itself.
// So we have one db object (whichever one got destroy() called on it)
// responsible for emitting the initial event, which then gets emitted
// by the constructor, which then broadcasts it to any other dbs
// that may have been created with the same name.
const prepareForDestruction = (self) => {
    const onDestroyed = (fromConstructor) => {
        self.removeListener("closed", onClosed);
        if (!fromConstructor) {
            self.constructor.emit("destroyed", self.name);
        }
    };

    const onClosed = () => {
        self.removeListener("destroyed", onDestroyed);
        self.constructor.emit("unref", self);
    };

    self.once("destroyed", onDestroyed);
    self.once("closed", onClosed);
    self.constructor.emit("ref", self);
};

export default class DB extends Adapter {
    constructor(name, opts = {}) {
        super();

        if (name && is.plainObject(name)) {
            opts = name;
            name = opts.name;
            delete opts.name;
        }

        const Base = this.constructor;

        this.__opts = opts = util.clone(opts);

        this.auto_compaction = opts.auto_compaction;

        this.prefix = Base.prefix;

        if (!is.string(name)) {
            throw new Error("Missing/invalid DB name");
        }

        const prefixedName = (opts.prefix || "") + name;
        const backend = pouchUtil.parseAdapter(this.constructor, prefixedName, opts);

        opts.name = backend.name;
        opts.adapter = opts.adapter || backend.adapter;

        this.name = name;
        this._adapter = opts.adapter;

        Base.emit("debug", ["adapter", "Picked adapter: ", opts.adapter]);

        if (!Base.adapters[opts.adapter] || !Base.adapters[opts.adapter].valid()) {
            throw new Error(`Invalid Adapter: ${opts.adapter}`);
        }

        this.taskqueue = new TaskQueue();

        this.adapter = opts.adapter;

        Base.adapters[opts.adapter].call(this, opts, (err) => {
            if (err) {
                return this.taskqueue.fail(err);
            }
            prepareForDestruction(this);

            this.emit("created", this);
            Base.emit("created", this.name);
            this.taskqueue.ready(this);
        });
    }
}

DB.adapters = {};
DB.preferredAdapters = [];

DB.prefix = "_pouch_";

const eventEmitter = new EventEmitter();

const setUpEventEmitter = (Pouch) => {
    for (const [k, v] of util.entries(EventEmitter.prototype, { all: true })) {
        if (is.function(v)) {
            Pouch[k] = v.bind(eventEmitter);
        }
    }

    // these are created in constructor.js, and allow us to notify each DB with
    // the same name that it was destroyed, via the constructor object
    const destructListeners = Pouch._destructionListeners = new Map();

    Pouch.on("ref", function onConstructorRef(db) {
        if (!destructListeners.has(db.name)) {
            destructListeners.set(db.name, []);
        }
        destructListeners.get(db.name).push(db);
    });

    Pouch.on("unref", function onConstructorUnref(db) {
        if (!destructListeners.has(db.name)) {
            return;
        }
        const dbList = destructListeners.get(db.name);
        const pos = dbList.indexOf(db);
        if (pos < 0) {
            /* istanbul ignore next */
            return;
        }
        dbList.splice(pos, 1);
        if (dbList.length > 1) {
            /* istanbul ignore next */
            destructListeners.set(db.name, dbList);
        } else {
            destructListeners.delete(db.name);
        }
    });

    Pouch.on("destroyed", function onConstructorDestroyed(name) {
        if (!destructListeners.has(name)) {
            return;
        }
        const dbList = destructListeners.get(name);
        destructListeners.delete(name);
        dbList.forEach((db) => {
            db.emit("destroyed", true);
        });
    });
};

setUpEventEmitter(DB);

DB.adapter = function (id, obj, addToPreferredAdapters) {
    /* istanbul ignore else */
    if (obj.valid()) {
        this.adapters[id] = obj;
        if (addToPreferredAdapters) {
            this.preferredAdapters.push(id);
        }
    }
    return this;
};

DB.plugin = function (obj) {
    if (is.function(obj)) { // function style for plugins
        obj(this);
    } else if (!is.object(obj) || is.emptyObject(obj)) {
        throw new Error(`Invalid plugin: got "${obj}", expected an object or a function`);
    } else {
        for (const [k, v] of util.entries(obj, { all: true })) { // object style for plugins
            this.prototype[k] = v;
        }
    }
    if (this.__defaults) {
        this.__defaults = { ...this.__defaults };
    }
    return this;
};

DB.defaults = function (defaultOpts) {
    class Alt extends this {
        constructor(name, opts = {}) {
            if (name && is.object(name)) {
                opts = name;
                name = opts.name;
                delete opts.name;
            }

            opts = { ...Alt.__defaults, ...opts };
            super(name, opts);
        }
    }

    Alt.preferredAdapters = this.preferredAdapters.slice();

    for (const key of util.keys(this, { all: true })) {
        if (!(key in Alt)) {
            Alt[key] = this[key];
        }
    }

    // make default options transitive
    // https://github.com/pouchdb/pouchdb/issues/5922
    Alt.__defaults = { ...this.__defaults, ...defaultOpts };

    return Alt;
};
