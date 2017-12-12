const CastError = require("./error/cast");
const ObjectParameterError = require("./error/objectParameter");
const PromiseProvider = require("./promise_provider");
import QueryCursor from "./cursor/QueryCursor";
import QueryStream from "./querystream";
const cast = require("./cast");
const castUpdate = require("./services/query/castUpdate");
const hasDollarKeys = require("./services/query/hasDollarKeys");
const helpers = require("./queryhelpers");
const isInclusive = require("./services/projection/isInclusive");
const mquery = require("mquery");
const readPref = require("./drivers").ReadPreference;
const selectPopulatedFields = require("./services/query/selectPopulatedFields");
const setDefaultsOnInsert = require("./services/setDefaultsOnInsert");
const slice = require("sliced");
const updateValidators = require("./services/updateValidators");
const util = require("util");
const utils = require("./utils");

const {
    is
} = adone;

/*!
 * hydrates many documents
 *
 * @param {Model} model
 * @param {Array} docs
 * @param {Object} fields
 * @param {Query} self
 * @param {Array} [pop] array of paths used in population
 * @param {Function} callback
 */
const completeMany = function (model, docs, fields, userProvidedFields, pop, callback) {
    const arr = [];
    let count = docs.length;
    const len = count;
    const opts = pop ? { populated: pop } : undefined;
    let error = null;
    const init = function (_error) {
        if (!is.nil(error)) {
            return;
        }
        if (!is.nil(_error)) {
            error = _error;
            return callback(error);
        }
        --count || callback(null, arr);
    };
    for (let i = 0; i < len; ++i) {
        arr[i] = helpers.createModel(model, docs[i], fields, userProvidedFields);
        arr[i].init(docs[i], opts, init);
    }
};

/*!
 * castQuery
 * @api private
 */

const castQuery = function (query) {
    try {
        return query.cast(query.model);
    } catch (err) {
        return err;
    }
};

/*!
 * castDoc
 * @api private
 */

const castDoc = function (query, overwrite) {
    try {
        return query._castUpdate(query._update, overwrite);
    } catch (err) {
        return err;
    }
};

const decorateResult = function (res) {
    if (res) {
        res._kareemIgnore = true;
    }
    return res;
};

/*!
 * hydrates a document
 *
 * @param {Model} model
 * @param {Document} doc
 * @param {Object} res 3rd parameter to callback
 * @param {Object} fields
 * @param {Query} self
 * @param {Array} [pop] array of paths used in population
 * @param {Function} callback
 */
const completeOne = function (model, doc, res, options, fields, userProvidedFields, pop, callback) {
    const opts = pop ?
        { populated: pop }
        : undefined;

    const casted = helpers.createModel(model, doc, fields, userProvidedFields);
    casted.init(doc, opts, (err) => {
        if (err) {
            return callback(err);
        }

        if (options.rawResult) {
            res.value = casted;
            return callback(null, res);
        }
        if (options.passRawResult) {
            return callback(null, casted, decorateResult(res));
        }
        callback(null, casted);
    });
};

/*!
 * If the model is a discriminator type and not root, then add the key & value to the criteria.
 */
const prepareDiscriminatorCriteria = function (query) {
    if (!query || !query.model || !query.model.schema) {
        return;
    }

    const schema = query.model.schema;

    if (schema && schema.discriminatorMapping && !schema.discriminatorMapping.isRoot) {
        query._conditions[schema.discriminatorMapping.key] = schema.discriminatorMapping.value;
    }
};

const _completeOneLean = function (doc, res, opts, callback) {
    if (opts.rawResult) {
        return callback(null, res);
    }
    if (opts.passRawResult) {
        return callback(null, doc, decorateResult(res));
    }
    return callback(null, doc);
};

/*!
 * The mongodb driver 1.3.23 only supports the nested array sort
 * syntax. We must convert it or sorting findAndModify will not work.
 */
const convertSortToArray = function (opts) {
    if (is.array(opts.sort)) {
        return;
    }
    if (!utils.isObject(opts.sort)) {
        return;
    }

    const sort = [];

    for (const key in opts.sort) {
        if (utils.object.hasOwnProperty(opts.sort, key)) {
            sort.push([key, opts.sort[key]]);
        }
    }

    opts.sort = sort;
};

/*!
 * Internal helper for update, updateMany, updateOne, replaceOne
 */
const _update = function (query, op, conditions, doc, options, callback) {
    // make sure we don't send in the whole Document to merge()
    query.op = op;
    conditions = utils.toObject(conditions);

    const oldCb = callback;
    if (oldCb) {
        if (is.function(oldCb)) {
            callback = function (error, result) {
                oldCb(error, result ? result.result : { ok: 0, n: 0, nModified: 0 });
            };
        } else {
            throw new Error("Invalid callback() argument.");
        }
    }

    // strict is an option used in the update checking, make sure it gets set
    if (options) {
        if ("strict" in options) {
            query._mongooseOptions.strict = options.strict;
        }
    }

    // if doc is undefined at this point, this means this function is being
    // executed by exec(not always see below). Grab the update doc from here in
    // order to validate
    // This could also be somebody calling update() or update({}). Probably not a
    // common use case, check for _update to make sure we don't do anything bad
    if (!doc && query._update) {
        doc = query._updateForExec();
    }

    if (!(conditions instanceof Query) &&
        !is.nil(conditions) &&
        conditions.toString() !== "[object Object]") {
        query.error(new ObjectParameterError(conditions, "filter", op));
    } else {
        query.merge(conditions);
    }

    // validate the selector part of the query
    const castedQuery = castQuery(query);
    if (castedQuery instanceof Error) {
        query.error(castedQuery);
        if (callback) {
            callback(castedQuery);
            return query;
        } else if (!options || !options.dontThrowCastError) {
            throw castedQuery;
        }
    }

    // validate the update part of the query
    let castedDoc;
    try {
        const $options = { retainKeyOrder: true };
        if (options && options.minimize) {
            $options.minimize = true;
        }
        castedDoc = query._castUpdate(utils.clone(doc, $options),
            (options && options.overwrite) || op === "replaceOne");
    } catch (err) {
        query.error(castedQuery);
        if (callback) {
            callback(err);
            return query;
        } else if (!options || !options.dontThrowCastError) {
            throw err;
        }
    }

    castedDoc = setDefaultsOnInsert(query._conditions, query.schema, castedDoc, options);
    if (!castedDoc) {
        // Make sure promises know that this is still an update, see gh-2796
        query.op = op;
        callback && callback(null);
        return query;
    }

    if (utils.isObject(options)) {
        query.setOptions(options);
    }

    if (!query._update) {
        query._update = castedDoc;
    }

    // Hooks
    if (callback) {
        if (op === "update") {
            return query._execUpdate(callback);
        }
        return query[`_${op}`](callback);
    }

    return mquery.prototype[op].call(query, castedQuery, castedDoc, options, callback);
};

/**
 * Query constructor used for building queries.
 *
 * ####Example:
 *
 *     var query = new Query();
 *     query.setOptions({ lean : true });
 *     query.collection(model.collection);
 *     query.where('age').gte(21).exec(callback);
 *
 * @param {Object} [options]
 * @param {Object} [model]
 * @param {Object} [conditions]
 * @param {Object} [collection] Mongoose collection
 * @api private
 */
export default class Query extends mquery {
    constructor(conditions, options, model, collection) {
        super(collection, options);

        // this stuff is for dealing with custom queries created by #toConstructor
        if (!this._mongooseOptions) {
            this._mongooseOptions = {};
        }

        // this is the case where we have a CustomQuery, we need to check if we got
        // options passed in, and if we did, merge them in
        if (options) {
            const keys = Object.keys(options);
            for (let i = 0; i < keys.length; ++i) {
                const k = keys[i];
                this._mongooseOptions[k] = options[k];
            }
        }

        if (collection) {
            this.mongooseCollection = collection;
        }

        if (model) {
            this.model = model;
            this.schema = model.schema;
        }

        // this is needed because map reduce returns a model that can be queried, but
        // all of the queries on said model should be lean
        if (this.model && this.model._mapreduce) {
            this.lean();
        }

        if (conditions) {
            this.find(conditions);
        }

        this.options = this.options || {};
        if (!is.nil(this.schema) && !is.nil(this.schema.options.collation)) {
            this.options.collation = this.schema.options.collation;
        }

        if (this.schema) {
            const kareemOptions = {
                useErrorHandlers: true,
                numCallbackParams: 1,
                nullResultByDefault: true
            };
            this._count = this.model.hooks.createWrapper("count",
                Query.prototype._count, this, kareemOptions);
            this._execUpdate = this.model.hooks.createWrapper("update",
                Query.prototype._execUpdate, this, kareemOptions);
            this._find = this.model.hooks.createWrapper("find",
                Query.prototype._find, this, kareemOptions);
            this._findOne = this.model.hooks.createWrapper("findOne",
                Query.prototype._findOne, this, kareemOptions);
            this._findOneAndRemove = this.model.hooks.createWrapper("findOneAndRemove",
                Query.prototype._findOneAndRemove, this, kareemOptions);
            this._findOneAndUpdate = this.model.hooks.createWrapper("findOneAndUpdate",
                Query.prototype._findOneAndUpdate, this, kareemOptions);
            this._replaceOne = this.model.hooks.createWrapper("replaceOne",
                Query.prototype._replaceOne, this, kareemOptions);
            this._updateMany = this.model.hooks.createWrapper("updateMany",
                Query.prototype._updateMany, this, kareemOptions);
            this._updateOne = this.model.hooks.createWrapper("updateOne",
                Query.prototype._updateOne, this, kareemOptions);
        }
    }

    /**
     * Converts this query to a customized, reusable query constructor with all arguments and options retained.
     *
     * ####Example
     *
     *     // Create a query for adventure movies and read from the primary
     *     // node in the replica-set unless it is down, in which case we'll
     *     // read from a secondary node.
     *     var query = Movie.find({ tags: 'adventure' }).read('primaryPreferred');
     *
     *     // create a custom Query constructor based off these settings
     *     var Adventure = query.toConstructor();
     *
     *     // Adventure is now a subclass of mongoose.Query and works the same way but with the
     *     // default query parameters and options set.
     *     Adventure().exec(callback)
     *
     *     // further narrow down our query results while still using the previous settings
     *     Adventure().where({ name: /^Life/ }).exec(callback);
     *
     *     // since Adventure is a stand-alone constructor we can also add our own
     *     // helper methods and getters without impacting global queries
     *     Adventure.prototype.startsWith = function (prefix) {
     *       this.where({ name: new RegExp('^' + prefix) })
     *       return this;
     *     }
     *     Object.defineProperty(Adventure.prototype, 'highlyRated', {
     *       get: function () {
     *         this.where({ rating: { $gt: 4.5 }});
     *         return this;
     *       }
     *     })
     *     Adventure().highlyRated.startsWith('Life').exec(callback)
     *
     * New in 3.7.3
     *
     * @return {Query} subclass-of-Query
     * @api public
     */
    toConstructor() {
        const model = this.model;
        const coll = this.mongooseCollection;
        let p;

        class CustomQuery extends Query {
            constructor(criteria, options) {
                super(criteria, options || null, model, coll);
                this._mongooseOptions = utils.clone(p._mongooseOptions);
            }
        }
        // set inherited defaults
        p = CustomQuery.prototype;
        p.options = {};
        p.setOptions(this.options);

        p.op = this.op;
        p._conditions = utils.clone(this._conditions, { retainKeyOrder: true });
        p._fields = utils.clone(this._fields);
        p._update = utils.clone(this._update, {
            flattenDecimals: false,
            retainKeyOrder: true
        });
        p._path = this._path;
        p._distinct = this._distinct;
        p._collection = this._collection;
        p._mongooseOptions = this._mongooseOptions;

        return CustomQuery;
    }

    /**
     * Specifies a javascript function or expression to pass to MongoDBs query system.
     *
     * ####Example
     *
     *     query.$where('this.comments.length === 10 || this.name.length === 5')
     *
     *     // or
     *
     *     query.$where(function () {
     *       return this.comments.length === 10 || this.name.length === 5;
     *     })
     *
     * ####NOTE:
     *
     * Only use `$where` when you have a condition that cannot be met using other MongoDB operators like `$lt`.
     * **Be sure to read about all of [its caveats](http://docs.mongodb.org/manual/reference/operator/where/) before using.**
     *
     * @see $where http://docs.mongodb.org/manual/reference/operator/where/
     * @method $where
     * @param {String|Function} js javascript string or function
     * @return {Query} this
     * @memberOf Query
     * @method $where
     * @api public
     */

    /**
     * Specifies a `path` for use with chaining.
     *
     * ####Example
     *
     *     // instead of writing:
     *     User.find({age: {$gte: 21, $lte: 65}}, callback);
     *
     *     // we can instead write:
     *     User.where('age').gte(21).lte(65);
     *
     *     // passing query conditions is permitted
     *     User.find().where({ name: 'vonderful' })
     *
     *     // chaining
     *     User
     *     .where('age').gte(21).lte(65)
     *     .where('name', /^vonderful/i)
     *     .where('friends').slice(10)
     *     .exec(callback)
     *
     * @method where
     * @memberOf Query
     * @param {String|Object} [path]
     * @param {any} [val]
     * @return {Query} this
     * @api public
     */
    slice() {
        if (arguments.length === 0) {
            return this;
        }

        this._validate("slice");

        let path;
        let val;

        if (arguments.length === 1) {
            const arg = arguments[0];
            if (typeof arg === "object" && !is.array(arg)) {
                const keys = Object.keys(arg);
                const numKeys = keys.length;
                for (let i = 0; i < numKeys; ++i) {
                    this.slice(keys[i], arg[keys[i]]);
                }
                return this;
            }
            this._ensurePath("slice");
            path = this._path;
            val = arguments[0];
        } else if (arguments.length === 2) {
            if (is.number(arguments[0])) {
                this._ensurePath("slice");
                path = this._path;
                val = slice(arguments);
            } else {
                path = arguments[0];
                val = arguments[1];
            }
        } else if (arguments.length === 3) {
            path = arguments[0];
            val = slice(arguments, 1);
        }

        const p = {};
        p[path] = { $slice: val };
        return this.select(p);
    }

    /**
     * Specifies the complementary comparison value for paths specified with `where()`
     *
     * ####Example
     *
     *     User.where('age').equals(49);
     *
     *     // is the same as
     *
     *     User.where('age', 49);
     *
     * @method equals
     * @memberOf Query
     * @param {Object} val
     * @return {Query} this
     * @api public
     */

    /**
     * Specifies arguments for an `$or` condition.
     *
     * ####Example
     *
     *     query.or([{ color: 'red' }, { status: 'emergency' }])
     *
     * @see $or http://docs.mongodb.org/manual/reference/operator/or/
     * @method or
     * @memberOf Query
     * @param {Array} array array of conditions
     * @return {Query} this
     * @api public
     */

    /**
     * Specifies arguments for a `$nor` condition.
     *
     * ####Example
     *
     *     query.nor([{ color: 'green' }, { status: 'ok' }])
     *
     * @see $nor http://docs.mongodb.org/manual/reference/operator/nor/
     * @method nor
     * @memberOf Query
     * @param {Array} array array of conditions
     * @return {Query} this
     * @api public
     */

    /**
     * Specifies arguments for a `$and` condition.
     *
     * ####Example
     *
     *     query.and([{ color: 'green' }, { status: 'ok' }])
     *
     * @method and
     * @memberOf Query
     * @see $and http://docs.mongodb.org/manual/reference/operator/and/
     * @param {Array} array array of conditions
     * @return {Query} this
     * @api public
     */

    /**
     * Specifies a $gt query condition.
     *
     * When called with one argument, the most recent path passed to `where()` is used.
     *
     * ####Example
     *
     *     Thing.find().where('age').gt(21)
     *
     *     // or
     *     Thing.find().gt('age', 21)
     *
     * @method gt
     * @memberOf Query
     * @param {String} [path]
     * @param {Number} val
     * @see $gt http://docs.mongodb.org/manual/reference/operator/gt/
     * @api public
     */

    /**
     * Specifies a $gte query condition.
     *
     * When called with one argument, the most recent path passed to `where()` is used.
     *
     * @method gte
     * @memberOf Query
     * @param {String} [path]
     * @param {Number} val
     * @see $gte http://docs.mongodb.org/manual/reference/operator/gte/
     * @api public
     */

    /**
     * Specifies a $lt query condition.
     *
     * When called with one argument, the most recent path passed to `where()` is used.
     *
     * @method lt
     * @memberOf Query
     * @param {String} [path]
     * @param {Number} val
     * @see $lt http://docs.mongodb.org/manual/reference/operator/lt/
     * @api public
     */

    /**
     * Specifies a $lte query condition.
     *
     * When called with one argument, the most recent path passed to `where()` is used.
     *
     * @method lte
     * @see $lte http://docs.mongodb.org/manual/reference/operator/lte/
     * @memberOf Query
     * @param {String} [path]
     * @param {Number} val
     * @api public
     */

    /**
     * Specifies a $ne query condition.
     *
     * When called with one argument, the most recent path passed to `where()` is used.
     *
     * @see $ne http://docs.mongodb.org/manual/reference/operator/ne/
     * @method ne
     * @memberOf Query
     * @param {String} [path]
     * @param {Number} val
     * @api public
     */

    /**
     * Specifies an $in query condition.
     *
     * When called with one argument, the most recent path passed to `where()` is used.
     *
     * @see $in http://docs.mongodb.org/manual/reference/operator/in/
     * @method in
     * @memberOf Query
     * @param {String} [path]
     * @param {Number} val
     * @api public
     */

    /**
     * Specifies an $nin query condition.
     *
     * When called with one argument, the most recent path passed to `where()` is used.
     *
     * @see $nin http://docs.mongodb.org/manual/reference/operator/nin/
     * @method nin
     * @memberOf Query
     * @param {String} [path]
     * @param {Number} val
     * @api public
     */

    /**
     * Specifies an $all query condition.
     *
     * When called with one argument, the most recent path passed to `where()` is used.
     *
     * @see $all http://docs.mongodb.org/manual/reference/operator/all/
     * @method all
     * @memberOf Query
     * @param {String} [path]
     * @param {Number} val
     * @api public
     */

    /**
     * Specifies a $size query condition.
     *
     * When called with one argument, the most recent path passed to `where()` is used.
     *
     * ####Example
     *
     *     MyModel.where('tags').size(0).exec(function (err, docs) {
     *       if (err) return handleError(err);
     *
     *       assert(Array.isArray(docs));
     *       console.log('documents with 0 tags', docs);
     *     })
     *
     * @see $size http://docs.mongodb.org/manual/reference/operator/size/
     * @method size
     * @memberOf Query
     * @param {String} [path]
     * @param {Number} val
     * @api public
     */

    /**
     * Specifies a $regex query condition.
     *
     * When called with one argument, the most recent path passed to `where()` is used.
     *
     * @see $regex http://docs.mongodb.org/manual/reference/operator/regex/
     * @method regex
     * @memberOf Query
     * @param {String} [path]
     * @param {String|RegExp} val
     * @api public
     */

    /**
     * Specifies a $maxDistance query condition.
     *
     * When called with one argument, the most recent path passed to `where()` is used.
     *
     * @see $maxDistance http://docs.mongodb.org/manual/reference/operator/maxDistance/
     * @method maxDistance
     * @memberOf Query
     * @param {String} [path]
     * @param {Number} val
     * @api public
     */


    /**
    * Specifies a `$mod` condition, filters documents for documents whose
    * `path` property is a number that is equal to `remainder` modulo `divisor`.
    *
    * ####Example
    *
    *     // All find products whose inventory is odd
    *     Product.find().mod('inventory', [2, 1]);
    *     Product.find().where('inventory').mod([2, 1]);
    *     // This syntax is a little strange, but supported.
    *     Product.find().where('inventory').mod(2, 1);
    *
    * @method mod
    * @memberOf Query
    * @param {String} [path]
    * @param {Array} val must be of length 2, first element is `divisor`, 2nd element is `remainder`.
    * @return {Query} this
    * @see $mod http://docs.mongodb.org/manual/reference/operator/mod/
    * @api public
    */
    mod() {
        let val;
        let path;

        if (arguments.length === 1) {
            this._ensurePath("mod");
            val = arguments[0];
            path = this._path;
        } else if (arguments.length === 2 && !is.array(arguments[1])) {
            this._ensurePath("mod");
            val = slice(arguments);
            path = this._path;
        } else if (arguments.length === 3) {
            val = slice(arguments, 1);
            path = arguments[0];
        } else {
            val = arguments[1];
            path = arguments[0];
        }

        const conds = this._conditions[path] || (this._conditions[path] = {});
        conds.$mod = val;
        return this;
    }

    /**
     * Specifies an `$exists` condition
     *
     * ####Example
     *
     *     // { name: { $exists: true }}
     *     Thing.where('name').exists()
     *     Thing.where('name').exists(true)
     *     Thing.find().exists('name')
     *
     *     // { name: { $exists: false }}
     *     Thing.where('name').exists(false);
     *     Thing.find().exists('name', false);
     *
     * @method exists
     * @memberOf Query
     * @param {String} [path]
     * @param {Number} val
     * @return {Query} this
     * @see $exists http://docs.mongodb.org/manual/reference/operator/exists/
     * @api public
     */

    /**
     * Specifies an `$elemMatch` condition
     *
     * ####Example
     *
     *     query.elemMatch('comment', { author: 'autobot', votes: {$gte: 5}})
     *
     *     query.where('comment').elemMatch({ author: 'autobot', votes: {$gte: 5}})
     *
     *     query.elemMatch('comment', function (elem) {
     *       elem.where('author').equals('autobot');
     *       elem.where('votes').gte(5);
     *     })
     *
     *     query.where('comment').elemMatch(function (elem) {
     *       elem.where({ author: 'autobot' });
     *       elem.where('votes').gte(5);
     *     })
     *
     * @method elemMatch
     * @memberOf Query
     * @param {String|Object|Function} path
     * @param {Object|Function} criteria
     * @return {Query} this
     * @see $elemMatch http://docs.mongodb.org/manual/reference/operator/elemMatch/
     * @api public
     */

    /**
     * Defines a `$within` or `$geoWithin` argument for geo-spatial queries.
     *
     * ####Example
     *
     *     query.where(path).within().box()
     *     query.where(path).within().circle()
     *     query.where(path).within().geometry()
     *
     *     query.where('loc').within({ center: [50,50], radius: 10, unique: true, spherical: true });
     *     query.where('loc').within({ box: [[40.73, -73.9], [40.7, -73.988]] });
     *     query.where('loc').within({ polygon: [[],[],[],[]] });
     *
     *     query.where('loc').within([], [], []) // polygon
     *     query.where('loc').within([], []) // box
     *     query.where('loc').within({ type: 'LineString', coordinates: [...] }); // geometry
     *
     * **MUST** be used after `where()`.
     *
     * ####NOTE:
     *
     * As of Mongoose 3.7, `$geoWithin` is always used for queries. To change this behavior, see [Query.use$geoWithin](#query_Query-use%2524geoWithin).
     *
     * ####NOTE:
     *
     * In Mongoose 3.7, `within` changed from a getter to a function. If you need the old syntax, use [this](https://github.com/ebensing/mongoose-within).
     *
     * @method within
     * @see $polygon http://docs.mongodb.org/manual/reference/operator/polygon/
     * @see $box http://docs.mongodb.org/manual/reference/operator/box/
     * @see $geometry http://docs.mongodb.org/manual/reference/operator/geometry/
     * @see $center http://docs.mongodb.org/manual/reference/operator/center/
     * @see $centerSphere http://docs.mongodb.org/manual/reference/operator/centerSphere/
     * @memberOf Query
     * @return {Query} this
     * @api public
     */

    /**
     * Specifies a $slice projection for an array.
     *
     * ####Example
     *
     *     query.slice('comments', 5)
     *     query.slice('comments', -5)
     *     query.slice('comments', [10, 5])
     *     query.where('comments').slice(5)
     *     query.where('comments').slice([-10, 5])
     *
     * @method slice
     * @memberOf Query
     * @param {String} [path]
     * @param {Number} val number/range of elements to slice
     * @return {Query} this
     * @see mongodb http://www.mongodb.org/display/DOCS/Retrieving+a+Subset+of+Fields#RetrievingaSubsetofFields-RetrievingaSubrangeofArrayElements
     * @see $slice http://docs.mongodb.org/manual/reference/projection/slice/#prj._S_slice
     * @api public
     */

    /**
     * Specifies the maximum number of documents the query will return.
     *
     * ####Example
     *
     *     query.limit(20)
     *
     * ####Note
     *
     * Cannot be used with `distinct()`
     *
     * @method limit
     * @memberOf Query
     * @param {Number} val
     * @api public
     */

    /**
     * Specifies the number of documents to skip.
     *
     * ####Example
     *
     *     query.skip(100).limit(20)
     *
     * ####Note
     *
     * Cannot be used with `distinct()`
     *
     * @method skip
     * @memberOf Query
     * @param {Number} val
     * @see cursor.skip http://docs.mongodb.org/manual/reference/method/cursor.skip/
     * @api public
     */

    /**
     * Specifies the maxScan option.
     *
     * ####Example
     *
     *     query.maxScan(100)
     *
     * ####Note
     *
     * Cannot be used with `distinct()`
     *
     * @method maxScan
     * @memberOf Query
     * @param {Number} val
     * @see maxScan http://docs.mongodb.org/manual/reference/operator/maxScan/
     * @api public
     */

    /**
     * Specifies the batchSize option.
     *
     * ####Example
     *
     *     query.batchSize(100)
     *
     * ####Note
     *
     * Cannot be used with `distinct()`
     *
     * @method batchSize
     * @memberOf Query
     * @param {Number} val
     * @see batchSize http://docs.mongodb.org/manual/reference/method/cursor.batchSize/
     * @api public
     */

    /**
     * Specifies the `comment` option.
     *
     * ####Example
     *
     *     query.comment('login query')
     *
     * ####Note
     *
     * Cannot be used with `distinct()`
     *
     * @method comment
     * @memberOf Query
     * @param {Number} val
     * @see comment http://docs.mongodb.org/manual/reference/operator/comment/
     * @api public
     */

    /**
     * Specifies this query as a `snapshot` query.
     *
     * ####Example
     *
     *     query.snapshot() // true
     *     query.snapshot(true)
     *     query.snapshot(false)
     *
     * ####Note
     *
     * Cannot be used with `distinct()`
     *
     * @method snapshot
     * @memberOf Query
     * @see snapshot http://docs.mongodb.org/manual/reference/operator/snapshot/
     * @return {Query} this
     * @api public
     */

    /**
     * Sets query hints.
     *
     * ####Example
     *
     *     query.hint({ indexA: 1, indexB: -1})
     *
     * ####Note
     *
     * Cannot be used with `distinct()`
     *
     * @method hint
     * @memberOf Query
     * @param {Object} val a hint object
     * @return {Query} this
     * @see $hint http://docs.mongodb.org/manual/reference/operator/hint/
     * @api public
     */

    /**
     * Specifies which document fields to include or exclude (also known as the query "projection")
     *
     * When using string syntax, prefixing a path with `-` will flag that path as excluded. When a path does not have the `-` prefix, it is included. Lastly, if a path is prefixed with `+`, it forces inclusion of the path, which is useful for paths excluded at the [schema level](/docs/api.html#schematype_SchemaType-select).
     *
     * A projection _must_ be either inclusive or exclusive. In other words, you must
     * either list the fields to include (which excludes all others), or list the fields
     * to exclude (which implies all other fields are included). The [`_id` field is the only exception because MongoDB includes it by default](https://docs.mongodb.com/manual/tutorial/project-fields-from-query-results/#suppress-id-field).
     *
     * ####Example
     *
     *     // include a and b, exclude other fields
     *     query.select('a b');
     *
     *     // exclude c and d, include other fields
     *     query.select('-c -d');
     *
     *     // or you may use object notation, useful when
     *     // you have keys already prefixed with a "-"
     *     query.select({ a: 1, b: 1 });
     *     query.select({ c: 0, d: 0 });
     *
     *     // force inclusion of field excluded at schema level
     *     query.select('+path')
     *
     * @method select
     * @memberOf Query
     * @param {Object|String} arg
     * @return {Query} this
     * @see SchemaType
     * @api public
     */
    select() {
        let arg = arguments[0];
        if (!arg) {
            return this;
        }
        let i;
        let len;

        if (arguments.length !== 1) {
            throw new Error("Invalid select: select only takes 1 argument");
        }

        this._validate("select");

        const fields = this._fields || (this._fields = {});
        const userProvidedFields = this._userProvidedFields || (this._userProvidedFields = {});
        const type = typeof arg;

        if ((type == "string" || Object.prototype.toString.call(arg) === "[object Arguments]") &&
            is.number(arg.length) || is.array(arg)) {
            if (type == "string") {
                arg = arg.split(/\s+/);
            }

            for (i = 0, len = arg.length; i < len; ++i) {
                let field = arg[i];
                if (!field) {
                    continue;
                }
                const include = field[0] == "-" ? 0 : 1;
                if (include === 0) {
                    field = field.substring(1);
                }
                fields[field] = include;
                userProvidedFields[field] = include;
            }

            return this;
        }

        if (utils.isObject(arg)) {
            const keys = Object.keys(arg);
            for (i = 0; i < keys.length; ++i) {
                fields[keys[i]] = arg[keys[i]];
                userProvidedFields[keys[i]] = arg[keys[i]];
            }
            return this;
        }

        throw new TypeError("Invalid select() argument. Must be string or object.");
    }

    /**
     * _DEPRECATED_ Sets the slaveOk option.
     *
     * **Deprecated** in MongoDB 2.2 in favor of [read preferences](#query_Query-read).
     *
     * ####Example:
     *
     *     query.slaveOk() // true
     *     query.slaveOk(true)
     *     query.slaveOk(false)
     *
     * @method slaveOk
     * @memberOf Query
     * @deprecated use read() preferences instead if on mongodb >= 2.2
     * @param {Boolean} v defaults to true
     * @see mongodb http://docs.mongodb.org/manual/applications/replication/#read-preference
     * @see slaveOk http://docs.mongodb.org/manual/reference/method/rs.slaveOk/
     * @see read() #query_Query-read
     * @return {Query} this
     * @api public
     */

    /**
     * Determines the MongoDB nodes from which to read.
     *
     * ####Preferences:
     *
     *     primary - (default) Read from primary only. Operations will produce an error if primary is unavailable. Cannot be combined with tags.
     *     secondary            Read from secondary if available, otherwise error.
     *     primaryPreferred     Read from primary if available, otherwise a secondary.
     *     secondaryPreferred   Read from a secondary if available, otherwise read from the primary.
     *     nearest              All operations read from among the nearest candidates, but unlike other modes, this option will include both the primary and all secondaries in the random selection.
     *
     * Aliases
     *
     *     p   primary
     *     pp  primaryPreferred
     *     s   secondary
     *     sp  secondaryPreferred
     *     n   nearest
     *
     * ####Example:
     *
     *     new Query().read('primary')
     *     new Query().read('p')  // same as primary
     *
     *     new Query().read('primaryPreferred')
     *     new Query().read('pp') // same as primaryPreferred
     *
     *     new Query().read('secondary')
     *     new Query().read('s')  // same as secondary
     *
     *     new Query().read('secondaryPreferred')
     *     new Query().read('sp') // same as secondaryPreferred
     *
     *     new Query().read('nearest')
     *     new Query().read('n')  // same as nearest
     *
     *     // read from secondaries with matching tags
     *     new Query().read('s', [{ dc:'sf', s: 1 },{ dc:'ma', s: 2 }])
     *
     * Read more about how to use read preferrences [here](http://docs.mongodb.org/manual/applications/replication/#read-preference) and [here](http://mongodb.github.com/node-mongodb-native/driver-articles/anintroductionto1_1and2_2.html#read-preferences).
     *
     * @method read
     * @memberOf Query
     * @param {String} pref one of the listed preference options or aliases
     * @param {Array} [tags] optional tags for this query
     * @see mongodb http://docs.mongodb.org/manual/applications/replication/#read-preference
     * @see driver http://mongodb.github.com/node-mongodb-native/driver-articles/anintroductionto1_1and2_2.html#read-preferences
     * @return {Query} this
     * @api public
     */
    read(pref, tags) {
        // first cast into a ReadPreference object to support tags
        const read = readPref.call(readPref, pref, tags);
        this.options.readPreference = read;
        return this;
    }

    /**
     * Merges another Query or conditions object into this one.
     *
     * When a Query is passed, conditions, field selection and options are merged.
     *
     * New in 3.7.0
     *
     * @method merge
     * @memberOf Query
     * @param {Query|Object} source
     * @return {Query} this
     */

    /**
     * Sets query options.
     *
     * ####Options:
     *
     * - [tailable](http://www.mongodb.org/display/DOCS/Tailable+Cursors) *
     * - [sort](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7Bsort(\)%7D%7D) *
     * - [limit](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7Blimit%28%29%7D%7D) *
     * - [skip](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7Bskip%28%29%7D%7D) *
     * - [maxscan](https://docs.mongodb.org/v3.2/reference/operator/meta/maxScan/#metaOp._S_maxScan) *
     * - [batchSize](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7BbatchSize%28%29%7D%7D) *
     * - [comment](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%24comment) *
     * - [snapshot](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7Bsnapshot%28%29%7D%7D) *
     * - [hint](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%24hint) *
     * - [readPreference](http://docs.mongodb.org/manual/applications/replication/#read-preference) **
     * - [lean](./api.html#query_Query-lean) *
     * - [safe](http://www.mongodb.org/display/DOCS/getLastError+Command)
     *
     * _* denotes a query helper method is also available_
     * _** query helper method to set `readPreference` is `read()`_
     *
     * @param {Object} options
     * @api public
     */
    setOptions(options, overwrite) {
        // overwrite is only for internal use
        if (overwrite) {
            // ensure that _mongooseOptions & options are two different objects
            this._mongooseOptions = (options && utils.clone(options)) || {};
            this.options = options || {};

            if ("populate" in options) {
                this.populate(this._mongooseOptions);
            }
            return this;
        }

        if (is.nil(options)) {
            return this;
        }

        if (is.array(options.populate)) {
            const populate = options.populate;
            delete options.populate;
            const _numPopulate = populate.length;
            for (let i = 0; i < _numPopulate; ++i) {
                this.populate(populate[i]);
            }
        }

        return super.setOptions(options);
    }

    /**
     * Returns the current query conditions as a JSON object.
     *
     * ####Example:
     *
     *     var query = new Query();
     *     query.find({ a: 1 }).where('b').gt(2);
     *     query.getQuery(); // { a: 1, b: { $gt: 2 } }
     *
     * @return {Object} current query conditions
     * @api public
     */
    getQuery() {
        return this._conditions;
    }

    /**
     * Returns the current update operations as a JSON object.
     *
     * ####Example:
     *
     *     var query = new Query();
     *     query.update({}, { $set: { a: 5 } });
     *     query.getUpdate(); // { $set: { a: 5 } }
     *
     * @return {Object} current update operations
     * @api public
     */
    getUpdate() {
        return this._update;
    }

    /**
     * Returns fields selection for this query.
     *
     * @method _fieldsForExec
     * @return {Object}
     * @api private
     * @receiver Query
     */

    /**
     * Return an update document with corrected $set operations.
     *
     * @method _updateForExec
     * @api private
     * @receiver Query
     */
    _updateForExec() {
        const update = utils.clone(this._update, {
            retainKeyOrder: true,
            transform: false,
            depopulate: true
        });
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
                if (!~ops.indexOf("$set")) {
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

        return ret;
    }

    /**
     * Makes sure _path is set.
     *
     * @method _ensurePath
     * @param {String} method
     * @api private
     * @receiver Query
     */

    /**
     * Determines if `conds` can be merged using `mquery().merge()`
     *
     * @method canMerge
     * @memberOf Query
     * @param {Object} conds
     * @return {Boolean}
     * @api private
     */

    /**
     * Returns default options for this query.
     *
     * @param {Model} model
     * @api private
     */
    _optionsForExec(model) {
        const options = super._optionsForExec.call(this);

        delete options.populate;
        delete options.retainKeyOrder;
        model = model || this.model;

        if (!model) {
            return options;
        }

        if (!("safe" in options) && model.schema.options.safe) {
            options.safe = model.schema.options.safe;
        }

        if (!("readPreference" in options) && model.schema.options.read) {
            options.readPreference = model.schema.options.read;
        }

        if (options.upsert !== void 0) {
            options.upsert = Boolean(options.upsert);
        }

        return options;
    }

    /**
     * Sets the lean option.
     *
     * Documents returned from queries with the `lean` option enabled are plain javascript objects, not [MongooseDocuments](#document-js). They have no `save` method, getters/setters or other Mongoose magic applied.
     *
     * ####Example:
     *
     *     new Query().lean() // true
     *     new Query().lean(true)
     *     new Query().lean(false)
     *
     *     Model.find().lean().exec(function (err, docs) {
     *       docs[0] instanceof mongoose.Document // false
     *     });
     *
     * This is a [great](https://groups.google.com/forum/#!topic/mongoose-orm/u2_DzDydcnA/discussion) option in high-performance read-only scenarios, especially when combined with [stream](#query_Query-stream).
     *
     * @param {Boolean|Object} bool defaults to true
     * @return {Query} this
     * @api public
     */
    lean(v) {
        this._mongooseOptions.lean = arguments.length ? v : true;
        return this;
    }

    /**
     * Gets/sets the error flag on this query. If this flag is not null or
     * undefined, the `exec()` promise will reject without executing.
     *
     * ####Example:
     *
     *     Query().error(); // Get current error value
     *     Query().error(null); // Unset the current error
     *     Query().error(new Error('test')); // `exec()` will resolve with test
     *     Schema.pre('find', function() {
     *       if (!this.getQuery().userId) {
     *         this.error(new Error('Not allowed to query without setting userId'));
     *       }
     *     });
     *
     * Note that query casting runs **after** hooks, so cast errors will override
     * custom errors.
     *
     * ####Example:
     *     var TestSchema = new Schema({ num: Number });
     *     var TestModel = db.model('Test', TestSchema);
     *     TestModel.find({ num: 'not a number' }).error(new Error('woops')).exec(function(error) {
     *       // `error` will be a cast error because `num` failed to cast
     *     });
     *
     * @param {Error|null} err if set, `exec()` will fail fast before sending the query to MongoDB
     * @returns {Query} this
     * @api public
     */
    error(err) {
        if (arguments.length === 0) {
            return this._error;
        }

        this._error = err;
        return this;
    }

    _unsetCastError() {
        if (!is.nil(this._error) && !(this._error instanceof CastError)) {
            return;
        }
        return this.error(null);
    }

    /**
     * Getter/setter around the current mongoose-specific options for this query
     * (populate, lean, etc.)
     *
     * @param {Object} options if specified, overwrites the current options
     * @returns {Object} the options
     * @api public
     */
    mongooseOptions(v) {
        if (arguments.length > 0) {
            this._mongooseOptions = v;
        }
        return this._mongooseOptions;
    }

    _castConditions() {
        try {
            this.cast(this.model);
            this._unsetCastError();
        } catch (err) {
            this.error(err);
        }
    }

    /**
     * Thunk around find()
     *
     * @param {Function} [callback]
     * @return {Query} this
     * @api private
     */
    _find(callback) {
        this._castConditions();

        if (!is.nil(this.error())) {
            callback(this.error());
            return this;
        }

        this._applyPaths();
        this._fields = this._castFields(this._fields);

        const fields = this._fieldsForExec();
        const options = this._mongooseOptions;
        const _this = this;
        const userProvidedFields = _this._userProvidedFields || {};

        const cb = function (err, docs) {
            if (err) {
                return callback(err);
            }

            if (docs.length === 0) {
                return callback(null, docs);
            }

            if (!options.populate) {
                return Boolean(options.lean) === true
                    ? callback(null, docs)
                    : completeMany(_this.model, docs, fields, userProvidedFields, null, callback);
            }

            const pop = helpers.preparePopulationOptionsMQ(_this, options);
            pop.__noPromise = true;
            _this.model.populate(docs, pop, (err, docs) => {
                if (err) {
                    return callback(err);
                }
                return Boolean(options.lean) === true
                    ? callback(null, docs)
                    : completeMany(_this.model, docs, fields, userProvidedFields, pop, callback);
            });
        };

        return super.find.call(this, {}, cb);
    }

    /**
     * Finds documents.
     *
     * When no `callback` is passed, the query is not executed. When the query is executed, the result will be an array of documents.
     *
     * ####Example
     *
     *     query.find({ name: 'Los Pollos Hermanos' }).find(callback)
     *
     * @param {Object} [criteria] mongodb selector
     * @param {Function} [callback]
     * @return {Query} this
     * @api public
     */
    find(conditions, callback) {
        if (is.function(conditions)) {
            callback = conditions;
            conditions = {};
        }

        conditions = utils.toObject(conditions);

        if (mquery.canMerge(conditions)) {
            this.merge(conditions);
            prepareDiscriminatorCriteria(this);
        } else if (!is.nil(conditions)) {
            this.error(new ObjectParameterError(conditions, "filter", "find"));
        }

        // if we don't have a callback, then just return the query object
        if (!callback) {
            return super.find.call(this);
        }

        this._find(callback);

        return this;
    }

    /**
     * Merges another Query or conditions object into this one.
     *
     * When a Query is passed, conditions, field selection and options are merged.
     *
     * @param {Query|Object} source
     * @return {Query} this
     */
    merge(source) {
        if (!source) {
            return this;
        }

        const opts = { retainKeyOrder: this.options.retainKeyOrder, overwrite: true };

        if (source instanceof Query) {
            // if source has a feature, apply it to ourselves

            if (source._conditions) {
                utils.merge(this._conditions, source._conditions, opts);
            }

            if (source._fields) {
                this._fields || (this._fields = {});
                utils.merge(this._fields, source._fields, opts);
            }

            if (source.options) {
                this.options || (this.options = {});
                utils.merge(this.options, source.options, opts);
            }

            if (source._update) {
                this._update || (this._update = {});
                utils.mergeClone(this._update, source._update);
            }

            if (source._distinct) {
                this._distinct = source._distinct;
            }

            return this;
        }

        // plain object
        utils.merge(this._conditions, source, opts);

        return this;
    }

    /**
     * Adds a collation to this op (MongoDB 3.4 and up)
     *
     * @param {Object} value
     * @return {Query} this
     * @see MongoDB docs https://docs.mongodb.com/manual/reference/method/cursor.collation/#cursor.collation
     * @api public
     */
    collation(value) {
        if (is.nil(this.options)) {
            this.options = {};
        }
        this.options.collation = value;
        return this;
    }

    /**
     * Thunk around findOne()
     *
     * @param {Function} [callback]
     * @see findOne http://docs.mongodb.org/manual/reference/method/db.collection.findOne/
     * @api private
     */
    _findOne(callback) {
        this._castConditions();

        if (this.error()) {
            return callback(this.error());
        }

        this._applyPaths();
        this._fields = this._castFields(this._fields);

        const options = this._mongooseOptions;
        const projection = this._fieldsForExec();
        const userProvidedFields = this._userProvidedFields || {};
        const _this = this;

        // don't pass in the conditions because we already merged them in
        super.findOne.call(_this, {}, (err, doc) => {
            if (err) {
                return callback(err);
            }
            if (!doc) {
                return callback(null, null);
            }

            if (!options.populate) {
                return Boolean(options.lean) === true
                    ? callback(null, doc)
                    : completeOne(_this.model, doc, null, {}, projection, userProvidedFields, null, callback);
            }

            const pop = helpers.preparePopulationOptionsMQ(_this, options);
            pop.__noPromise = true;
            _this.model.populate(doc, pop, (err, doc) => {
                if (err) {
                    return callback(err);
                }
                return Boolean(options.lean) === true
                    ? callback(null, doc)
                    : completeOne(_this.model, doc, null, {}, projection, userProvidedFields, pop, callback);
            });
        });
    }

    /**
     * Declares the query a findOne operation. When executed, the first found document is passed to the callback.
     *
     * Passing a `callback` executes the query. The result of the query is a single document.
     *
     * * *Note:* `conditions` is optional, and if `conditions` is null or undefined,
     * mongoose will send an empty `findOne` command to MongoDB, which will return
     * an arbitrary document. If you're querying by `_id`, use `Model.findById()`
     * instead.
     *
     * This function triggers the following middleware:
     * - `findOne()`
     *
     * ####Example
     *
     *     var query  = Kitten.where({ color: 'white' });
     *     query.findOne(function (err, kitten) {
     *       if (err) return handleError(err);
     *       if (kitten) {
     *         // doc may be null if no document matched
     *       }
     *     });
     *
     * @param {Object|Query} [criteria] mongodb selector
     * @param {Object} [projection] optional fields to return
     * @param {Function} [callback] optional params are (error, document)
     * @return {Query} this
     * @see findOne http://docs.mongodb.org/manual/reference/method/db.collection.findOne/
     * @see Query.select #query_Query-select
     * @api public
     */
    findOne(conditions, projection, options, callback) {
        if (is.function(conditions)) {
            callback = conditions;
            conditions = null;
            projection = null;
            options = null;
        } else if (is.function(projection)) {
            callback = projection;
            options = null;
            projection = null;
        } else if (is.function(options)) {
            callback = options;
            options = null;
        }

        // make sure we don't send in the whole Document to merge()
        conditions = utils.toObject(conditions);

        this.op = "findOne";

        if (options) {
            this.setOptions(options);
        }

        if (projection) {
            this.select(projection);
        }

        if (mquery.canMerge(conditions)) {
            this.merge(conditions);

            prepareDiscriminatorCriteria(this);

            try {
                this.cast(this.model);
                this.error(null);
            } catch (err) {
                this.error(err);
            }
        } else if (!is.nil(conditions)) {
            this.error(new ObjectParameterError(conditions, "filter", "findOne"));
        }

        if (!callback) {
            // already merged in the conditions, don't need to send them in.
            return super.findOne.call(this);
        }

        this._findOne(callback);

        return this;
    }

    /**
     * Thunk around count()
     *
     * @param {Function} [callback]
     * @see count http://docs.mongodb.org/manual/reference/method/db.collection.count/
     * @api private
     */
    _count(callback) {
        try {
            this.cast(this.model);
        } catch (err) {
            this.error(err);
        }

        if (this.error()) {
            return callback(this.error());
        }

        const conds = this._conditions;
        const options = this._optionsForExec();

        this._collection.count(conds, options, utils.tick(callback));
    }

    /**
     * Specifying this query as a `count` query.
     *
     * Passing a `callback` executes the query.
     *
     * This function triggers the following middleware:
     * - `count()`
     *
     * ####Example:
     *
     *     var countQuery = model.where({ 'color': 'black' }).count();
     *
     *     query.count({ color: 'black' }).count(callback)
     *
     *     query.count({ color: 'black' }, callback)
     *
     *     query.where('color', 'black').count(function (err, count) {
     *       if (err) return handleError(err);
     *       console.log('there are %d kittens', count);
     *     })
     *
     * @param {Object} [criteria] mongodb selector
     * @param {Function} [callback] optional params are (error, count)
     * @return {Query} this
     * @see count http://docs.mongodb.org/manual/reference/method/db.collection.count/
     * @api public
     */
    count(conditions, callback) {
        if (is.function(conditions)) {
            callback = conditions;
            conditions = undefined;
        }

        if (mquery.canMerge(conditions)) {
            this.merge(conditions);
        }

        this.op = "count";
        if (!callback) {
            return this;
        }

        this._count(callback);

        return this;
    }

    /**
     * Declares or executes a distict() operation.
     *
     * Passing a `callback` executes the query.
     *
     * This function does not trigger any middleware.
     *
     * ####Example
     *
     *     distinct(field, conditions, callback)
     *     distinct(field, conditions)
     *     distinct(field, callback)
     *     distinct(field)
     *     distinct(callback)
     *     distinct()
     *
     * @param {String} [field]
     * @param {Object|Query} [criteria]
     * @param {Function} [callback] optional params are (error, arr)
     * @return {Query} this
     * @see distinct http://docs.mongodb.org/manual/reference/method/db.collection.distinct/
     * @api public
     */
    distinct(field, conditions, callback) {
        if (!callback) {
            if (is.function(conditions)) {
                callback = conditions;
                conditions = undefined;
            } else if (is.function(field)) {
                callback = field;
                field = undefined;
                conditions = undefined;
            }
        }

        conditions = utils.toObject(conditions);

        if (mquery.canMerge(conditions)) {
            this.merge(conditions);
        }

        try {
            this.cast(this.model);
        } catch (err) {
            if (!callback) {
                throw err;
            }
            callback(err);
            return this;
        }

        return super.distinct.call(this, {}, field, callback);
    }

    /**
     * Sets the sort order
     *
     * If an object is passed, values allowed are `asc`, `desc`, `ascending`, `descending`, `1`, and `-1`.
     *
     * If a string is passed, it must be a space delimited list of path names. The
     * sort order of each path is ascending unless the path name is prefixed with `-`
     * which will be treated as descending.
     *
     * ####Example
     *
     *     // sort by "field" ascending and "test" descending
     *     query.sort({ field: 'asc', test: -1 });
     *
     *     // equivalent
     *     query.sort('field -test');
     *
     * ####Note
     *
     * Cannot be used with `distinct()`
     *
     * @param {Object|String} arg
     * @return {Query} this
     * @see cursor.sort http://docs.mongodb.org/manual/reference/method/cursor.sort/
     * @api public
     */
    sort(arg) {
        if (arguments.length > 1) {
            throw new Error("sort() only takes 1 Argument");
        }

        return super.sort.call(this, arg);
    }

    /**
     * Declare and/or execute this query as a remove() operation.
     *
     * This function does not trigger any middleware
     *
     * ####Example
     *
     *     Model.remove({ artist: 'Anne Murray' }, callback)
     *
     * ####Note
     *
     * The operation is only executed when a callback is passed. To force execution without a callback, you must first call `remove()` and then execute it by using the `exec()` method.
     *
     *     // not executed
     *     var query = Model.find().remove({ name: 'Anne Murray' })
     *
     *     // executed
     *     query.remove({ name: 'Anne Murray' }, callback)
     *     query.remove({ name: 'Anne Murray' }).remove(callback)
     *
     *     // executed without a callback
     *     query.exec()
     *
     *     // summary
     *     query.remove(conds, fn); // executes
     *     query.remove(conds)
     *     query.remove(fn) // executes
     *     query.remove()
     *
     * @param {Object|Query} [filter] mongodb selector
     * @param {Function} [callback] optional params are (error, writeOpResult)
     * @return {Query} this
     * @see writeOpResult http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html#~WriteOpResult
     * @see remove http://docs.mongodb.org/manual/reference/method/db.collection.remove/
     * @api public
     */
    remove(filter, callback) {
        if (is.function(filter)) {
            callback = filter;
            filter = null;
        }

        filter = utils.toObject(filter, { retainKeyOrder: true });

        try {
            this.cast(this.model, filter);
            this.merge(filter);
        } catch (err) {
            this.error(err);
        }

        prepareDiscriminatorCriteria(this);

        if (!callback) {
            return super.remove.call(this);
        }

        return this._remove(callback);
    }

    _remove(callback) {
        if (!is.nil(this.error())) {
            callback(this.error());
            return this;
        }

        return super.remove.call(this, callback);
    }

    /**
     * Declare and/or execute this query as a `deleteOne()` operation. Works like
     * remove, except it deletes at most one document regardless of the `single`
     * option.
     *
     * This function does not trigger any middleware.
     *
     * ####Example
     *
     *     Character.deleteOne({ name: 'Eddard Stark' }, callback)
     *     Character.deleteOne({ name: 'Eddard Stark' }).then(next)
     *
     * @param {Object|Query} [filter] mongodb selector
     * @param {Function} [callback] optional params are (error, writeOpResult)
     * @return {Query} this
     * @see writeOpResult http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html#~WriteOpResult
     * @see remove http://docs.mongodb.org/manual/reference/method/db.collection.remove/
     * @api public
     */
    deleteOne(filter, callback) {
        if (is.function(filter)) {
            callback = filter;
            filter = null;
        }

        filter = utils.toObject(filter, { retainKeyOrder: true });

        try {
            this.cast(this.model, filter);
            this.merge(filter);
        } catch (err) {
            this.error(err);
        }

        prepareDiscriminatorCriteria(this);

        if (!callback) {
            return super.deleteOne.call(this);
        }

        return this._deleteOne.call(this, callback);
    }

    _deleteOne(callback) {
        if (!is.nil(this.error())) {
            callback(this.error());
            return this;
        }

        return super.deleteOne.call(this, callback);
    }

    /**
     * Declare and/or execute this query as a `deleteMany()` operation. Works like
     * remove, except it deletes _every_ document that matches `criteria` in the
     * collection, regardless of the value of `single`.
     *
     * This function does not trigger any middleware
     *
     * ####Example
     *
     *     Character.deleteMany({ name: /Stark/, age: { $gte: 18 } }, callback)
     *     Character.deleteMany({ name: /Stark/, age: { $gte: 18 } }).then(next)
     *
     * @param {Object|Query} [filter] mongodb selector
     * @param {Function} [callback] optional params are (error, writeOpResult)
     * @return {Query} this
     * @see writeOpResult http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html#~WriteOpResult
     * @see remove http://docs.mongodb.org/manual/reference/method/db.collection.remove/
     * @api public
     */
    deleteMany(filter, callback) {
        if (is.function(filter)) {
            callback = filter;
            filter = null;
        }

        filter = utils.toObject(filter, { retainKeyOrder: true });

        try {
            this.cast(this.model, filter);
            this.merge(filter);
        } catch (err) {
            this.error(err);
        }

        prepareDiscriminatorCriteria(this);

        if (!callback) {
            return super.deleteMany.call(this);
        }

        return this._deleteMany.call(this, callback);
    }

    _deleteMany(callback) {
        if (!is.nil(this.error())) {
            callback(this.error());
            return this;
        }

        return super.deleteMany.call(this, callback);
    }

    /**
     * Issues a mongodb [findAndModify](http://www.mongodb.org/display/DOCS/findAndModify+Command) update command.
     *
     * Finds a matching document, updates it according to the `update` arg, passing any `options`, and returns the found document (if any) to the callback. The query executes immediately if `callback` is passed.
     *
     * This function triggers the following middleware:
     * - `findOneAndUpdate()`
     *
     * ####Available options
     *
     * - `new`: bool - if true, return the modified document rather than the original. defaults to false (changed in 4.0)
     * - `upsert`: bool - creates the object if it doesn't exist. defaults to false.
     * - `fields`: {Object|String} - Field selection. Equivalent to `.select(fields).findOneAndUpdate()`
     * - `sort`: if multiple docs are found by the conditions, sets the sort order to choose which doc to update
     * - `maxTimeMS`: puts a time limit on the query - requires mongodb >= 2.6.0
     * - `runValidators`: if true, runs [update validators](/docs/validation.html#update-validators) on this command. Update validators validate the update operation against the model's schema.
     * - `setDefaultsOnInsert`: if this and `upsert` are true, mongoose will apply the [defaults](http://mongoosejs.com/docs/defaults.html) specified in the model's schema if a new document is created. This option only works on MongoDB >= 2.4 because it relies on [MongoDB's `$setOnInsert` operator](https://docs.mongodb.org/v2.4/reference/operator/update/setOnInsert/).
     * - `passRawResult`: if true, passes the [raw result from the MongoDB driver as the third callback parameter](http://mongodb.github.io/node-mongodb-native/2.0/api/Collection.html#findAndModify)
     * - `context` (string) if set to 'query' and `runValidators` is on, `this` will refer to the query in custom validator functions that update validation runs. Does nothing if `runValidators` is false.
     * - `runSettersOnQuery`: bool - if true, run all setters defined on the associated model's schema for all fields defined in the query and the update.
     *
     * ####Callback Signature
     *     function(error, doc) {
     *       // error: any errors that occurred
     *       // doc: the document before updates are applied if `new: false`, or after updates if `new = true`
     *     }
     *
     * ####Examples
     *
     *     query.findOneAndUpdate(conditions, update, options, callback) // executes
     *     query.findOneAndUpdate(conditions, update, options)  // returns Query
     *     query.findOneAndUpdate(conditions, update, callback) // executes
     *     query.findOneAndUpdate(conditions, update)           // returns Query
     *     query.findOneAndUpdate(update, callback)             // returns Query
     *     query.findOneAndUpdate(update)                       // returns Query
     *     query.findOneAndUpdate(callback)                     // executes
     *     query.findOneAndUpdate()                             // returns Query
     *
     * @method findOneAndUpdate
     * @memberOf Query
     * @param {Object|Query} [query]
     * @param {Object} [doc]
     * @param {Object} [options]
     * @param {Boolean} [options.passRawResult] if true, passes the [raw result from the MongoDB driver as the third callback parameter](http://mongodb.github.io/node-mongodb-native/2.0/api/Collection.html#findAndModify)
     * @param {Boolean|String} [options.strict] overwrites the schema's [strict mode option](http://mongoosejs.com/docs/guide.html#strict)
     * @param {Boolean} [options.multipleCastError] by default, mongoose only returns the first error that occurred in casting the query. Turn on this option to aggregate all the cast errors.
     * @param {Function} [callback] optional params are (error, doc), _unless_ `passRawResult` is used, in which case params are (error, doc, writeOpResult)
     * @see mongodb http://www.mongodb.org/display/DOCS/findAndModify+Command
     * @see writeOpResult http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html#~WriteOpResult
     * @return {Query} this
     * @api public
     */
    findOneAndUpdate(criteria, doc, options, callback) {
        this.op = "findOneAndUpdate";
        this._validate();

        switch (arguments.length) {
            case 3:
                if (is.function(options)) {
                    callback = options;
                    options = {};
                }
                break;
            case 2:
                if (is.function(doc)) {
                    callback = doc;
                    doc = criteria;
                    criteria = undefined;
                }
                options = undefined;
                break;
            case 1:
                if (is.function(criteria)) {
                    callback = criteria;
                    criteria = options = doc = undefined;
                } else {
                    doc = criteria;
                    criteria = options = undefined;
                }
        }

        if (mquery.canMerge(criteria)) {
            this.merge(criteria);
        }

        // apply doc
        if (doc) {
            this._mergeUpdate(doc);
        }

        if (options) {
            options = utils.clone(options, { retainKeyOrder: true });
            if (options.projection) {
                this.select(options.projection);
                delete options.projection;
            }
            if (options.fields) {
                this.select(options.fields);
                delete options.fields;
            }

            this.setOptions(options);
        }

        if (!callback) {
            return this;
        }

        return this._findOneAndUpdate(callback);
    }

    /*!
    * Thunk around findOneAndUpdate()
    *
    * @param {Function} [callback]
    * @api private
    */
    _findOneAndUpdate(callback) {
        this._castConditions();

        if (!is.nil(this.error())) {
            return callback(this.error());
        }

        this._findAndModify("update", callback);
        return this;
    }

    /**
     * Issues a mongodb [findAndModify](http://www.mongodb.org/display/DOCS/findAndModify+Command) remove command.
     *
     * Finds a matching document, removes it, passing the found document (if any) to the callback. Executes immediately if `callback` is passed.
     *
     * This function triggers the following middleware:
     * - `findOneAndRemove()`
     *
     * ####Available options
     *
     * - `sort`: if multiple docs are found by the conditions, sets the sort order to choose which doc to update
     * - `maxTimeMS`: puts a time limit on the query - requires mongodb >= 2.6.0
     * - `passRawResult`: if true, passes the [raw result from the MongoDB driver as the third callback parameter](http://mongodb.github.io/node-mongodb-native/2.0/api/Collection.html#findAndModify)
     *
     * ####Callback Signature
     *     function(error, doc, result) {
     *       // error: any errors that occurred
     *       // doc: the document before updates are applied if `new: false`, or after updates if `new = true`
     *       // result: [raw result from the MongoDB driver](http://mongodb.github.io/node-mongodb-native/2.0/api/Collection.html#findAndModify)
     *     }
     *
     * ####Examples
     *
     *     A.where().findOneAndRemove(conditions, options, callback) // executes
     *     A.where().findOneAndRemove(conditions, options)  // return Query
     *     A.where().findOneAndRemove(conditions, callback) // executes
     *     A.where().findOneAndRemove(conditions) // returns Query
     *     A.where().findOneAndRemove(callback)   // executes
     *     A.where().findOneAndRemove()           // returns Query
     *
     * @method findOneAndRemove
     * @memberOf Query
     * @param {Object} [conditions]
     * @param {Object} [options]
     * @param {Boolean} [options.passRawResult] if true, passes the [raw result from the MongoDB driver as the third callback parameter](http://mongodb.github.io/node-mongodb-native/2.0/api/Collection.html#findAndModify)
     * @param {Boolean|String} [options.strict] overwrites the schema's [strict mode option](http://mongoosejs.com/docs/guide.html#strict)
     * @param {Function} [callback] optional params are (error, document)
     * @return {Query} this
     * @see mongodb http://www.mongodb.org/display/DOCS/findAndModify+Command
     * @api public
     */
    findOneAndRemove(conditions, options, callback) {
        this.op = "findOneAndRemove";
        this._validate();

        switch (arguments.length) {
            case 2:
                if (is.function(options)) {
                    callback = options;
                    options = {};
                }
                break;
            case 1:
                if (is.function(conditions)) {
                    callback = conditions;
                    conditions = undefined;
                    options = undefined;
                }
                break;
        }

        if (mquery.canMerge(conditions)) {
            this.merge(conditions);
        }

        options && this.setOptions(options);

        if (!callback) {
            return this;
        }

        this._findOneAndRemove(callback);

        return this;
    }

    /*!
    * Thunk around findOneAndRemove()
    *
    * @param {Function} [callback]
    * @return {Query} this
    * @api private
    */
    _findOneAndRemove(callback) {
        this._castConditions();

        if (!is.nil(this.error())) {
            return callback(this.error());
        }

        super.findOneAndRemove.call(this, callback);
    }

    /*!
    * Override mquery.prototype._findAndModify to provide casting etc.
    *
    * @param {String} type - either "remove" or "update"
    * @param {Function} callback
    * @api private
    */
    _findAndModify(type, callback) {
        if (!is.function(callback)) {
            throw new Error("Expected callback in _findAndModify");
        }

        const model = this.model;
        const schema = model.schema;
        const _this = this;
        let castedQuery;
        let castedDoc = this._update;
        let fields;
        let opts;
        let doValidate;

        castedQuery = castQuery(this);
        if (castedQuery instanceof Error) {
            return callback(castedQuery);
        }

        opts = this._optionsForExec(model);

        if ("strict" in opts) {
            this._mongooseOptions.strict = opts.strict;
        }

        const isOverwriting = this.options.overwrite && !hasDollarKeys(castedDoc);
        if (isOverwriting) {
            castedDoc = new this.model(castedDoc, null, true);
        }

        if (type === "remove") {
            opts.remove = true;
        } else {
            if (!("new" in opts)) {
                opts.new = false;
            }
            if (!("upsert" in opts)) {
                opts.upsert = false;
            }
            if (opts.upsert || opts.new) {
                opts.remove = false;
            }

            if (isOverwriting) {
                doValidate = function (callback) {
                    castedDoc.validate(callback);
                };
            } else {
                castedDoc = castDoc(this, opts.overwrite);
                castedDoc = setDefaultsOnInsert(this._conditions, schema, castedDoc, opts);
                if (!castedDoc) {
                    if (opts.upsert) {
                        // still need to do the upsert to empty doc
                        const doc = utils.clone(castedQuery);
                        delete doc._id;
                        castedDoc = { $set: doc };
                    } else {
                        return this.findOne(callback);
                    }
                } else if (castedDoc instanceof Error) {
                    return callback(castedDoc);
                } else {
                    // In order to make MongoDB 2.6 happy (see
                    // https://jira.mongodb.org/browse/SERVER-12266 and related issues)
                    // if we have an actual update document but $set is empty, junk the $set.
                    if (castedDoc.$set && Object.keys(castedDoc.$set).length === 0) {
                        delete castedDoc.$set;
                    }
                }

                doValidate = updateValidators(this, schema, castedDoc, opts);
            }
        }

        this._applyPaths();
        const userProvidedFields = this._userProvidedFields || {};

        const options = this._mongooseOptions;

        if (this._fields) {
            fields = utils.clone(this._fields);
            opts.fields = this._castFields(fields);
            if (opts.fields instanceof Error) {
                return callback(opts.fields);
            }
        }

        if (opts.sort) {
            convertSortToArray(opts);
        }

        const cb = function (err, doc, res) {
            if (err) {
                return callback(err);
            }

            if (!doc || (utils.isObject(doc) && Object.keys(doc).length === 0)) {
                if (opts.rawResult) {
                    return callback(null, res);
                }
                // opts.passRawResult will be deprecated soon
                if (opts.passRawResult) {
                    return callback(null, null, decorateResult(res));
                }
                return callback(null, null);
            }

            if (!options.populate) {
                if (Boolean(options.lean) === true) {
                    return _completeOneLean(doc, res, opts, callback);
                }
                return completeOne(_this.model, doc, res, opts, fields, userProvidedFields, null, callback);
            }

            const pop = helpers.preparePopulationOptionsMQ(_this, options);
            pop.__noPromise = true;
            _this.model.populate(doc, pop, (err, doc) => {
                if (err) {
                    return callback(err);
                }

                if (Boolean(options.lean) === true) {
                    return _completeOneLean(doc, res, opts, callback);
                }
                return completeOne(_this.model, doc, res, opts, fields, userProvidedFields, pop, callback);
            });
        };

        if (opts.runValidators && doValidate) {
            const _callback = function (error) {
                if (error) {
                    return callback(error);
                }
                if (castedDoc && castedDoc.toBSON) {
                    castedDoc = castedDoc.toBSON();
                }
                _this._collection.findAndModify(castedQuery, castedDoc, opts, utils.tick((error, res) => {
                    return cb(error, res ? res.value : res, res);
                }));
            };

            try {
                doValidate(_callback);
            } catch (error) {
                callback(error);
            }
        } else {
            if (castedDoc && castedDoc.toBSON) {
                castedDoc = castedDoc.toBSON();
            }
            this._collection.findAndModify(castedQuery, castedDoc, opts, utils.tick((error, res) => {
                return cb(error, res ? res.value : res, res);
            }));
        }

        return this;
    }

    /*!
    * Override mquery.prototype._mergeUpdate to handle mongoose objects in
    * updates.
    *
    * @param {Object} doc
    * @api private
    */
    _mergeUpdate(doc) {
        if (!this._update) {
            this._update = {};
        }
        if (doc instanceof Query) {
            if (doc._update) {
                utils.mergeClone(this._update, doc._update);
            }
        } else {
            utils.mergeClone(this._update, doc);
        }
    }


    /*!
    * Internal thunk for .update()
    *
    * @param {Function} callback
    * @see Model.update #model_Model.update
    * @api private
    */
    _execUpdate(callback) {
        const schema = this.model.schema;
        let doValidate;
        let _this;

        this._castConditions();

        const castedQuery = this._conditions;
        let castedDoc = this._update;
        const options = this.options;

        if (!is.nil(this.error())) {
            callback(this.error());
            return this;
        }

        const isOverwriting = this.options.overwrite && !hasDollarKeys(castedDoc);
        if (isOverwriting) {
            castedDoc = new this.model(castedDoc, null, true);
        }

        if (this.options.runValidators) {
            _this = this;
            if (isOverwriting) {
                doValidate = function (callback) {
                    castedDoc.validate(callback);
                };
            } else {
                doValidate = updateValidators(this, schema, castedDoc, options);
            }
            const _callback = function (err) {
                if (err) {
                    return callback(err);
                }

                if (castedDoc.toBSON) {
                    castedDoc = castedDoc.toBSON();
                }
                mquery.prototype.update.call(_this, castedQuery, castedDoc, options, callback);
            };
            try {
                doValidate(_callback);
            } catch (err) {
                process.nextTick(() => {
                    callback(err);
                });
            }
            return this;
        }

        if (castedDoc.toBSON) {
            castedDoc = castedDoc.toBSON();
        }
        super.update.call(this, castedQuery, castedDoc, options, callback);
        return this;
    }

    /*!
    * Internal thunk for .updateMany()
    *
    * @param {Function} callback
    * @see Model.update #model_Model.update
    * @api private
    */
    _updateMany(callback) {
        const schema = this.model.schema;
        let doValidate;
        let _this;

        this._castConditions();

        const castedQuery = this._conditions;
        const castedDoc = this._update;
        const options = this.options;

        if (!is.nil(this.error())) {
            callback(this.error());
            return this;
        }

        if (this.options.runValidators) {
            _this = this;
            doValidate = updateValidators(this, schema, castedDoc, options);
            const _callback = function (err) {
                if (err) {
                    return callback(err);
                }

                mquery.prototype.updateMany.call(_this, castedQuery, castedDoc, options, callback);
            };
            try {
                doValidate(_callback);
            } catch (err) {
                process.nextTick(() => {
                    callback(err);
                });
            }
            return this;
        }

        super.updateMany.call(this, castedQuery, castedDoc, options, callback);
        return this;
    }

    /*!
    * Internal thunk for .updateOne()
    *
    * @param {Function} callback
    * @see Model.update #model_Model.update
    * @api private
    */
    _updateOne(callback) {
        const schema = this.model.schema;
        let doValidate;
        let _this;

        this._castConditions();

        const castedQuery = this._conditions;
        const castedDoc = this._update;
        const options = this.options;

        if (!is.nil(this.error())) {
            callback(this.error());
            return this;
        }

        if (this.options.runValidators) {
            _this = this;
            doValidate = updateValidators(this, schema, castedDoc, options);
            const _callback = function (err) {
                if (err) {
                    return callback(err);
                }

                mquery.prototype.updateOne.call(_this, castedQuery, castedDoc, options, callback);
            };
            try {
                doValidate(_callback);
            } catch (err) {
                process.nextTick(() => {
                    callback(err);
                });
            }
            return this;
        }

        super.updateOne.call(this, castedQuery, castedDoc, options, callback);
        return this;
    }

    /*!
    * Internal thunk for .replaceOne()
    *
    * @param {Function} callback
    * @see Model.replaceOne #model_Model.replaceOne
    * @api private
    */
    _replaceOne(callback) {
        const schema = this.model.schema;
        let doValidate;
        let _this;

        const castedQuery = this._conditions;
        const castedDoc = this._update;
        const options = this.options;

        if (!is.nil(this.error())) {
            callback(this.error());
            return this;
        }

        if (this.options.runValidators) {
            _this = this;
            doValidate = updateValidators(this, schema, castedDoc, options);
            const _callback = function (err) {
                if (err) {
                    return callback(err);
                }

                mquery.prototype.replaceOne.call(_this, castedQuery, castedDoc, options, callback);
            };
            try {
                doValidate(_callback);
            } catch (err) {
                process.nextTick(() => {
                    callback(err);
                });
            }
            return this;
        }

        super.replaceOne.call(this, castedQuery, castedDoc, options, callback);
        return this;
    }

    /**
     * Declare and/or execute this query as an update() operation.
     *
     * _All paths passed that are not $atomic operations will become $set ops._
     *
     * This function triggers the following middleware:
     * - `update()`
     *
     * ####Example
     *
     *     Model.where({ _id: id }).update({ title: 'words' })
     *
     *     // becomes
     *
     *     Model.where({ _id: id }).update({ $set: { title: 'words' }})
     *
     * ####Valid options:
     *
     *  - `safe` (boolean) safe mode (defaults to value set in schema (true))
     *  - `upsert` (boolean) whether to create the doc if it doesn't match (false)
     *  - `multi` (boolean) whether multiple documents should be updated (false)
     *  - `runValidators`: if true, runs [update validators](/docs/validation.html#update-validators) on this command. Update validators validate the update operation against the model's schema.
     *  - `setDefaultsOnInsert`: if this and `upsert` are true, mongoose will apply the [defaults](http://mongoosejs.com/docs/defaults.html) specified in the model's schema if a new document is created. This option only works on MongoDB >= 2.4 because it relies on [MongoDB's `$setOnInsert` operator](https://docs.mongodb.org/v2.4/reference/operator/update/setOnInsert/).
     *  - `strict` (boolean) overrides the `strict` option for this update
     *  - `overwrite` (boolean) disables update-only mode, allowing you to overwrite the doc (false)
     *  - `context` (string) if set to 'query' and `runValidators` is on, `this` will refer to the query in custom validator functions that update validation runs. Does nothing if `runValidators` is false.
     *
     * ####Note
     *
     * Passing an empty object `{}` as the doc will result in a no-op unless the `overwrite` option is passed. Without the `overwrite` option set, the update operation will be ignored and the callback executed without sending the command to MongoDB so as to prevent accidently overwritting documents in the collection.
     *
     * ####Note
     *
     * The operation is only executed when a callback is passed. To force execution without a callback, we must first call update() and then execute it by using the `exec()` method.
     *
     *     var q = Model.where({ _id: id });
     *     q.update({ $set: { name: 'bob' }}).update(); // not executed
     *
     *     q.update({ $set: { name: 'bob' }}).exec(); // executed
     *
     *     // keys that are not $atomic ops become $set.
     *     // this executes the same command as the previous example.
     *     q.update({ name: 'bob' }).exec();
     *
     *     // overwriting with empty docs
     *     var q = Model.where({ _id: id }).setOptions({ overwrite: true })
     *     q.update({ }, callback); // executes
     *
     *     // multi update with overwrite to empty doc
     *     var q = Model.where({ _id: id });
     *     q.setOptions({ multi: true, overwrite: true })
     *     q.update({ });
     *     q.update(callback); // executed
     *
     *     // multi updates
     *     Model.where()
     *          .update({ name: /^match/ }, { $set: { arr: [] }}, { multi: true }, callback)
     *
     *     // more multi updates
     *     Model.where()
     *          .setOptions({ multi: true })
     *          .update({ $set: { arr: [] }}, callback)
     *
     *     // single update by default
     *     Model.where({ email: 'address@example.com' })
     *          .update({ $inc: { counter: 1 }}, callback)
     *
     * API summary
     *
     *     update(criteria, doc, options, cb) // executes
     *     update(criteria, doc, options)
     *     update(criteria, doc, cb) // executes
     *     update(criteria, doc)
     *     update(doc, cb) // executes
     *     update(doc)
     *     update(cb) // executes
     *     update(true) // executes
     *     update()
     *
     * @param {Object} [criteria]
     * @param {Object} [doc] the update command
     * @param {Object} [options]
     * @param {Boolean} [options.multipleCastError] by default, mongoose only returns the first error that occurred in casting the query. Turn on this option to aggregate all the cast errors.
     * @param {Function} [callback] optional, params are (error, writeOpResult)
     * @return {Query} this
     * @see Model.update #model_Model.update
     * @see update http://docs.mongodb.org/manual/reference/method/db.collection.update/
     * @see writeOpResult http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html#~WriteOpResult
     * @api public
     */
    update(conditions, doc, options, callback) {
        if (is.function(options)) {
            // .update(conditions, doc, callback)
            callback = options;
            options = null;
        } else if (is.function(doc)) {
            // .update(doc, callback);
            callback = doc;
            doc = conditions;
            conditions = {};
            options = null;
        } else if (is.function(conditions)) {
            // .update(callback)
            callback = conditions;
            conditions = undefined;
            doc = undefined;
            options = undefined;
        } else if (typeof conditions === "object" && !doc && !options && !callback) {
            // .update(doc)
            doc = conditions;
            conditions = undefined;
            options = undefined;
            callback = undefined;
        }

        return _update(this, "update", conditions, doc, options, callback);
    }

    /**
     * Declare and/or execute this query as an updateMany() operation. Same as
     * `update()`, except MongoDB will update _all_ documents that match
     * `criteria` (as opposed to just the first one) regardless of the value of
     * the `multi` option.
     *
     * **Note** updateMany will _not_ fire update middleware. Use `pre('updateMany')`
     * and `post('updateMany')` instead.
     *
     * This function triggers the following middleware:
     * - `updateMany()`
     *
     * @param {Object} [criteria]
     * @param {Object} [doc] the update command
     * @param {Object} [options]
     @param {Boolean} [options.multipleCastError] by default, mongoose only returns the first error that occurred in casting the query. Turn on this option to aggregate all the cast errors.
    * @param {Function} [callback] optional params are (error, writeOpResult)
    * @return {Query} this
    * @see Model.update #model_Model.update
    * @see update http://docs.mongodb.org/manual/reference/method/db.collection.update/
    * @see writeOpResult http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html#~WriteOpResult
    * @api public
    */
    updateMany(conditions, doc, options, callback) {
        if (is.function(options)) {
            // .update(conditions, doc, callback)
            callback = options;
            options = null;
        } else if (is.function(doc)) {
            // .update(doc, callback);
            callback = doc;
            doc = conditions;
            conditions = {};
            options = null;
        } else if (is.function(conditions)) {
            // .update(callback)
            callback = conditions;
            conditions = undefined;
            doc = undefined;
            options = undefined;
        } else if (typeof conditions === "object" && !doc && !options && !callback) {
            // .update(doc)
            doc = conditions;
            conditions = undefined;
            options = undefined;
            callback = undefined;
        }

        return _update(this, "updateMany", conditions, doc, options, callback);
    }

    /**
     * Declare and/or execute this query as an updateOne() operation. Same as
     * `update()`, except MongoDB will update _only_ the first document that
     * matches `criteria` regardless of the value of the `multi` option.
     *
     * **Note** updateOne will _not_ fire update middleware. Use `pre('updateOne')`
     * and `post('updateOne')` instead.
     *
     * This function triggers the following middleware:
     * - `updateOne()`
     *
     * @param {Object} [criteria]
     * @param {Object} [doc] the update command
     * @param {Object} [options]
     @param {Boolean} [options.multipleCastError] by default, mongoose only returns the first error that occurred in casting the query. Turn on this option to aggregate all the cast errors.
    * @param {Function} [callback] params are (error, writeOpResult)
    * @return {Query} this
    * @see Model.update #model_Model.update
    * @see update http://docs.mongodb.org/manual/reference/method/db.collection.update/
    * @see writeOpResult http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html#~WriteOpResult
    * @api public
    */
    updateOne(conditions, doc, options, callback) {
        if (is.function(options)) {
            // .update(conditions, doc, callback)
            callback = options;
            options = null;
        } else if (is.function(doc)) {
            // .update(doc, callback);
            callback = doc;
            doc = conditions;
            conditions = {};
            options = null;
        } else if (is.function(conditions)) {
            // .update(callback)
            callback = conditions;
            conditions = undefined;
            doc = undefined;
            options = undefined;
        } else if (typeof conditions === "object" && !doc && !options && !callback) {
            // .update(doc)
            doc = conditions;
            conditions = undefined;
            options = undefined;
            callback = undefined;
        }

        return _update(this, "updateOne", conditions, doc, options, callback);
    }

    /**
     * Declare and/or execute this query as a replaceOne() operation. Same as
     * `update()`, except MongoDB will replace the existing document and will
     * not accept any atomic operators (`$set`, etc.)
     *
     * **Note** replaceOne will _not_ fire update middleware. Use `pre('replaceOne')`
     * and `post('replaceOne')` instead.
     *
     * This function triggers the following middleware:
     * - `replaceOne()`
     *
     * @param {Object} [criteria]
     * @param {Object} [doc] the update command
     * @param {Object} [options]
     * @param {Function} [callback] optional params are (error, writeOpResult)
     * @return {Query} this
     * @see Model.update #model_Model.update
     * @see update http://docs.mongodb.org/manual/reference/method/db.collection.update/
     * @see writeOpResult http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html#~WriteOpResult
     * @api public
     */
    replaceOne(conditions, doc, options, callback) {
        if (is.function(options)) {
            // .update(conditions, doc, callback)
            callback = options;
            options = null;
        } else if (is.function(doc)) {
            // .update(doc, callback);
            callback = doc;
            doc = conditions;
            conditions = {};
            options = null;
        } else if (is.function(conditions)) {
            // .update(callback)
            callback = conditions;
            conditions = undefined;
            doc = undefined;
            options = undefined;
        } else if (typeof conditions === "object" && !doc && !options && !callback) {
            // .update(doc)
            doc = conditions;
            conditions = undefined;
            options = undefined;
            callback = undefined;
        }

        this.setOptions({ overwrite: true });
        return _update(this, "replaceOne", conditions, doc, options, callback);
    }

    /**
     * Executes the query
     *
     * ####Examples:
     *
     *     var promise = query.exec();
     *     var promise = query.exec('update');
     *
     *     query.exec(callback);
     *     query.exec('find', callback);
     *
     * @param {String|Function} [operation]
     * @param {Function} [callback] optional params depend on the function being called
     * @return {Promise}
     * @api public
     */
    exec(op, callback) {
        const Promise = PromiseProvider.get();
        const _this = this;

        if (is.function(op)) {
            callback = op;
            op = null;
        } else if (is.string(op)) {
            this.op = op;
        }

        let _results;
        const promise = new Promise.ES6(((resolve, reject) => {
            if (!_this.op) {
                resolve();
                return;
            }

            _this[_this.op].call(_this, function (error, res) {
                if (error) {
                    reject(error);
                    return;
                }
                _results = arguments;
                resolve(res);
            });
        }));

        if (callback) {
            promise.then(
                () => {
                    callback.apply(null, _results);
                    return null;
                },
                (error) => {
                    callback(error, null);
                }).
                catch((error) => {
                    // If we made it here, we must have an error in the callback re:
                    // gh-4500, so we need to emit.
                    setImmediate(() => {
                        _this.model.emit("error", error);
                    });
                });
        }

        return promise;
    }

    /**
     * Executes the query returning a `Promise` which will be
     * resolved with either the doc(s) or rejected with the error.
     *
     * @param {Function} [resolve]
     * @param {Function} [reject]
     * @return {Promise}
     * @api public
     */
    then(resolve, reject) {
        return this.exec().then(resolve, reject);
    }

    /**
     * Executes the query returning a `Promise` which will be
     * resolved with either the doc(s) or rejected with the error.
     * Like `.then()`, but only takes a rejection handler.
     *
     * @param {Function} [reject]
     * @return {Promise}
     * @api public
     */
    catch(reject) {
        return this.exec().then(null, reject);
    }

    /*!
    * Casts obj for an update command.
    *
    * @param {Object} obj
    * @return {Object} obj after casting its values
    * @api private
    */
    _castUpdate(obj, overwrite) {
        let strict;
        if ("strict" in this._mongooseOptions) {
            strict = this._mongooseOptions.strict;
        } else if (this.schema && this.schema.options) {
            strict = this.schema.options.strict;
        } else {
            strict = true;
        }
        return castUpdate(this.schema, obj, {
            overwrite,
            strict
        }, this);
    }

    /**
     * Specifies paths which should be populated with other documents.
     *
     * ####Example:
     *
     *     Kitten.findOne().populate('owner').exec(function (err, kitten) {
     *       console.log(kitten.owner.name) // Max
     *     })
     *
     *     Kitten.find().populate({
     *         path: 'owner'
     *       , select: 'name'
     *       , match: { color: 'black' }
     *       , options: { sort: { name: -1 }}
     *     }).exec(function (err, kittens) {
     *       console.log(kittens[0].owner.name) // Zoopa
     *     })
     *
     *     // alternatively
     *     Kitten.find().populate('owner', 'name', null, {sort: { name: -1 }}).exec(function (err, kittens) {
     *       console.log(kittens[0].owner.name) // Zoopa
     *     })
     *
     * Paths are populated after the query executes and a response is received. A separate query is then executed for each path specified for population. After a response for each query has also been returned, the results are passed to the callback.
     *
     * @param {Object|String} path either the path to populate or an object specifying all parameters
     * @param {Object|String} [select] Field selection for the population query
     * @param {Model} [model] The model you wish to use for population. If not specified, populate will look up the model by the name in the Schema's `ref` field.
     * @param {Object} [match] Conditions for the population query
     * @param {Object} [options] Options for the population query (sort, etc)
     * @see population ./populate.html
     * @see Query#select #query_Query-select
     * @see Model.populate #model_Model.populate
     * @return {Query} this
     * @api public
     */
    populate() {
        if (arguments.length === 0) {
            return this;
        }

        let i;

        const res = utils.populate.apply(null, arguments);

        // Propagate readPreference from parent query, unless one already specified
        if (this.options && !is.nil(this.options.readPreference)) {
            for (i = 0; i < res.length; ++i) {
                if (!res[i].options || is.nil(res[i].options.readPreference)) {
                    res[i].options = res[i].options || {};
                    res[i].options.readPreference = this.options.readPreference;
                }
            }
        }

        const opts = this._mongooseOptions;

        if (!utils.isObject(opts.populate)) {
            opts.populate = {};
        }

        const pop = opts.populate;

        for (i = 0; i < res.length; ++i) {
            const path = res[i].path;
            if (pop[path] && pop[path].populate && res[i].populate) {
                res[i].populate = pop[path].populate.concat(res[i].populate);
            }
            pop[res[i].path] = res[i];
        }

        return this;
    }

    /**
     * Casts this query to the schema of `model`
     *
     * ####Note
     *
     * If `obj` is present, it is cast instead of this query.
     *
     * @param {Model} model
     * @param {Object} [obj]
     * @return {Object}
     * @api public
     */
    cast(model, obj) {
        obj || (obj = this._conditions);

        try {
            return cast(model.schema, obj, {
                upsert: this.options && this.options.upsert,
                strict: (this.options && "strict" in this.options) ?
                    this.options.strict :
                    (model.schema.options && model.schema.options.strict),
                strictQuery: (this.options && this.options.strictQuery) ||
                    (model.schema.options && model.schema.options.strictQuery)
            }, this);
        } catch (err) {
            // CastError, assign model
            if (is.function(err.setModel)) {
                err.setModel(model);
            }
            throw err;
        }
    }

    /**
     * Casts selected field arguments for field selection with mongo 2.2
     *
     *     query.select({ ids: { $elemMatch: { $in: [hexString] }})
     *
     * @param {Object} fields
     * @see https://github.com/Automattic/mongoose/issues/1091
     * @see http://docs.mongodb.org/manual/reference/projection/elemMatch/
     * @api private
     */
    _castFields(fields) {
        let selected,
            elemMatchKeys,
            keys,
            key,
            out,
            i;

        if (fields) {
            keys = Object.keys(fields);
            elemMatchKeys = [];
            i = keys.length;

            // collect $elemMatch args
            while (i--) {
                key = keys[i];
                if (fields[key].$elemMatch) {
                    selected || (selected = {});
                    selected[key] = fields[key];
                    elemMatchKeys.push(key);
                }
            }
        }

        if (selected) {
            // they passed $elemMatch, cast em
            try {
                out = this.cast(this.model, selected);
            } catch (err) {
                return err;
            }

            // apply the casted field args
            i = elemMatchKeys.length;
            while (i--) {
                key = elemMatchKeys[i];
                fields[key] = out[key];
            }
        }

        return fields;
    }

    /**
     * Applies schematype selected options to this query.
     * @api private
     */
    _applyPaths() {
        this._fields = this._fields || {};
        helpers.applyPaths(this._fields, this.model.schema);
        selectPopulatedFields(this);
    }

    /**
     * Returns a Node.js 0.8 style [read stream](http://nodejs.org/docs/v0.8.21/api/stream.html#stream_readable_stream) interface.
     *
     * ####Example
     *
     *     // follows the nodejs 0.8 stream api
     *     Thing.find({ name: /^hello/ }).stream().pipe(res)
     *
     *     // manual streaming
     *     var stream = Thing.find({ name: /^hello/ }).stream();
     *
     *     stream.on('data', function (doc) {
     *       // do something with the mongoose document
     *     }).on('error', function (err) {
     *       // handle the error
     *     }).on('close', function () {
     *       // the stream is closed
     *     });
     *
     * ####Valid options
     *
     *   - `transform`: optional function which accepts a mongoose document. The return value of the function will be emitted on `data`.
     *
     * ####Example
     *
     *     // JSON.stringify all documents before emitting
     *     var stream = Thing.find().stream({ transform: JSON.stringify });
     *     stream.pipe(writeStream);
     *
     * @return {QueryStream}
     * @param {Object} [options]
     * @see QueryStream
     * @api public
     */
    stream(opts) {
        this._applyPaths();
        this._fields = this._castFields(this._fields);
        this._castConditions();
        return new QueryStream(this, opts);
    }

    /**
     * Returns a wrapper around a [mongodb driver cursor](http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html).
     * A QueryCursor exposes a [Streams3](https://strongloop.com/strongblog/whats-new-io-js-beta-streams3/)-compatible
     * interface, as well as a `.next()` function.
     *
     * The `.cursor()` function triggers pre find hooks, but **not** post find hooks.
     *
     * ####Example
     *
     *     // There are 2 ways to use a cursor. First, as a stream:
     *     Thing.
     *       find({ name: /^hello/ }).
     *       cursor().
     *       on('data', function(doc) { console.log(doc); }).
     *       on('end', function() { console.log('Done!'); });
     *
     *     // Or you can use `.next()` to manually get the next doc in the stream.
     *     // `.next()` returns a promise, so you can use promises or callbacks.
     *     var cursor = Thing.find({ name: /^hello/ }).cursor();
     *     cursor.next(function(error, doc) {
     *       console.log(doc);
     *     });
     *
     *     // Because `.next()` returns a promise, you can use co
     *     // to easily iterate through all documents without loading them
     *     // all into memory.
     *     co(function*() {
     *       const cursor = Thing.find({ name: /^hello/ }).cursor();
     *       for (let doc = yield cursor.next(); doc != null; doc = yield cursor.next()) {
     *         console.log(doc);
     *       }
     *     });
     *
     * ####Valid options
     *
     *   - `transform`: optional function which accepts a mongoose document. The return value of the function will be emitted on `data` and returned by `.next()`.
     *
     * @return {QueryCursor}
     * @param {Object} [options]
     * @see QueryCursor
     * @api public
     */
    cursor(opts) {
        this._applyPaths();
        this._fields = this._castFields(this._fields);
        this.setOptions({ fields: this._fieldsForExec() });
        if (opts) {
            this.setOptions(opts);
        }

        try {
            this.cast(this.model);
        } catch (err) {
            return (new QueryCursor(this, this.options))._markError(err);
        }

        return new QueryCursor(this, this.options);
    }

    /**
     * Sets the tailable option (for use with capped collections).
     *
     * ####Example
     *
     *     query.tailable() // true
     *     query.tailable(true)
     *     query.tailable(false)
     *
     * ####Note
     *
     * Cannot be used with `distinct()`
     *
     * @param {Boolean} bool defaults to true
     * @param {Object} [opts] options to set
     * @param {Number} [opts.numberOfRetries] if cursor is exhausted, retry this many times before giving up
     * @param {Number} [opts.tailableRetryInterval] if cursor is exhausted, wait this many milliseconds before retrying
     * @see tailable http://docs.mongodb.org/manual/tutorial/create-tailable-cursor/
     * @api public
     */
    tailable(val, opts) {
        // we need to support the tailable({ awaitdata : true }) as well as the
        // tailable(true, {awaitdata :true}) syntax that mquery does not support
        if (val && val.constructor.name === "Object") {
            opts = val;
            val = true;
        }

        if (is.undefined(val)) {
            val = true;
        }

        if (opts && typeof opts === "object") {
            for (const key in opts) {
                if (key === "awaitdata") {
                    // For backwards compatibility
                    this.options[key] = Boolean(opts[key]);
                } else {
                    this.options[key] = opts[key];
                }
            }
        }

        return super.tailable.call(this, val);
    }

    /**
     * Declares an intersects query for `geometry()`.
     *
     * ####Example
     *
     *     query.where('path').intersects().geometry({
     *         type: 'LineString'
     *       , coordinates: [[180.0, 11.0], [180, 9.0]]
     *     })
     *
     *     query.where('path').intersects({
     *         type: 'LineString'
     *       , coordinates: [[180.0, 11.0], [180, 9.0]]
     *     })
     *
     * ####NOTE:
     *
     * **MUST** be used after `where()`.
     *
     * ####NOTE:
     *
     * In Mongoose 3.7, `intersects` changed from a getter to a function. If you need the old syntax, use [this](https://github.com/ebensing/mongoose-within).
     *
     * @method intersects
     * @memberOf Query
     * @param {Object} [arg]
     * @return {Query} this
     * @see $geometry http://docs.mongodb.org/manual/reference/operator/geometry/
     * @see geoIntersects http://docs.mongodb.org/manual/reference/operator/geoIntersects/
     * @api public
     */

    /**
     * Specifies a `$geometry` condition
     *
     * ####Example
     *
     *     var polyA = [[[ 10, 20 ], [ 10, 40 ], [ 30, 40 ], [ 30, 20 ]]]
     *     query.where('loc').within().geometry({ type: 'Polygon', coordinates: polyA })
     *
     *     // or
     *     var polyB = [[ 0, 0 ], [ 1, 1 ]]
     *     query.where('loc').within().geometry({ type: 'LineString', coordinates: polyB })
     *
     *     // or
     *     var polyC = [ 0, 0 ]
     *     query.where('loc').within().geometry({ type: 'Point', coordinates: polyC })
     *
     *     // or
     *     query.where('loc').intersects().geometry({ type: 'Point', coordinates: polyC })
     *
     * The argument is assigned to the most recent path passed to `where()`.
     *
     * ####NOTE:
     *
     * `geometry()` **must** come after either `intersects()` or `within()`.
     *
     * The `object` argument must contain `type` and `coordinates` properties.
     * - type {String}
     * - coordinates {Array}
     *
     * @method geometry
     * @memberOf Query
     * @param {Object} object Must contain a `type` property which is a String and a `coordinates` property which is an Array. See the examples.
     * @return {Query} this
     * @see $geometry http://docs.mongodb.org/manual/reference/operator/geometry/
     * @see http://docs.mongodb.org/manual/release-notes/2.4/#new-geospatial-indexes-with-geojson-and-improved-spherical-geometry
     * @see http://www.mongodb.org/display/DOCS/Geospatial+Indexing
     * @api public
     */

    /**
     * Specifies a `$near` or `$nearSphere` condition
     *
     * These operators return documents sorted by distance.
     *
     * ####Example
     *
     *     query.where('loc').near({ center: [10, 10] });
     *     query.where('loc').near({ center: [10, 10], maxDistance: 5 });
     *     query.where('loc').near({ center: [10, 10], maxDistance: 5, spherical: true });
     *     query.near('loc', { center: [10, 10], maxDistance: 5 });
     *
     * @method near
     * @memberOf Query
     * @param {String} [path]
     * @param {Object} val
     * @return {Query} this
     * @see $near http://docs.mongodb.org/manual/reference/operator/near/
     * @see $nearSphere http://docs.mongodb.org/manual/reference/operator/nearSphere/
     * @see $maxDistance http://docs.mongodb.org/manual/reference/operator/maxDistance/
     * @see http://www.mongodb.org/display/DOCS/Geospatial+Indexing
     * @api public
     */

    /*!
    * Overwriting mquery is needed to support a couple different near() forms found in older
    * versions of mongoose
    * near([1,1])
    * near(1,1)
    * near(field, [1,2])
    * near(field, 1, 2)
    * In addition to all of the normal forms supported by mquery
    */
    near() {
        const params = [];
        const sphere = this._mongooseOptions.nearSphere;

        // TODO refactor

        if (arguments.length === 1) {
            if (is.array(arguments[0])) {
                params.push({ center: arguments[0], spherical: sphere });
            } else if (is.string(arguments[0])) {
                // just passing a path
                params.push(arguments[0]);
            } else if (utils.isObject(arguments[0])) {
                if (!is.boolean(arguments[0].spherical)) {
                    arguments[0].spherical = sphere;
                }
                params.push(arguments[0]);
            } else {
                throw new TypeError("invalid argument");
            }
        } else if (arguments.length === 2) {
            if (is.number(arguments[0]) && is.number(arguments[1])) {
                params.push({ center: [arguments[0], arguments[1]], spherical: sphere });
            } else if (is.string(arguments[0]) && is.array(arguments[1])) {
                params.push(arguments[0]);
                params.push({ center: arguments[1], spherical: sphere });
            } else if (is.string(arguments[0]) && utils.isObject(arguments[1])) {
                params.push(arguments[0]);
                if (!is.boolean(arguments[1].spherical)) {
                    arguments[1].spherical = sphere;
                }
                params.push(arguments[1]);
            } else {
                throw new TypeError("invalid argument");
            }
        } else if (arguments.length === 3) {
            if (is.string(arguments[0]) && is.number(arguments[1])
                && is.number(arguments[2])) {
                params.push(arguments[0]);
                params.push({ center: [arguments[1], arguments[2]], spherical: sphere });
            } else {
                throw new TypeError("invalid argument");
            }
        } else {
            throw new TypeError("invalid argument");
        }

        return super.near.apply(this, params);
    }

    /**
     * _DEPRECATED_ Specifies a `$nearSphere` condition
     *
     * ####Example
     *
     *     query.where('loc').nearSphere({ center: [10, 10], maxDistance: 5 });
     *
     * **Deprecated.** Use `query.near()` instead with the `spherical` option set to `true`.
     *
     * ####Example
     *
     *     query.where('loc').near({ center: [10, 10], spherical: true });
     *
     * @deprecated
     * @see near() #query_Query-near
     * @see $near http://docs.mongodb.org/manual/reference/operator/near/
     * @see $nearSphere http://docs.mongodb.org/manual/reference/operator/nearSphere/
     * @see $maxDistance http://docs.mongodb.org/manual/reference/operator/maxDistance/
     */
    nearSphere() {
        this._mongooseOptions.nearSphere = true;
        this.near.apply(this, arguments);
        return this;
    }

    /**
     * Specifies a $polygon condition
     *
     * ####Example
     *
     *     query.where('loc').within().polygon([10,20], [13, 25], [7,15])
     *     query.polygon('loc', [10,20], [13, 25], [7,15])
     *
     * @method polygon
     * @memberOf Query
     * @param {String|Array} [path]
     * @param {Array|Object} [coordinatePairs...]
     * @return {Query} this
     * @see $polygon http://docs.mongodb.org/manual/reference/operator/polygon/
     * @see http://www.mongodb.org/display/DOCS/Geospatial+Indexing
     * @api public
     */

    /**
     * Specifies a $box condition
     *
     * ####Example
     *
     *     var lowerLeft = [40.73083, -73.99756]
     *     var upperRight= [40.741404,  -73.988135]
     *
     *     query.where('loc').within().box(lowerLeft, upperRight)
     *     query.box({ ll : lowerLeft, ur : upperRight })
     *
     * @method box
     * @memberOf Query
     * @see $box http://docs.mongodb.org/manual/reference/operator/box/
     * @see within() Query#within #query_Query-within
     * @see http://www.mongodb.org/display/DOCS/Geospatial+Indexing
     * @param {Object} val
     * @param [Array] Upper Right Coords
     * @return {Query} this
     * @api public
     */

    /*!
    * this is needed to support the mongoose syntax of:
    * box(field, { ll : [x,y], ur : [x2,y2] })
    * box({ ll : [x,y], ur : [x2,y2] })
    */
    box(ll, ur) {
        if (!is.array(ll) && utils.isObject(ll)) {
            ur = ll.ur;
            ll = ll.ll;
        }
        return super.box.call(this, ll, ur);
    }

    /**
     * _DEPRECATED_ Specifies a $centerSphere condition
     *
     * **Deprecated.** Use [circle](#query_Query-circle) instead.
     *
     * ####Example
     *
     *     var area = { center: [50, 50], radius: 10 };
     *     query.where('loc').within().centerSphere(area);
     *
     * @deprecated
     * @param {String} [path]
     * @param {Object} val
     * @return {Query} this
     * @see http://www.mongodb.org/display/DOCS/Geospatial+Indexing
     * @see $centerSphere http://docs.mongodb.org/manual/reference/operator/centerSphere/
     * @api public
     */
    centerSphere() {
        if (arguments[0] && arguments[0].constructor.name === "Object") {
            arguments[0].spherical = true;
        }

        if (arguments[1] && arguments[1].constructor.name === "Object") {
            arguments[1].spherical = true;
        }

        super.circle.apply(this, arguments);
    }

    /**
     * Determines if field selection has been made.
     *
     * @method selected
     * @memberOf Query
     * @return {Boolean}
     * @api public
     */

    /**
     * Determines if inclusive field selection has been made.
     *
     *     query.selectedInclusively() // false
     *     query.select('name')
     *     query.selectedInclusively() // true
     *
     * @method selectedInclusively
     * @memberOf Query
     * @return {Boolean}
     * @api public
     */
    selectedInclusively() {
        return isInclusive(this._fields);
    }

    /**
     * Determines if exclusive field selection has been made.
     *
     *     query.selectedExclusively() // false
     *     query.select('-name')
     *     query.selectedExclusively() // true
     *     query.selectedInclusively() // false
     *
     * @method selectedExclusively
     * @memberOf Query
     * @return {Boolean}
     * @api public
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
            if (key === "_id") {
                continue;
            }
            if (this._fields[key] === 0 || this._fields[key] === false) {
                return true;
            }
        }

        return false;
    }
}

/**
 * Flag to opt out of using `$geoWithin`.
 *
 *     mongoose.Query.use$geoWithin = false;
 *
 * MongoDB 2.4 deprecated the use of `$within`, replacing it with `$geoWithin`. Mongoose uses `$geoWithin` by default (which is 100% backward compatible with $within). If you are running an older version of MongoDB, set this flag to `false` so your `within()` queries continue to work.
 *
 * @see http://docs.mongodb.org/manual/reference/operator/geoWithin/
 * @default true
 * @property use$geoWithin
 * @memberOf Query
 * @receiver Query
 * @api public
 */

Query.use$geoWithin = mquery.use$geoWithin;

Query.prototype.stream = util.deprecate(Query.prototype.stream, "Mongoose: " +
    "Query.prototype.stream() is deprecated in mongoose >= 4.5.0, " +
    "use Query.prototype.cursor() instead");


// the rest of these are basically to support older Mongoose syntax with mquery

/**
 * _DEPRECATED_ Alias of `maxScan`
 *
 * @deprecated
 * @see maxScan #query_Query-maxScan
 * @method maxscan
 * @memberOf Query
 */

Query.prototype.maxscan = mquery.prototype.maxScan;

/**
 * Specifies a $center or $centerSphere condition.
 *
 * ####Example
 *
 *     var area = { center: [50, 50], radius: 10, unique: true }
 *     query.where('loc').within().circle(area)
 *     // alternatively
 *     query.circle('loc', area);
 *
 *     // spherical calculations
 *     var area = { center: [50, 50], radius: 10, unique: true, spherical: true }
 *     query.where('loc').within().circle(area)
 *     // alternatively
 *     query.circle('loc', area);
 *
 * New in 3.7.0
 *
 * @method circle
 * @memberOf Query
 * @param {String} [path]
 * @param {Object} area
 * @return {Query} this
 * @see $center http://docs.mongodb.org/manual/reference/operator/center/
 * @see $centerSphere http://docs.mongodb.org/manual/reference/operator/centerSphere/
 * @see $geoWithin http://docs.mongodb.org/manual/reference/operator/geoWithin/
 * @see http://www.mongodb.org/display/DOCS/Geospatial+Indexing
 * @api public
 */

/**
 * _DEPRECATED_ Alias for [circle](#query_Query-circle)
 *
 * **Deprecated.** Use [circle](#query_Query-circle) instead.
 *
 * @deprecated
 * @method center
 * @memberOf Query
 * @api public
 */

Query.prototype.center = mquery.prototype.circle;
