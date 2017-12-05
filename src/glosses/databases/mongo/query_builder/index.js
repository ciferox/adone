import * as util from "./__/util";

const {
    is
} = adone;

const push = (opts, field, value) => {
    if (is.array(opts.sort)) {
        throw new TypeError("Can't mix sort syntaxes. Use either array or object:" +
            "\n- `.sort([['field', 1], ['test', -1]])`" +
            "\n- `.sort({ field: 1, test: -1 })`");
    }

    if (value && value.$meta) {
        if (!opts.sort) {
            opts.sort = {};
        }
        opts.sort[field] = { $meta: value.$meta };
        return;
    }

    const val = String(value || 1).toLowerCase();
    if (!/^(?:ascending|asc|descending|desc|1|-1)$/.test(val)) {
        if (is.array(value)) {
            value = `[${value}]`;
        }
        throw new TypeError(`Invalid sort value: {${field}: ${value} }`);
    }
    // store `sort` in a sane format
    if (!opts.sort) {
        opts.sort = {};
    }
    const valueStr = value.toString()
        .replace("asc", "1")
        .replace("ascending", "1")
        .replace("desc", "-1")
        .replace("descending", "-1");
    opts.sort[field] = parseInt(valueStr, 10);
};

const _pushArr = (opts, field, value) => {
    opts.sort = opts.sort || [];
    if (!is.array(opts.sort)) {
        throw new TypeError("Can't mix sort syntaxes. Use either array or object:" +
            "\n- `.sort([['field', 1], ['test', -1]])`" +
            "\n- `.sort({ field: 1, test: -1 })`");
    }
    const valueStr = value.toString()
        .replace("asc", "1")
        .replace("ascending", "1")
        .replace("desc", "-1")
        .replace("descending", "-1");
    opts.sort.push([field, valueStr]);
};

const _pushMap = (opts, map) => {
    opts.sort = opts.sort || new Map();
    if (!(opts.sort instanceof Map)) {
        throw new TypeError("Can't mix sort syntaxes. Use either array or object or map consistently");
    }
    map.forEach((value, key) => {
        const valueStr = value.toString()
            .replace("asc", "1")
            .replace("ascending", "1")
            .replace("desc", "-1")
            .replace("descending", "-1");
        opts.sort.set(key, valueStr);
    });
};


/**
 * This is a parameter that the user can set which determines if mquery
 * uses $within or $geoWithin for queries. It defaults to true which
 * means $geoWithin will be used. If using MongoDB < 2.4 you should
 * set this to false.
 */
let $withinCmd = "$geoWithin";

export default class Query {
    constructor(criteria, options) {
        const proto = this.constructor.prototype;

        this.op = proto.op || undefined;

        this.options = {};
        this.setOptions(proto.options);

        this._conditions = proto._conditions
            ? util.clone(proto._conditions, { retainKeyOrder: this.options.retainKeyOrder })
            : {};

        this._fields = proto._fields
            ? util.clone(proto._fields, { retainKeyOrder: this.options.retainKeyOrder })
            : undefined;

        this._update = proto._update
            ? util.clone(proto._update, { retainKeyOrder: this.options.retainKeyOrder })
            : undefined;

        this._path = proto._path || undefined;
        this._distinct = proto._distinct || undefined;
        this._collection = proto._collection || undefined;
        this._traceFunction = proto._traceFunction || undefined;

        if (options) {
            this.setOptions(options);
        }

        if (criteria) {
            if (criteria.find && criteria.remove && criteria.update) {
                // quack quack!
                this.collection(criteria);
            } else {
                this.find(criteria);
            }
        }
    }

    static get use$geoWithin() {
        return $withinCmd === "$geoWithin";
    }

    static set use$geoWithin(v) {
        if (v === true) {
            // mongodb >= 2.4
            $withinCmd = "$geoWithin";
        } else {
            $withinCmd = "$within";
        }
    }

    /**
     * Converts this query to a constructor function with all arguments and options retained.
     */
    toConstructor() {
        class CustomQuery extends Query { }

        // set inherited defaults
        const p = CustomQuery.prototype;

        p.options = {};
        p.setOptions(this.options);

        p.op = this.op;
        p._conditions = util.clone(this._conditions, { retainKeyOrder: this.options.retainKeyOrder });
        p._fields = util.clone(this._fields, { retainKeyOrder: this.options.retainKeyOrder });
        p._update = util.clone(this._update, { retainKeyOrder: this.options.retainKeyOrder });
        p._path = this._path;
        p._distinct = this._distinct;
        p._collection = this._collection;
        p._traceFunction = this._traceFunction;

        return CustomQuery;
    }

    setOptions(options) {
        if (!(options && is.object(options))) {
            return this;
        }

        // set arbitrary options
        const methods = Object.keys(options);
        let method;

        for (let i = 0; i < methods.length; ++i) {
            method = methods[i];

            // use methods if exist (safer option manipulation)
            if (is.function(this[method])) {
                const args = is.array(options[method])
                    ? options[method]
                    : [options[method]];
                this[method].apply(this, args);
            } else {
                this.options[method] = options[method];
            }
        }

        return this;
    }

    /**
     * Sets this Querys collection.
     */
    collection(coll) {
        this._collection = new __.Collection(coll); // eslint-disable-line

        return this;
    }

    /**
     * Specifies a `$where` condition
     *
     * Use `$where` when you need to select documents using a JavaScript expression.
     *
     * @param {String|Function} js javascript string or function
     * @returns {this}
     */
    $where(js) {
        this._conditions.$where = js;
        return this;
    }

    /**
     * Specifies a `path` for use with chaining.
     *
     * @param {String} [path]
     * @param {Object} [val]
     * @returns {this}
     */
    where(...args) {
        if (!args.length) {
            return this;
        }
        if (!this.op) {
            this.op = "find";
        }

        switch (typeof args[0]) {
            case "string": {
                this._path = args[0];

                if (arguments.length === 2) {
                    this._conditions[this._path] = args[1];
                }

                return this;
            }
            case "object": {
                if (!is.array(args[0])) {
                    return this.merge(args[0]);
                }
            }
        }

        throw new TypeError("path must be a string or object");
    }

    /**
     * Specifies the complementary comparison value for paths specified with `where()`
     *
     * @param {Object} val
     * @returns {this}
     */
    equals(val) {
        this._ensurePath("equals");
        const path = this._path;
        this._conditions[path] = val;
        return this;
    }

    /**
     * Specifies the complementary comparison value for paths specified with `where()`
     * This is alias of `equals`
     *
     * @param {Object} val
     * @returns {this}
     */
    eq(val) {
        this._ensurePath("eq");
        const path = this._path;
        this._conditions[path] = val;
        return this;
    }

    /**
     * Specifies arguments for an `$or` condition.
     *
     * @param {Array} array array of conditions
     * @returns {this}
     */
    or(array) {
        if (!this._conditions.$or) {
            this._conditions.$or = [];
        }
        this._conditions.$or.push(...adone.util.arrify(array));
        return this;
    }

    /**
     * Specifies arguments for a `$nor` condition.
     *
     * @param {Array} array array of conditions
     * @returns {this}
     */
    nor(array) {
        if (!this._conditions.$nor) {
            this._conditions.$nor = [];
        }
        this._conditions.$nor.push(...adone.util.arrify(array));
        return this;
    }


    /**
     * Specifies arguments for a `$and` condition.
     *
     * @param {Array} array array of conditions
     * @returns {this}
     */
    and(array) {
        if (!this._conditions.$and) {
            this._conditions.$and = [];
        }
        this._conditions.$and.push(...adone.util.arrify(array));
        return this;
    }

    /**
     * Specifies a `$mod` condition
     *
     * @param {String} [path]
     * @param {Number} val
     * @returns {this}
     */
    mod(...args) {
        let val;
        let path;

        if (args.length === 1) {
            this._ensurePath("mod");
            [val] = args;
            path = this._path;
        } else if (args.length === 2 && !is.array(args[1])) {
            this._ensurePath("mod");
            val = args;
            path = this._path;
        } else if (args.length === 3) {
            [path, ...val] = args;
        } else {
            [path, val] = args;
        }

        if (!this._conditions[path]) {
            this._conditions[path] = {};
        }

        this._conditions[path].$mod = val;

        return this;
    }


    /**
     * Specifies an `$exists` condition
     *
     * @param {String} [path]
     * @param {Number} val
     * @returns {this}
     */
    exists(...args) {
        let path;
        let val;

        if (args.length === 0) {
            this._ensurePath("exists");
            path = this._path;
            val = true;
        } else if (args.length === 1) {
            if (is.boolean(args[0])) {
                this._ensurePath("exists");
                path = this._path;
                [val] = args;
            } else {
                [path] = args;
                val = true;
            }
        } else if (args.length === 2) {
            [path, val] = args;
        }

        if (!this._conditions[path]) {
            this._conditions[path] = {};
        }

        this._conditions[path].$exists = val;

        return this;
    }

    /**
     * Specifies an `$elemMatch` condition
     *
     * @param {String|Object|Function} path
     * @param {Object|Function} criteria
     * @returns {this}
     */
    elemMatch(...args) {
        if (is.nil(args[0])) {
            throw new TypeError("Invalid argument");
        }

        let fn;
        let path;
        let criteria;

        if (is.function(args[0])) {
            this._ensurePath("elemMatch");
            path = this._path;
            [fn] = args;
        } else if (is.plainObject(args[0])) {
            this._ensurePath("elemMatch");
            path = this._path;
            [criteria] = args;
        } else if (is.function(args[1])) {
            [path, fn] = args;
        } else if (args[1] && is.plainObject(args[1])) {
            [path, criteria] = args;
        } else {
            throw new TypeError("Invalid argument");
        }

        if (fn) {
            criteria = new Query();
            fn(criteria);
            criteria = criteria._conditions;
        }

        if (!this._conditions[path]) {
            this._conditions[path] = {};
        }

        this._conditions[path].$elemMatch = criteria;

        return this;
    }

    // Spatial queries

    /**
     * Sugar for geo-spatial queries.
     *
     * Must be used after `where()`.
     *
     * @returns {this}
     */
    within(...args) {
        // opinionated, must be used after where
        this._ensurePath("within");
        this._geoComparison = $withinCmd;

        if (args.length === 0) {
            return this;
        }

        if (args.length === 2) {
            return this.box(...args);
        } else if (arguments.length > 2) {
            return this.polygon(...args);
        }

        const [area] = args;

        if (!area) {
            throw new TypeError("Invalid argument");
        }

        if (area.center) {
            return this.circle(area);
        }

        if (area.box) {
            return this.box(...area.box);
        }

        if (area.polygon) {
            return this.polygon(...area.polygon);
        }

        if (area.type && area.coordinates) {
            return this.geometry(area);
        }

        throw new TypeError("Invalid argument");
    }

    /**
     * Specifies a $box condition
     *
     * @param {String} path
     * @param {Object} val
     * @returns {this}
     */
    box(...args) {
        let path;
        let box;

        if (args.length === 3) {
            // box('loc', [], [])
            [path, ...box] = args;
        } else if (args.length === 2) {
            // box([], [])
            this._ensurePath("box");
            path = this._path;
            box = args;
        } else {
            throw new TypeError("Invalid argument");
        }

        if (!this._conditions[path]) {
            this._conditions[path] = {};
        }

        this._conditions[path][this._geoComparison || $withinCmd] = { $box: box };
        return this;
    }

    /**
     * Specifies a $polygon condition
     *
     * @param {String|Array} [path]
     * @param {Array|Object} [val]
     * @returns {this}
     */
    polygon(...args) {
        let val;
        let path;

        if (is.string(args[0])) {
            // polygon('loc', [],[],[])
            [path, ...val] = args;
        } else {
            // polygon([],[],[])
            this._ensurePath("polygon");
            path = this._path;
            val = args;
        }

        if (!this._conditions[path]) {
            this._conditions[path] = {};
        }

        this._conditions[path][this._geoComparison || $withinCmd] = { $polygon: val };

        return this;
    }


    /**
     * Specifies a $center or $centerSphere condition.
     *
     * @param {String} [path]
     * @param {Object} area
     * @returns {this}
     */
    circle(...args) {
        let path;
        let val;

        if (args.length === 1) {
            this._ensurePath("circle");
            path = this._path;
            [val] = args;
        } else if (args.length === 2) {
            [path, val] = args;
        } else {
            throw new TypeError("Invalid argument");
        }

        if (!("radius" in val && val.center)) {
            throw new Error("center and radius are required");
        }

        if (!this._conditions[path]) {
            this._conditions[path] = {};
        }


        const conds = this._conditions[path];

        const type = val.spherical
            ? "$centerSphere"
            : "$center";

        const wKey = this._geoComparison || $withinCmd;
        conds[wKey] = {};
        conds[wKey][type] = [val.center, val.radius];

        if ("unique" in val) {
            conds[wKey].$uniqueDocs = Boolean(val.unique);
        }

        return this;
    }


    /**
     * Specifies a `$near` or `$nearSphere` condition
     *
     * These operators return documents sorted by distance.
     *
     * @param {String} [path]
     * @param {Object} val
     * @returns {this}
     */
    near(...args) {
        let path;
        let val;

        this._geoComparison = "$near";

        if (args.length === 0) {
            return this;
        } else if (args.length === 1) {
            this._ensurePath("near");
            path = this._path;
            [val] = args;
        } else if (args.length === 2) {
            [path, val] = args;
        } else {
            throw new TypeError("Invalid argument");
        }

        if (!val.center) {
            throw new Error("center is required");
        }

        if (!this._conditions[path]) {
            this._conditions[path] = {};
        }

        const conds = this._conditions[path];

        const type = val.spherical
            ? "$nearSphere"
            : "$near";

        // center could be a GeoJSON object or an Array
        if (is.array(val.center)) {
            conds[type] = val.center;

            const radius = "maxDistance" in val
                ? val.maxDistance
                : null;

            if (!is.nil(radius)) {
                conds.$maxDistance = radius;
            }
            if (!is.nil(val.minDistance)) {
                conds.$minDistance = val.minDistance;
            }
        } else {
            // GeoJSON?
            if (val.center.type !== "Point" || !is.array(val.center.coordinates)) {
                throw new Error(`Invalid GeoJSON specified for ${type}`);
            }
            conds[type] = { $geometry: val.center };

            // MongoDB 2.6 insists on maxDistance being in $near / $nearSphere
            if ("maxDistance" in val) {
                conds[type].$maxDistance = val.maxDistance;
            }
            if ("minDistance" in val) {
                conds[type].$minDistance = val.minDistance;
            }
        }

        return this;
    }


    /**
     * Declares an intersects query for `geometry()`.
     *
     * @param {Object} [arg]
     * @returns {this}
     */
    intersects(...args) {
        // opinionated, must be used after where
        this._ensurePath("intersects");

        this._geoComparison = "$geoIntersects";

        if (args.length === 0) {
            return this;
        }

        const [area] = args;

        if (!is.nil(area) && area.type && area.coordinates) {
            return this.geometry(area);
        }

        throw new TypeError("Invalid argument");
    }


    /**
     * Specifies a `$geometry` condition
     *
     * The most recent path passed to `where()` is used.
     *
     * @param {Object} object Must contain a `type` property which is a String and a `coordinates` property which is an Array. See the examples.
     * @returns {this}
     */
    geometry(...args) {
        if (!(this._geoComparison === "$within" ||
            this._geoComparison === "$geoWithin" ||
            this._geoComparison === "$near" ||
            this._geoComparison === "$geoIntersects")) {
            throw new Error("geometry() must come after `within()`, `intersects()`, or `near()");
        }

        let val;
        let path;

        if (args.length === 1) {
            this._ensurePath("geometry");
            path = this._path;
            [val] = args;
        } else {
            throw new TypeError("Invalid argument");
        }

        if (!(val.type && is.array(val.coordinates))) {
            throw new TypeError("Invalid argument");
        }

        const conds = this._conditions[path] || (this._conditions[path] = {});
        conds[this._geoComparison] = { $geometry: val };

        return this;
    }


    // end spatial

    /**
     * Specifies which document fields to include or exclude
     *
     * ####String syntax
     *
     * When passing a string, prefixing a path with `-` will flag that path as excluded. When a path does not have the `-` prefix, it is included.
     *
     * Cannot be used with `distinct()`
     *
     * @param {Object|String} arg
     * @returns {this}
     */
    select(...args) {
        let [arg] = args;
        if (!arg) {
            return this;
        }

        if (args.length !== 1) {
            throw new Error("Invalid select: select only takes 1 argument");
        }

        this._validate("select");

        const fields = this._fields || (this._fields = {});
        const type = typeof arg;

        if ((type === "string" || is.array(arg)) && is.number(arg.length)) {
            if (type === "string") {
                arg = arg.split(/\s+/);
            }

            for (let field of arg) {
                if (!field) {
                    continue;
                }
                const include = field[0] === "-" ? 0 : 1;
                if (include === 0) {
                    field = field.substring(1);
                }
                fields[field] = include;
            }

            return this;
        }

        if (is.plainObject(arg)) {
            for (const [k, v] of Object.entries(arg)) {
                fields[k] = v;
            }
            return this;
        }

        throw new TypeError("Invalid select() argument. Must be string or object.");
    }


    /**
     * Specifies a $slice condition for a `path`
     *
     * @param {String} [path]
     * @param {Number} val number/range of elements to slice
     * @returns {this}
     */
    slice(...args) {
        if (args.length === 0) {
            return this;
        }

        this._validate("slice");

        let path;
        let val;

        if (args.length === 1) {
            const [arg] = args;
            if (is.object(arg) && !is.array(arg)) {
                const keys = Object.keys(arg);
                const numKeys = keys.length;
                for (let i = 0; i < numKeys; ++i) {
                    this.slice(keys[i], arg[keys[i]]);
                }
                return this;
            }
            this._ensurePath("slice");
            path = this._path;
            [val] = args;
        } else if (args.length === 2) {
            if (is.number(args[0])) {
                this._ensurePath("slice");
                path = this._path;
                val = args;
            } else {
                [path, val] = args;
            }
        } else if (args.length === 3) {
            [path, ...val] = args;
        }

        if (!this._fields) {
            this._fields = {};
        }

        this._fields[path] = { $slice: val };

        return this;
    }

    /**
     * Sets the sort order
     *
     * If an object is passed, values allowed are 'asc', 'desc', 'ascending', 'descending', 1, and -1.
     *
     * If a string is passed, it must be a space delimited list of path names. The sort order of each path is ascending unless the path name is prefixed with `-` which will be treated as descending.
     *
     *  - The array syntax `.sort([['field', 1], ['test', -1]])` can only be used with [mongodb driver >= 2.0.46](https://github.com/mongodb/node-mongodb-native/blob/2.1/HISTORY.md#2046-2015-10-15).
     *  - Cannot be used with `distinct()`
     *
     * @param {Object|String|Array} arg
     * @returns {this}
     */
    sort(...args) {
        if (!args.length) {
            return this;
        }

        let [arg] = args;

        this._validate("sort");

        const type = typeof arg;

        // .sort([['field', 1], ['test', -1]])
        if (is.array(arg)) {
            for (const v of arg) {
                if (!is.array(v)) {
                    throw new Error("Invalid sort() argument, must be array of arrays");
                }
                _pushArr(this.options, v[0], v[1]);
            }
            return this;
        }

        // .sort('field -test')
        if (args.length === 1 && type === "string") {
            arg = arg.split(/\s+/);
            for (let field of arg) {
                if (!field) {
                    continue;
                }
                const ascend = field[0] === "-" ? -1 : 1;
                if (ascend === -1) {
                    field = field.substring(1);
                }
                push(this.options, field, ascend);
            }

            return this;
        }

        // .sort({ field: 1, test: -1 })
        if (is.plainObject(arg)) {
            for (const [field, value] of Object.entries(arg)) {
                push(this.options, field, value);
            }
            return this;
        }

        if (arg instanceof Map) {
            _pushMap(this.options, arg);
            return this;
        }

        throw new TypeError("Invalid sort() argument. Must be a string, object, or array.");
    }

    /**
     * Specifies the maxTimeMS option.
     *
     * @param {Number} val
     */
    maxTime(v) {
        this._validate("maxTime");
        this.options.maxTimeMS = v;
        return this;
    }

    /**
     * Specifies this query as a `snapshot` query.
     *
     * Cannot be used with `distinct()`
     *
     * @returns {this}
     */
    snapshot(...args) {
        this._validate("snapshot");

        this.options.snapshot = args.length
            ? Boolean(args[0])
            : true;

        return this;
    }

    /**
     * Sets query hints.
     *
     * Cannot be used with `distinct()`
     *
     * @param {Object|string} val a hint object or the index name
     * @returns {this}
     */
    hint(...args) {
        if (args.length === 0) {
            return this;
        }

        this._validate("hint");

        const [arg] = args;
        if (is.plainObject(arg)) {
            if (!this.options.hint) {
                this.options.hint = {};
            }
            const { hint } = this.options;

            // must keep object keys in order so don't use Object.keys()
            for (const k in arg) {
                hint[k] = arg[k];
            }

            return this;
        }
        if (is.string(arg)) {
            this.options.hint = arg;
            return this;
        }

        throw new TypeError(`Invalid hint. ${arg}`);
    }

    /**
     * Sets the slaveOk option. _Deprecated_ in MongoDB 2.2 in favor of read preferences.
     *
     * @param {Boolean} v defaults to true
     * @see read()
     * @returns {this}
     */
    slaveOk(...args) {
        this.options.slaveOk = args.length ? Boolean(args[0]) : true;
        return this;
    }

    /**
     * Sets the readPreference option for the query.
     *
     * primary - (default)  Read from primary only. Operations will produce an error if primary is unavailable. Cannot be combined with tags.
     * secondary            Read from secondary if available, otherwise error.
     * primaryPreferred     Read from primary if available, otherwise a secondary.
     * secondaryPreferred   Read from a secondary if available, otherwise read from the primary.
     * nearest              All operations read from among the nearest candidates, but unlike other modes, this option will include both the primary and all secondaries in the random selection.
     *
     * Aliases
     * p   primary
     * pp  primaryPreferred
     * s   secondary
     * sp  secondaryPreferred
     * n   nearest
     *
     * @param {String|ReadPreference} pref one of the listed preference options or their aliases
     * @returns {this}
     */
    read(...args) {
        if (args.length > 1 && !Query.prototype.read.deprecationWarningIssued) {
            console.error("Deprecation warning: 'tags' argument is not supported anymore in Query.read() method. Please use mongodb.ReadPreference object instead.");
            Query.prototype.read.deprecationWarningIssued = true;
        }
        this.options.readPreference = util.readPref(args[0]);
        return this;
    }


    /**
     * Sets tailable option.
     *
     * Cannot be used with `distinct()`
     *
     * @param {Boolean} v defaults to true
     */
    tailable(...args) {
        this._validate("tailable");

        this.options.tailable = args.length
            ? Boolean(args[0])
            : true;

        return this;
    }

    /**
     * Merges another Query or conditions object into this one.
     *
     * When a Query is passed, conditions, field selection and options are merged.
     *
     * @param {Query|Object} source
     * @returns {this}
     */
    merge(source) {
        if (!source) {
            return this;
        }

        if (!Query.canMerge(source)) {
            throw new TypeError("Invalid argument. Expected instanceof mquery or plain object");
        }

        if (source instanceof Query) {
            // if source has a feature, apply it to ourselves

            if (source._conditions) {
                util.merge(this._conditions, source._conditions);
            }

            if (source._fields) {
                this._fields || (this._fields = {});
                util.merge(this._fields, source._fields);
            }

            if (source.options) {
                this.options || (this.options = {});
                util.merge(this.options, source.options);
            }

            if (source._update) {
                if (!this._update) {
                    this._update = {};
                }
                util.mergeClone(this._update, source._update);
            }

            if (source._distinct) {
                this._distinct = source._distinct;
            }

            return this;
        }

        // plain object
        util.merge(this._conditions, source);

        return this;
    }

    /**
     * Finds documents.
     *
     *
     * @param {Object} [criteria] mongodb selector
     * @param {Function} [callback]
     * @returns {this}
     */
    find(criteria) {
        this.op = "find";

        if (Query.canMerge(criteria)) {
            this.merge(criteria);
        }

        return this;
    }


    _findExec() {
        const conds = this._conditions;
        const options = this._optionsForExec();

        options.fields = this._fieldsForExec();

        return this._collection.find(conds, options);
    }

    /**
     * Returns the query cursor
     *
     * @param {Object} [criteria] mongodb selector
     * @return {Object} cursor
     */
    cursor(criteria) {
        if (this.op) {
            if (this.op !== "find") {
                throw new TypeError(".cursor only support .find method");
            }
        } else {
            this.find(criteria);
        }

        const conds = this._conditions;
        const options = this._optionsForExec();

        options.fields = this._fieldsForExec();

        return this._collection.findCursor(conds, options);
    }

    /**
     * Executes the query as a findOne() operation.
     *
     * @param {Object|Query} [criteria] mongodb selector
     * @param {Function} [callback]
     * @returns {this}
     */
    findOne(criteria) {
        this.op = "findOne";

        if (Query.canMerge(criteria)) {
            this.merge(criteria);
        }

        return this;
    }

    _findOneExec() {
        const conds = this._conditions;
        const options = this._optionsForExec();

        options.fields = this._fieldsForExec();

        return this._collection.findOne(conds, options);
    }

    /**
     * Exectues the query as a count() operation.
     *
     * @param {Object} [criteria] mongodb selector
     * @param {Function} [callback]
     * @returns {this}
     */
    count(criteria) {
        this.op = "count";
        this._validate();

        if (Query.canMerge(criteria)) {
            this.merge(criteria);
        }

        return this;
    }

    _countExec() {
        const conds = this._conditions;
        const options = this._optionsForExec();

        return this._collection.count(conds, options);
    }

    /**
     * Declares or executes a distinct() operation.
     *
     * @param {Object|Query} [criteria]
     * @param {String} [field]
     * @param {Function} [callback]
     * @returns {this}
     */
    distinct(criteria, field) {
        this.op = "distinct";
        this._validate();

        switch (typeof field) {
            case "undefined":
            case "string":
                break;
            default:
                throw new TypeError("Invalid `field` argument. Must be string or function");
        }

        switch (typeof criteria) {
            case "string":
                field = criteria;
                criteria = undefined;
                break;
        }

        if (is.string(field)) {
            this._distinct = field;
        }

        if (Query.canMerge(criteria)) {
            this.merge(criteria);
        }

        return this;
    }

    _distinctExec() {
        if (!this._distinct) {
            throw new Error("No value for `distinct` has been declared");
        }

        const conds = this._conditions;
        const options = this._optionsForExec();

        return this._collection.distinct(this._distinct, conds, options);
    }

    /**
     * Declare and/or execute this query as an `updateMany()` operation. Identical
     * to `update()` except `updateMany()` will update _all_ documents that match
     * `criteria`, rather than just the first one.
     *
     * _All paths passed that are not $atomic operations will become $set ops._
     *
     * @param {Object} [criteria]
     * @param {Object} [doc] the update command
     * @param {Object} [options]
     * @param {Function} [callback]
     * @returns {this}
     */
    updateMany(criteria, doc, options) {
        let force;

        switch (arguments.length) {
            case 1:
                switch (typeof criteria) {
                    case "boolean":
                        // execution with no callback (unsafe write)
                        force = criteria;
                        criteria = undefined;
                        break;
                    default:
                        doc = criteria;
                        criteria = options = undefined;
                        break;
                }
        }

        return this._prepareUpdate("updateMany", criteria, doc, options, force);
    }

    _updateManyExec() {
        return this._updateExec();
    }


    /**
     * Declare and/or execute this query as an `updateOne()` operation. Identical
     * to `update()` except `updateOne()` will _always_ update just one document,
     * regardless of the `multi` option.
     *
     * _All paths passed that are not $atomic operations will become $set ops._
     *
     * @param {Object} [criteria]
     * @param {Object} [doc] the update command
     * @param {Object} [options]
     * @param {Function} [callback]
     * @returns {this}
     */
    updateOne(criteria, doc, options) {
        let force;

        switch (arguments.length) {
            case 1:
                switch (typeof criteria) {
                    case "boolean":
                        // execution with no callback (unsafe write)
                        force = criteria;
                        criteria = undefined;
                        break;
                    default:
                        doc = criteria;
                        criteria = options = undefined;
                        break;
                }
        }

        return this._prepareUpdate("updateOne", criteria, doc, options, force);
    }

    _updateOneExec() {
        return this._updateExec();
    }

    /**
     * Declare and/or execute this query as an `replaceOne()` operation. Similar
     * to `updateOne()`, except `replaceOne()` is not allowed to use atomic
     * modifiers (`$set`, `$push`, etc.). Calling `replaceOne()` will always
     * replace the existing doc.
     *
     * @param {Object} [criteria]
     * @param {Object} [doc] the update command
     * @param {Object} [options]
     * @param {Function} [callback]
     * @returns {this}
     */
    replaceOne(criteria, doc, options) {
        let force;

        switch (arguments.length) {
            case 1:
                switch (typeof criteria) {
                    case "boolean":
                        // execution with no callback (unsafe write)
                        force = criteria;
                        criteria = undefined;
                        break;
                    default:
                        doc = criteria;
                        criteria = options = undefined;
                        break;
                }
        }

        this.setOptions({ overwrite: true });
        return this._prepareUpdate("replaceOne", criteria, doc, options, force);
    }

    _replaceOneExec() {
        return this._updateExec();
    }

    _prepareUpdate(op, criteria, doc, options, force) {
        this.op = op;

        if (Query.canMerge(criteria)) {
            this.merge(criteria);
        }

        if (doc) {
            this._mergeUpdate(doc);
        }

        if (is.object(options)) {
            // { overwrite: true }
            this.setOptions(options);
        }

        if (!force) {
            return this;
        }

        return this._updateExec(true);
    }

    /**
     * Declare and/or execute this query as an update() operation. By default,
     * `update()` only modifies the _first_ document that matches `criteria`.
     *
     * _All paths passed that are not $atomic operations will become $set ops._
     *
     * Passing an empty object `{}` as the doc will result in a no-op unless the `overwrite` option is passed.
     * Without the `overwrite` option set, the update operation will be ignored without sending the command to MongoDB so as to prevent accidently overwritting documents in the collection.
     *
     * @param {Object} [criteria]
     * @param {Object} [doc] the update command
     * @param {Object} [options]
     * @param {Function} [callback]
     * @returns {this}
     */
    update(criteria, doc, options) {
        let force;

        switch (arguments.length) {
            case 1:
                switch (typeof criteria) {
                    case "boolean":
                        // execution with no callback (unsafe write)
                        force = criteria;
                        criteria = undefined;
                        break;
                    default:
                        doc = criteria;
                        criteria = options = undefined;
                        break;
                }
        }

        return this._prepareUpdate("update", criteria, doc, options, force);
    }

    _updateExec(unsafe) {
        if (!this._update || !this.options.overwrite && Object.keys(this._update).length === 0) {
            return null; // todo: ok ?
        }

        const options = this._optionsForExec();

        if (unsafe) {
            options.safe = false;
        }

        const criteria = this._conditions;
        const doc = this._updateForExec();

        const p = this._collection[this.op](criteria, doc, options);

        if (unsafe) {
            p.catch(adone.noop); // todo: ok?
            return this;
        }
        return p;
    }

    /**
     * Declare and/or execute this query as a remove() operation.
     *
     * @param {Object|Query} [criteria] mongodb selector
     * @param {Function} [callback]
     * @returns {this}
     */
    remove(criteria) {
        this.op = "remove";
        let force;

        if (Query.canMerge(criteria)) {
            this.merge(criteria);
        } else if (criteria === true) {
            force = criteria;
            criteria = undefined;
        }

        if (!force) {
            return this;
        }

        return this._removeExec(true);
    }

    _removeExec(unsafe) {
        const options = this._optionsForExec();

        if (unsafe) {
            options.safe = false;
        }

        const conds = this._conditions;

        const p = this._collection.remove(conds, options);

        if (unsafe) {
            p.catch(adone.noop); // todo: ok?
            return this;
        }

        return p;
    }

    /**
     * Declare and/or execute this query as a `deleteOne()` operation. Behaves like
     * `remove()`, except for ignores the `justOne` option and always deletes at
     * most one document.
     *
     * @param {Object|Query} [criteria] mongodb selector
     * @param {Function} [callback]
     * @return {this}
     */
    deleteOne(criteria) {
        this.op = "deleteOne";
        let force;

        if (Query.canMerge(criteria)) {
            this.merge(criteria);
        } else if (criteria === true) {
            force = criteria;
            criteria = undefined;
        }

        if (!force) {
            return this;
        }

        return this._deleteOneExec(true);
    }

    _deleteOneExec(unsafe) {
        const options = this._optionsForExec();
        if (unsafe) {
            options.safe = false;
        }
        delete options.justOne;

        const conds = this._conditions;

        const p = this._collection.deleteOne(conds, options);

        if (unsafe) {
            p.catch(adone.noop); // todo: ok?
            return this;
        }

        return p;
    }

    /**
     * Declare and/or execute this query as a `deleteMany()` operation. Behaves like
     * `remove()`, except for ignores the `justOne` option and always deletes
     * _every_ document that matches `criteria`.
     *
     * @param {Object|Query} [criteria] mongodb selector
     * @param {Function} [callback]
     * @returns {this}
     */
    deleteMany(criteria) {
        this.op = "deleteMany";
        let force;

        if (Query.canMerge(criteria)) {
            this.merge(criteria);
        } else if (criteria === true) {
            force = criteria;
            criteria = undefined;
        }

        if (!force) {
            return this;
        }

        return this._deleteManyExec(true);
    }

    _deleteManyExec(unsafe) {
        const options = this._optionsForExec();
        if (unsafe) {
            options.safe = false;
        }
        delete options.justOne;

        const conds = this._conditions;

        const p = this._collection.deleteMany(conds, options);

        if (unsafe) {
            p.catch(adone.noop); // todo: ok?
            return this;
        }

        return p;
    }

    /**
     * Issues a mongodb [findAndModify](http://www.mongodb.org/display/DOCS/findAndModify+Command) update command.
     *
     * Finds a matching document, updates it according to the `update` arg, passing any `options`, and returns the found document (if any) to the callback. The query executes immediately if `callback` is passed.
     *
     * @param {Object|Query} [query]
     * @param {Object} [doc]
     * @param {Object} [options]
     * @param {Function} [callback]
     * @returns {this}
     */
    findOneAndUpdate(criteria, doc, options) {
        this.op = "findOneAndUpdate";
        this._validate();

        switch (arguments.length) {
            case 1:
                doc = criteria;
                criteria = options = undefined;
        }

        if (Query.canMerge(criteria)) {
            this.merge(criteria);
        }

        // apply doc
        if (doc) {
            this._mergeUpdate(doc);
        }

        options && this.setOptions(options);

        return this;
    }

    _findOneAndUpdateExec() {
        return this._findAndModify("update");
    }

    /**
     * Issues a mongodb [findAndModify](http://www.mongodb.org/display/DOCS/findAndModify+Command) remove command.
     *
     * Finds a matching document, removes it, passing the found document (if any) to the callback. Executes immediately if `callback` is passed.
     *
     * @param {Object} [conditions]
     * @param {Object} [options]
     * @param {Function} [callback]
     * @returns {this}
     */
    findOneAndRemove(conditions, options) {
        this.op = "findOneAndRemove";
        this._validate();

        // apply conditions
        if (Query.canMerge(conditions)) {
            this.merge(conditions);
        }

        // apply options
        options && this.setOptions(options);

        return this;
    }

    _findOneAndRemoveExec() {
        return this._findAndModify("remove");
    }

    _findAndModify(type) {
        const opts = this._optionsForExec();
        let doc;

        if (type === "remove") {
            opts.remove = true;
        } else {
            if (!("new" in opts)) {
                opts.new = true;
            }
            if (!("upsert" in opts)) {
                opts.upsert = false;
            }

            doc = this._updateForExec();
            if (!doc) {
                if (opts.upsert) {
                    // still need to do the upsert to empty doc
                    doc = { $set: {} };
                } else {
                    return this._findOneExec();
                }
            }
        }

        const fields = this._fieldsForExec();
        if (fields) {
            opts.fields = fields;
        }

        const conds = this._conditions;

        return this._collection.findAndModify(conds, doc, opts);
    }


    /**
     * Executes the query
     *
     * @param {String|Function} [operation]
     * @param {Function} [callback]
     */
    async exec(op, unsafe = false) {
        switch (typeof op) {
            case "boolean":
                unsafe = op;
                break;
            case "string":
                this.op = op;
                break;
        }

        if (!this.op) {
            throw new Error("Missing query type: (find, update, etc)");
        }

        return this[`_${this.op}Exec`](unsafe);
    }

    /**
     * Executes the query returning a `Promise` which will be
     * resolved with either the doc(s) or rejected with the error.
     *
     * @param {Function} [resolve]
     * @param {Function} [reject]
     * @return {Promise}
     */
    then(resolve, reject) {
        return this.exec().then(resolve, reject);
    }

    catch(reject) {
        return this.exec().then(null, reject);
    }

    /**
     * Returns a stream for the given find query.
     *
     * @throws Error if operation is not a find
     * @returns {Stream} Node 0.8 style
     */
    stream(streamOptions) {
        if (this.op !== "find") {
            throw new Error("stream() is only available for find");
        }

        const conds = this._conditions;

        const options = this._optionsForExec();
        options.fields = this._fieldsForExec();

        return this._collection.findStream(conds, options, streamOptions);
    }

    /**
     * Determines if field selection has been made.
     *
     * @return {Boolean}
     * @api public
     */
    selected() {
        return Boolean(this._fields && Object.keys(this._fields).length > 0);
    }

    /**
     * Determines if inclusive field selection has been made.
     *
     * @returns {Boolean}
     */
    selectedInclusively() {
        if (!this._fields) {
            return false;
        }

        const keys = Object.keys(this._fields);
        if (keys.length === 0) {
            return false;
        }

        for (let i = 0; i < keys.length; ++i) {
            const key = keys[i];
            if (this._fields[key] === 0) {
                return false;
            }
            if (this._fields[key]
                && is.object(this._fields[key])
                && this._fields[key].$meta
            ) {
                return false;
            }
        }

        return true;
    }

    /**
     * Determines if exclusive field selection has been made.
     *
     * @returns {Boolean}
     */
    selectedExclusively() {
        if (!this._fields) {
            return false;
        }

        const keys = Object.keys(this._fields);
        if (keys.length === 0) {
            return false;
        }

        for (let i = 0; i < keys.length; ++i) {
            const key = keys[i];
            if (this._fields[key] === 0) {
                return true;
            }
        }

        return false;
    }

    /**
     * Merges `doc` with the current update object.
     *
     * @param {Object} doc
     */
    _mergeUpdate(doc) {
        if (!this._update) {
            this._update = {};
        }
        if (doc instanceof Query) {
            if (doc._update) {
                util.mergeClone(this._update, doc._update);
            }
        } else {
            util.mergeClone(this._update, doc);
        }
    }

    /**
     * Returns default options.
     *
     * @return {Object}
     */
    _optionsForExec() {
        const options = util.clone(this.options, { retainKeyOrder: true });
        return options;
    }

    /**
     * Returns fields selection for this query.
     *
     * @return {Object}
     */
    _fieldsForExec() {
        return util.clone(this._fields, { retainKeyOrder: true });
    }

    /**
     * Return an update document with corrected $set operations.
     */
    _updateForExec() {
        const update = util.clone(this._update || {}, { retainKeyOrder: true });
        const ops = Object.keys(update);
        let i = ops.length;
        const ret = {};

        while (i--) {
            const op = ops[i];

            if (this.options.overwrite) {
                ret[op] = update[op];
                continue;
            }

            if (op[0] !== "$") {
                // fix up $set sugar
                if (!ret.$set) {
                    if (update.$set) {
                        ret.$set = update.$set;
                    } else {
                        ret.$set = {};
                    }
                }
                ret.$set[op] = update[op];
                ops.splice(i, 1);
                if (!ops.includes("$set")) {
                    ops.push("$set");
                }
            } else if (op === "$set") {
                if (!ret.$set) {
                    ret[op] = update[op];
                }
            } else {
                ret[op] = update[op];
            }
        }

        this._compiledUpdate = ret;
        return ret;
    }

    /**
     * Make sure _path is set.
     *
     * @param {String} method
     */
    _ensurePath(method) {
        if (!this._path) {
            const msg = `${method}() must be used after where() `
                + "when called with these arguments";
            throw new Error(msg);
        }
    }

    _validate(action) {
        let fail;
        let validator;

        if (undefined === action) {

            validator = Query.permissions[this.op];
            if (!is.function(validator)) {
                return true;
            }

            fail = validator(this);

        } else if (!Query._isPermitted(action, this.op)) {
            fail = action;
        }

        if (fail) {
            throw new Error(`${fail} cannot be used with ${this.op}`);
        }
    }

    static _isPermitted(a, b) {
        const denied = Query.permissions[b];
        if (!denied) {
            return true;
        }
        return denied[a] !== true;
    }

    /**
     * Determines if `conds` can be merged using `mquery().merge()`
     *
     * @param {Object} conds
     * @return {Boolean}
     */
    static canMerge(conds) {
        return conds instanceof Query || is.plainObject(conds);
    }
}

for (const conditional of [
    "gt", "gte", "lt",
    "lte", "ne", "in",
    "nin", "all", "regex",
    "size", "maxDistance", "minDistance"
]) {
    Query.prototype[conditional] = function (...args) { // eslint-disable-line
        let path;
        let val;

        if (args.length === 1) {
            this._ensurePath(conditional);
            [val] = args;
            path = this._path;
        } else {
            [path, val] = args;
        }

        if (!this._conditions[path]) {
            this._conditions[path] = {};
        }

        this._conditions[path][`$${conditional}`] = val;

        return this;
    };
}

for (const method of ["limit", "skip", "maxScan", "batchSize", "comment"]) {
    Query.prototype[method] = function (v) {
        this._validate(method);
        this.options[method] = v;
        return this;
    };
}

adone.lazify({
    permissions: "./permissions",
    Collection: "./collection"
}, Query, require);

adone.lazifyPrivate({
    Collection: "./__/collection",
    util: "./__/util"
}, Query, require);

const __ = adone.private(Query);
