import Aggregate from "./aggregate";
import Document from "./document";
const DocumentNotFoundError = require("./error").DocumentNotFoundError;
const DivergentArrayError = require("./error").DivergentArrayError;
const Error = require("./error");
const EventEmitter = require("events").EventEmitter;
const OverwriteModelError = require("./error").OverwriteModelError;
const PromiseProvider = require("./promise_provider");
import Query from "./query";
import Schema from "./schema";
const VersionError = require("./error").VersionError;
const applyHooks = require("./services/model/applyHooks");
const applyMethods = require("./services/model/applyMethods");
const applyStatics = require("./services/model/applyStatics");
const cast = require("./cast");
const castUpdate = require("./services/query/castUpdate");
const discriminator = require("./services/model/discriminator");
const isPathSelectedInclusive = require("./services/projection/isPathSelectedInclusive");
const get = require("lodash.get");
const mpath = require("mpath");
const parallel = require("async/parallel");
const parallelLimit = require("async/parallelLimit");
const setDefaultsOnInsert = require("./services/setDefaultsOnInsert");
const util = require("util");
const utils = require("./utils");

const {
    is
} = adone;

const VERSION_WHERE = 1;
const VERSION_INC = 2;
const VERSION_ALL = VERSION_WHERE | VERSION_INC;

/*!
 * Determines whether versioning should be skipped for the given path
 *
 * @param {Document} self
 * @param {String} path
 * @return {Boolean} true if versioning should be skipped for the given path
 */
const shouldSkipVersioning = function (self, path) {
    const skipVersioning = self.schema.options.skipVersioning;
    if (!skipVersioning) {
        return false;
    }

    // Remove any array indexes from the path
    path = path.replace(/\.\d+\./, ".");

    return skipVersioning[path];
};

/*!
 * Apply the operation to the delta (update) clause as
 * well as track versioning for our where clause.
 *
 * @param {Document} self
 * @param {Object} where
 * @param {Object} delta
 * @param {Object} data
 * @param {Mixed} val
 * @param {String} [operation]
 */

const operand = function (self, where, delta, data, val, op) {
    // delta
    op || (op = "$set");
    if (!delta[op]) {
        delta[op] = {};
    }
    delta[op][data.path] = val;

    // disabled versioning?
    if (self.schema.options.versionKey === false) {
        return;
    }

    // path excluded from versioning?
    if (shouldSkipVersioning(self, data.path)) {
        return;
    }

    // already marked for versioning?
    if (VERSION_ALL === (VERSION_ALL & self.$__.version)) {
        return;
    }

    switch (op) {
        case "$set":
        case "$unset":
        case "$pop":
        case "$pull":
        case "$pullAll":
        case "$push":
        case "$pushAll":
        case "$addToSet":
            break;
        default:
            // nothing to do
            return;
    }

    // ensure updates sent with positional notation are
    // editing the correct array element.
    // only increment the version if an array position changes.
    // modifying elements of an array is ok if position does not change.

    if (op === "$push" || op === "$pushAll" || op === "$addToSet") {
        self.$__.version = VERSION_INC;
    } else if (/^\$p/.test(op)) {
        // potentially changing array positions
        self.increment();
    } else if (is.array(val)) {
        // $set an array
        self.increment();
    } else if (/\.\d+\.|\.\d+$/.test(data.path)) {
        // now handling $set, $unset
        // subpath of array
        self.$__.version = VERSION_WHERE;
    }
};

/*!
 * Compiles an update and where clause for a `val` with _atomics.
 *
 * @param {Document} self
 * @param {Object} where
 * @param {Object} delta
 * @param {Object} data
 * @param {Array} value
 */
const handleAtomics = function (self, where, delta, data, value) {
    if (delta.$set && delta.$set[data.path]) {
        // $set has precedence over other atomics
        return;
    }

    if (is.function(value.$__getAtomics)) {
        value.$__getAtomics().forEach((atomic) => {
            let op = atomic[0];
            let val = atomic[1];
            if (self.schema.options.usePushEach && op === "$pushAll") {
                op = "$push";
                val = { $each: val };
            }
            operand(self, where, delta, data, val, op);
        });
        return;
    }

    // legacy support for plugins

    const atomics = value._atomics;
    const ops = Object.keys(atomics);
    let i = ops.length;
    let val;
    let op;

    if (i === 0) {
        // $set

        if (utils.isMongooseObject(value)) {
            value = value.toObject({ depopulate: 1, _isNested: true });
        } else if (value.valueOf) {
            value = value.valueOf();
        }

        return operand(self, where, delta, data, value);
    }

    const iter = function (mem) {
        return utils.isMongooseObject(mem)
            ? mem.toObject({ depopulate: 1, _isNested: true })
            : mem;
    };

    while (i--) {
        op = ops[i];
        val = atomics[op];

        if (utils.isMongooseObject(val)) {
            val = val.toObject({ depopulate: true, transform: false, _isNested: true });
        } else if (is.array(val)) {
            val = val.map(iter);
        } else if (val.valueOf) {
            val = val.valueOf();
        }

        if (op === "$addToSet") {
            val = { $each: val };
        }

        operand(self, where, delta, data, val, op);
    }
};

/*!
 * Determine if array was populated with some form of filter and is now
 * being updated in a manner which could overwrite data unintentionally.
 *
 * @see https://github.com/Automattic/mongoose/issues/1334
 * @param {Document} doc
 * @param {String} path
 * @return {String|undefined}
 */
const checkDivergentArray = function (doc, path, array) {
    // see if we populated this path
    const pop = doc.populated(path, true);

    if (!pop && doc.$__.selected) {
        // If any array was selected using an $elemMatch projection, we deny the update.
        // NOTE: MongoDB only supports projected $elemMatch on top level array.
        const top = path.split(".")[0];
        if (doc.$__.selected[`${top}.$`]) {
            return top;
        }
    }

    if (!(pop && array && array.isMongooseArray)) {
        return;
    }

    // If the array was populated using options that prevented all
    // documents from being returned (match, skip, limit) or they
    // deselected the _id field, $pop and $set of the array are
    // not safe operations. If _id was deselected, we do not know
    // how to remove elements. $pop will pop off the _id from the end
    // of the array in the db which is not guaranteed to be the
    // same as the last element we have here. $set of the entire array
    // would be similarily destructive as we never received all
    // elements of the array and potentially would overwrite data.
    const check = pop.options.match ||
        pop.options.options && utils.object.hasOwnProperty(pop.options.options, "limit") || // 0 is not permitted
        pop.options.options && pop.options.options.skip || // 0 is permitted
        pop.options.select && // deselected _id?
        (pop.options.select._id === 0 ||
            /\s?-_id\s?/.test(pop.options.select));

    if (check) {
        const atomics = array._atomics;
        if (Object.keys(atomics).length === 0 || atomics.$set || atomics.$pop) {
            return path;
        }
    }
};

const _handleSafe = function (options) {
    if (options.safe) {
        if (is.boolean(options.safe)) {
            options.w = options.safe;
            delete options.safe;
        }
        if (typeof options.safe === "object") {
            options.w = options.safe.w;
            options.j = options.safe.j;
            options.wtimeout = options.safe.wtimeout;
            delete options.safe;
        }
    }
};

const _ensureIndexes = function (model, options, callback) {
    const indexes = model.schema.indexes();
    options = options || {};

    const done = function (err) {
        if (err && model.schema.options.emitIndexErrors) {
            model.emit("error", err);
        }
        model.emit("index", err);
        callback && callback(err);
    };

    if (!indexes.length) {
        setImmediate(() => {
            done();
        });
        return;
    }
    // Indexes are created one-by-one to support how MongoDB < 2.4 deals
    // with background indexes.

    const indexSingleDone = function (err, fields, options, name) {
        model.emit("index-single-done", err, fields, options, name);
    };
    const indexSingleStart = function (fields, options) {
        model.emit("index-single-start", fields, options);
    };

    const create = function () {
        if (options._automatic) {
            if (model.schema.options.autoIndex === false ||
                (is.nil(model.schema.options.autoIndex) && model.db.config.autoIndex === false)) {
                return done();
            }
        }

        const index = indexes.shift();
        if (!index) {
            return done();
        }

        const indexFields = index[0];
        const indexOptions = index[1];
        _handleSafe(options);

        indexSingleStart(indexFields, options);
        const methodName = options.createIndex ? "createIndex" : "ensureIndex";
        adone.promise.nodeify(model.collection[methodName](indexFields, indexOptions), utils.tick((err, name) => {
            indexSingleDone(err, indexFields, indexOptions, name);
            if (err) {
                return done(err);
            }
            create();
        }));
    };

    setImmediate(() => {
        // If buffering is off, do this manually.
        if (options._automatic && !model.collection.collection) {
            model.collection.addQueue(create, []);
        } else {
            create();
        }
    });
};

const INSERT_MANY_CONVERT_OPTIONS = {
    depopulate: true,
    transform: false,
    _skipDepopulateTopLevel: true,
    flattenDecimals: false
};

const _update = function (model, op, conditions, doc, options, callback) {
    const mq = new model.Query({}, {}, model, model.collection);
    if (callback) {
        callback = model.$wrapCallback(callback);
    }
    // gh-2406
    // make local deep copy of conditions
    if (conditions instanceof Document) {
        conditions = conditions.toObject();
    } else {
        conditions = utils.clone(conditions, { retainKeyOrder: true });
    }
    if (is.function(options)) {
        [options, callback] = [{}, options];
    } else {
        options = utils.clone(options);
    }

    if (model.schema.options.versionKey && options && options.upsert) {
        if (options.overwrite) {
            doc[model.schema.options.versionKey] = 0;
        } else {
            if (!doc.$setOnInsert) {
                doc.$setOnInsert = {};
            }
            doc.$setOnInsert[model.schema.options.versionKey] = 0;
        }
    }
    const res = mq[op](conditions, doc, options);
    if (callback) {
        return res.exec(callback);
    }
    return res;
};


/*!
 * Populates `docs`
 */
const excludeIdReg = /\s?-_id\s?/;
const excludeIdRegGlobal = /\s?-_id\s?/g;

/*!
 * Retrieve the _id of `val` if a Document or Array of Documents.
 *
 * @param {Array|Document|Any} val
 * @return {Array|Document|Any}
 */
const convertTo_id = function (val) {
    if (val instanceof Model) {
        return val._id;
    }

    if (is.array(val)) {
        for (let i = 0; i < val.length; ++i) {
            if (val[i] instanceof Model) {
                val[i] = val[i]._id;
            }
        }
        if (val.isMongooseArray) {
            return val._schema.cast(val, val._parent);
        }

        return [].concat(val);
    }

    return val;
};


const getModelsMapForPopulate = function (model, docs, options) {
    let i;
    let doc;
    const len = docs.length;
    const available = {};
    const map = [];
    const modelNameFromQuery = options.model && options.model.modelName || options.model;
    let schema;
    let Model;
    let currentOptions;
    let modelNames;
    let modelName;
    let discriminatorKey;
    let modelForFindSchema;

    const originalModel = options.model;
    let isVirtual = false;
    let isRefPathArray = false;

    schema = model._getSchema(options.path);
    const isUnderneathDocArray = schema && schema.$isUnderneathDocArray;
    if (isUnderneathDocArray &&
        options &&
        options.options &&
        options.options.sort) {
        return new Error(`Cannot populate with \`sort\` on path ${options.path} because it is a subproperty of a document array`);
    }

    if (schema && schema.caster) {
        schema = schema.caster;
    }

    if (!schema && model.discriminators) {
        discriminatorKey = model.schema.discriminatorMapping.key;
    }

    let virtual;
    const refPath = schema && schema.options && schema.options.refPath;

    for (i = 0; i < len; i++) {
        doc = docs[i];

        if (refPath) {
            modelNames = utils.getValue(refPath, doc);
            isRefPathArray = is.array(modelNames);
        } else {
            if (!modelNameFromQuery) {
                let modelForCurrentDoc = model;
                let schemaForCurrentDoc;

                if (!schema && discriminatorKey) {
                    modelForFindSchema = utils.getValue(discriminatorKey, doc);

                    if (modelForFindSchema) {
                        try {
                            modelForCurrentDoc = model.db.model(modelForFindSchema);
                        } catch (error) {
                            return error;
                        }

                        schemaForCurrentDoc = modelForCurrentDoc._getSchema(options.path);

                        if (schemaForCurrentDoc && schemaForCurrentDoc.caster) {
                            schemaForCurrentDoc = schemaForCurrentDoc.caster;
                        }
                    }
                } else {
                    schemaForCurrentDoc = schema;
                }
                virtual = modelForCurrentDoc.schema._getVirtual(options.path);

                let ref;
                if (!is.nil(ref = get(schemaForCurrentDoc, "options.ref"))) {
                    modelNames = [ref];
                } else if (!is.nil(ref = get(virtual, "options.ref"))) {
                    if (is.function(ref)) {
                        ref = ref.call(doc, doc);
                    }
                    // When referencing nested arrays, the ref should be an Array
                    // of modelNames.
                    if (is.array(ref)) {
                        modelNames = ref;
                    } else {
                        modelNames = [ref];
                    }
                    isVirtual = true;
                } else {
                    // We may have a discriminator, in which case we don't want to
                    // populate using the base model by default
                    modelNames = discriminatorKey ? null : [model.modelName];
                }
            } else {
                modelNames = [modelNameFromQuery]; // query options
            }
        }

        if (!modelNames) {
            continue;
        }

        if (!is.array(modelNames)) {
            modelNames = [modelNames];
        }

        virtual = model.schema._getVirtual(options.path);
        let localField;
        if (virtual && virtual.options) {
            const virtualPrefix = virtual.$nestedSchemaPath ?
                `${virtual.$nestedSchemaPath}.` : "";
            if (is.function(virtual.options.localField)) {
                localField = virtualPrefix + virtual.options.localField.call(doc, doc);
            } else {
                localField = virtualPrefix + virtual.options.localField;
            }
        } else {
            localField = options.path;
        }
        let foreignField = virtual && virtual.options ?
            virtual.options.foreignField :
            "_id";
        const justOne = virtual && virtual.options && virtual.options.justOne;
        if (virtual && virtual.options && virtual.options.ref) {
            isVirtual = true;
        }

        if (virtual && (!localField || !foreignField)) {
            throw new Error("If you are populating a virtual, you must set the " +
                "localField and foreignField options");
        }

        options.isVirtual = isVirtual;
        if (is.function(localField)) {
            localField = localField.call(doc, doc);
        }
        if (is.function(foreignField)) {
            foreignField = foreignField.call(doc);
        }
        const ret = convertTo_id(utils.getValue(localField, doc));
        const id = String(utils.getValue(foreignField, doc));
        options._docs[id] = is.array(ret) ? ret.slice() : ret;

        let k = modelNames.length;
        while (k--) {
            modelName = modelNames[k];
            if (is.nil(modelName)) {
                continue;
            }
            const _doc = is.array(doc) && isRefPathArray ? doc[k] : doc;
            const _ret = is.array(ret) && isRefPathArray ? ret[k] : ret;
            try {
                Model = originalModel && originalModel.modelName ?
                    originalModel :
                    model.db.model(modelName);
            } catch (error) {
                return error;
            }

            if (!available[modelName]) {
                currentOptions = {
                    model: Model
                };

                if (isVirtual && virtual.options && virtual.options.options) {
                    currentOptions.options = utils.clone(virtual.options.options, {
                        retainKeyOrder: true
                    });
                }
                utils.merge(currentOptions, options);
                if (schema && !discriminatorKey) {
                    currentOptions.model = Model;
                }
                options.model = Model;

                available[modelName] = {
                    Model,
                    options: currentOptions,
                    docs: [_doc],
                    ids: [_ret],
                    allIds: [ret],
                    // Assume only 1 localField + foreignField
                    localField,
                    foreignField,
                    justOne,
                    isVirtual
                };
                map.push(available[modelName]);
            } else {
                available[modelName].docs.push(_doc);
                available[modelName].ids.push(_ret);
                available[modelName].allIds.push(ret);
            }
        }
    }

    return map;
};

/*!
 * Assign `vals` returned by mongo query to the `rawIds`
 * structure returned from utils.getVals() honoring
 * query sort order if specified by user.
 *
 * This can be optimized.
 *
 * Rules:
 *
 *   if the value of the path is not an array, use findOne rules, else find.
 *   for findOne the results are assigned directly to doc path (including null results).
 *   for find, if user specified sort order, results are assigned directly
 *   else documents are put back in original order of array if found in results
 *
 * @param {Array} rawIds
 * @param {Array} vals
 * @param {Boolean} sort
 * @api private
 */
const assignRawDocsToIdStructure = function (rawIds, resultDocs, resultOrder, options, localFields, foreignFields, recursed) {
    // honor user specified sort order
    const newOrder = [];
    const sorting = options.sort && rawIds.length > 1;
    let doc;
    let sid;
    let id;

    for (let i = 0; i < rawIds.length; ++i) {
        id = rawIds[i];

        if (is.array(id)) {
            // handle [ [id0, id2], [id3] ]
            assignRawDocsToIdStructure(id, resultDocs, resultOrder, options, localFields, foreignFields, true);
            newOrder.push(id);
            continue;
        }

        if (is.null(id) && !sorting) {
            // keep nulls for findOne unless sorting, which always
            // removes them (backward compat)
            newOrder.push(id);
            continue;
        }

        sid = String(id);

        if (recursed) {
            // apply find behavior

            // assign matching documents in original order unless sorting
            doc = resultDocs[sid];
            if (doc) {
                if (sorting) {
                    newOrder[resultOrder[sid]] = doc;
                } else {
                    newOrder.push(doc);
                }
            } else {
                newOrder.push(id);
            }
        } else {
            // apply findOne behavior - if document in results, assign, else assign null
            newOrder[i] = doc = resultDocs[sid] || null;
        }
    }

    rawIds.length = 0;
    if (newOrder.length) {
        // reassign the documents based on corrected order

        // forEach skips over sparse entries in arrays so we
        // can safely use this to our advantage dealing with sorted
        // result sets too.
        newOrder.forEach((doc, i) => {
            if (!doc) {
                return;
            }
            rawIds[i] = doc;
        });
    }
};

/*!
 * Determine if `doc` is a document returned
 * by a populate query.
 */
const isDoc = function (doc) {
    if (is.nil(doc)) {
        return false;
    }

    const type = typeof doc;
    if (type === "string") {
        return false;
    }

    if (type === "number") {
        return false;
    }

    if (is.buffer(doc)) {
        return false;
    }

    if (doc.constructor.name === "ObjectId") {
        return false;
    }

    // only docs
    return true;
};

/*!
 * Remove _id from `subdoc` if user specified "lean" query option
 */

const maybeRemoveId = function (subdoc, assignmentOpts) {
    if (assignmentOpts.excludeId) {
        if (is.function(subdoc.setValue)) {
            delete subdoc._doc._id;
        } else {
            delete subdoc._id;
        }
    }
};

/*!
 * 1) Apply backwards compatible find/findOne behavior to sub documents
 *
 *    find logic:
 *      a) filter out non-documents
 *      b) remove _id from sub docs when user specified
 *
 *    findOne
 *      a) if no doc found, set to null
 *      b) remove _id from sub docs when user specified
 *
 * 2) Remove _ids when specified by users query.
 *
 * background:
 * _ids are left in the query even when user excludes them so
 * that population mapping can occur.
 */
const valueFilter = function (val, assignmentOpts) {
    if (is.array(val)) {
        // find logic
        const ret = [];
        const numValues = val.length;
        for (let i = 0; i < numValues; ++i) {
            const subdoc = val[i];
            if (!isDoc(subdoc)) {
                continue;
            }
            maybeRemoveId(subdoc, assignmentOpts);
            ret.push(subdoc);
            if (assignmentOpts.originalLimit &&
                ret.length >= assignmentOpts.originalLimit) {
                break;
            }
        }

        // Since we don't want to have to create a new mongoosearray, make sure to
        // modify the array in place
        while (val.length > ret.length) {
            Array.prototype.pop.apply(val, []);
        }
        for (let i = 0; i < ret.length; ++i) {
            val[i] = ret[i];
        }
        return val;
    }

    // findOne
    if (isDoc(val)) {
        maybeRemoveId(val, assignmentOpts);
        return val;
    }

    return null;
};

/*!
 * Assigns documents returned from a population query back
 * to the original document path.
 */
const assignVals = function (o) {
    // replace the original ids in our intermediate _ids structure
    // with the documents found by query
    assignRawDocsToIdStructure(o.rawIds, o.rawDocs, o.rawOrder, o.options, o.localField, o.foreignField);

    // now update the original documents being populated using the
    // result structure that contains real documents.

    const docs = o.docs;
    const rawIds = o.rawIds;
    const options = o.options;

    const setValue = (val) => valueFilter(val, options);

    for (let i = 0; i < docs.length; ++i) {
        if (is.nil(utils.getValue(o.path, docs[i])) &&
            !o.originalModel.schema._getVirtual(o.path)) {
            continue;
        }

        if (o.isVirtual && !o.justOne && !is.array(rawIds[i])) {
            if (is.nil(rawIds[i])) {
                rawIds[i] = [];
            } else {
                rawIds[i] = [rawIds[i]];
            }
        }

        if (o.isVirtual && docs[i].constructor.name === "model") {
            // If virtual populate and doc is already init-ed, need to walk through
            // the actual doc to set rather than setting `_doc` directly
            mpath.set(o.path, rawIds[i], docs[i]);
        } else {
            const parts = o.path.split(".");
            let cur = docs[i];
            for (let j = 0; j < parts.length - 1; ++j) {
                if (is.nil(cur[parts[j]])) {
                    cur[parts[j]] = {};
                }
                cur = cur[parts[j]];
            }
            if (docs[i].$__) {
                docs[i].populated(o.path, o.allIds[i], o.allOptions);
            }
            utils.setValue(o.path, rawIds[i], docs[i], setValue);
        }
    }
};

const populate = function (model, docs, options, callback) {
    // normalize single / multiple docs passed
    if (!is.array(docs)) {
        docs = [docs];
    }

    if (docs.length === 0 || docs.every(utils.isNullOrUndefined)) {
        return callback();
    }

    const modelsMap = getModelsMapForPopulate(model, docs, options);
    if (modelsMap instanceof Error) {
        return setImmediate(() => {
            callback(modelsMap);
        });
    }

    let i;
    const len = modelsMap.length;
    let mod;
    let match;
    let select;
    let vals = [];

    const flatten = function (item) {
        // no need to include undefined values in our query
        return undefined !== item;
    };

    let _remaining = len;
    let hasOne = false;
    const _assign = function (err, vals, mod, assignmentOpts) {
        if (err) {
            return callback(err);
        }

        const options = mod.options;
        const isVirtual = mod.isVirtual;
        const justOne = mod.justOne;
        let _val;
        const lean = options.options && options.options.lean;
        const len = vals.length;
        const rawOrder = {};
        const rawDocs = {};
        let key;
        let val;

        // Clone because `assignRawDocsToIdStructure` will mutate the array
        const allIds = [].concat(mod.allIds.map((v) => {
            if (is.array(v)) {
                return [].concat(v);
            }
            return v;
        }));

        // optimization:
        // record the document positions as returned by
        // the query result.
        for (let i = 0; i < len; i++) {
            val = vals[i];
            if (val) {
                _val = utils.getValue(mod.foreignField, val);
                if (is.array(_val)) {
                    const _valLength = _val.length;
                    for (let j = 0; j < _valLength; ++j) {
                        let __val = _val[j];
                        if (__val instanceof Document) {
                            __val = __val._id;
                        }
                        key = String(__val);
                        if (rawDocs[key]) {
                            if (is.array(rawDocs[key])) {
                                rawDocs[key].push(val);
                                rawOrder[key].push(i);
                            } else {
                                rawDocs[key] = [rawDocs[key], val];
                                rawOrder[key] = [rawOrder[key], i];
                            }
                        } else {
                            if (isVirtual && !justOne) {
                                rawDocs[key] = [val];
                                rawOrder[key] = [i];
                            } else {
                                rawDocs[key] = val;
                                rawOrder[key] = i;
                            }
                        }
                    }
                } else {
                    if (_val instanceof Document) {
                        _val = _val._id;
                    }
                    key = String(_val);
                    if (rawDocs[key]) {
                        if (is.array(rawDocs[key])) {
                            rawDocs[key].push(val);
                            rawOrder[key].push(i);
                        } else {
                            rawDocs[key] = [rawDocs[key], val];
                            rawOrder[key] = [rawOrder[key], i];
                        }
                    } else {
                        rawDocs[key] = val;
                        rawOrder[key] = i;
                    }
                }
                // flag each as result of population
                if (!lean) {
                    val.$__.wasPopulated = true;
                }
            }
        }

        assignVals({
            originalModel: model,
            rawIds: mod.allIds,
            allIds,
            localField: mod.localField,
            foreignField: mod.foreignField,
            rawDocs,
            rawOrder,
            docs: mod.docs,
            path: options.path,
            options: assignmentOpts,
            justOne: mod.justOne,
            isVirtual: mod.isVirtual,
            allOptions: mod
        });
    };

    const next = function (options, assignmentOpts, err, valsFromDb) {
        if (mod.options.options && mod.options.options.limit) {
            mod.options.options.limit = assignmentOpts.originalLimit;
        }

        if (err) {
            return callback(err);
        }
        vals = vals.concat(valsFromDb);
        _assign(null, vals, options, assignmentOpts);
        if (--_remaining === 0) {
            callback();
        }
    };

    for (i = 0; i < len; i++) {
        mod = modelsMap[i];
        select = mod.options.select;

        if (mod.options.match) {
            match = utils.object.shallowCopy(mod.options.match);
        } else {
            match = {};
        }

        let ids = utils.array.flatten(mod.ids, flatten);
        ids = utils.array.unique(ids);

        if (ids.length === 0 || ids.every(utils.isNullOrUndefined)) {
            --_remaining;
            continue;
        }

        hasOne = true;
        if (mod.foreignField !== "_id" || !match._id) {
            match[mod.foreignField] = { $in: ids };
        }

        const assignmentOpts = {};
        assignmentOpts.sort = mod.options.options && mod.options.options.sort || undefined;
        assignmentOpts.excludeId = excludeIdReg.test(select) || (select && select._id === 0);

        if (assignmentOpts.excludeId) {
            // override the exclusion from the query so we can use the _id
            // for document matching during assignment. we'll delete the
            // _id back off before returning the result.
            if (is.string(select)) {
                select = select.replace(excludeIdRegGlobal, " ");
            } else {
                // preserve original select conditions by copying
                select = utils.object.shallowCopy(select);
                delete select._id;
            }
        }

        if (mod.options.options && mod.options.options.limit) {
            assignmentOpts.originalLimit = mod.options.options.limit;
            mod.options.options.limit = mod.options.options.limit * ids.length;
        }

        const subPopulate = mod.options.populate;
        const query = mod.Model.find(match, select, mod.options.options);

        // If we're doing virtual populate and projection is inclusive and foreign
        // field is not selected, automatically select it because mongoose needs it.
        // If projection is exclusive and client explicitly unselected the foreign
        // field, that's the client's fault.
        if (mod.foreignField !== "_id" && query.selectedInclusively() &&
            !isPathSelectedInclusive(query._fields, mod.foreignField)) {
            query.select(mod.foreignField);
        }

        // If we need to sub-populate, call populate recursively
        if (subPopulate) {
            query.populate(subPopulate);
        }

        query.exec(next.bind(this, mod, assignmentOpts));
    }

    if (!hasOne) {
        return callback();
    }
};

/*!
 * Populate helper
 *
 * @param {Model} model the model to use
 * @param {Document|Array} docs Either a single document or array of documents to populate.
 * @param {Object} paths
 * @param {Function} [cb(err,doc)] Optional callback, executed upon completion. Receives `err` and the `doc(s)`.
 * @return {Function}
 * @api private
 */
const _populate = function (model, docs, paths, cache, callback) {
    let pending = paths.length;
    const next = function (err) {
        if (err) {
            return callback(err);
        }
        if (--pending) {
            return;
        }
        callback(null, docs);
    };

    if (pending === 0) {
        return callback(null, docs);
    }

    // each path has its own query options and must be executed separately
    let i = pending;
    let path;
    while (i--) {
        path = paths[i];
        populate(model, docs, path, next);
    }
};

/*!
 * Register custom query methods for this model
 *
 * @param {Model} model
 * @param {Schema} schema
 */
const applyQueryMethods = function (model, methods) {
    for (const i in methods) {
        model.Query.prototype[i] = methods[i];
    }
};

/**
 * Model constructor
 *
 * Provides the interface to MongoDB collections as well as creates document instances.
 *
 * @param {Object} doc values with which to create the document
 * @inherits Document http://mongoosejs.com/docs/api.html#document-js
 * @event `error`: If listening to this event, 'error' is emitted when a document was saved without passing a callback and an `error` occurred. If not listening, the event bubbles to the connection used to create this Model.
 * @event `index`: Emitted after `Model#ensureIndexes` completes. If an error occurred it is passed with the event.
 * @event `index-single-start`: Emitted when an individual index starts within `Model#ensureIndexes`. The fields and options being used to build the index are also passed with the event.
 * @event `index-single-done`: Emitted when an individual index finishes within `Model#ensureIndexes`. If an error occurred it is passed with the event. The fields, options, and index name are also passed.
 * @api public
 */
export default class Model extends Document {
    constructor(doc, fields, skipId) {
        super(doc, fields, skipId, true);
        if (fields instanceof Schema) {
            throw new TypeError("2nd argument to `Model` must be a POJO or string, " +
                "**not** a schema. Make sure you're calling `mongoose.model()`, not " +
                "`mongoose.Model()`.");
        }
    }

    $__handleSave(options, callback) {
        const _this = this;
        let i;
        let keys;
        let len;
        if (!options.safe && this.schema.options.safe) {
            options.safe = this.schema.options.safe;
        }
        if (is.boolean(options.safe)) {
            options.safe = null;
        }
        const safe = options.safe ? utils.clone(options.safe, { retainKeyOrder: true }) : options.safe;

        if (this.isNew) {
            // send entire doc
            const toObjectOptions = {};

            toObjectOptions.retainKeyOrder = this.schema.options.retainKeyOrder;
            toObjectOptions.depopulate = 1;
            toObjectOptions._skipDepopulateTopLevel = true;
            toObjectOptions.transform = false;
            toObjectOptions.flattenDecimals = false;

            const obj = this.toObject(toObjectOptions);

            if ((obj || {})._id === void 0) {
                // documents must have an _id else mongoose won't know
                // what to update later if more changes are made. the user
                // wouldn't know what _id was generated by mongodb either
                // nor would the ObjectId generated my mongodb necessarily
                // match the schema definition.
                setTimeout(() => {
                    callback(new Error("document must have an _id before saving"));
                }, 0);
                return;
            }

            this.$__version(true, obj);
            adone.promise.nodeify(this.collection.insert(obj, safe), (err, ret) => {
                if (err) {
                    _this.isNew = true;
                    _this.emit("isNew", true);
                    _this.constructor.emit("isNew", true);

                    callback(err);
                    return;
                }

                callback(null, ret);
            });
            this.$__reset();
            this.isNew = false;
            this.emit("isNew", false);
            this.constructor.emit("isNew", false);
            // Make it possible to retry the insert
            this.$__.inserting = true;
        } else {
            // Make sure we don't treat it as a new object on error,
            // since it already exists
            this.$__.inserting = false;

            const delta = this.$__delta();

            if (delta) {
                if (delta instanceof Error) {
                    callback(delta);
                    return;
                }

                const where = this.$__where(delta[0]);
                if (where instanceof Error) {
                    callback(where);
                    return;
                }

                if (this.$where) {
                    keys = Object.keys(this.$where);
                    len = keys.length;
                    for (i = 0; i < len; ++i) {
                        where[keys[i]] = this.$where[keys[i]];
                    }
                }

                adone.promise.nodeify(this.collection.update(where, delta[1], safe), (err, ret) => {
                    if (err) {
                        callback(err);
                        return;
                    }
                    ret.$where = where;
                    callback(null, ret);
                });
            } else {
                this.$__reset();
                callback();
                return;
            }

            this.emit("isNew", false);
            this.constructor.emit("isNew", false);
        }
    }

    $__save(options, callback) {
        const _this = this;

        _this.$__handleSave(options, (error, result) => {
            if (error) {
                return _this.schema.s.hooks.execPost("save:error", _this, [_this], { error }, (error) => {
                    callback(error);
                });
            }

            _this.$__reset();

            let numAffected = 0;
            if (result) {
                if (is.array(result)) {
                    numAffected = result.length;
                } else if (result.result && !is.undefined(result.result.n)) {
                    numAffected = result.result.n;
                } else if (result.result && !is.undefined(result.result.nModified)) {
                    numAffected = result.result.nModified;
                } else {
                    numAffected = result;
                }
            }

            if (_this.schema.options &&
                _this.schema.options.saveErrorIfNotFound &&
                numAffected <= 0) {
                error = new DocumentNotFoundError(result.$where);
                return _this.schema.s.hooks.execPost("save:error", _this, [_this], { error }, (error) => {
                    callback(error);
                });
            }

            // was this an update that required a version bump?
            if (_this.$__.version && !_this.$__.inserting) {
                const doIncrement = VERSION_INC === (VERSION_INC & _this.$__.version);
                _this.$__.version = undefined;

                if (numAffected <= 0) {
                    // the update failed. pass an error back
                    const err = new VersionError(_this);
                    return callback(err);
                }

                // increment version if was successful
                if (doIncrement) {
                    const key = _this.schema.options.versionKey;
                    const version = _this.getValue(key) | 0;
                    _this.setValue(key, version + 1);
                }
            }

            _this.emit("save", _this, numAffected);
            _this.constructor.emit("save", _this, numAffected);
            callback(null, _this, numAffected);
        });
    }

    /**
     * Saves this document.
     *
     * ####Example:
     *
     *     product.sold = Date.now();
     *     product.save(function (err, product, numAffected) {
     *       if (err) ..
     *     })
     *
     * The callback will receive three parameters
     *
     * 1. `err` if an error occurred
     * 2. `product` which is the saved `product`
     * 3. `numAffected` will be 1 when the document was successfully persisted to MongoDB, otherwise 0. Unless you tweak mongoose's internals, you don't need to worry about checking this parameter for errors - checking `err` is sufficient to make sure your document was properly saved.
     *
     * As an extra measure of flow control, save will return a Promise.
     * ####Example:
     *     product.save().then(function(product) {
     *        ...
     *     });
     *
     * For legacy reasons, mongoose stores object keys in reverse order on initial
     * save. That is, `{ a: 1, b: 2 }` will be saved as `{ b: 2, a: 1 }` in
     * MongoDB. To override this behavior, set
     * [the `toObject.retainKeyOrder` option](http://mongoosejs.com/docs/api.html#document_Document-toObject)
     * to true on your schema.
     *
     * @param {Object} [options] options optional options
     * @param {Object} [options.safe] overrides [schema's safe option](http://mongoosejs.com//docs/guide.html#safe)
     * @param {Boolean} [options.validateBeforeSave] set to false to save without validating.
     * @param {Function} [fn] optional callback
     * @return {Promise} Promise
     * @api public
     * @see middleware http://mongoosejs.com/docs/middleware.html
     */
    save(options, fn) {
        if (is.function(options)) {
            fn = options;
            options = undefined;
        }

        if (!options) {
            options = {};
        }

        if (fn) {
            fn = this.constructor.$wrapCallback(fn);
        }

        return this.$__save(options, fn);
    }

    /**
     * Produces a special query document of the modified properties used in updates.
     *
     * @api private
     * @method $__delta
     * @memberOf Model
     */
    $__delta() {
        const dirty = this.$__dirty();
        if (!dirty.length && VERSION_ALL !== this.$__.version) {
            return;
        }

        const where = {};
        const delta = {};
        const len = dirty.length;
        const divergent = [];
        let d = 0;

        where._id = this._doc._id;
        if (where._id.toObject) {
            where._id = where._id.toObject({ transform: false, depopulate: true });
        }

        for (; d < len; ++d) {
            const data = dirty[d];
            let value = data.value;

            const match = checkDivergentArray(this, data.path, value);
            if (match) {
                divergent.push(match);
                continue;
            }

            const pop = this.populated(data.path, true);
            if (!pop && this.$__.selected) {
                // If any array was selected using an $elemMatch projection, we alter the path and where clause
                // NOTE: MongoDB only supports projected $elemMatch on top level array.
                const pathSplit = data.path.split(".");
                const top = pathSplit[0];
                if (this.$__.selected[top] && this.$__.selected[top].$elemMatch) {
                    // If the selected array entry was modified
                    if (pathSplit.length > 1 && pathSplit[1] == 0 && is.undefined(where[top])) {
                        where[top] = this.$__.selected[top];
                        pathSplit[1] = "$";
                        data.path = pathSplit.join(".");
                    }
                    // if the selected array was modified in any other way throw an error
                    else {
                        divergent.push(data.path);
                        continue;
                    }
                }
            }

            if (divergent.length) {
                continue;
            }

            if (undefined === value) {
                operand(this, where, delta, data, 1, "$unset");
            } else if (is.null(value)) {
                operand(this, where, delta, data, null);
            } else if (value._path && value._atomics) {
                // arrays and other custom types (support plugins etc)
                handleAtomics(this, where, delta, data, value);
            } else if (value._path && is.buffer(value)) {
                // MongooseBuffer
                value = value.toObject();
                operand(this, where, delta, data, value);
            } else {
                value = utils.clone(value, {
                    depopulate: true,
                    transform: false,
                    virtuals: false,
                    retainKeyOrder: true,
                    _isNested: true
                });
                operand(this, where, delta, data, value);
            }
        }

        if (divergent.length) {
            return new DivergentArrayError(divergent);
        }

        if (this.$__.version) {
            this.$__version(where, delta);
        }

        return [where, delta];
    }

    /**
     * Appends versioning to the where and update clauses.
     *
     * @api private
     * @method $__version
     * @memberOf Model
     */
    $__version(where, delta) {
        const key = this.schema.options.versionKey;

        if (where === true) {
            // this is an insert
            if (key) {
                this.setValue(key, delta[key] = 0);
            }
            return;
        }

        // updates

        // only apply versioning if our versionKey was selected. else
        // there is no way to select the correct version. we could fail
        // fast here and force them to include the versionKey but
        // thats a bit intrusive. can we do this automatically?
        if (!this.isSelected(key)) {
            return;
        }

        // $push $addToSet don't need the where clause set
        if (VERSION_WHERE === (VERSION_WHERE & this.$__.version)) {
            const value = this.getValue(key);
            if (!is.nil(value)) {
                where[key] = value;
            }
        }

        if (VERSION_INC === (VERSION_INC & this.$__.version)) {
            if (!is.nil(get(delta.$set, key, null))) {
                // Version key is getting set, means we'll increment the doc's version
                // after a successful save, so we should set the incremented version so
                // future saves don't fail (gh-5779)
                ++delta.$set[key];
            } else {
                delta.$inc = delta.$inc || {};
                delta.$inc[key] = 1;
            }
        }
    }

    /**
     * Signal that we desire an increment of this documents version.
     *
     * ####Example:
     *
     *     Model.findById(id, function (err, doc) {
     *       doc.increment();
     *       doc.save(function (err) { .. })
     *     })
     *
     * @see versionKeys http://mongoosejs.com/docs/guide.html#versionKey
     * @api public
     */
    increment() {
        this.$__.version = VERSION_ALL;
        return this;
    }

    /**
     * Returns a query object
     *
     * @api private
     * @method $__where
     * @memberOf Model
     */
    $__where(where) {
        where || (where = {});

        if (!where._id) {
            where._id = this._doc._id;
        }

        if (is.nil(this._doc._id)) {
            return new Error("No _id found on document!");
        }

        return where;
    }

    /**
     * Removes this document from the db.
     *
     * ####Example:
     *     product.remove(function (err, product) {
     *       if (err) return handleError(err);
     *       Product.findById(product._id, function (err, product) {
     *         console.log(product) // null
     *       })
     *     })
     *
     *
     * As an extra measure of flow control, remove will return a Promise (bound to `fn` if passed) so it could be chained, or hooked to recive errors
     *
     * ####Example:
     *     product.remove().then(function (product) {
     *        ...
     *     }).catch(function (err) {
     *        assert.ok(err)
     *     })
     *
     * @param {function(err,product)} [fn] optional callback
     * @return {Promise} Promise
     * @api public
     */
    remove(options, fn) {
        if (is.function(options)) {
            fn = options;
            options = undefined;
        }

        const _this = this;

        if (!options) {
            options = {};
        }

        if (this.$__.removing) {
            if (fn) {
                this.$__.removing.then(
                    (res) => {
                        fn(null, res);
                    },
                    (err) => {
                        fn(err);
                    });
            }
            return this;
        }
        if (this.$__.isDeleted) {
            setImmediate(() => {
                fn(null, _this);
            });
            return this;
        }

        const Promise = PromiseProvider.get();

        if (fn) {
            fn = this.constructor.$wrapCallback(fn);
        }

        this.$__.removing = new Promise.ES6(((resolve, reject) => {
            const where = _this.$__where();
            if (where instanceof Error) {
                reject(where);
                fn && fn(where);
                return;
            }

            if (!options.safe && _this.schema.options.safe) {
                options.safe = _this.schema.options.safe;
            }

            adone.promise.nodeify(_this.collection.remove(where, options), (err) => {
                if (!err) {
                    _this.$__.isDeleted = true;
                    _this.emit("remove", _this);
                    _this.constructor.emit("remove", _this);
                    resolve(_this);
                    fn && fn(null, _this);
                    return;
                }
                _this.$__.isDeleted = false;
                reject(err);
                fn && fn(err);
            });
        }));
        return this.$__.removing;
    }

    /**
     * Returns another Model instance.
     *
     * ####Example:
     *
     *     var doc = new Tank;
     *     doc.model('User').findById(id, callback);
     *
     * @param {String} name model name
     * @api public
     */
    model(name) {
        return this.db.model(name);
    }



    /**
     * Adds a discriminator type.
     *
     * ####Example:
     *
     *     function BaseSchema() {
     *       Schema.apply(this, arguments);
     *
     *       this.add({
     *         name: String,
     *         createdAt: Date
     *       });
     *     }
     *     util.inherits(BaseSchema, Schema);
     *
     *     var PersonSchema = new BaseSchema();
     *     var BossSchema = new BaseSchema({ department: String });
     *
     *     var Person = mongoose.model('Person', PersonSchema);
     *     var Boss = Person.discriminator('Boss', BossSchema);
     *
     * @param {String} name   discriminator model name
     * @param {Schema} schema discriminator model schema
     * @api public
     */

    static discriminator(name, schema) {
        let model;
        if (is.function(name)) {
            model = name;
            name = utils.getFunctionName(model);
            if (!(model.prototype instanceof Model)) {
                throw new Error(`The provided class ${name} must extend Model`);
            }
        }

        schema = discriminator(this, name, schema);
        if (this.db.models[name]) {
            throw new OverwriteModelError(name);
        }

        schema.$isRootDiscriminator = true;

        model = this.db.model(model || name, schema, this.collection.name);
        this.discriminators[name] = model;
        const d = this.discriminators[name];
        d.prototype.__proto__ = this.prototype;
        Object.defineProperty(d, "baseModelName", {
            value: this.modelName,
            configurable: true,
            writable: false
        });

        // apply methods and statics
        applyMethods(d, schema);
        applyStatics(d, schema);

        return d;
    }

    /**
     * Performs any async initialization of this model against MongoDB. Currently,
     * this function is only responsible for building [indexes](https://docs.mongodb.com/manual/indexes/),
     * unless [`autoIndex`](http://mongoosejs.com/docs/guide.html#autoIndex) is turned off.
     *
     * This function is called automatically, so you don't need to call it.
     * This function is also idempotent, so you may call it to get back a promise
     * that will resolve when your indexes are finished building as an alternative
     * to `MyModel.on('index')`
     *
     * ####Example:
     *
     *     var eventSchema = new Schema({ thing: { type: 'string', unique: true }})
     *     // This calls `Event.init()` implicitly, so you don't need to call
     *     // `Event.init()` on your own.
     *     var Event = mongoose.model('Event', eventSchema);
     *
     *     Event.init().then(function(Event) {
     *       // You can also use `Event.on('index')` if you prefer event emitters
     *       // over promises.
     *       console.log('Indexes are done building!');
     *     });
     *
     * @api public
     * @param {Function} [callback]
     * @returns {Promise}
     */
    static init(callback) {
        this.schema.emit("init", this);

        if (this.$init) {
            return this.$init;
        }

        const _this = this;
        const Promise = PromiseProvider.get();
        this.$init = new Promise.ES6(((resolve, reject) => {
            if ((_this.schema.options.autoIndex) ||
                (is.nil(_this.schema.options.autoIndex) && _this.db.config.autoIndex)) {
                _this.ensureIndexes({ _automatic: true, __noPromise: true }, (error) => {
                    if (error) {
                        callback && callback(error);
                        return reject(error);
                    }
                    callback && callback(null, _this);
                    resolve(_this);
                });
            } else {
                resolve(_this);
            }
        }));

        return this.$init;
    }

    /**
     * Sends `createIndex` commands to mongo for each index declared in the schema.
     * The `createIndex` commands are sent in series.
     *
     * ####Example:
     *
     *     Event.ensureIndexes(function (err) {
     *       if (err) return handleError(err);
     *     });
     *
     * After completion, an `index` event is emitted on this `Model` passing an error if one occurred.
     *
     * ####Example:
     *
     *     var eventSchema = new Schema({ thing: { type: 'string', unique: true }})
     *     var Event = mongoose.model('Event', eventSchema);
     *
     *     Event.on('index', function (err) {
     *       if (err) console.error(err); // error occurred during index creation
     *     })
     *
     * _NOTE: It is not recommended that you run this in production. Index creation may impact database performance depending on your load. Use with caution._
     *
     * @param {Object} [options] internal options
     * @param {Function} [cb] optional callback
     * @return {Promise}
     * @api public
     */
    static ensureIndexes(options, callback) {
        if (is.function(options)) {
            callback = options;
            options = null;
        }

        if (options && options.__noPromise) {
            _ensureIndexes(this, options, callback);
            return;
        }

        if (callback) {
            callback = this.$wrapCallback(callback);
        }

        const _this = this;
        const Promise = PromiseProvider.get();
        return new Promise.ES6(((resolve, reject) => {
            _ensureIndexes(_this, options || {}, (error) => {
                if (error) {
                    callback && callback(error);
                    reject(error);
                }
                callback && callback();
                resolve();
            });
        }));
    }

    /**
     * Similar to `ensureIndexes()`, except for it uses the [`createIndex`](http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html#createIndex)
     * function. The `ensureIndex()` function checks to see if an index with that
     * name already exists, and, if not, does not attempt to create the index.
     * `createIndex()` bypasses this check.
     *
     * @param {Object} [options] internal options
     * @param {Function} [cb] optional callback
     * @return {Promise}
     * @api public
     */
    static createIndexes(options, callback) {
        if (is.function(options)) {
            callback = options;
            options = {};
        }
        options = options || {};
        options.createIndex = true;
        return this.ensureIndexes(options, callback);
    }

    /**
     * Translate any aliases fields/conditions so the final query or document object is pure
     *
     * ####Example:
     *
     *     Character
     *       .find(Character.translateAliases({
     *         '名': 'Eddard Stark' // Alias for 'name'
     *       })
     *       .exec(function(err, characters) {})
     *
     * ####Note:
     * Only translate arguments of object type anything else is returned raw
     *
     * @param {Object} raw fields/conditions that may contain aliased keys
     * @return {Object} the translated 'pure' fields/conditions
     */
    static translateAliases(fields) {
        const aliases = this.schema.aliases;

        if (typeof fields === "object") {
            // Fields is an object (query conditions or document fields)
            for (const key in fields) {
                if (aliases[key]) {
                    fields[aliases[key]] = fields[key];
                    delete fields[key];
                }
            }

            return fields;
        }
        // Don't know typeof fields
        return fields;
    }

    /**
     * Removes all documents that match `conditions` from the collection.
     * To remove just the first document that matches `conditions`, set the `single`
     * option to true.
     *
     * ####Example:
     *
     *     Character.remove({ name: 'Eddard Stark' }, function (err) {});
     *
     * ####Note:
     *
     * This method sends a remove command directly to MongoDB, no Mongoose documents
     * are involved. Because no Mongoose documents are involved, _no middleware
     * (hooks) are executed_.
     *
     * @param {Object} conditions
     * @param {Function} [callback]
     * @return {Query}
     * @api public
     */
    static remove(conditions, callback) {
        if (is.function(conditions)) {
            callback = conditions;
            conditions = {};
        }

        // get the mongodb collection object
        const mq = new this.Query({}, {}, this, this.collection);

        if (callback) {
            callback = this.$wrapCallback(callback);
        }

        return adone.promise.nodeify(mq.remove(conditions), callback);
    }

    /**
     * Deletes the first document that matches `conditions` from the collection.
     * Behaves like `remove()`, but deletes at most one document regardless of the
     * `single` option.
     *
     * ####Example:
     *
     *     Character.deleteOne({ name: 'Eddard Stark' }, function (err) {});
     *
     * ####Note:
     *
     * Like `Model.remove()`, this function does **not** trigger `pre('remove')` or `post('remove')` hooks.
     *
     * @param {Object} conditions
     * @param {Function} [callback]
     * @return {Query}
     * @api public
     */
    static deleteOne(conditions, callback) {
        if (is.function(conditions)) {
            callback = conditions;
            conditions = {};
        }

        // get the mongodb collection object
        const mq = new this.Query(conditions, {}, this, this.collection);

        if (callback) {
            callback = this.$wrapCallback(callback);
        }

        return adone.promise.nodeify(mq.deleteOne(), callback);
    }

    /**
     * Deletes all of the documents that match `conditions` from the collection.
     * Behaves like `remove()`, but deletes all documents that match `conditions`
     * regardless of the `single` option.
     *
     * ####Example:
     *
     *     Character.deleteMany({ name: /Stark/, age: { $gte: 18 } }, function (err) {});
     *
     * ####Note:
     *
     * Like `Model.remove()`, this function does **not** trigger `pre('remove')` or `post('remove')` hooks.
     *
     * @param {Object} conditions
     * @param {Function} [callback]
     * @return {Query}
     * @api public
     */
    static deleteMany(conditions, callback) {
        if (is.function(conditions)) {
            callback = conditions;
            conditions = {};
        }

        // get the mongodb collection object
        const mq = new this.Query(conditions, {}, this, this.collection);

        if (callback) {
            callback = this.$wrapCallback(callback);
        }

        return adone.promise.nodeify(mq.deleteMany(), callback);
    }

    /**
     * Finds documents
     *
     * The `conditions` are cast to their respective SchemaTypes before the command is sent.
     *
     * ####Examples:
     *
     *     // named john and at least 18
     *     MyModel.find({ name: 'john', age: { $gte: 18 }});
     *
     *     // executes immediately, passing results to callback
     *     MyModel.find({ name: 'john', age: { $gte: 18 }}, function (err, docs) {});
     *
     *     // name LIKE john and only selecting the "name" and "friends" fields, executing immediately
     *     MyModel.find({ name: /john/i }, 'name friends', function (err, docs) { })
     *
     *     // passing options
     *     MyModel.find({ name: /john/i }, null, { skip: 10 })
     *
     *     // passing options and executing immediately
     *     MyModel.find({ name: /john/i }, null, { skip: 10 }, function (err, docs) {});
     *
     *     // executing a query explicitly
     *     var query = MyModel.find({ name: /john/i }, null, { skip: 10 })
     *     query.exec(function (err, docs) {});
     *
     *     // using the promise returned from executing a query
     *     var query = MyModel.find({ name: /john/i }, null, { skip: 10 });
     *     var promise = query.exec();
     *     promise.addBack(function (err, docs) {});
     *
     * @param {Object} conditions
     * @param {Object} [projection] optional fields to return (http://bit.ly/1HotzBo)
     * @param {Object} [options] optional
     * @param {Function} [callback]
     * @return {Query}
     * @see field selection #query_Query-select
     * @see promise #promise-js
     * @api public
     */
    static find(conditions, projection, options, callback) {
        if (is.function(conditions)) {
            callback = conditions;
            conditions = {};
            projection = null;
            options = null;
        } else if (is.function(projection)) {
            callback = projection;
            projection = null;
            options = null;
        } else if (is.function(options)) {
            callback = options;
            options = null;
        }

        const mq = new this.Query({}, {}, this, this.collection);
        mq.select(projection);
        mq.setOptions(options);
        if (this.schema.discriminatorMapping &&
            this.schema.discriminatorMapping.isRoot &&
            mq.selectedInclusively()) {
            // Need to select discriminator key because original schema doesn't have it
            mq.select(this.schema.options.discriminatorKey);
        }

        if (callback) {
            callback = this.$wrapCallback(callback);
        }

        return adone.promise.nodeify(mq.find(conditions), callback);
    }

    /**
     * Finds a single document by its _id field. `findById(id)` is almost*
     * equivalent to `findOne({ _id: id })`. If you want to query by a document's
     * `_id`, use `findById()` instead of `findOne()`.
     *
     * The `id` is cast based on the Schema before sending the command.
     *
     * This function triggers the following middleware:
     * - `findOne()`
     *
     * \* Except for how it treats `undefined`. If you use `findOne()`, you'll see
     * that `findOne(undefined)` and `findOne({ _id: undefined })` are equivalent
     * to `findOne({})` and return arbitrary documents. However, mongoose
     * translates `findById(undefined)` into `findOne({ _id: null })`.
     *
     * ####Example:
     *
     *     // find adventure by id and execute immediately
     *     Adventure.findById(id, function (err, adventure) {});
     *
     *     // same as above
     *     Adventure.findById(id).exec(callback);
     *
     *     // select only the adventures name and length
     *     Adventure.findById(id, 'name length', function (err, adventure) {});
     *
     *     // same as above
     *     Adventure.findById(id, 'name length').exec(callback);
     *
     *     // include all properties except for `length`
     *     Adventure.findById(id, '-length').exec(function (err, adventure) {});
     *
     *     // passing options (in this case return the raw js objects, not mongoose documents by passing `lean`
     *     Adventure.findById(id, 'name', { lean: true }, function (err, doc) {});
     *
     *     // same as above
     *     Adventure.findById(id, 'name').lean().exec(function (err, doc) {});
     *
     * @param {Object|String|Number} id value of `_id` to query by
     * @param {Object} [projection] optional fields to return (http://bit.ly/1HotzBo)
     * @param {Object} [options] optional
     * @param {Function} [callback]
     * @return {Query}
     * @see field selection #query_Query-select
     * @see lean queries #query_Query-lean
     * @api public
     */
    static findById(id, projection, options, callback) {
        if (is.undefined(id)) {
            id = null;
        }

        if (callback) {
            callback = this.$wrapCallback(callback);
        }

        return this.findOne({ _id: id }, projection, options, callback);
    }

    /**
     * Finds one document.
     *
     * The `conditions` are cast to their respective SchemaTypes before the command is sent.
     *
     * *Note:* `conditions` is optional, and if `conditions` is null or undefined,
     * mongoose will send an empty `findOne` command to MongoDB, which will return
     * an arbitrary document. If you're querying by `_id`, use `findById()` instead.
     *
     * ####Example:
     *
     *     // find one iphone adventures - iphone adventures??
     *     Adventure.findOne({ type: 'iphone' }, function (err, adventure) {});
     *
     *     // same as above
     *     Adventure.findOne({ type: 'iphone' }).exec(function (err, adventure) {});
     *
     *     // select only the adventures name
     *     Adventure.findOne({ type: 'iphone' }, 'name', function (err, adventure) {});
     *
     *     // same as above
     *     Adventure.findOne({ type: 'iphone' }, 'name').exec(function (err, adventure) {});
     *
     *     // specify options, in this case lean
     *     Adventure.findOne({ type: 'iphone' }, 'name', { lean: true }, callback);
     *
     *     // same as above
     *     Adventure.findOne({ type: 'iphone' }, 'name', { lean: true }).exec(callback);
     *
     *     // chaining findOne queries (same as above)
     *     Adventure.findOne({ type: 'iphone' }).select('name').lean().exec(callback);
     *
     * @param {Object} [conditions]
     * @param {Object} [projection] optional fields to return (http://bit.ly/1HotzBo)
     * @param {Object} [options] optional
     * @param {Function} [callback]
     * @return {Query}
     * @see field selection #query_Query-select
     * @see lean queries #query_Query-lean
     * @api public
     */
    static findOne(conditions, projection, options, callback) {
        if (is.function(options)) {
            callback = options;
            options = null;
        } else if (is.function(projection)) {
            callback = projection;
            projection = null;
            options = null;
        } else if (is.function(conditions)) {
            callback = conditions;
            conditions = {};
            projection = null;
            options = null;
        }

        // get the mongodb collection object
        const mq = new this.Query({}, {}, this, this.collection);
        mq.select(projection);
        mq.setOptions(options);
        if (this.schema.discriminatorMapping &&
            this.schema.discriminatorMapping.isRoot &&
            mq.selectedInclusively()) {
            mq.select(this.schema.options.discriminatorKey);
        }

        if (callback) {
            callback = this.$wrapCallback(callback);
        }

        const res = mq.findOne(conditions);
        if (callback) {
            return res.exec(callback);
        }
        return res;
    }

    /**
     * Counts number of matching documents in a database collection.
     *
     * ####Example:
     *
     *     Adventure.count({ type: 'jungle' }, function (err, count) {
     *       if (err) ..
     *       console.log('there are %d jungle adventures', count);
     *     });
     *
     * @param {Object} conditions
     * @param {Function} [callback]
     * @return {Query}
     * @api public
     */
    static count(conditions, callback) {
        if (is.function(conditions)) {
            callback = conditions;
            conditions = {};
        }

        // get the mongodb collection object
        const mq = new this.Query({}, {}, this, this.collection);

        if (callback) {
            callback = this.$wrapCallback(callback);
        }

        return adone.promise.nodeify(mq.count(conditions), callback);
    }

    /**
     * Creates a Query for a `distinct` operation.
     *
     * Passing a `callback` immediately executes the query.
     *
     * ####Example
     *
     *     Link.distinct('url', { clicks: {$gt: 100}}, function (err, result) {
     *       if (err) return handleError(err);
     *
     *       assert(Array.isArray(result));
     *       console.log('unique urls with more than 100 clicks', result);
     *     })
     *
     *     var query = Link.distinct('url');
     *     query.exec(callback);
     *
     * @param {String} field
     * @param {Object} [conditions] optional
     * @param {Function} [callback]
     * @return {Query}
     * @api public
     */
    static distinct(field, conditions, callback) {
        // get the mongodb collection object
        const mq = new this.Query({}, {}, this, this.collection);

        if (is.function(conditions)) {
            callback = conditions;
            conditions = {};
        }
        if (callback) {
            callback = this.$wrapCallback(callback);
        }

        return adone.promise.nodeify(mq.distinct(field, conditions), callback);
    }

    /**
     * Creates a Query, applies the passed conditions, and returns the Query.
     *
     * For example, instead of writing:
     *
     *     User.find({age: {$gte: 21, $lte: 65}}, callback);
     *
     * we can instead write:
     *
     *     User.where('age').gte(21).lte(65).exec(callback);
     *
     * Since the Query class also supports `where` you can continue chaining
     *
     *     User
     *     .where('age').gte(21).lte(65)
     *     .where('name', /^b/i)
     *     ... etc
     *
     * @param {String} path
     * @param {Object} [val] optional value
     * @return {Query}
     * @api public
     */
    static where(...args) {
        // get the mongodb collection object
        const mq = new this.Query({}, {}, this, this.collection).find({});
        if (is.function(args[args.length - 1])) {
            const cb = args.pop();
            return adone.promise.nodeify(mq.where(...args), cb);
        }
        return mq.where(...args);
    }

    /**
     * Creates a `Query` and specifies a `$where` condition.
     *
     * Sometimes you need to query for things in mongodb using a JavaScript expression. You can do so via `find({ $where: javascript })`, or you can use the mongoose shortcut method $where via a Query chain or from your mongoose Model.
     *
     *     Blog.$where('this.username.indexOf("val") !== -1').exec(function (err, docs) {});
     *
     * @param {String|Function} argument is a javascript string or anonymous function
     * @method $where
     * @memberOf Model
     * @return {Query}
     * @see Query.$where #query_Query-%24where
     * @api public
     */
    static $where(...args) {
        const mq = new this.Query({}, {}, this, this.collection).find({});
        if (is.function(args[args.length - 1])) {
            const cb = args.pop();
            return adone.promise.nodeify(mq.$where(...args), cb);
        }
        return mq.$where(...args);
    }

    /**
     * Issues a mongodb findAndModify update command.
     *
     * Finds a matching document, updates it according to the `update` arg, passing any `options`, and returns the found document (if any) to the callback. The query executes immediately if `callback` is passed else a Query object is returned.
     *
     * ####Options:
     *
     * - `new`: bool - if true, return the modified document rather than the original. defaults to false (changed in 4.0)
     * - `upsert`: bool - creates the object if it doesn't exist. defaults to false.
     * - `fields`: {Object|String} - Field selection. Equivalent to `.select(fields).findOneAndUpdate()`
     * - `maxTimeMS`: puts a time limit on the query - requires mongodb >= 2.6.0
     * - `sort`: if multiple docs are found by the conditions, sets the sort order to choose which doc to update
     * - `runValidators`: if true, runs [update validators](/docs/validation.html#update-validators) on this command. Update validators validate the update operation against the model's schema.
     * - `setDefaultsOnInsert`: if this and `upsert` are true, mongoose will apply the [defaults](http://mongoosejs.com/docs/defaults.html) specified in the model's schema if a new document is created. This option only works on MongoDB >= 2.4 because it relies on [MongoDB's `$setOnInsert` operator](https://docs.mongodb.org/v2.4/reference/operator/update/setOnInsert/).
     * - `passRawResult`: if true, passes the [raw result from the MongoDB driver as the third callback parameter](http://mongodb.github.io/node-mongodb-native/2.0/api/Collection.html#findAndModify)
     * - `strict`: overwrites the schema's [strict mode option](http://mongoosejs.com/docs/guide.html#strict) for this update
     * - `runSettersOnQuery`: bool - if true, run all setters defined on the associated model's schema for all fields defined in the query and the update.
     *
     * ####Examples:
     *
     *     A.findOneAndUpdate(conditions, update, options, callback) // executes
     *     A.findOneAndUpdate(conditions, update, options)  // returns Query
     *     A.findOneAndUpdate(conditions, update, callback) // executes
     *     A.findOneAndUpdate(conditions, update)           // returns Query
     *     A.findOneAndUpdate()                             // returns Query
     *
     * ####Note:
     *
     * All top level update keys which are not `atomic` operation names are treated as set operations:
     *
     * ####Example:
     *
     *     var query = { name: 'borne' };
     *     Model.findOneAndUpdate(query, { name: 'jason bourne' }, options, callback)
     *
     *     // is sent as
     *     Model.findOneAndUpdate(query, { $set: { name: 'jason bourne' }}, options, callback)
     *
     * This helps prevent accidentally overwriting your document with `{ name: 'jason bourne' }`.
     *
     * ####Note:
     *
     * Values are cast to their appropriate types when using the findAndModify helpers.
     * However, the below are not executed by default.
     *
     * - defaults. Use the `setDefaultsOnInsert` option to override.
     * - setters. Use the `runSettersOnQuery` option to override.
     *
     * `findAndModify` helpers support limited validation. You can
     * enable these by setting the `runValidators` options,
     * respectively.
     *
     * If you need full-fledged validation, use the traditional approach of first
     * retrieving the document.
     *
     *     Model.findById(id, function (err, doc) {
     *       if (err) ..
     *       doc.name = 'jason bourne';
     *       doc.save(callback);
     *     });
     *
     * @param {Object} [conditions]
     * @param {Object} [update]
     * @param {Object} [options]
     * @param {Function} [callback]
     * @return {Query}
     * @see mongodb http://www.mongodb.org/display/DOCS/findAndModify+Command
     * @api public
     */
    static findOneAndUpdate(conditions, update, options, callback) {
        if (is.function(options)) {
            callback = options;
            options = null;
        } else if (arguments.length === 1) {
            if (is.function(conditions)) {
                const msg = `${"Model.findOneAndUpdate(): First argument must not be a function.\n\n"
                    + "  "}${this.modelName}.findOneAndUpdate(conditions, update, options, callback)\n`
                    + `  ${this.modelName}.findOneAndUpdate(conditions, update, options)\n`
                    + `  ${this.modelName}.findOneAndUpdate(conditions, update)\n`
                    + `  ${this.modelName}.findOneAndUpdate(update)\n`
                    + `  ${this.modelName}.findOneAndUpdate()\n`;
                throw new TypeError(msg);
            }
            update = conditions;
            conditions = undefined;
        }
        if (callback) {
            callback = this.$wrapCallback(callback);
        }

        let fields;
        if (options && options.fields) {
            fields = options.fields;
        }

        update = utils.clone(update, { depopulate: 1, _isNested: true });
        if (this.schema.options.versionKey && options && options.upsert) {
            if (options.overwrite) {
                update[this.schema.options.versionKey] = 0;
            } else {
                if (!update.$setOnInsert) {
                    update.$setOnInsert = {};
                }
                update.$setOnInsert[this.schema.options.versionKey] = 0;
            }
        }

        const mq = new this.Query({}, {}, this, this.collection);
        mq.select(fields);

        const res = mq.findOneAndUpdate(conditions, update, options);
        if (callback) {
            return res.exec(callback);
        }
        return res;
    }

    /**
     * Issues a mongodb findAndModify update command by a document's _id field.
     * `findByIdAndUpdate(id, ...)` is equivalent to `findOneAndUpdate({ _id: id }, ...)`.
     *
     * Finds a matching document, updates it according to the `update` arg,
     * passing any `options`, and returns the found document (if any) to the
     * callback. The query executes immediately if `callback` is passed else a
     * Query object is returned.
     *
     * This function triggers the following middleware:
     * - `findOneAndUpdate()`
     *
     * ####Options:
     *
     * - `new`: bool - true to return the modified document rather than the original. defaults to false
     * - `upsert`: bool - creates the object if it doesn't exist. defaults to false.
     * - `runValidators`: if true, runs [update validators](/docs/validation.html#update-validators) on this command. Update validators validate the update operation against the model's schema.
     * - `setDefaultsOnInsert`: if this and `upsert` are true, mongoose will apply the [defaults](http://mongoosejs.com/docs/defaults.html) specified in the model's schema if a new document is created. This option only works on MongoDB >= 2.4 because it relies on [MongoDB's `$setOnInsert` operator](https://docs.mongodb.org/v2.4/reference/operator/update/setOnInsert/).
     * - `sort`: if multiple docs are found by the conditions, sets the sort order to choose which doc to update
     * - `select`: sets the document fields to return
     * - `passRawResult`: if true, passes the [raw result from the MongoDB driver as the third callback parameter](http://mongodb.github.io/node-mongodb-native/2.0/api/Collection.html#findAndModify)
     * - `strict`: overwrites the schema's [strict mode option](http://mongoosejs.com/docs/guide.html#strict) for this update
     * - `runSettersOnQuery`: bool - if true, run all setters defined on the associated model's schema for all fields defined in the query and the update.
     *
     * ####Examples:
     *
     *     A.findByIdAndUpdate(id, update, options, callback) // executes
     *     A.findByIdAndUpdate(id, update, options)  // returns Query
     *     A.findByIdAndUpdate(id, update, callback) // executes
     *     A.findByIdAndUpdate(id, update)           // returns Query
     *     A.findByIdAndUpdate()                     // returns Query
     *
     * ####Note:
     *
     * All top level update keys which are not `atomic` operation names are treated as set operations:
     *
     * ####Example:
     *
     *     Model.findByIdAndUpdate(id, { name: 'jason bourne' }, options, callback)
     *
     *     // is sent as
     *     Model.findByIdAndUpdate(id, { $set: { name: 'jason bourne' }}, options, callback)
     *
     * This helps prevent accidentally overwriting your document with `{ name: 'jason bourne' }`.
     *
     * ####Note:
     *
     * Values are cast to their appropriate types when using the findAndModify helpers.
     * However, the below are not executed by default.
     *
     * - defaults. Use the `setDefaultsOnInsert` option to override.
     * - setters. Use the `runSettersOnQuery` option to override.
     *
     * `findAndModify` helpers support limited validation. You can
     * enable these by setting the `runValidators` options,
     * respectively.
     *
     * If you need full-fledged validation, use the traditional approach of first
     * retrieving the document.
     *
     *     Model.findById(id, function (err, doc) {
     *       if (err) ..
     *       doc.name = 'jason bourne';
     *       doc.save(callback);
     *     });
     *
     * @param {Object|Number|String} id value of `_id` to query by
     * @param {Object} [update]
     * @param {Object} [options]
     * @param {Function} [callback]
     * @return {Query}
     * @see Model.findOneAndUpdate #model_Model.findOneAndUpdate
     * @see mongodb http://www.mongodb.org/display/DOCS/findAndModify+Command
     * @api public
     */
    static findByIdAndUpdate(id, update, options, callback) {
        if (callback) {
            callback = this.$wrapCallback(callback);
        }
        if (arguments.length === 1) {
            if (is.function(id)) {
                const msg = `${"Model.findByIdAndUpdate(): First argument must not be a function.\n\n"
                    + "  "}${this.modelName}.findByIdAndUpdate(id, callback)\n`
                    + `  ${this.modelName}.findByIdAndUpdate(id)\n`
                    + `  ${this.modelName}.findByIdAndUpdate()\n`;
                throw new TypeError(msg);
            }
            return this.findOneAndUpdate({ _id: id }, undefined);
        }

        // if a model is passed in instead of an id
        if (id instanceof Document) {
            id = id._id;
        }

        return this.findOneAndUpdate.call(this, { _id: id }, update, options, callback);
    }

    /**
     * Issue a mongodb findAndModify remove command.
     *
     * Finds a matching document, removes it, passing the found document (if any) to the callback.
     *
     * Executes immediately if `callback` is passed else a Query object is returned.
     *
     * This function triggers the following middleware:
     * - `findOneAndRemove()`
     *
     * ####Options:
     *
     * - `sort`: if multiple docs are found by the conditions, sets the sort order to choose which doc to update
     * - `maxTimeMS`: puts a time limit on the query - requires mongodb >= 2.6.0
     * - `select`: sets the document fields to return
     * - `passRawResult`: if true, passes the [raw result from the MongoDB driver as the third callback parameter](http://mongodb.github.io/node-mongodb-native/2.0/api/Collection.html#findAndModify)
     * - `strict`: overwrites the schema's [strict mode option](http://mongoosejs.com/docs/guide.html#strict) for this update
     *
     * ####Examples:
     *
     *     A.findOneAndRemove(conditions, options, callback) // executes
     *     A.findOneAndRemove(conditions, options)  // return Query
     *     A.findOneAndRemove(conditions, callback) // executes
     *     A.findOneAndRemove(conditions) // returns Query
     *     A.findOneAndRemove()           // returns Query
     *
     * Values are cast to their appropriate types when using the findAndModify helpers.
     * However, the below are not executed by default.
     *
     * - defaults. Use the `setDefaultsOnInsert` option to override.
     * - setters. Use the `runSettersOnQuery` option to override.
     *
     * `findAndModify` helpers support limited validation. You can
     * enable these by setting the `runValidators` options,
     * respectively.
     *
     * If you need full-fledged validation, use the traditional approach of first
     * retrieving the document.
     *
     *     Model.findById(id, function (err, doc) {
     *       if (err) ..
     *       doc.name = 'jason bourne';
     *       doc.save(callback);
     *     });
     *
     * @param {Object} conditions
     * @param {Object} [options]
     * @param {Function} [callback]
     * @return {Query}
     * @see mongodb http://www.mongodb.org/display/DOCS/findAndModify+Command
     * @api public
     */
    static findOneAndRemove(conditions, options, callback) {
        if (arguments.length === 1 && is.function(conditions)) {
            const msg = `${"Model.findOneAndRemove(): First argument must not be a function.\n\n"
                + "  "}${this.modelName}.findOneAndRemove(conditions, callback)\n`
                + `  ${this.modelName}.findOneAndRemove(conditions)\n`
                + `  ${this.modelName}.findOneAndRemove()\n`;
            throw new TypeError(msg);
        }

        if (is.function(options)) {
            callback = options;
            options = undefined;
        }
        if (callback) {
            callback = this.$wrapCallback(callback);
        }

        let fields;
        if (options) {
            fields = options.select;
            options.select = undefined;
        }

        const mq = new this.Query({}, {}, this, this.collection);
        mq.select(fields);

        const res = mq.findOneAndRemove(conditions, options);
        if (callback) {
            return res.exec(callback);
        }
        return res;
    }

    /**
     * Issue a mongodb findAndModify remove command by a document's _id field. `findByIdAndRemove(id, ...)` is equivalent to `findOneAndRemove({ _id: id }, ...)`.
     *
     * Finds a matching document, removes it, passing the found document (if any) to the callback.
     *
     * Executes immediately if `callback` is passed, else a `Query` object is returned.
     *
     * This function triggers the following middleware:
     * - `findOneAndRemove()`
     *
     * ####Options:
     *
     * - `sort`: if multiple docs are found by the conditions, sets the sort order to choose which doc to update
     * - `select`: sets the document fields to return
     * - `passRawResult`: if true, passes the [raw result from the MongoDB driver as the third callback parameter](http://mongodb.github.io/node-mongodb-native/2.0/api/Collection.html#findAndModify)
     * - `strict`: overwrites the schema's [strict mode option](http://mongoosejs.com/docs/guide.html#strict) for this update
     *
     * ####Examples:
     *
     *     A.findByIdAndRemove(id, options, callback) // executes
     *     A.findByIdAndRemove(id, options)  // return Query
     *     A.findByIdAndRemove(id, callback) // executes
     *     A.findByIdAndRemove(id) // returns Query
     *     A.findByIdAndRemove()           // returns Query
     *
     * @param {Object|Number|String} id value of `_id` to query by
     * @param {Object} [options]
     * @param {Function} [callback]
     * @return {Query}
     * @see Model.findOneAndRemove #model_Model.findOneAndRemove
     * @see mongodb http://www.mongodb.org/display/DOCS/findAndModify+Command
     */
    static findByIdAndRemove(id, options, callback) {
        if (arguments.length === 1 && is.function(id)) {
            const msg = `${"Model.findByIdAndRemove(): First argument must not be a function.\n\n"
                + "  "}${this.modelName}.findByIdAndRemove(id, callback)\n`
                + `  ${this.modelName}.findByIdAndRemove(id)\n`
                + `  ${this.modelName}.findByIdAndRemove()\n`;
            throw new TypeError(msg);
        }
        if (callback) {
            callback = this.$wrapCallback(callback);
        }

        return this.findOneAndRemove({ _id: id }, options, callback);
    }

    /**
     * Shortcut for saving one or more documents to the database.
     * `MyModel.create(docs)` does `new MyModel(doc).save()` for every doc in
     * docs.
     *
     * This function triggers the following middleware:
     * - `save()`
     *
     * ####Example:
     *
     *     // pass individual docs
     *     Candy.create({ type: 'jelly bean' }, { type: 'snickers' }, function (err, jellybean, snickers) {
     *       if (err) // ...
     *     });
     *
     *     // pass an array
     *     var array = [{ type: 'jelly bean' }, { type: 'snickers' }];
     *     Candy.create(array, function (err, candies) {
     *       if (err) // ...
     *
     *       var jellybean = candies[0];
     *       var snickers = candies[1];
     *       // ...
     *     });
     *
     *     // callback is optional; use the returned promise if you like:
     *     var promise = Candy.create({ type: 'jawbreaker' });
     *     promise.then(function (jawbreaker) {
     *       // ...
     *     })
     *
     * @param {Array|Object|*} doc(s)
     * @param {Function} [callback] callback
     * @return {Promise}
     * @api public
     */
    static create(doc, callback) {
        let args;
        let cb;
        const discriminatorKey = this.schema.options.discriminatorKey;

        if (is.array(doc)) {
            args = doc;
            cb = callback;
        } else {
            const last = arguments[arguments.length - 1];
            // Handle falsy callbacks re: #5061
            if (is.function(last) || !last) {
                cb = last;
                args = utils.args(arguments, 0, arguments.length - 1);
            } else {
                args = utils.args(arguments);
            }
        }

        const Promise = PromiseProvider.get();
        const _this = this;
        if (cb) {
            cb = this.$wrapCallback(cb);
        }

        const promise = new Promise.ES6(((resolve, reject) => {
            if (args.length === 0) {
                setImmediate(() => {
                    cb && cb(null);
                    resolve(null);
                });
                return;
            }

            const toExecute = [];
            let firstError;
            args.forEach((doc) => {
                toExecute.push((callback) => {
                    const Model = _this.discriminators && doc[discriminatorKey] ? _this.discriminators[doc[discriminatorKey]] : _this;
                    let toSave = doc;
                    const callbackWrapper = function (error, doc) {
                        if (error) {
                            if (!firstError) {
                                firstError = error;
                            }
                            return callback(null, { error });
                        }
                        callback(null, { doc });
                    };

                    if (!(toSave instanceof Model)) {
                        try {
                            toSave = new Model(toSave);
                        } catch (error) {
                            return callbackWrapper(error);
                        }
                    }

                    // Hack to avoid getting a promise because of
                    // $__registerHooksFromSchema
                    if (toSave.$__original_save) {
                        toSave.$__original_save({ __noPromise: true }, callbackWrapper);
                    } else {
                        toSave.save({ __noPromise: true }, callbackWrapper);
                    }
                });
            });

            parallel(toExecute, (error, res) => {
                const savedDocs = [];
                const len = res.length;
                for (let i = 0; i < len; ++i) {
                    if (res[i].doc) {
                        savedDocs.push(res[i].doc);
                    }
                }

                if (firstError) {
                    if (cb) {
                        cb(firstError, savedDocs);
                    } else {
                        reject(firstError);
                    }
                    return;
                }

                if (doc instanceof Array) {
                    resolve(savedDocs);
                    cb && cb.call(_this, null, savedDocs);
                } else {
                    // resolve.apply(promise, savedDocs);
                    // rest args
                    resolve(savedDocs.length === 1 ? savedDocs[0] : savedDocs);
                    if (cb) {
                        cb.apply(_this, [null].concat(savedDocs));
                    }
                }
            });
        }));

        return promise;
    }

    /**
     * Shortcut for validating an array of documents and inserting them into
     * MongoDB if they're all valid. This function is faster than `.create()`
     * because it only sends one operation to the server, rather than one for each
     * document.
     *
     * Mongoose always validates each document **before** sending `insertMany`
     * to MongoDB. So if one document has a validation error, no documents will
     * be saved, unless you set
     * [the `ordered` option to false](https://docs.mongodb.com/manual/reference/method/db.collection.insertMany/#error-handling).
     *
     * This function does **not** trigger save middleware.
     *
     * This function triggers the following middleware:
     * - `insertMany()`
     *
     * ####Example:
     *
     *     var arr = [{ name: 'Star Wars' }, { name: 'The Empire Strikes Back' }];
     *     Movies.insertMany(arr, function(error, docs) {});
     *
     * @param {Array|Object|*} doc(s)
     * @param {Object} [options] see the [mongodb driver options](http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html#insertMany)
     * @param {Boolean} [options.ordered = true] if true, will fail fast on the first error encountered. If false, will insert all the documents it can and report errors later. An `insertMany()` with `ordered = false` is called an "unordered" `insertMany()`.
     * @param {Boolean} [options.rawResult = false] if false, the returned promise resolves to the documents that passed mongoose document validation. If `false`, will return the [raw result from the MongoDB driver](http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html#~insertWriteOpCallback) with a `mongoose` property that contains `validationErrors` if this is an unordered `insertMany`.
     * @param {Function} [callback] callback
     * @return {Promise}
     * @api public
     */
    static insertMany(arr, options, callback) {
        const _this = this;
        if (is.function(options)) {
            callback = options;
            options = null;
        }
        if (callback) {
            callback = this.$wrapCallback(callback);
        }
        callback = callback || utils.noop;
        options = options || {};
        const limit = get(options, "limit", 1000);
        const rawResult = get(options, "rawResult", false);
        const ordered = get(options, "ordered", true);

        if (!is.array(arr)) {
            arr = [arr];
        }

        const toExecute = [];
        const validationErrors = [];
        arr.forEach((doc) => {
            toExecute.push((callback) => {
                doc = new _this(doc);
                doc.validate({ __noPromise: true }, (error) => {
                    if (error) {
                        // Option `ordered` signals that insert should be continued after reaching
                        // a failing insert. Therefore we delegate "null", meaning the validation
                        // failed. It's up to the next function to filter out all failed models
                        if (ordered === false) {
                            validationErrors.push(error);
                            return callback(null, null);
                        }
                        return callback(error);
                    }
                    callback(null, doc);
                });
            });
        });

        parallelLimit(toExecute, limit, (error, docs) => {
            if (error) {
                callback && callback(error);
                return;
            }
            // We filter all failed pre-validations by removing nulls
            const docAttributes = docs.filter((doc) => {
                return !is.nil(doc);
            });
            // Quickly escape while there aren't any valid docAttributes
            if (docAttributes.length < 1) {
                callback(null, []);
                return;
            }
            const docObjects = docAttributes.map((doc) => {
                if (doc.schema.options.versionKey) {
                    doc[doc.schema.options.versionKey] = 0;
                }
                if (doc.initializeTimestamps) {
                    return doc.initializeTimestamps().toObject(INSERT_MANY_CONVERT_OPTIONS);
                }
                return doc.toObject(INSERT_MANY_CONVERT_OPTIONS);
            });

            adone.promise.nodeify(_this.collection.insertMany(docObjects, options), (error, res) => {
                if (error) {
                    callback && callback(error);
                    return;
                }
                for (let i = 0; i < docAttributes.length; ++i) {
                    docAttributes[i].isNew = false;
                    docAttributes[i].emit("isNew", false);
                    docAttributes[i].constructor.emit("isNew", false);
                }
                if (rawResult) {
                    if (ordered === false) {
                        // Decorate with mongoose validation errors in case of unordered,
                        // because then still do `insertMany()`
                        res.mongoose = {
                            validationErrors
                        };
                    }
                    return callback(null, res);
                }
                callback(null, docAttributes);
            });
        });
    }

    /**
     * Sends multiple `insertOne`, `updateOne`, `updateMany`, `replaceOne`,
     * `deleteOne`, and/or `deleteMany` operations to the MongoDB server in one
     * command. This is faster than sending multiple independent operations (like)
     * if you use `create()`) because with `bulkWrite()` there is only one round
     * trip to MongoDB.
     *
     * Mongoose will perform casting on all operations you provide.
     *
     * This function does **not** trigger any middleware, not `save()` nor `update()`.
     * If you need to trigger
     * `save()` middleware for every document use [`create()`](http://mongoosejs.com/docs/api.html#model_Model.create) instead.
     *
     * ####Example:
     *
     *     Character.bulkWrite([
     *       {
     *         insertOne: {
     *           document: {
     *             name: 'Eddard Stark',
     *             title: 'Warden of the North'
     *           }
     *         }
     *       },
     *       {
     *         updateOne: {
     *           filter: { name: 'Eddard Stark' },
     *           // If you were using the MongoDB driver directly, you'd need to do
     *           // `update: { $set: { title: ... } }` but mongoose adds $set for
     *           // you.
     *           update: { title: 'Hand of the King' }
     *         }
     *       },
     *       {
     *         deleteOne: {
     *           {
     *             filter: { name: 'Eddard Stark' }
     *           }
     *         }
     *       }
     *     ]).then(handleResult);
     *
     * @param {Array} ops
     * @param {Object} [options]
     * @param {Function} [callback] callback `function(error, bulkWriteOpResult) {}`
     * @return {Promise} resolves to a `BulkWriteOpResult` if the operation succeeds
     * @see writeOpResult http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html#~BulkWriteOpResult
     * @api public
     */
    static bulkWrite(ops, options, callback) {
        const Promise = PromiseProvider.get();
        const _this = this;
        if (is.function(options)) {
            callback = options;
            options = null;
        }
        if (callback) {
            callback = this.$wrapCallback(callback);
        }
        options = options || {};

        const validations = ops.map((op) => {
            if (op.insertOne) {
                return function (callback) {
                    op.insertOne.document = new _this(op.insertOne.document);
                    op.insertOne.document.validate({ __noPromise: true }, (error) => {
                        if (error) {
                            return callback(error);
                        }
                        callback(null);
                    });
                };
            } else if (op.updateOne) {
                op = op.updateOne;
                return function (callback) {
                    try {
                        op.filter = cast(_this.schema, op.filter);
                        op.update = castUpdate(_this.schema, op.update,
                            _this.schema.options.strict);
                        if (op.setDefaultsOnInsert) {
                            setDefaultsOnInsert(op.filter, _this.schema, op.update, {
                                setDefaultsOnInsert: true,
                                upsert: op.upsert
                            });
                        }
                    } catch (error) {
                        return callback(error);
                    }

                    callback(null);
                };
            } else if (op.updateMany) {
                op = op.updateMany;
                return function (callback) {
                    try {
                        op.filter = cast(_this.schema, op.filter);
                        op.update = castUpdate(_this.schema, op.update, {
                            strict: _this.schema.options.strict,
                            overwrite: false
                        });
                        if (op.setDefaultsOnInsert) {
                            setDefaultsOnInsert(op.filter, _this.schema, op.update, {
                                setDefaultsOnInsert: true,
                                upsert: op.upsert
                            });
                        }
                    } catch (error) {
                        return callback(error);
                    }

                    callback(null);
                };
            } else if (op.replaceOne) {
                return function (callback) {
                    try {
                        op.replaceOne.filter = cast(_this.schema,
                            op.replaceOne.filter);
                    } catch (error) {
                        return callback(error);
                    }

                    // set `skipId`, otherwise we get "_id field cannot be changed"
                    op.replaceOne.replacement =
                        new _this(op.replaceOne.replacement, null, true);
                    op.replaceOne.replacement.validate({ __noPromise: true }, (error) => {
                        if (error) {
                            return callback(error);
                        }
                        callback(null);
                    });
                };
            } else if (op.deleteOne) {
                return function (callback) {
                    try {
                        op.deleteOne.filter = cast(_this.schema,
                            op.deleteOne.filter);
                    } catch (error) {
                        return callback(error);
                    }

                    callback(null);
                };
            } else if (op.deleteMany) {
                return function (callback) {
                    try {
                        op.deleteMany.filter = cast(_this.schema,
                            op.deleteMany.filter);
                    } catch (error) {
                        return callback(error);
                    }

                    callback(null);
                };
            }
            return function (callback) {
                callback(new Error("Invalid op passed to `bulkWrite()`"));
            };

        });

        const promise = new Promise.ES6(((resolve, reject) => {
            parallel(validations, (error) => {
                if (error) {
                    callback && callback(error);
                    return reject(error);
                }

                adone.promise.nodeify(_this.collection.bulkWrite(ops, options), (error, res) => {
                    if (error) {
                        callback && callback(error);
                        return reject(error);
                    }

                    callback && callback(null, res);
                    resolve(res);
                });
            });
        }));

        return promise;
    }

    /**
     * Shortcut for creating a new Document from existing raw data, pre-saved in the DB.
     * The document returned has no paths marked as modified initially.
     *
     * ####Example:
     *
     *     // hydrate previous data into a Mongoose document
     *     var mongooseCandy = Candy.hydrate({ _id: '54108337212ffb6d459f854c', type: 'jelly bean' });
     *
     * @param {Object} obj
     * @return {Document}
     * @api public
     */
    static hydrate(obj) {
        const model = require("./queryhelpers").createModel(this, obj);
        model.init(obj);
        return model;
    }

    /**
     * Updates one document in the database without returning it.
     *
     * This function triggers the following middleware:
     * - `update()`
     *
     * ####Examples:
     *
     *     MyModel.update({ age: { $gt: 18 } }, { oldEnough: true }, fn);
     *     MyModel.update({ name: 'Tobi' }, { ferret: true }, { multi: true }, function (err, raw) {
     *       if (err) return handleError(err);
     *       console.log('The raw response from Mongo was ', raw);
     *     });
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
     *
     * All `update` values are cast to their appropriate SchemaTypes before being sent.
     *
     * The `callback` function receives `(err, rawResponse)`.
     *
     * - `err` is the error if any occurred
     * - `rawResponse` is the full response from Mongo
     *
     * ####Note:
     *
     * All top level keys which are not `atomic` operation names are treated as set operations:
     *
     * ####Example:
     *
     *     var query = { name: 'borne' };
     *     Model.update(query, { name: 'jason bourne' }, options, callback)
     *
     *     // is sent as
     *     Model.update(query, { $set: { name: 'jason bourne' }}, options, callback)
     *     // if overwrite option is false. If overwrite is true, sent without the $set wrapper.
     *
     * This helps prevent accidentally overwriting all documents in your collection with `{ name: 'jason bourne' }`.
     *
     * ####Note:
     *
     * Be careful to not use an existing model instance for the update clause (this won't work and can cause weird behavior like infinite loops). Also, ensure that the update clause does not have an _id property, which causes Mongo to return a "Mod on _id not allowed" error.
     *
     * ####Note:
     *
     * To update documents without waiting for a response from MongoDB, do not pass a `callback`, then call `exec` on the returned [Query](#query-js):
     *
     *     Comment.update({ _id: id }, { $set: { text: 'changed' }}).exec();
     *
     * ####Note:
     *
     * Although values are casted to their appropriate types when using update, the following are *not* applied:
     *
     * - defaults
     * - setters
     * - validators
     * - middleware
     *
     * If you need those features, use the traditional approach of first retrieving the document.
     *
     *     Model.findOne({ name: 'borne' }, function (err, doc) {
     *       if (err) ..
     *       doc.name = 'jason bourne';
     *       doc.save(callback);
     *     })
     *
     * @see strict http://mongoosejs.com/docs/guide.html#strict
     * @see response http://docs.mongodb.org/v2.6/reference/command/update/#output
     * @param {Object} conditions
     * @param {Object} doc
     * @param {Object} [options]
     * @param {Function} [callback]
     * @return {Query}
     * @api public
     */
    static update(conditions, doc, options, callback) {
        return _update(this, "update", conditions, doc, options, callback);
    }

    /**
     * Same as `update()`, except MongoDB will update _all_ documents that match
     * `criteria` (as opposed to just the first one) regardless of the value of
     * the `multi` option.
     *
     * **Note** updateMany will _not_ fire update middleware. Use `pre('updateMany')`
     * and `post('updateMany')` instead.
     *
     * This function triggers the following middleware:
     * - `updateMany()`
     *
     * @param {Object} conditions
     * @param {Object} doc
     * @param {Object} [options]
     * @param {Function} [callback]
     * @return {Query}
     * @api public
     */
    static updateMany(conditions, doc, options, callback) {
        return _update(this, "updateMany", conditions, doc, options, callback);
    }

    /**
     * Same as `update()`, except MongoDB will update _only_ the first document that
     * matches `criteria` regardless of the value of the `multi` option.
     *
     * This function triggers the following middleware:
     * - `updateOne()`
     *
     * @param {Object} conditions
     * @param {Object} doc
     * @param {Object} [options]
     * @param {Function} [callback]
     * @return {Query}
     * @api public
     */
    static updateOne(conditions, doc, options, callback) {
        return _update(this, "updateOne", conditions, doc, options, callback);
    }

    /**
     * Same as `update()`, except MongoDB replace the existing document with the
     * given document (no atomic operators like `$set`).
     *
     * This function triggers the following middleware:
     * - `replaceOne()`
     *
     * @param {Object} conditions
     * @param {Object} doc
     * @param {Object} [options]
     * @param {Function} [callback]
     * @return {Query}
     * @api public
     */
    static replaceOne(conditions, doc, options, callback) {
        return _update(this, "replaceOne", conditions, doc, options, callback);
    }

    /**
     * Executes a mapReduce command.
     *
     * `o` is an object specifying all mapReduce options as well as the map and reduce functions. All options are delegated to the driver implementation. See [node-mongodb-native mapReduce() documentation](http://mongodb.github.io/node-mongodb-native/api-generated/collection.html#mapreduce) for more detail about options.
     *
     * This function does not trigger any middleware.
     *
     * ####Example:
     *
     *     var o = {};
     *     o.map = function () { emit(this.name, 1) }
     *     o.reduce = function (k, vals) { return vals.length }
     *     User.mapReduce(o, function (err, results) {
     *       console.log(results)
     *     })
     *
     * ####Other options:
     *
     * - `query` {Object} query filter object.
     * - `sort` {Object} sort input objects using this key
     * - `limit` {Number} max number of documents
     * - `keeptemp` {Boolean, default:false} keep temporary data
     * - `finalize` {Function} finalize function
     * - `scope` {Object} scope variables exposed to map/reduce/finalize during execution
     * - `jsMode` {Boolean, default:false} it is possible to make the execution stay in JS. Provided in MongoDB > 2.0.X
     * - `verbose` {Boolean, default:false} provide statistics on job execution time.
     * - `readPreference` {String}
     * - `out*` {Object, default: {inline:1}} sets the output target for the map reduce job.
     *
     * ####* out options:
     *
     * - `{inline:1}` the results are returned in an array
     * - `{replace: 'collectionName'}` add the results to collectionName: the results replace the collection
     * - `{reduce: 'collectionName'}` add the results to collectionName: if dups are detected, uses the reducer / finalize functions
     * - `{merge: 'collectionName'}` add the results to collectionName: if dups exist the new docs overwrite the old
     *
     * If `options.out` is set to `replace`, `merge`, or `reduce`, a Model instance is returned that can be used for further querying. Queries run against this model are all executed with the `lean` option; meaning only the js object is returned and no Mongoose magic is applied (getters, setters, etc).
     *
     * ####Example:
     *
     *     var o = {};
     *     o.map = function () { emit(this.name, 1) }
     *     o.reduce = function (k, vals) { return vals.length }
     *     o.out = { replace: 'createdCollectionNameForResults' }
     *     o.verbose = true;
     *
     *     User.mapReduce(o, function (err, model, stats) {
     *       console.log('map reduce took %d ms', stats.processtime)
     *       model.find().where('value').gt(10).exec(function (err, docs) {
     *         console.log(docs);
     *       });
     *     })
     *
     *     // `mapReduce()` returns a promise. However, ES6 promises can only
     *     // resolve to exactly one value,
     *     o.resolveToObject = true;
     *     var promise = User.mapReduce(o);
     *     promise.then(function (res) {
     *       var model = res.model;
     *       var stats = res.stats;
     *       console.log('map reduce took %d ms', stats.processtime)
     *       return model.find().where('value').gt(10).exec();
     *     }).then(function (docs) {
     *        console.log(docs);
     *     }).then(null, handleError).end()
     *
     * @param {Object} o an object specifying map-reduce options
     * @param {Function} [callback] optional callback
     * @see http://www.mongodb.org/display/DOCS/MapReduce
     * @return {Promise}
     * @api public
     */
    static mapReduce(o, callback) {
        const _this = this;
        if (callback) {
            callback = this.$wrapCallback(callback);
        }
        const resolveToObject = o.resolveToObject;
        const Promise = PromiseProvider.get();
        return new Promise.ES6(((resolve, reject) => {
            if (!Model.mapReduce.schema) {
                const opts = { noId: true, noVirtualId: true, strict: false };
                Model.mapReduce.schema = new Schema({}, opts);
            }

            if (!o.out) {
                o.out = { inline: 1 };
            }
            if (o.verbose !== false) {
                o.verbose = true;
            }

            o.map = String(o.map);
            o.reduce = String(o.reduce);

            if (o.query) {
                let q = new _this.Query(o.query);
                q.cast(_this);
                o.query = q._conditions;
                q = undefined;
            }

            adone.promise.nodeify(_this.collection.mapReduce(null, null, o), (err, ret, stats) => {
                if (err) {
                    callback && callback(err);
                    reject(err);
                    return;
                }

                if (ret.findOne && ret.mapReduce) {
                    // returned a collection, convert to Model
                    const model = Model.compile(
                        `_mapreduce_${ret.collectionName}`
                        , Model.mapReduce.schema
                        , ret.collectionName
                        , _this.db
                        , _this.base);

                    model._mapreduce = true;

                    callback && callback(null, model, stats);
                    return resolveToObject ? resolve({
                        model,
                        stats
                    }) : resolve([model, stats]);
                }

                callback && callback(null, ret, stats);
                if (resolveToObject) {
                    return resolve({ model: ret, stats });
                }
                resolve([ret, stats]);
            });
        }));
    }

    /**
     * geoNear support for Mongoose
     *
     * This function does not trigger any middleware. In particular, this
     * bypasses `find()` middleware.
     *
     * ####Options:
     * - `lean` {Boolean} return the raw object
     * - All options supported by the driver are also supported
     *
     * ####Example:
     *
     *     // Legacy point
     *     Model.geoNear([1,3], { maxDistance : 5, spherical : true }, function(err, results, stats) {
     *        console.log(results);
     *     });
     *
     *     // geoJson
     *     var point = { type : "Point", coordinates : [9,9] };
     *     Model.geoNear(point, { maxDistance : 5, spherical : true }, function(err, results, stats) {
     *        console.log(results);
     *     });
     *
     * @param {Object|Array} GeoJSON point or legacy coordinate pair [x,y] to search near
     * @param {Object} options for the query
     * @param {Function} [callback] optional callback for the query
     * @return {Promise}
     * @see http://docs.mongodb.org/manual/core/2dsphere/
     * @see http://mongodb.github.io/node-mongodb-native/api-generated/collection.html?highlight=geonear#geoNear
     * @api public
     */
    static geoNear(near, options, callback) {
        if (is.function(options)) {
            callback = options;
            options = {};
        }

        if (callback) {
            callback = this.$wrapCallback(callback);
        }

        const _this = this;
        const Promise = PromiseProvider.get();
        if (!near) {
            return new Promise.ES6(((resolve, reject) => {
                const error = new Error("Must pass a near option to geoNear");
                reject(error);
                callback && callback(error);
            }));
        }

        let x;
        let y;
        const schema = this.schema;

        const p = new Promise.ES6(((resolve, reject) => {
            const handler = function (err, res) {
                if (err) {
                    reject(err);
                    callback && callback(err);
                    return;
                }
                if (options.lean) {
                    resolve([res.results, res.stats]);
                    callback && callback(null, res.results, res.stats);
                    return;
                }

                let count = res.results.length;
                // if there are no results, fulfill the promise now
                if (count === 0) {
                    resolve([res.results, res.stats]);
                    callback && callback(null, res.results, res.stats);
                    return;
                }

                let errSeen = false;

                function init(err) {
                    if (err && !errSeen) {
                        errSeen = true;
                        reject(err);
                        callback && callback(err);
                        return;
                    }
                    if (--count <= 0) {
                        resolve([res.results, res.stats]);
                        callback && callback(null, res.results, res.stats);
                    }
                }

                for (let i = 0; i < res.results.length; i++) {
                    const temp = res.results[i].obj;
                    res.results[i].obj = new _this();
                    res.results[i].obj.init(temp, init);
                }
            };

            if (!is.nil(options.query)) {
                options.query = utils.clone(options.query, { retainKeyOrder: 1 });
                cast(schema, options.query);
            }

            if (is.array(near)) {
                if (near.length !== 2) {
                    var error = new Error("If using legacy coordinates, must be an array " +
                        "of size 2 for geoNear");
                    reject(error);
                    callback && callback(error);
                    return;
                }
                x = near[0];
                y = near[1];
                adone.promise.nodeify(_this.collection.geoNear(x, y, options), handler);
            } else {
                if (near.type !== "Point" || !is.array(near.coordinates)) {
                    error = new Error("Must pass either a legacy coordinate array or " +
                        "GeoJSON Point to geoNear");
                    reject(error);
                    callback && callback(error);
                    return;
                }

                adone.promise.nodeify(_this.collection.geoNear(near, options), handler);
            }
        }));

        if (callback) {
            p.catch(adone.noop); // TODO: ok?
        }

        return p;
    }

    /**
     * Performs [aggregations](http://docs.mongodb.org/manual/applications/aggregation/) on the models collection.
     *
     * If a `callback` is passed, the `aggregate` is executed and a `Promise` is returned. If a callback is not passed, the `aggregate` itself is returned.
     *
     * This function does not trigger any middleware.
     *
     * ####Example:
     *
     *     // Find the max balance of all accounts
     *     Users.aggregate(
     *       { $group: { _id: null, maxBalance: { $max: '$balance' }}},
     *       { $project: { _id: 0, maxBalance: 1 }},
     *       function (err, res) {
     *         if (err) return handleError(err);
     *         console.log(res); // [ { maxBalance: 98000 } ]
     *       });
     *
     *     // Or use the aggregation pipeline builder.
     *     Users.aggregate()
     *       .group({ _id: null, maxBalance: { $max: '$balance' } })
     *       .select('-id maxBalance')
     *       .exec(function (err, res) {
     *         if (err) return handleError(err);
     *         console.log(res); // [ { maxBalance: 98 } ]
     *     });
     *
     * ####NOTE:
     *
     * - Arguments are not cast to the model's schema because `$project` operators allow redefining the "shape" of the documents at any stage of the pipeline, which may leave documents in an incompatible format.
     * - The documents returned are plain javascript objects, not mongoose documents (since any shape of document can be returned).
     * - Requires MongoDB >= 2.1
     *
     * @see Aggregate #aggregate_Aggregate
     * @see MongoDB http://docs.mongodb.org/manual/applications/aggregation/
     * @param {Object|Array} [...] aggregation pipeline operator(s) or operator array
     * @param {Function} [callback]
     * @return {Aggregate|Promise}
     * @api public
     */
    static aggregate() {
        let args = [].slice.call(arguments),
            aggregate,
            callback;

        if (is.function(args[args.length - 1])) {
            callback = args.pop();
        }

        if (args.length === 1 && util.isArray(args[0])) {
            aggregate = new Aggregate(args[0]);
        } else {
            aggregate = new Aggregate(args);
        }

        aggregate.model(this);

        if (is.undefined(callback)) {
            return aggregate;
        }

        if (callback) {
            callback = this.$wrapCallback(callback);
        }

        adone.promise.nodeify(aggregate.exec(), callback);
    }

    /**
     * Implements `$geoSearch` functionality for Mongoose
     *
     * This function does not trigger any middleware
     *
     * ####Example:
     *
     *     var options = { near: [10, 10], maxDistance: 5 };
     *     Locations.geoSearch({ type : "house" }, options, function(err, res) {
     *       console.log(res);
     *     });
     *
     * ####Options:
     * - `near` {Array} x,y point to search for
     * - `maxDistance` {Number} the maximum distance from the point near that a result can be
     * - `limit` {Number} The maximum number of results to return
     * - `lean` {Boolean} return the raw object instead of the Mongoose Model
     *
     * @param {Object} conditions an object that specifies the match condition (required)
     * @param {Object} options for the geoSearch, some (near, maxDistance) are required
     * @param {Function} [callback] optional callback
     * @return {Promise}
     * @see http://docs.mongodb.org/manual/reference/command/geoSearch/
     * @see http://docs.mongodb.org/manual/core/geohaystack/
     * @api public
     */
    static geoSearch(conditions, options, callback) {
        if (is.function(options)) {
            callback = options;
            options = {};
        }
        if (callback) {
            callback = this.$wrapCallback(callback);
        }

        const _this = this;
        const Promise = PromiseProvider.get();
        const p = new Promise.ES6(((resolve, reject) => {
            let error;
            if (is.undefined(conditions) || !utils.isObject(conditions)) {
                error = new Error("Must pass conditions to geoSearch");
            } else if (!options.near) {
                error = new Error("Must specify the near option in geoSearch");
            } else if (!is.array(options.near)) {
                error = new Error("near option must be an array [x, y]");
            }

            if (error) {
                callback && callback(error);
                reject(error);
                return;
            }

            // send the conditions in the options object
            options.search = conditions;

            adone.promise.nodeify(_this.collection.geoHaystackSearch(options.near[0], options.near[1], options), (err, res) => {
                // have to deal with driver problem. Should be fixed in a soon-ish release
                // (7/8/2013)
                if (err) {
                    callback && callback(err);
                    reject(err);
                    return;
                }

                let count = res.results.length;
                if (options.lean || count === 0) {
                    callback && callback(null, res.results, res.stats);
                    resolve([res.results, res.stats]);
                    return;
                }

                const errSeen = false;

                const init = function (err) {
                    if (err && !errSeen) {
                        callback && callback(err);
                        reject(err);
                        return;
                    }

                    if (!--count && !errSeen) {
                        callback && callback(null, res.results, res.stats);
                        resolve([res.results, res.stats]);
                    }
                };

                for (let i = 0; i < res.results.length; i++) {
                    const temp = res.results[i];
                    res.results[i] = new _this();
                    res.results[i].init(temp, {}, init);
                }
            });
        }));

        if (callback) {
            p.catch(adone.noop); // TODO: ok?
        }

        return p;
    }

    /**
     * Populates document references.
     *
     * ####Available options:
     *
     * - path: space delimited path(s) to populate
     * - select: optional fields to select
     * - match: optional query conditions to match
     * - model: optional name of the model to use for population
     * - options: optional query options like sort, limit, etc
     *
     * ####Examples:
     *
     *     // populates a single object
     *     User.findById(id, function (err, user) {
     *       var opts = [
     *           { path: 'company', match: { x: 1 }, select: 'name' }
     *         , { path: 'notes', options: { limit: 10 }, model: 'override' }
     *       ]
     *
     *       User.populate(user, opts, function (err, user) {
     *         console.log(user);
     *       });
     *     });
     *
     *     // populates an array of objects
     *     User.find(match, function (err, users) {
     *       var opts = [{ path: 'company', match: { x: 1 }, select: 'name' }]
     *
     *       var promise = User.populate(users, opts);
     *       promise.then(console.log).end();
     *     })
     *
     *     // imagine a Weapon model exists with two saved documents:
     *     //   { _id: 389, name: 'whip' }
     *     //   { _id: 8921, name: 'boomerang' }
     *     // and this schema:
     *     // new Schema({
     *     //   name: String,
     *     //   weapon: { type: ObjectId, ref: 'Weapon' }
     *     // });
     *
     *     var user = { name: 'Indiana Jones', weapon: 389 }
     *     Weapon.populate(user, { path: 'weapon', model: 'Weapon' }, function (err, user) {
     *       console.log(user.weapon.name) // whip
     *     })
     *
     *     // populate many plain objects
     *     var users = [{ name: 'Indiana Jones', weapon: 389 }]
     *     users.push({ name: 'Batman', weapon: 8921 })
     *     Weapon.populate(users, { path: 'weapon' }, function (err, users) {
     *       users.forEach(function (user) {
     *         console.log('%s uses a %s', users.name, user.weapon.name)
     *         // Indiana Jones uses a whip
     *         // Batman uses a boomerang
     *       });
     *     });
     *     // Note that we didn't need to specify the Weapon model because
     *     // it is in the schema's ref
     *
     * @param {Document|Array} docs Either a single document or array of documents to populate.
     * @param {Object} options A hash of key/val (path, options) used for population.
     * @param {Function} [callback(err,doc)] Optional callback, executed upon completion. Receives `err` and the `doc(s)`.
     * @return {Promise}
     * @api public
     */
    static populate(docs, paths, callback) {
        const _this = this;
        if (callback) {
            callback = this.$wrapCallback(callback);
        }

        // normalized paths
        const noPromise = paths && Boolean(paths.__noPromise);
        paths = utils.populate(paths);

        // data that should persist across subPopulate calls
        const cache = {};

        if (noPromise) {
            _populate(this, docs, paths, cache, callback);
        } else {
            const Promise = PromiseProvider.get();
            return new Promise.ES6(((resolve, reject) => {
                _populate(_this, docs, paths, cache, (error, docs) => {
                    if (error) {
                        callback && callback(error);
                        reject(error);
                    } else {
                        callback && callback(null, docs);
                        resolve(docs);
                    }
                });
            }));
        }
    }

    /**
     * Finds the schema for `path`. This is different than
     * calling `schema.path` as it also resolves paths with
     * positional selectors (something.$.another.$.path).
     *
     * @param {String} path
     * @return {Schema}
     * @api private
     */
    static _getSchema(path) {
        return this.schema._getSchema(path);
    }

    /*!
    * Compiler utility.
    *
    * @param {String|Function} name model name or class extending Model
    * @param {Schema} schema
    * @param {String} collectionName
    * @param {Connection} connection
    * @param {Mongoose} base mongoose instance
    */
    static compile(name, schema, collectionName, connection, base) {
        const versioningEnabled = schema.options.versionKey !== false;

        if (versioningEnabled && !schema.paths[schema.options.versionKey]) {
            // add versioning to top level documents only
            const o = {};
            o[schema.options.versionKey] = Number;
            schema.add(o);
        }

        let model;
        if (is.function(name) && name.prototype instanceof Model) {
            model = name;
            name = model.name;
            schema.loadClass(model, false);
            model.prototype.$isMongooseModelPrototype = true;
        } else {
            // generate new class
            model = class extends Model {
                constructor(doc, fields, skipId) {
                    super(doc, fields, skipId);
                    if (!(this instanceof model)) {
                        return new model(doc, fields, skipId);
                    }
                }
            };
        }

        model.hooks = schema.s.hooks.clone();
        model.base = base;
        model.modelName = name;
        if (!(model.prototype instanceof Model)) {
            model.__proto__ = Model;
            model.prototype.__proto__ = Model.prototype;
        }
        model.model = Model.prototype.model;
        model.db = model.prototype.db = connection;
        model.discriminators = model.prototype.discriminators = undefined;

        model.prototype.$__setSchema(schema);

        const _userProvidedOptions = schema._userProvidedOptions || {};
        let bufferCommands = true;
        if (!is.nil(connection.config.bufferCommands)) {
            bufferCommands = connection.config.bufferCommands;
        }
        if (!is.nil(_userProvidedOptions.bufferCommands)) {
            bufferCommands = _userProvidedOptions.bufferCommands;
        }

        const collectionOptions = {
            bufferCommands,
            capped: schema.options.capped
        };

        model.prototype.collection = connection.collection(
            collectionName
            , collectionOptions
        );

        // apply methods and statics
        applyMethods(model, schema);
        applyStatics(model, schema);
        applyHooks(model, schema);

        model.schema = model.prototype.schema;
        model.collection = model.prototype.collection;

        // Create custom query constructor
        model.Query = class extends Query {
            constructor(...args) {
                super(...args);
                this.options.retainKeyOrder = model.schema.options.retainKeyOrder;
            }
        };

        model.Query.base = Query.base;
        applyQueryMethods(model, schema.query);

        const kareemOptions = {
            useErrorHandlers: true,
            numCallbackParams: 1
        };
        model.$__insertMany = model.hooks.createWrapper("insertMany", model.insertMany, model, kareemOptions);
        model.insertMany = function (arr, options, callback) {
            const Promise = PromiseProvider.get();
            if (is.function(options)) {
                callback = options;
                options = null;
            }
            return new Promise.ES6(((resolve, reject) => {
                model.$__insertMany(arr, options, (error, result) => {
                    if (error) {
                        callback && callback(error);
                        return reject(error);
                    }
                    callback && callback(null, result);
                    resolve(result);
                });
            }));
        };

        return model;
    }

    /*!
    * Subclass this model with `conn`, `schema`, and `collection` settings.
    *
    * @param {Connection} conn
    * @param {Schema} [schema]
    * @param {String} [collection]
    * @return {Model}
    */
    static __subclass(conn, schema, collection) {
        // subclass model using this connection and collection name
        const _this = this;

        const Model = class extends this.prototype.constructor { };
        Model.db = Model.prototype.db = conn;

        const s = schema && !is.string(schema) ? schema : _this.prototype.schema;

        const options = s.options || {};
        const _userProvidedOptions = s._userProvidedOptions || {};

        if (!collection) {
            collection = _this.prototype.schema.get("collection")
                || utils.toCollectionName(_this.modelName, options);
        }

        let bufferCommands = true;
        if (s) {
            if (!is.nil(conn.config.bufferCommands)) {
                bufferCommands = conn.config.bufferCommands;
            }
            if (!is.nil(_userProvidedOptions.bufferCommands)) {
                bufferCommands = _userProvidedOptions.bufferCommands;
            }
        }
        const collectionOptions = {
            bufferCommands,
            capped: s && options.capped
        };

        Model.prototype.collection = conn.collection(collection, collectionOptions);
        Model.collection = Model.prototype.collection;
        Model.init();
        return Model;
    }

    static $wrapCallback(callback) {
        const _this = this;
        return function () {
            try {
                callback.apply(null, arguments);
            } catch (error) {
                _this.emit("error", error);
            }
        };
    }
}
Model.prototype.$isMongooseModelPrototype = true;

/**
 * Connection the model uses.
 *
 * @api public
 * @property db
 */

Model.prototype.db;

/**
 * Collection the model uses.
 *
 * @api public
 * @property collection
 */

Model.prototype.collection;

/**
 * The name of the model
 *
 * @api public
 * @property modelName
 */

Model.prototype.modelName;

/**
 * Additional properties to attach to the query when calling `save()` and
 * `isNew` is false.
 *
 * @api public
 * @property $where
 */

Model.prototype.$where;

/**
 * If this is a discriminator model, `baseModelName` is the name of
 * the base model.
 *
 * @api public
 * @property baseModelName
 */

Model.prototype.baseModelName;

// Model (class) features

/*!
 * Give the constructor the ability to emit events.
 */

for (const i in EventEmitter.prototype) {
    Model[i] = EventEmitter.prototype[i];
}



/**
 * Schema the model uses.
 *
 * @property schema
 * @receiver Model
 * @api public
 */

Model.schema;

/*!
 * Connection instance the model uses.
 *
 * @property db
 * @receiver Model
 * @api public
 */

Model.db;

/*!
 * Collection the model uses.
 *
 * @property collection
 * @receiver Model
 * @api public
 */

Model.collection;

/**
 * Base Mongoose instance the model uses.
 *
 * @property base
 * @receiver Model
 * @api public
 */

Model.base;

/**
 * Registered discriminators for this model.
 *
 * @property discriminators
 * @receiver Model
 * @api public
 */

Model.discriminators;
