const readPref = require("./drivers").ReadPreference;
const EventEmitter = require("events").EventEmitter;
import VirtualType from "./virtualtype";
import SchemaType from "./schematype";
const utils = require("./utils");
let MongooseTypes;
const Kareem = require("kareem");
const each = require("async/each");
const mpath = require("mpath");

const {
    is
} = adone;

const IS_KAREEM_HOOK = {
    aggregate: true,
    count: true,
    find: true,
    findOne: true,
    findOneAndUpdate: true,
    findOneAndRemove: true,
    insertMany: true,
    replaceOne: true,
    update: true,
    updateMany: true,
    updateOne: true
};

/*!
 * Create virtual properties with alias field
 */
const aliasFields = function (schema) {
    for (const path in schema.paths) {
        if (!schema.paths[path].options) {
            continue;
        }

        const prop = schema.paths[path].path;
        const alias = schema.paths[path].options.alias;

        if (alias) {
            if (is.string(alias) && alias.length > 0) {
                if (schema.aliases[alias]) {
                    throw new Error(`Duplicate alias, alias ${alias} is used more than once`);
                } else {
                    schema.aliases[alias] = prop;
                }

                schema
                    .virtual(alias)
                    .get((function (p) {
                        return function () {
                            return this.get(p);
                        };
                    })(prop))
                    .set((function (p) {
                        return function (v) {
                            return this.set(p, v);
                        };
                    })(prop));
            } else {
                throw new Error(`Invalid value for alias option on ${prop}, got ${alias}`);
            }
        }
    }
};

const handleTimestampOption = function (arg, prop) {
    if (is.boolean(arg)) {
        return prop;
    }
    if (is.boolean(arg[prop])) {
        return arg[prop] ? prop : null;
    }
    if (!(prop in arg)) {
        return prop;
    }
    return arg[prop];
};

const applyTimestampsToChildren = function (query) {
    const now = new Date();
    const update = query.getUpdate();
    const keys = Object.keys(update);
    let key;
    const schema = query.model.schema;
    let len;
    let createdAt;
    let updatedAt;
    let timestamps;
    let path;

    const hasDollarKey = keys.length && keys[0].charAt(0) === "$";

    if (hasDollarKey) {
        if (update.$push) {
            for (key in update.$push) {
                const $path = schema.path(key);
                if (update.$push[key] &&
                    $path &&
                    $path.$isMongooseDocumentArray &&
                    $path.schema.options.timestamps) {
                    timestamps = $path.schema.options.timestamps;
                    createdAt = handleTimestampOption(timestamps, "createdAt");
                    updatedAt = handleTimestampOption(timestamps, "updatedAt");
                    if (update.$push[key].$each) {
                        update.$push[key].$each.forEach((subdoc) => {
                            if (!is.nil(updatedAt)) {
                                subdoc[updatedAt] = now;
                            }
                            if (!is.nil(createdAt)) {
                                subdoc[createdAt] = now;
                            }
                        });
                    } else {
                        if (!is.nil(updatedAt)) {
                            update.$push[key][updatedAt] = now;
                        }
                        if (!is.nil(createdAt)) {
                            update.$push[key][createdAt] = now;
                        }
                    }
                }
            }
        }
        if (update.$set) {
            for (key in update.$set) {
                path = schema.path(key);
                if (!path) {
                    continue;
                }
                if (is.array(update.$set[key]) && path.$isMongooseDocumentArray) {
                    len = update.$set[key].length;
                    timestamps = schema.path(key).schema.options.timestamps;
                    if (timestamps) {
                        createdAt = handleTimestampOption(timestamps, "createdAt");
                        updatedAt = handleTimestampOption(timestamps, "updatedAt");
                        for (let i = 0; i < len; ++i) {
                            if (!is.nil(updatedAt)) {
                                update.$set[key][i][updatedAt] = now;
                            }
                            if (!is.nil(createdAt)) {
                                update.$set[key][i][createdAt] = now;
                            }
                        }
                    }
                } else if (update.$set[key] && path.$isSingleNested) {
                    timestamps = schema.path(key).schema.options.timestamps;
                    if (timestamps) {
                        createdAt = handleTimestampOption(timestamps, "createdAt");
                        updatedAt = handleTimestampOption(timestamps, "updatedAt");
                        if (!is.nil(updatedAt)) {
                            update.$set[key][updatedAt] = now;
                        }
                        if (!is.nil(createdAt)) {
                            update.$set[key][createdAt] = now;
                        }
                    }
                }
            }
        }
    }
};

const getPositionalPathType = function (self, path) {
    const subpaths = path.split(/\.(\d+)\.|\.(\d+)$/).filter(Boolean);
    if (subpaths.length < 2) {
        return self.paths[subpaths[0]];
    }

    let val = self.path(subpaths[0]);
    let isNested = false;
    if (!val) {
        return val;
    }

    const last = subpaths.length - 1;
    let subpath;
    let i = 1;

    for (; i < subpaths.length; ++i) {
        isNested = false;
        subpath = subpaths[i];

        if (i === last && val && !/\D/.test(subpath)) {
            if (val.$isMongooseDocumentArray) {
                const oldVal = val;
                val = new SchemaType(subpath);
                val.cast = function (value, doc, init) {
                    return oldVal.cast(value, doc, init)[0];
                };
                val.caster = oldVal.caster;
                val.schema = oldVal.schema;
            } else if (val instanceof MongooseTypes.Array) {
                // StringSchema, NumberSchema, etc
                val = val.caster;
            } else {
                val = undefined;
            }
            break;
        }

        // ignore if its just a position segment: path.0.subpath
        if (!/\D/.test(subpath)) {
            continue;
        }

        if (!(val && val.schema)) {
            val = undefined;
            break;
        }

        const type = val.schema.pathType(subpath);
        isNested = (type === "nested");
        val = val.schema.path(subpath);
    }

    self.subpaths[path] = val;
    if (val) {
        return "real";
    }
    if (isNested) {
        return "nested";
    }
    return "adhocOrUndefined";
};

const getPositionalPath = function (self, path) {
    getPositionalPathType(self, path);
    return self.subpaths[path];
};

const _getVirtual = function (schema, name) {
    if (schema.virtuals[name]) {
        return schema.virtuals[name];
    }
    const parts = name.split(".");
    let cur = "";
    let nestedSchemaPath = "";
    for (let i = 0; i < parts.length; ++i) {
        cur += (cur.length > 0 ? "." : "") + parts[i];
        if (schema.virtuals[cur]) {
            if (i === parts.length - 1) {
                schema.virtuals[cur].$nestedSchemaPath = nestedSchemaPath;
                return schema.virtuals[cur];
            }
            continue;
        } else if (schema.paths[cur] && schema.paths[cur].schema) {
            schema = schema.paths[cur].schema;
            nestedSchemaPath += (nestedSchemaPath.length > 0 ? "." : "") + cur;
            cur = "";
        } else {
            return null;
        }
    }
};

/**
 * Schema constructor.
 *
 * ####Example:
 *
 *     var child = new Schema({ name: String });
 *     var schema = new Schema({ name: String, age: Number, children: [child] });
 *     var Tree = mongoose.model('Tree', schema);
 *
 *     // setting schema options
 *     new Schema({ name: String }, { _id: false, autoIndex: false })
 *
 * ####Options:
 *
 * - [autoIndex](/docs/guide.html#autoIndex): bool - defaults to null (which means use the connection's autoIndex option)
 * - [bufferCommands](/docs/guide.html#bufferCommands): bool - defaults to true
 * - [capped](/docs/guide.html#capped): bool - defaults to false
 * - [collection](/docs/guide.html#collection): string - no default
 * - [emitIndexErrors](/docs/guide.html#emitIndexErrors): bool - defaults to false.
 * - [id](/docs/guide.html#id): bool - defaults to true
 * - [_id](/docs/guide.html#_id): bool - defaults to true
 * - `minimize`: bool - controls [document#toObject](#document_Document-toObject) behavior when called manually - defaults to true
 * - [read](/docs/guide.html#read): string
 * - [safe](/docs/guide.html#safe): bool - defaults to true.
 * - [shardKey](/docs/guide.html#shardKey): bool - defaults to `null`
 * - [strict](/docs/guide.html#strict): bool - defaults to true
 * - [toJSON](/docs/guide.html#toJSON) - object - no default
 * - [toObject](/docs/guide.html#toObject) - object - no default
 * - [typeKey](/docs/guide.html#typeKey) - string - defaults to 'type'
 * - [useNestedStrict](/docs/guide.html#useNestedStrict) - boolean - defaults to false
 * - [validateBeforeSave](/docs/guide.html#validateBeforeSave) - bool - defaults to `true`
 * - [versionKey](/docs/guide.html#versionKey): string - defaults to "__v"
 * - [collation](/docs/guide.html#collation): object - defaults to null (which means use no collation)
 *
 * ####Note:
 *
 * _When nesting schemas, (`children` in the example above), always declare the child schema first before passing it into its parent._
 *
 * @param {Object} definition
 * @param {Object} [options]
 * @inherits NodeJS EventEmitter http://nodejs.org/api/events.html#events_class_events_eventemitter
 * @event `init`: Emitted after the schema is compiled into a `Model`.
 * @api public
 */
export default class Schema extends EventEmitter {
    constructor(obj, options) {
        super();

        this.obj = obj;
        this.paths = {};
        this.aliases = {};
        this.subpaths = {};
        this.virtuals = {};
        this.singleNestedPaths = {};
        this.nested = {};
        this.inherits = {};
        this.callQueue = [];
        this._indexes = [];
        this.methods = {};
        this.statics = {};
        this.tree = {};
        this.query = {};
        this.childSchemas = [];
        this.plugins = [];

        this.s = {
            hooks: new Kareem(),
            kareemHooks: IS_KAREEM_HOOK
        };

        this.options = this.defaultOptions(options);

        // build paths
        if (obj) {
            this.add(obj);
        }

        // check if _id's value is a subdocument (gh-2276)
        const _idSubDoc = obj && obj._id && utils.isObject(obj._id);

        // ensure the documents get an auto _id unless disabled
        const autoId = !this.paths._id &&
            (!this.options.noId && this.options._id) && !_idSubDoc;

        if (autoId) {
            const _obj = { _id: { auto: true } };
            _obj._id[this.options.typeKey] = Schema.ObjectId;
            this.add(_obj);
        }

        for (let i = 0; i < this._defaultMiddleware.length; ++i) {
            const m = this._defaultMiddleware[i];
            this[m.kind](m.hook, Boolean(m.isAsync), m.fn);
        }

        if (this.options.timestamps) {
            this.setupTimestamp(this.options.timestamps);
        }

        // Assign virtual properties based on alias option
        aliasFields(this);
    }

    /**
     * Returns a deep copy of the schema
     *
     * @return {Schema} the cloned schema
     * @api public
     */
    clone() {
        const s = new Schema(this.paths, this.options);
        // Clone the call queue
        const cloneOpts = { retainKeyOrder: true };
        s.callQueue = this.callQueue.map((f) => {
            return f;
        });
        s.methods = utils.clone(this.methods, cloneOpts);
        s.statics = utils.clone(this.statics, cloneOpts);
        s.query = utils.clone(this.query, cloneOpts);
        s.plugins = Array.prototype.slice.call(this.plugins);
        s._indexes = utils.clone(this._indexes, cloneOpts);
        s.s.hooks = this.s.hooks.clone();
        return s;
    }

    /**
     * Returns default options for this schema, merged with `options`.
     *
     * @param {Object} options
     * @return {Object}
     * @api private
     */
    defaultOptions(options) {
        if (options && options.safe === false) {
            options.safe = { w: 0 };
        }

        if (options && options.safe && options.safe.w === 0) {
            // if you turn off safe writes, then versioning goes off as well
            options.versionKey = false;
        }

        this._userProvidedOptions = utils.clone(options, {
            retainKeyOrder: true
        });

        options = utils.options({
            strict: true,
            bufferCommands: true,
            capped: false, // { size, max, autoIndexId }
            versionKey: "__v",
            discriminatorKey: "__t",
            minimize: true,
            autoIndex: null,
            shardKey: null,
            read: null,
            validateBeforeSave: true,
            // the following are only applied at construction time
            noId: false, // deprecated, use { _id: false }
            _id: true,
            noVirtualId: false, // deprecated, use { id: false }
            id: true,
            typeKey: "type",
            retainKeyOrder: false
        }, options);

        if (options.read) {
            options.read = readPref(options.read);
        }

        return options;
    }

    /**
     * Adds key path / schema type pairs to this schema.
     *
     * ####Example:
     *
     *     var ToySchema = new Schema;
     *     ToySchema.add({ name: 'string', color: 'string', price: 'number' });
     *
     * @param {Object} obj
     * @param {String} prefix
     * @api public
     */
    add(obj, prefix) {
        prefix = prefix || "";
        const keys = Object.keys(obj);

        for (let i = 0; i < keys.length; ++i) {
            const key = keys[i];

            if (is.nil(obj[key])) {
                throw new TypeError(`Invalid value for schema path \`${prefix}${key}\``);
            }

            if (is.array(obj[key]) && obj[key].length === 1 && is.nil(obj[key][0])) {
                throw new TypeError(`Invalid value for schema Array path \`${prefix}${key}\``);
            }

            if (utils.isObject(obj[key]) &&
                (!obj[key].constructor || utils.getFunctionName(obj[key].constructor) === "Object") &&
                (!obj[key][this.options.typeKey] || (this.options.typeKey === "type" && obj[key].type.type))) {
                if (Object.keys(obj[key]).length) {
                    // nested object { last: { name: String }}
                    this.nested[prefix + key] = true;
                    this.add(obj[key], `${prefix + key}.`);
                } else {
                    if (prefix) {
                        this.nested[prefix.substr(0, prefix.length - 1)] = true;
                    }
                    this.path(prefix + key, obj[key]); // mixed type
                }
            } else {
                if (prefix) {
                    this.nested[prefix.substr(0, prefix.length - 1)] = true;
                }
                this.path(prefix + key, obj[key]);
            }
        }
    }

    /**
     * Gets/sets schema paths.
     *
     * Sets a path (if arity 2)
     * Gets a path (if arity 1)
     *
     * ####Example
     *
     *     schema.path('name') // returns a SchemaType
     *     schema.path('name', Number) // changes the schemaType of `name` to Number
     *
     * @param {String} path
     * @param {Object} constructor
     * @api public
     */
    path(path, obj) {
        if (is.undefined(obj)) {
            if (this.paths[path]) {
                return this.paths[path];
            }
            if (this.subpaths[path]) {
                return this.subpaths[path];
            }
            if (this.singleNestedPaths[path]) {
                return this.singleNestedPaths[path];
            }

            // subpaths?
            return /\.\d+\.?.*$/.test(path)
                ? getPositionalPath(this, path)
                : undefined;
        }

        // some path names conflict with document methods
        if (reserved[path]) {
            throw new Error(`\`${path}\` may not be used as a schema pathname`);
        }

        if (warnings[path]) {
            console.log(`WARN: ${warnings[path]}`);
        }

        // update the tree
        const subpaths = path.split(/\./);
        const last = subpaths.pop();
        let branch = this.tree;

        subpaths.forEach((sub, i) => {
            if (!branch[sub]) {
                branch[sub] = {};
            }
            if (typeof branch[sub] !== "object") {
                const msg = `Cannot set nested path \`${path}\`. Parent path \`${subpaths.slice(0, i).concat([sub]).join(".")}\` already set to type ${branch[sub].name}.`;
                throw new Error(msg);
            }
            branch = branch[sub];
        });

        branch[last] = utils.clone(obj);

        this.paths[path] = Schema.interpretAsType(path, obj, this.options);

        if (this.paths[path].$isSingleNested) {
            for (const key in this.paths[path].schema.paths) {
                this.singleNestedPaths[`${path}.${key}`] =
                    this.paths[path].schema.paths[key];
            }
            for (const key in this.paths[path].schema.singleNestedPaths) {
                this.singleNestedPaths[`${path}.${key}`] =
                    this.paths[path].schema.singleNestedPaths[key];
            }

            this.childSchemas.push({
                schema: this.paths[path].schema,
                model: this.paths[path].caster
            });
        } else if (this.paths[path].$isMongooseDocumentArray) {
            this.childSchemas.push({
                schema: this.paths[path].schema,
                model: this.paths[path].casterConstructor
            });
        }
        return this;
    }

    /**
     * Converts type arguments into Mongoose Types.
     *
     * @param {String} path
     * @param {Object} obj constructor
     * @api private
     */

    static interpretAsType(path, obj, options) {
        if (obj instanceof SchemaType) {
            return obj;
        }

        if (obj.constructor) {
            const constructorName = utils.getFunctionName(obj.constructor);
            if (constructorName !== "Object") {
                const oldObj = obj;
                obj = {};
                obj[options.typeKey] = oldObj;
            }
        }

        // Get the type making sure to allow keys named "type"
        // and default to mixed if not specified.
        // { type: { type: String, default: 'freshcut' } }
        let type = obj[options.typeKey] && (options.typeKey !== "type" || !obj.type.type)
            ? obj[options.typeKey]
            : {};

        if (utils.getFunctionName(type.constructor) === "Object" || type === "mixed") {
            return new MongooseTypes.Mixed(path, obj);
        }

        if (is.array(type) || Array === type || type === "array") {
            // if it was specified through { type } look for `cast`
            let cast = (Array === type || type === "array")
                ? obj.cast
                : type[0];

            if (cast && cast.instanceOfSchema) {
                return new MongooseTypes.DocumentArray(path, cast, obj);
            }
            if (cast &&
                cast[options.typeKey] &&
                cast[options.typeKey].instanceOfSchema) {
                return new MongooseTypes.DocumentArray(path, cast[options.typeKey], cast);
            }

            if (is.array(cast)) {
                return new MongooseTypes.Array(path, Schema.interpretAsType(path, cast, options), obj);
            }

            if (is.string(cast)) {
                cast = MongooseTypes[cast.charAt(0).toUpperCase() + cast.substring(1)];
            } else if (cast && (!cast[options.typeKey] || (options.typeKey === "type" && cast.type.type))
                && utils.getFunctionName(cast.constructor) === "Object") {
                if (Object.keys(cast).length) {
                    // The `minimize` and `typeKey` options propagate to child schemas
                    // declared inline, like `{ arr: [{ val: { $type: String } }] }`.
                    // See gh-3560
                    const childSchemaOptions = { minimize: options.minimize };
                    if (options.typeKey) {
                        childSchemaOptions.typeKey = options.typeKey;
                    }
                    //propagate 'strict' option to child schema
                    if (options.hasOwnProperty("strict")) {
                        childSchemaOptions.strict = options.strict;
                    }
                    //propagate 'runSettersOnQuery' option to child schema
                    if (options.hasOwnProperty("runSettersOnQuery")) {
                        childSchemaOptions.runSettersOnQuery = options.runSettersOnQuery;
                    }
                    const childSchema = new Schema(cast, childSchemaOptions);
                    childSchema.$implicitlyCreated = true;
                    return new MongooseTypes.DocumentArray(path, childSchema, obj);
                }
                // Special case: empty object becomes mixed
                return new MongooseTypes.Array(path, MongooseTypes.Mixed, obj);

            }

            if (cast) {
                type = cast[options.typeKey] && (options.typeKey !== "type" || !cast.type.type)
                    ? cast[options.typeKey]
                    : cast;

                const name = is.string(type)
                    ? type
                    : type.schemaName || utils.getFunctionName(type);

                if (!(name in MongooseTypes)) {
                    throw new TypeError(`Undefined type \`${name}\` at array \`${path}\``);
                }
            }

            return new MongooseTypes.Array(path, cast || MongooseTypes.Mixed, obj, options);
        }

        if (type && type.instanceOfSchema) {
            return new MongooseTypes.Embedded(type, path, obj);
        }

        let name;
        if (is.buffer(type)) {
            name = "Buffer";
        } else {
            name = is.string(type)
                ? type
                // If not string, `type` is a function. Outside of IE, function.name
                // gives you the function name. In IE, you need to compute it
                : type.schemaName || utils.getFunctionName(type);
        }

        if (name) {
            name = name.charAt(0).toUpperCase() + name.substring(1);
        }

        if (undefined == MongooseTypes[name]) {
            throw new TypeError(`Undefined type \`${name}\` at \`${path
            }\`\n  Did you try nesting Schemas? ` +
                "You can only nest using refs or arrays.");
        }

        obj = utils.clone(obj, { retainKeyOrder: true });
        if (!("runSettersOnQuery" in obj)) {
            obj.runSettersOnQuery = options.runSettersOnQuery;
        }
        return new MongooseTypes[name](path, obj);
    }

    /**
     * Iterates the schemas paths similar to Array#forEach.
     *
     * The callback is passed the pathname and schemaType as arguments on each iteration.
     *
     * @param {Function} fn callback function
     * @return {Schema} this
     * @api public
     */
    eachPath(fn) {
        const keys = Object.keys(this.paths);
        const len = keys.length;

        for (let i = 0; i < len; ++i) {
            fn(keys[i], this.paths[keys[i]]);
        }

        return this;
    }

    /**
     * Returns an Array of path strings that are required by this schema.
     *
     * @api public
     * @param {Boolean} invalidate refresh the cache
     * @return {Array}
     */
    requiredPaths(invalidate) {
        if (this._requiredpaths && !invalidate) {
            return this._requiredpaths;
        }

        const paths = Object.keys(this.paths);
        let i = paths.length;
        const ret = [];

        while (i--) {
            const path = paths[i];
            if (this.paths[path].isRequired) {
                ret.push(path);
            }
        }
        this._requiredpaths = ret;
        return this._requiredpaths;
    }

    /**
     * Returns indexes from fields and schema-level indexes (cached).
     *
     * @api private
     * @return {Array}
     */
    indexedPaths() {
        if (this._indexedpaths) {
            return this._indexedpaths;
        }
        this._indexedpaths = this.indexes();
        return this._indexedpaths;
    }

    /**
     * Returns the pathType of `path` for this schema.
     *
     * Given a path, returns whether it is a real, virtual, nested, or ad-hoc/undefined path.
     *
     * @param {String} path
     * @return {String}
     * @api public
     */
    pathType(path) {
        if (path in this.paths) {
            return "real";
        }
        if (path in this.virtuals) {
            return "virtual";
        }
        if (path in this.nested) {
            return "nested";
        }
        if (path in this.subpaths) {
            return "real";
        }
        if (path in this.singleNestedPaths) {
            return "real";
        }

        if (/\.\d+\.|\.\d+$/.test(path)) {
            return getPositionalPathType(this, path);
        }
        return "adhocOrUndefined";
    }

    /**
     * Returns true iff this path is a child of a mixed schema.
     *
     * @param {String} path
     * @return {Boolean}
     * @api private
     */
    hasMixedParent(path) {
        const subpaths = path.split(/\./g);
        path = "";
        for (let i = 0; i < subpaths.length; ++i) {
            path = i > 0 ? `${path}.${subpaths[i]}` : subpaths[i];
            if (path in this.paths &&
                this.paths[path] instanceof MongooseTypes.Mixed) {
                return true;
            }
        }

        return false;
    }

    /**
     * Setup updatedAt and createdAt timestamps to documents if enabled
     *
     * @param {Boolean|Object} timestamps timestamps options
     * @api private
     */
    setupTimestamp(timestamps) {
        if (timestamps) {
            const paths = ["createdAt", "updatedAt"].map(handleTimestampOption.bind(null, timestamps));
            const createdAt = paths[0];
            const updatedAt = paths[1];
            const schemaAdditions = paths.reduce((cur, path) => {
                if (!is.nil(path)) {
                    const parts = path.split(".");
                    if (this.pathType(path) === "adhocOrUndefined") {
                        for (let i = 0; i < parts.length; ++i) {
                            cur[parts[i]] = (i < parts.length - 1 ?
                                cur[parts[i]] || {} :
                                Date);
                        }
                    }
                }
                return cur;
            }, {});

            this.add(schemaAdditions);

            this.pre("save", function (next) {
                const defaultTimestamp = new Date();
                const autoId = this._id && this._id.auto;

                if (!is.nil(createdAt) && !this.get(createdAt) && this.isSelected(createdAt)) {
                    this.set(createdAt, autoId ? this._id.getTimestamp() : defaultTimestamp);
                }

                if (!is.nil(updatedAt) && (this.isNew || this.isModified())) {
                    let ts = defaultTimestamp;
                    if (this.isNew) {
                        if (!is.nil(createdAt)) {
                            ts = this.get(createdAt);
                        } else if (autoId) {
                            ts = this._id.getTimestamp();
                        }
                    }
                    this.set(updatedAt, ts);
                }

                next();
            });

            const genUpdates = function (currentUpdate, overwrite) {
                const now = new Date();
                let updates = {};
                let _updates = updates;
                if (overwrite) {
                    if (currentUpdate && currentUpdate.$set) {
                        currentUpdate = currentUpdate.$set;
                        updates.$set = {};
                        _updates = updates.$set;
                    }
                    if (!is.nil(updatedAt) && !currentUpdate[updatedAt]) {
                        _updates[updatedAt] = now;
                    }
                    if (!is.nil(createdAt) && !currentUpdate[createdAt]) {
                        _updates[createdAt] = now;
                    }
                    return updates;
                }
                updates = { $set: {} };
                currentUpdate = currentUpdate || {};

                if (!is.nil(updatedAt) &&
                    (!currentUpdate.$currentDate || !currentUpdate.$currentDate[updatedAt])) {
                    updates.$set[updatedAt] = now;
                }

                if (!is.nil(createdAt)) {
                    if (currentUpdate[createdAt]) {
                        delete currentUpdate[createdAt];
                    }
                    if (currentUpdate.$set && currentUpdate.$set[createdAt]) {
                        delete currentUpdate.$set[createdAt];
                    }

                    updates.$setOnInsert = {};
                    updates.$setOnInsert[createdAt] = now;
                }

                return updates;
            };

            this.methods.initializeTimestamps = function () {
                if (!this.get(createdAt)) {
                    this.set(createdAt, new Date());
                }
                if (!this.get(updatedAt)) {
                    this.set(updatedAt, new Date());
                }
                return this;
            };

            this.pre("findOneAndUpdate", function (next) {
                const overwrite = this.options.overwrite;
                this.findOneAndUpdate({}, genUpdates(this.getUpdate(), overwrite), {
                    overwrite
                });
                applyTimestampsToChildren(this);
                next();
            });

            this.pre("update", function (next) {
                const overwrite = this.options.overwrite;
                this.update({}, genUpdates(this.getUpdate(), overwrite), {
                    overwrite
                });
                applyTimestampsToChildren(this);
                next();
            });
        }
    }

    /**
     * Defines a pre hook for the document.
     *
     * ####Example
     *
     *     var toySchema = new Schema(..);
     *
     *     toySchema.pre('save', function (next) {
     *       if (!this.created) this.created = new Date;
     *       next();
     *     })
     *
     *     toySchema.pre('validate', function (next) {
     *       if (this.name !== 'Woody') this.name = 'Woody';
     *       next();
     *     })
     *
     * @param {String} method
     * @param {Function} callback
     * @see hooks.js https://github.com/bnoguchi/hooks-js/tree/31ec571cef0332e21121ee7157e0cf9728572cc3
     * @api public
     */
    pre() {
        const name = arguments[0];
        if (IS_KAREEM_HOOK[name]) {
            this.s.hooks.pre.apply(this.s.hooks, arguments);
            return this;
        }
        return this.queue("pre", arguments);
    }

    /**
     * Defines a post hook for the document
     *
     *     var schema = new Schema(..);
     *     schema.post('save', function (doc) {
     *       console.log('this fired after a document was saved');
     *     });
     *
     *     schema.post('find', function(docs) {
     *       console.log('this fired after you run a find query');
     *     });
     *
     *     var Model = mongoose.model('Model', schema);
     *
     *     var m = new Model(..);
     *     m.save(function(err) {
     *       console.log('this fires after the `post` hook');
     *     });
     *
     *     m.find(function(err, docs) {
     *       console.log('this fires after the post find hook');
     *     });
     *
     * @param {String} method name of the method to hook
     * @param {Function} fn callback
     * @see middleware http://mongoosejs.com/docs/middleware.html
     * @see hooks.js https://www.npmjs.com/package/hooks-fixed
     * @see kareem http://npmjs.org/package/kareem
     * @api public
     */
    post(method, fn) {
        if (IS_KAREEM_HOOK[method]) {
            this.s.hooks.post.apply(this.s.hooks, arguments);
            return this;
        }
        // assuming that all callbacks with arity < 2 are synchronous post hooks
        if (fn.length < 2) {
            return this.queue("on", [arguments[0], function (doc) {
                return fn.call(doc, doc);
            }]);
        }

        if (fn.length === 3) {
            this.s.hooks.post(`${method}:error`, fn);
            return this;
        }

        return this.queue("post", [arguments[0], function (next) {
            // wrap original function so that the callback goes last,
            // for compatibility with old code that is using synchronous post hooks
            const _this = this;
            const args = Array.prototype.slice.call(arguments, 1);
            fn.call(this, this, (err) => {
                return next.apply(_this, [err].concat(args));
            });
        }]);
    }

    /**
     * Registers a plugin for this schema.
     *
     * @param {Function} plugin callback
     * @param {Object} [opts]
     * @see plugins
     * @api public
     */
    plugin(fn, opts) {
        if (!is.function(fn)) {
            throw new Error(`${"First param to `schema.plugin()` must be a function, " +
                'got "'}${typeof fn}"`);
        }

        if (opts &&
            opts.deduplicate) {
            for (let i = 0; i < this.plugins.length; ++i) {
                if (this.plugins[i].fn === fn) {
                    return this;
                }
            }
        }
        this.plugins.push({ fn, opts });

        fn(this, opts);
        return this;
    }

    /**
     * Adds an instance method to documents constructed from Models compiled from this schema.
     *
     * ####Example
     *
     *     var schema = kittySchema = new Schema(..);
     *
     *     schema.method('meow', function () {
     *       console.log('meeeeeoooooooooooow');
     *     })
     *
     *     var Kitty = mongoose.model('Kitty', schema);
     *
     *     var fizz = new Kitty;
     *     fizz.meow(); // meeeeeooooooooooooow
     *
     * If a hash of name/fn pairs is passed as the only argument, each name/fn pair will be added as methods.
     *
     *     schema.method({
     *         purr: function () {}
     *       , scratch: function () {}
     *     });
     *
     *     // later
     *     fizz.purr();
     *     fizz.scratch();
     *
     * @param {String|Object} method name
     * @param {Function} [fn]
     * @api public
     */
    method(name, fn) {
        if (!is.string(name)) {
            for (const i in name) {
                this.methods[i] = name[i];
            }
        } else {
            this.methods[name] = fn;
        }
        return this;
    }

    /**
     * Adds static "class" methods to Models compiled from this schema.
     *
     * ####Example
     *
     *     var schema = new Schema(..);
     *     schema.static('findByName', function (name, callback) {
     *       return this.find({ name: name }, callback);
     *     });
     *
     *     var Drink = mongoose.model('Drink', schema);
     *     Drink.findByName('sanpellegrino', function (err, drinks) {
     *       //
     *     });
     *
     * If a hash of name/fn pairs is passed as the only argument, each name/fn pair will be added as statics.
     *
     * @param {String|Object} name
     * @param {Function} [fn]
     * @api public
     */
    static(name, fn) {
        if (!is.string(name)) {
            for (const i in name) {
                this.statics[i] = name[i];
            }
        } else {
            this.statics[name] = fn;
        }
        return this;
    }

    /**
     * Defines an index (most likely compound) for this schema.
     *
     * ####Example
     *
     *     schema.index({ first: 1, last: -1 })
     *
     * @param {Object} fields
     * @param {Object} [options] Options to pass to [MongoDB driver's `createIndex()` function](http://mongodb.github.io/node-mongodb-native/2.0/api/Collection.html#createIndex)
     * @param {String} [options.expires=null] Mongoose-specific syntactic sugar, uses [ms](https://www.npmjs.com/package/ms) to convert `expires` option into seconds for the `expireAfterSeconds` in the above link.
     * @api public
     */
    index(fields, options) {
        options || (options = {});

        if (options.expires) {
            utils.expires(options);
        }

        this._indexes.push([fields, options]);
        return this;
    }

    /**
     * Sets/gets a schema option.
     *
     * ####Example
     *
     *     schema.set('strict'); // 'true' by default
     *     schema.set('strict', false); // Sets 'strict' to false
     *     schema.set('strict'); // 'false'
     *
     * @param {String} key option name
     * @param {Object} [value] if not passed, the current option value is returned
     * @see Schema ./
     * @api public
     */
    set(key, value, _tags) {
        if (arguments.length === 1) {
            return this.options[key];
        }

        switch (key) {
            case "read":
                this.options[key] = readPref(value, _tags);
                break;
            case "safe":
                this.options[key] = value === false
                    ? { w: 0 }
                    : value;
                break;
            case "timestamps":
                this.setupTimestamp(value);
                this.options[key] = value;
                break;
            default:
                this.options[key] = value;
        }

        return this;
    }

    /**
     * Gets a schema option.
     *
     * @param {String} key option name
     * @api public
     */
    get(key) {
        return this.options[key];
    }

    /**
     * Adds a method call to the queue.
     *
     * @param {String} name name of the document method to call later
     * @param {Array} args arguments to pass to the method
     * @api public
     */
    queue(name, args) {
        this.callQueue.push([name, args]);
        return this;
    }

    /**
     * Compiles indexes from fields and schema-level indexes
     *
     * @api public
     */
    indexes() {
        let indexes = [];
        const schemaStack = [];

        /*!
        * Checks for indexes added to subdocs using Schema.index().
        * These indexes need their paths prefixed properly.
        *
        * schema._indexes = [ [indexObj, options], [indexObj, options] ..]
        */

        const fixSubIndexPaths = function (schema, prefix) {
            const subindexes = schema._indexes;
            const len = subindexes.length;
            let indexObj;
            let newindex;
            let klen;
            let keys;
            let key;
            let i = 0;
            let j;

            for (i = 0; i < len; ++i) {
                indexObj = subindexes[i][0];
                keys = Object.keys(indexObj);
                klen = keys.length;
                newindex = {};

                // use forward iteration, order matters
                for (j = 0; j < klen; ++j) {
                    key = keys[j];
                    newindex[prefix + key] = indexObj[key];
                }

                indexes.push([newindex, subindexes[i][1]]);
            }
        };

        const collectIndexes = function (schema, prefix) {
            // Ignore infinitely nested schemas, if we've already seen this schema
            // along this path there must be a cycle
            if (schemaStack.indexOf(schema) !== -1) {
                return;
            }
            schemaStack.push(schema);

            prefix = prefix || "";
            let key;
            let path;
            let index;
            let field;
            let isObject;
            let options;
            let type;
            const keys = Object.keys(schema.paths);

            for (let i = 0; i < keys.length; ++i) {
                key = keys[i];
                path = schema.paths[key];

                if ((path instanceof MongooseTypes.DocumentArray) || path.$isSingleNested) {
                    if (path.options.excludeIndexes !== true) {
                        collectIndexes(path.schema, `${prefix + key}.`);
                    }
                } else {
                    index = path._index || (path.caster && path.caster._index);

                    if (index !== false && !is.null(index) && !is.undefined(index)) {
                        field = {};
                        isObject = utils.isObject(index);
                        options = isObject ? index : {};
                        type = is.string(index) ? index :
                            isObject ? index.type :
                                false;

                        if (type && ~Schema.indexTypes.indexOf(type)) {
                            field[prefix + key] = type;
                        } else if (options.text) {
                            field[prefix + key] = "text";
                            delete options.text;
                        } else {
                            field[prefix + key] = 1;
                        }

                        delete options.type;
                        if (!("background" in options)) {
                            options.background = true;
                        }

                        indexes.push([field, options]);
                    }
                }
            }

            schemaStack.pop();

            if (prefix) {
                fixSubIndexPaths(schema, prefix);
            } else {
                schema._indexes.forEach((index) => {
                    if (!("background" in index[1])) {
                        index[1].background = true;
                    }
                });
                indexes = indexes.concat(schema._indexes);
            }
        };

        collectIndexes(this);
        return indexes;
    }

    /**
     * Creates a virtual type with the given name.
     *
     * @param {String} name
     * @param {Object} [options]
     * @return {VirtualType}
     */
    virtual(name, options) {
        if (options && options.ref) {
            if (!options.localField) {
                throw new Error("Reference virtuals require `localField` option");
            }

            if (!options.foreignField) {
                throw new Error("Reference virtuals require `foreignField` option");
            }

            this.pre("init", function (next, obj) {
                if (mpath.has(name, obj)) {
                    const _v = mpath.get(name, obj);
                    if (!this.$$populatedVirtuals) {
                        this.$$populatedVirtuals = {};
                    }

                    if (options.justOne) {
                        this.$$populatedVirtuals[name] = is.array(_v) ?
                            _v[0] :
                            _v;
                    } else {
                        this.$$populatedVirtuals[name] = is.array(_v) ?
                            _v :
                            is.nil(_v) ? [] : [_v];
                    }

                    mpath.unset(name, obj);
                }
                if (this.ownerDocument) {
                    next();
                    return this;
                }
                next();

            });

            const virtual = this.virtual(name);
            virtual.options = options;
            return virtual.
                get(function () {
                    if (!this.$$populatedVirtuals) {
                        this.$$populatedVirtuals = {};
                    }
                    if (name in this.$$populatedVirtuals) {
                        return this.$$populatedVirtuals[name];
                    }
                    return null;
                }).
                set(function (_v) {
                    if (!this.$$populatedVirtuals) {
                        this.$$populatedVirtuals = {};
                    }

                    if (options.justOne) {
                        this.$$populatedVirtuals[name] = is.array(_v) ?
                            _v[0] :
                            _v;

                        if (typeof this.$$populatedVirtuals[name] !== "object") {
                            this.$$populatedVirtuals[name] = null;
                        }
                    } else {
                        this.$$populatedVirtuals[name] = is.array(_v) ?
                            _v :
                            is.nil(_v) ? [] : [_v];

                        this.$$populatedVirtuals[name] = this.$$populatedVirtuals[name].filter((doc) => {
                            return doc && typeof doc === "object";
                        });
                    }
                });
        }

        const virtuals = this.virtuals;
        const parts = name.split(".");

        if (this.pathType(name) === "real") {
            throw new Error(`Virtual path "${name}"` +
                " conflicts with a real path in the schema");
        }

        virtuals[name] = parts.reduce((mem, part, i) => {
            mem[part] || (mem[part] = (i === parts.length - 1)
                ? new VirtualType(options, name)
                : {});
            return mem[part];
        }, this.tree);

        return virtuals[name];
    }

    _getVirtual(name) {
        return _getVirtual(this, name);
    }

    /**
     * Returns the virtual type with the given `name`.
     *
     * @param {String} name
     * @return {VirtualType}
     */
    virtualpath(name) {
        return this.virtuals[name];
    }

    /**
     * Removes the given `path` (or [`paths`]).
     *
     * @param {String|Array} path
     *
     * @api public
     */
    remove(path) {
        if (is.string(path)) {
            path = [path];
        }
        if (is.array(path)) {
            path.forEach(function (name) {
                if (this.path(name)) {
                    delete this.paths[name];

                    const pieces = name.split(".");
                    const last = pieces.pop();
                    let branch = this.tree;
                    for (let i = 0; i < pieces.length; ++i) {
                        branch = branch[pieces[i]];
                    }
                    delete branch[last];
                }
            }, this);
        }
    }

    /**
     * Loads an ES6 class into a schema. Maps setters + getters, static methods, and instance methods to schema virtuals, statics, and methods.
     *
     * @param {Function} model
     */
    loadClass(model, virtualsOnly) {
        if (model === Object.prototype ||
            model === Function.prototype ||
            model.prototype.hasOwnProperty("$isMongooseModelPrototype")) {
            return this;
        }

        this.loadClass(Object.getPrototypeOf(model));

        // Add static methods
        if (!virtualsOnly) {
            Object.getOwnPropertyNames(model).forEach(function (name) {
                if (name.match(/^(length|name|prototype)$/)) {
                    return;
                }
                const method = Object.getOwnPropertyDescriptor(model, name);
                if (is.function(method.value)) {
                    this.static(name, method.value);
                }
            }, this);
        }

        // Add methods and virtuals
        Object.getOwnPropertyNames(model.prototype).forEach(function (name) {
            if (name.match(/^(constructor)$/)) {
                return;
            }
            const method = Object.getOwnPropertyDescriptor(model.prototype, name);
            if (!virtualsOnly) {
                if (is.function(method.value)) {
                    this.method(name, method.value);
                }
            }
            if (is.function(method.get)) {
                this.virtual(name).get(method.get);
            }
            if (is.function(method.set)) {
                this.virtual(name).set(method.set);
            }
        }, this);

        return this;
    }

    _getSchema(path) {
        const _this = this;
        const pathschema = _this.path(path);
        const resultPath = [];

        if (pathschema) {
            pathschema.$fullPath = path;
            return pathschema;
        }

        const search = function (parts, schema) {
            let p = parts.length + 1;
            let foundschema;
            let trypath;

            while (p--) {
                trypath = parts.slice(0, p).join(".");
                foundschema = schema.path(trypath);
                if (foundschema) {
                    resultPath.push(trypath);

                    if (foundschema.caster) {
                        // array of Mixed?
                        if (foundschema.caster instanceof MongooseTypes.Mixed) {
                            foundschema.caster.$fullPath = resultPath.join(".");
                            return foundschema.caster;
                        }

                        // Now that we found the array, we need to check if there
                        // are remaining document paths to look up for casting.
                        // Also we need to handle array.$.path since schema.path
                        // doesn't work for that.
                        // If there is no foundschema.schema we are dealing with
                        // a path like array.$
                        if (p !== parts.length && foundschema.schema) {
                            let ret;
                            if (parts[p] === "$") {
                                if (p + 1 === parts.length) {
                                    // comments.$
                                    return foundschema;
                                }
                                // comments.$.comments.$.title
                                ret = search(parts.slice(p + 1), foundschema.schema);
                                if (ret) {
                                    ret.$isUnderneathDocArray = ret.$isUnderneathDocArray ||
                                        !foundschema.schema.$isSingleNested;
                                }
                                return ret;
                            }
                            // this is the last path of the selector
                            ret = search(parts.slice(p), foundschema.schema);
                            if (ret) {
                                ret.$isUnderneathDocArray = ret.$isUnderneathDocArray ||
                                    !foundschema.schema.$isSingleNested;
                            }
                            return ret;
                        }
                    }

                    foundschema.$fullPath = resultPath.join(".");

                    return foundschema;
                }
            }
        };

        // look for arrays
        const parts = path.split(".");
        for (let i = 0; i < parts.length; ++i) {
            if (parts[i] === "$") {
                // Re: gh-5628, because `schema.path()` doesn't take $ into account.
                parts[i] = "0";
            }
        }
        return search(parts, _this);
    }

    _getPathType(path) {
        const _this = this;
        const pathschema = _this.path(path);

        if (pathschema) {
            return "real";
        }

        const search = function (parts, schema) {
            let p = parts.length + 1;
            let foundschema;
            let trypath;

            while (p--) {
                trypath = parts.slice(0, p).join(".");
                foundschema = schema.path(trypath);
                if (foundschema) {
                    if (foundschema.caster) {
                        // array of Mixed?
                        if (foundschema.caster instanceof MongooseTypes.Mixed) {
                            return { schema: foundschema, pathType: "mixed" };
                        }

                        // Now that we found the array, we need to check if there
                        // are remaining document paths to look up for casting.
                        // Also we need to handle array.$.path since schema.path
                        // doesn't work for that.
                        // If there is no foundschema.schema we are dealing with
                        // a path like array.$
                        if (p !== parts.length && foundschema.schema) {
                            if (parts[p] === "$") {
                                if (p === parts.length - 1) {
                                    return { schema: foundschema, pathType: "nested" };
                                }
                                // comments.$.comments.$.title
                                return search(parts.slice(p + 1), foundschema.schema);
                            }
                            // this is the last path of the selector
                            return search(parts.slice(p), foundschema.schema);
                        }
                        return {
                            schema: foundschema,
                            pathType: foundschema.$isSingleNested ? "nested" : "array"
                        };
                    }
                    return { schema: foundschema, pathType: "real" };
                } else if (p === parts.length && schema.nested[trypath]) {
                    return { schema, pathType: "nested" };
                }
            }
            return { schema: foundschema || schema, pathType: "undefined" };
        };

        // look for arrays
        return search(path.split("."), _this);
    }
}
Schema.prototype.instanceOfSchema = true;

/**
 * Default middleware attached to a schema. Cannot be changed.
 *
 * This field is used to make sure discriminators don't get multiple copies of
 * built-in middleware. Declared as a constant because changing this at runtime
 * may lead to instability with Model.prototype.discriminator().
 *
 * @api private
 * @property _defaultMiddleware
 */
Object.defineProperty(Schema.prototype, "_defaultMiddleware", {
    configurable: false,
    enumerable: false,
    writable: false,
    value: [
        {
            kind: "pre",
            hook: "remove",
            isAsync: true,
            fn(next, done) {
                if (this.ownerDocument) {
                    done();
                    next();
                    return;
                }

                const subdocs = this.$__getAllSubdocs();

                if (!subdocs.length) {
                    done();
                    next();
                    return;
                }

                each(subdocs, (subdoc, cb) => {
                    subdoc.remove({ noop: true }, (err) => {
                        cb(err);
                    });
                }, (error) => {
                    if (error) {
                        done(error);
                        return;
                    }
                    next();
                    done();
                });
            }
        }
    ]
});

/**
 * Array of child schemas (from document arrays and single nested subdocs)
 * and their corresponding compiled models. Each element of the array is
 * an object with 2 properties: `schema` and `model`.
 *
 * This property is typically only useful for plugin authors and advanced users.
 * You do not need to interact with this property at all to use mongoose.
 *
 * @api public
 * @property childSchemas
 */

Object.defineProperty(Schema.prototype, "childSchemas", {
    configurable: false,
    enumerable: true,
    writable: true
});

/**
 * The original object passed to the schema constructor
 *
 * ####Example:
 *
 *     var schema = new Schema({ a: String }).add({ b: String });
 *     schema.obj; // { a: String }
 *
 * @api public
 * @property obj
 */

Schema.prototype.obj;

/**
 * Schema as flat paths
 *
 * ####Example:
 *     {
 *         '_id'        : SchemaType,
 *       , 'nested.key' : SchemaType,
 *     }
 *
 * @api private
 * @property paths
 */

Schema.prototype.paths;

/**
 * Schema as a tree
 *
 * ####Example:
 *     {
 *         '_id'     : ObjectId
 *       , 'nested'  : {
 *             'key' : String
 *         }
 *     }
 *
 * @api private
 * @property tree
 */

Schema.prototype.tree;

/**
 * Reserved document keys.
 *
 * Keys in this object are names that are rejected in schema declarations b/c they conflict with mongoose functionality. Using these key name will throw an error.
 *
 *      on, emit, _events, db, get, set, init, isNew, errors, schema, options, modelName, collection, _pres, _posts, toObject
 *
 * _NOTE:_ Use of these terms as method names is permitted, but play at your own risk, as they may be existing mongoose document methods you are stomping on.
 *
 *      var schema = new Schema(..);
 *      schema.methods.init = function () {} // potentially breaking
 */

Schema.reserved = Object.create(null);
const reserved = Schema.reserved;
// Core object
reserved.prototype =
    // EventEmitter
    reserved.emit =
    reserved.on =
    reserved.once =
    reserved.listeners =
    reserved.removeListener =
    // document properties and functions
    reserved.collection =
    reserved.db =
    reserved.errors =
    reserved.init =
    reserved.isModified =
    reserved.isNew =
    reserved.get =
    reserved.modelName =
    reserved.save =
    reserved.schema =
    reserved.toObject =
    reserved.validate =
    reserved.remove =
    // hooks.js
    reserved._pres = reserved._posts = 1;

/*!
 * Document keys to print warnings for
 */

const warnings = {};
warnings.increment = "`increment` should not be used as a schema path name " +
    "unless you have disabled versioning.";

/**
 * The allowed index types
 *
 * @static indexTypes
 * @receiver Schema
 * @api public
 */

const indexTypes = "2d 2dsphere hashed text".split(" ");

Object.defineProperty(Schema, "indexTypes", {
    get() {
        return indexTypes;
    },
    set() {
        throw new Error("Cannot overwrite Schema.indexTypes");
    }
});

Schema.Types = MongooseTypes = require("./schema/index");
Schema.ObjectId = MongooseTypes.ObjectId;
