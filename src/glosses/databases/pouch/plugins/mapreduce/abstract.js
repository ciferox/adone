const {
    database: { pouch }
} = adone;

const {
    x
} = pouch;

const {
    collate: {
        collate,
    toIndexableString,
    normalizeKey,
    parseIndexableString
    },
    util: {
        md5: {
            string: stringMd5
        },
        binary: {
            base64ToBuffer
        },
        upsert,
        isRemote
    }
} = adone.private(pouch);

const stringify = (input) => {
    if (!input) {
        return "undefined"; // backwards compat for empty reduce
    }
    // for backwards compat with mapreduce, functions/strings are stringified
    // as-is. everything else is JSON-stringified.
    switch (typeof input) {
        case "function":
            // e.g. a mapreduce map
            return input.toString();
        case "string":
            // e.g. a mapreduce built-in _reduce function
            return input.toString();
        default:
            // e.g. a JSON object in the case of mango queries
            return JSON.stringify(input);
    }
};

/* create a string signature for a view so we can cache it and uniq it */
const createViewSignature = (mapFun, reduceFun) => {
    // the "undefined" part is for backwards compatibility
    return `${stringify(mapFun) + stringify(reduceFun)}undefined`;
};

const createView = (sourceDB, viewName, mapFun, reduceFun, temporary, localDocName) => {
    const viewSignature = createViewSignature(mapFun, reduceFun);

    let cachedViews;
    if (!temporary) {
        // cache this to ensure we don't try to update the same view twice
        cachedViews = sourceDB._cachedViews = sourceDB._cachedViews || {};
        if (cachedViews[viewSignature]) {
            return cachedViews[viewSignature];
        }
    }

    const promiseForView = sourceDB.info().then((info) => {

        const depDbName = `${info.db_name}-mrview-${
            temporary ? "temp" : stringMd5(viewSignature)}`;

        // save the view name in the source db so it can be cleaned up if necessary
        // (e.g. when the _design doc is deleted, remove all associated view data)
        const diffFunction = (doc) => {
            doc.views = doc.views || {};
            let fullViewName = viewName;
            if (fullViewName.indexOf("/") === -1) {
                fullViewName = `${viewName}/${viewName}`;
            }
            const depDbs = doc.views[fullViewName] = doc.views[fullViewName] || {};
            /* istanbul ignore if */
            if (depDbs[depDbName]) {
                return; // no update necessary
            }
            depDbs[depDbName] = true;
            return doc;
        };

        return upsert(sourceDB, `_local/${localDocName}`, diffFunction).then(() => {
            return sourceDB.registerDependentDatabase(depDbName).then((res) => {
                const db = res.db;
                db.auto_compaction = true;
                const view = {
                    name: depDbName,
                    db,
                    sourceDB,
                    adapter: sourceDB.adapter,
                    mapFun,
                    reduceFun
                };
                return view.db.get("_local/lastSeq").catch((err) => {
                    /* istanbul ignore if */
                    if (err.status !== 404) {
                        throw err;
                    }
                }).then((lastSeqDoc) => {
                    view.seq = lastSeqDoc ? lastSeqDoc.seq : 0;
                    if (cachedViews) {
                        view.db.once("destroyed", () => {
                            delete cachedViews[viewSignature];
                        });
                    }
                    return view;
                });
            });
        });
    });

    if (cachedViews) {
        cachedViews[viewSignature] = promiseForView;
    }
    return promiseForView;
};

/*
 * Simple task queue to sequentialize actions. Assumes
 * callbacks will eventually fire (once).
 */

class TaskQueue {
    constructor() {
        this.promise = new Promise(((fulfill) => {
            fulfill();
        }));
    }

    add(promiseFactory) {
        this.promise = this.promise.catch(() => {
            // just recover
        }).then(() => {
            return promiseFactory();
        });
        return this.promise;
    }

    finish() {
        return this.promise;
    }
}

const sequentialize = (queue, promiseFactory) => {
    return function (...args) {
        return queue.add(() => {
            return promiseFactory.apply(this, args);
        });
    };
};

const mapToKeysArray = (map) => {
    const result = new Array(map.size);
    let index = -1;
    map.forEach((value, key) => {
        result[++index] = key;
    });
    return result;
};

const { is, util } = adone;

const persistentQueues = {};
const tempViewQueue = new TaskQueue();
const CHANGES_BATCH_SIZE = 50;

const parseViewName = (name) => {
    // can be either 'ddocname/viewname' or just 'viewname'
    // (where the ddoc name is the same)
    return name.indexOf("/") === -1 ? [name, name] : name.split("/");
};

const isGenOne = (changes) => {
    // only return true if the current change is 1-
    // and there are no other leafs
    return changes.length === 1 && /^1-/.test(changes[0].rev);
};

const emitError = (db, e) => {
    try {
        db.emit("error", e);
    } catch (err) {
        adone.error(
            "The user's map/reduce function threw an uncaught error.\n" +
            "You can debug this error by doing:\n" +
            "myDatabase.on('error', function (err) { debugger; });\n" +
            "Please double-check your map/reduce function.");
        adone.error("error", e);
    }
};

/**
 * Returns an "abstract" mapreduce object of the form:
 *
 *   {
 *     query: queryFun,
 *     viewCleanup: viewCleanupFun
 *   }
 *
 * Arguments are:
 *
 * localDoc: string
 *   This is for the local doc that gets saved in order to track the
 *   "dependent" DBs and clean them up for viewCleanup. It should be
 *   unique, so that indexer plugins don't collide with each other.
 * mapper: function (mapFunDef, emit)
 *   Returns a map function based on the mapFunDef, which in the case of
 *   normal map/reduce is just the de-stringified function, but may be
 *   something else, such as an object in the case of find.
 * reducer: function (reduceFunDef)
 *   Ditto, but for reducing. Modules don't have to support reducing
 *   (e.g. find).
 * ddocValidator: function (ddoc, viewName)
 *   Throws an error if the ddoc or viewName is not valid.
 *   This could be a way to communicate to the user that the configuration for the
 *   indexer is invalid.
 */
const createAbstractMapReduce = (localDocName, mapper, reducer, ddocValidator) => {

    const tryMap = (db, fun, doc) => {
        // emit an event if there was an error thrown by a map function.
        // putting try/catches in a single function also avoids deoptimizations.
        try {
            fun(doc);
        } catch (e) {
            emitError(db, e);
        }
    };

    const tryReduce = (db, fun, keys, values, rereduce) => {
        // same as above, but returning the result or an error. there are two separate
        // functions to avoid extra memory allocations since the tryCode() case is used
        // for custom map functions (common) vs this function, which is only used for
        // custom reduce functions (rare)
        try {
            return { output: fun(keys, values, rereduce) };
        } catch (e) {
            emitError(db, e);
            return { error: e };
        }
    };

    const sortByKeyThenValue = (x, y) => {
        const keyCompare = collate(x.key, y.key);
        return keyCompare !== 0 ? keyCompare : collate(x.value, y.value);
    };

    const sliceResults = (results, limit, skip) => {
        skip = skip || 0;
        if (is.number(limit)) {
            return results.slice(skip, limit + skip);
        } else if (skip > 0) {
            return results.slice(skip);
        }
        return results;
    };

    const rowToDocId = (row) => {
        const val = row.value;
        // Users can explicitly specify a joined doc _id, or it
        // defaults to the doc _id that emitted the key/value.
        const docId = (val && typeof val === "object" && val._id) || row.id;
        return docId;
    };

    const readAttachmentsAsBlobOrBuffer = (res) => {
        res.rows.forEach((row) => {
            const atts = row.doc && row.doc._attachments;
            if (!atts) {
                return;
            }
            Object.keys(atts).forEach((filename) => {
                const att = atts[filename];
                atts[filename].data = base64ToBuffer(att.data, att.content_type);
            });
        });
    };

    const postprocessAttachments = (opts) => {
        return function (res) {
            if (opts.include_docs && opts.attachments && opts.binary) {
                readAttachmentsAsBlobOrBuffer(res);
            }
            return res;
        };
    };

    const addHttpParam = (paramName, opts, params, asJson) => {
        // add an http param from opts to params, optionally json-encoded
        let val = opts[paramName];
        if (!is.undefined(val)) {
            if (asJson) {
                val = encodeURIComponent(JSON.stringify(val));
            }
            params.push(`${paramName}=${val}`);
        }
    };

    const coerceInteger = (integerCandidate) => {
        if (!is.undefined(integerCandidate)) {
            const asNumber = Number(integerCandidate);
            // prevents e.g. '1foo' or '1.1' being coerced to 1
            if (!isNaN(asNumber) && asNumber === parseInt(integerCandidate, 10)) {
                return asNumber;
            }
            return integerCandidate;

        }
    };

    const coerceOptions = (opts) => {
        opts.group_level = coerceInteger(opts.group_level);
        opts.limit = coerceInteger(opts.limit);
        opts.skip = coerceInteger(opts.skip);
        return opts;
    };

    const checkPositiveInteger = (number) => {
        if (number) {
            if (!is.number(number)) {
                return x.createError(x.QUERY_PARSE_ERROR, `Invalid value for integer: "${number}"`);
            }
            if (number < 0) {
                return x.createError(x.QUERY_PARSE_ERROR, `Invalid value for positive integer: "${number}"`);
            }
        }
    };

    const checkQueryParseError = (options, fun) => {
        const startkeyName = options.descending ? "endkey" : "startkey";
        const endkeyName = options.descending ? "startkey" : "endkey";

        if (!is.undefined(options[startkeyName]) &&
            !is.undefined(options[endkeyName]) &&
            collate(options[startkeyName], options[endkeyName]) > 0) {
            throw x.createError(x.QUERY_PARSE_ERROR, "No rows can match your key range, reverse your start_key and end_key or set {descending : true}");
        } else if (fun.reduce && options.reduce !== false) {
            if (options.include_docs) {
                throw x.createError(x.QUERY_PARSE_ERROR, "{include_docs:true} is invalid for reduce");
            } else if (options.keys && options.keys.length > 1 &&
                !options.group && !options.group_level) {
                throw x.createError(x.QUERY_PARSE_ERROR, "Multi-key fetches for reduce views must use {group: true}");
            }
        }
        ["group_level", "limit", "skip"].forEach((optionName) => {
            const error = checkPositiveInteger(options[optionName]);
            if (error) {
                throw error;
            }
        });
    };

    const httpQuery = (db, fun, opts) => {
        // List of parameters to add to the PUT request
        let params = [];
        let body;
        let method = "GET";

        // If opts.reduce exists and is defined, then add it to the list
        // of parameters.
        // If reduce=false then the results are that of only the map function
        // not the final result of map and reduce.
        addHttpParam("reduce", opts, params);
        addHttpParam("include_docs", opts, params);
        addHttpParam("attachments", opts, params);
        addHttpParam("limit", opts, params);
        addHttpParam("descending", opts, params);
        addHttpParam("group", opts, params);
        addHttpParam("group_level", opts, params);
        addHttpParam("skip", opts, params);
        addHttpParam("stale", opts, params);
        addHttpParam("conflicts", opts, params);
        addHttpParam("startkey", opts, params, true);
        addHttpParam("start_key", opts, params, true);
        addHttpParam("endkey", opts, params, true);
        addHttpParam("end_key", opts, params, true);
        addHttpParam("inclusive_end", opts, params);
        addHttpParam("key", opts, params, true);
        addHttpParam("update_seq", opts, params);

        // Format the list of parameters into a valid URI query string
        params = params.join("&");
        params = params === "" ? "" : `?${params}`;

        // If keys are supplied, issue a POST to circumvent GET query string limits
        // see http://wiki.apache.org/couchdb/HTTP_view_API#Querying_Options
        if (!is.undefined(opts.keys)) {
            const MAX_URL_LENGTH = 2000;
            // according to http://stackoverflow.com/a/417184/680742,
            // the de facto URL length limit is 2000 characters

            const keysAsString =
                `keys=${encodeURIComponent(JSON.stringify(opts.keys))}`;
            if (keysAsString.length + params.length + 1 <= MAX_URL_LENGTH) {
                // If the keys are short enough, do a GET. we do this to work around
                // Safari not understanding 304s on POSTs (see pouchdb/pouchdb#1239)
                params += (params[0] === "?" ? "&" : "?") + keysAsString;
            } else {
                method = "POST";
                if (is.string(fun)) {
                    body = { keys: opts.keys };
                } else { // fun is {map : mapfun}, so append to this
                    fun.keys = opts.keys;
                }
            }
        }

        // We are referencing a query defined in the design doc
        if (is.string(fun)) {
            const parts = parseViewName(fun);
            return db.request({
                method,
                url: `_design/${parts[0]}/_view/${parts[1]}${params}`,
                body
            }).then(
                /* istanbul ignore next */
                (result) => {
                    // fail the entire request if the result contains an error
                    result.rows.forEach((row) => {
                        if (row.value && row.value.error && row.value.error === "builtin_reduce_error") {
                            throw new Error(row.reason);
                        }
                    });

                    return result;
                })
                .then(postprocessAttachments(opts));
        }

        // We are using a temporary view, terrible for performance, good for testing
        body = body || {};
        Object.keys(fun).forEach((key) => {
            if (is.array(fun[key])) {
                body[key] = fun[key];
            } else {
                body[key] = fun[key].toString();
            }
        });
        return db.request({
            method: "POST",
            url: `_temp_view${params}`,
            body
        }).then(postprocessAttachments(opts));
    };

    // custom adapters can define their own api._query
    // and override the default behavior
    /* istanbul ignore next */
    const customQuery = (db, fun, opts) => {
        return new Promise(((resolve, reject) => {
            db._query(fun, opts, (err, res) => {
                if (err) {
                    return reject(err);
                }
                resolve(res);
            });
        }));
    };

    // custom adapters can define their own api._viewCleanup
    // and override the default behavior
    /* istanbul ignore next */
    const customViewCleanup = (db) => {
        return new Promise(((resolve, reject) => {
            db._viewCleanup((err, res) => {
                if (err) {
                    return reject(err);
                }
                resolve(res);
            });
        }));
    };

    const defaultsTo = (value) => {
        return function (reason) {
            /* istanbul ignore else */
            if (reason.status === 404) {
                return value;
            }
            throw reason;

        };
    };

    // returns a promise for a list of docs to update, based on the input docId.
    // the order doesn't matter, because post-3.2.0, bulkDocs
    // is an atomic operation in all three adapters.
    const getDocsToPersist = (docId, view, docIdsToChangesAndEmits) => {
        const metaDocId = `_local/doc_${docId}`;
        const defaultMetaDoc = { _id: metaDocId, keys: [] };
        const docData = docIdsToChangesAndEmits.get(docId);
        const indexableKeysToKeyValues = docData[0];
        const changes = docData[1];

        const getMetaDoc = () => {
            if (isGenOne(changes)) {
                // generation 1, so we can safely assume initial state
                // for performance reasons (avoids unnecessary GETs)
                return Promise.resolve(defaultMetaDoc);
            }
            return view.db.get(metaDocId).catch(defaultsTo(defaultMetaDoc));
        };

        const getKeyValueDocs = (metaDoc) => {
            if (!metaDoc.keys.length) {
                // no keys, no need for a lookup
                return Promise.resolve({ rows: [] });
            }
            return view.db.allDocs({
                keys: metaDoc.keys,
                include_docs: true
            });
        };

        const processKeyValueDocs = (metaDoc, kvDocsRes) => {
            const kvDocs = [];
            const oldKeys = new Set();

            for (let i = 0, len = kvDocsRes.rows.length; i < len; i++) {
                const row = kvDocsRes.rows[i];
                const doc = row.doc;
                if (!doc) { // deleted
                    continue;
                }
                kvDocs.push(doc);
                oldKeys.add(doc._id);
                doc._deleted = !indexableKeysToKeyValues.has(doc._id);
                if (!doc._deleted) {
                    const keyValue = indexableKeysToKeyValues.get(doc._id);
                    if ("value" in keyValue) {
                        doc.value = keyValue.value;
                    }
                }
            }
            const newKeys = mapToKeysArray(indexableKeysToKeyValues);
            newKeys.forEach((key) => {
                if (!oldKeys.has(key)) {
                    // new doc
                    const kvDoc = {
                        _id: key
                    };
                    const keyValue = indexableKeysToKeyValues.get(key);
                    if ("value" in keyValue) {
                        kvDoc.value = keyValue.value;
                    }
                    kvDocs.push(kvDoc);
                }
            });
            metaDoc.keys = adone.util.unique(newKeys.concat(metaDoc.keys));
            kvDocs.push(metaDoc);

            return kvDocs;
        };

        return getMetaDoc().then((metaDoc) => {
            return getKeyValueDocs(metaDoc).then((kvDocsRes) => {
                return processKeyValueDocs(metaDoc, kvDocsRes);
            });
        });
    };

    // updates all emitted key/value docs and metaDocs in the mrview database
    // for the given batch of documents from the source database
    const saveKeyValues = (view, docIdsToChangesAndEmits, seq) => {
        const seqDocId = "_local/lastSeq";
        return view.db.get(seqDocId)
            .catch(defaultsTo({ _id: seqDocId, seq: 0 }))
            .then((lastSeqDoc) => {
                const docIds = mapToKeysArray(docIdsToChangesAndEmits);
                return Promise.all(docIds.map((docId) => {
                    return getDocsToPersist(docId, view, docIdsToChangesAndEmits);
                })).then((listOfDocsToPersist) => {
                    const docsToPersist = util.flatten(listOfDocsToPersist);
                    lastSeqDoc.seq = seq;
                    docsToPersist.push(lastSeqDoc);
                    // write all docs in a single operation, update the seq once
                    return view.db.bulkDocs({ docs: docsToPersist });
                });
            });
    };

    const getQueue = (view) => {
        const viewName = is.string(view) ? view : view.name;
        let queue = persistentQueues[viewName];
        if (!queue) {
            queue = persistentQueues[viewName] = new TaskQueue();
        }
        return queue;
    };

    const updateView = (view) => {
        return sequentialize(getQueue(view), () => {
            return updateViewInQueue(view);
        })();
    };

    const updateViewInQueue = (view) => {
        // bind the emit function once
        let mapResults;
        let doc;

        const emit = (key, value) => {
            const output = { id: doc._id, key: normalizeKey(key) };
            // Don't explicitly store the value unless it's defined and non-null.
            // This saves on storage space, because often people don't use it.
            if (!is.nil(value)) {
                output.value = normalizeKey(value);
            }
            mapResults.push(output);
        };

        const mapFun = mapper(view.mapFun, emit);

        let currentSeq = view.seq || 0;

        const processChange = (docIdsToChangesAndEmits, seq) => {
            return function () {
                return saveKeyValues(view, docIdsToChangesAndEmits, seq);
            };
        };

        const queue = new TaskQueue();

        const processNextBatch = () => {
            return view.sourceDB.changes({
                conflicts: true,
                include_docs: true,
                style: "all_docs",
                since: currentSeq,
                limit: CHANGES_BATCH_SIZE
            }).then(processBatch);
        };

        const processBatch = (response) => {
            const results = response.results;
            if (!results.length) {
                return;
            }
            const docIdsToChangesAndEmits = createDocIdsToChangesAndEmits(results);
            queue.add(processChange(docIdsToChangesAndEmits, currentSeq));
            if (results.length < CHANGES_BATCH_SIZE) {
                return;
            }
            return processNextBatch();
        };

        const createDocIdsToChangesAndEmits = (results) => {
            const docIdsToChangesAndEmits = new Map();
            for (let i = 0, len = results.length; i < len; i++) {
                const change = results[i];
                if (change.doc._id[0] !== "_") {
                    mapResults = [];
                    doc = change.doc;

                    if (!doc._deleted) {
                        tryMap(view.sourceDB, mapFun, doc);
                    }
                    mapResults.sort(sortByKeyThenValue);

                    const indexableKeysToKeyValues = createIndexableKeysToKeyValues(mapResults);
                    docIdsToChangesAndEmits.set(change.doc._id, [
                        indexableKeysToKeyValues,
                        change.changes
                    ]);
                }
                currentSeq = change.seq;
            }
            return docIdsToChangesAndEmits;
        };

        const createIndexableKeysToKeyValues = (mapResults) => {
            const indexableKeysToKeyValues = new Map();
            let lastKey;
            for (let i = 0, len = mapResults.length; i < len; i++) {
                const emittedKeyValue = mapResults[i];
                const complexKey = [emittedKeyValue.key, emittedKeyValue.id];
                if (i > 0 && collate(emittedKeyValue.key, lastKey) === 0) {
                    complexKey.push(i); // dup key+id, so make it unique
                }
                indexableKeysToKeyValues.set(toIndexableString(complexKey), emittedKeyValue);
                lastKey = emittedKeyValue.key;
            }
            return indexableKeysToKeyValues;
        };

        return processNextBatch().then(() => {
            return queue.finish();
        }).then(() => {
            view.seq = currentSeq;
        });
    };

    const reduceView = (view, results, options) => {
        if (options.group_level === 0) {
            delete options.group_level;
        }

        const shouldGroup = options.group || options.group_level;

        const reduceFun = reducer(view.reduceFun);

        const groups = [];
        const lvl = isNaN(options.group_level) ? Number.POSITIVE_INFINITY :
            options.group_level;
        results.forEach((e) => {
            const last = groups[groups.length - 1];
            let groupKey = shouldGroup ? e.key : null;

            // only set group_level for array keys
            if (shouldGroup && is.array(groupKey)) {
                groupKey = groupKey.slice(0, lvl);
            }

            if (last && collate(last.groupKey, groupKey) === 0) {
                last.keys.push([e.key, e.id]);
                last.values.push(e.value);
                return;
            }
            groups.push({
                keys: [[e.key, e.id]],
                values: [e.value],
                groupKey
            });
        });
        results = [];
        for (let i = 0, len = groups.length; i < len; i++) {
            const e = groups[i];
            const reduceTry = tryReduce(view.sourceDB, reduceFun, e.keys, e.values, false);
            if (reduceTry.error && reduceTry.error.builtIn) {
                // CouchDB returns an error if a built-in errors out
                throw reduceTry.error;
            }
            results.push({
                // CouchDB just sets the value to null if a non-built-in errors out
                value: reduceTry.error ? null : reduceTry.output,
                key: e.groupKey
            });
        }
        // no total_rows/offset when reducing
        return { rows: sliceResults(results, options.limit, options.skip) };
    };

    const queryView = (view, opts) => {
        return sequentialize(getQueue(view), () => {
            return queryViewInQueue(view, opts);
        })();
    };

    const queryViewInQueue = (view, opts) => {
        let totalRows;
        const shouldReduce = view.reduceFun && opts.reduce !== false;
        const skip = opts.skip || 0;
        if (!is.undefined(opts.keys) && !opts.keys.length) {
            // equivalent query
            opts.limit = 0;
            delete opts.keys;
        }

        const fetchFromView = (viewOpts) => {
            viewOpts.include_docs = true;
            return view.db.allDocs(viewOpts).then((res) => {
                totalRows = res.total_rows;
                return res.rows.map((result) => {

                    // implicit migration - in older versions of PouchDB,
                    // we explicitly stored the doc as {id: ..., key: ..., value: ...}
                    // this is tested in a migration test
                    /* istanbul ignore next */
                    if ("value" in result.doc && typeof result.doc.value === "object" &&
                        !is.null(result.doc.value)) {
                        const keys = Object.keys(result.doc.value).sort();
                        // this detection method is not perfect, but it's unlikely the user
                        // emitted a value which was an object with these 3 exact keys
                        const expectedKeys = ["id", "key", "value"];
                        if (!(keys < expectedKeys || keys > expectedKeys)) {
                            return result.doc.value;
                        }
                    }

                    const parsedKeyAndDocId = parseIndexableString(result.doc._id);
                    return {
                        key: parsedKeyAndDocId[0],
                        id: parsedKeyAndDocId[1],
                        value: ("value" in result.doc ? result.doc.value : null)
                    };
                });
            });
        };

        const onMapResultsReady = (rows) => {
            let finalResults;
            if (shouldReduce) {
                finalResults = reduceView(view, rows, opts);
            } else {
                finalResults = {
                    total_rows: totalRows,
                    offset: skip,
                    rows
                };
            }
            if (opts.update_seq) {
                finalResults.update_seq = view.seq;
            }
            if (opts.include_docs) {
                const docIds = adone.util.unique(rows.map(rowToDocId));

                return view.sourceDB.allDocs({
                    keys: docIds,
                    include_docs: true,
                    conflicts: opts.conflicts,
                    attachments: opts.attachments,
                    binary: opts.binary
                }).then((allDocsRes) => {
                    const docIdsToDocs = new Map();
                    allDocsRes.rows.forEach((row) => {
                        docIdsToDocs.set(row.id, row.doc);
                    });
                    rows.forEach((row) => {
                        const docId = rowToDocId(row);
                        const doc = docIdsToDocs.get(docId);
                        if (doc) {
                            row.doc = doc;
                        }
                    });
                    return finalResults;
                });
            }
            return finalResults;

        };

        if (!is.undefined(opts.keys)) {
            const keys = opts.keys;
            const fetchPromises = keys.map((key) => {
                const viewOpts = {
                    startkey: toIndexableString([key]),
                    endkey: toIndexableString([key, {}])
                };
                if (opts.update_seq) {
                    viewOpts.update_seq = true;
                }
                return fetchFromView(viewOpts);
            });
            return Promise.all(fetchPromises).then(util.flatten).then(onMapResultsReady);
        } // normal query, no 'keys'
        const viewOpts = {
            descending: opts.descending
        };
        if (opts.update_seq) {
            viewOpts.update_seq = true;
        }
        let startkey;
        let endkey;
        if ("start_key" in opts) {
            startkey = opts.start_key;
        }
        if ("startkey" in opts) {
            startkey = opts.startkey;
        }
        if ("end_key" in opts) {
            endkey = opts.end_key;
        }
        if ("endkey" in opts) {
            endkey = opts.endkey;
        }
        if (!is.undefined(startkey)) {
            viewOpts.startkey = opts.descending ?
                toIndexableString([startkey, {}]) :
                toIndexableString([startkey]);
        }
        if (!is.undefined(endkey)) {
            let inclusiveEnd = opts.inclusive_end !== false;
            if (opts.descending) {
                inclusiveEnd = !inclusiveEnd;
            }

            viewOpts.endkey = toIndexableString(
                inclusiveEnd ? [endkey, {}] : [endkey]);
        }
        if (!is.undefined(opts.key)) {
            const keyStart = toIndexableString([opts.key]);
            const keyEnd = toIndexableString([opts.key, {}]);
            if (viewOpts.descending) {
                viewOpts.endkey = keyStart;
                viewOpts.startkey = keyEnd;
            } else {
                viewOpts.startkey = keyStart;
                viewOpts.endkey = keyEnd;
            }
        }
        if (!shouldReduce) {
            if (is.number(opts.limit)) {
                viewOpts.limit = opts.limit;
            }
            viewOpts.skip = skip;
        }
        return fetchFromView(viewOpts).then(onMapResultsReady);

    };

    const httpViewCleanup = (db) => {
        return db.request({
            method: "POST",
            url: "_view_cleanup"
        });
    };

    const localViewCleanup = (db) => {
        return db.get(`_local/${localDocName}`).then((metaDoc) => {
            const docsToViews = new Map();
            Object.keys(metaDoc.views).forEach((fullViewName) => {
                const parts = parseViewName(fullViewName);
                const designDocName = `_design/${parts[0]}`;
                const viewName = parts[1];
                let views = docsToViews.get(designDocName);
                if (!views) {
                    views = new Set();
                    docsToViews.set(designDocName, views);
                }
                views.add(viewName);
            });
            const opts = {
                keys: mapToKeysArray(docsToViews),
                include_docs: true
            };
            return db.allDocs(opts).then((res) => {
                const viewsToStatus = {};
                res.rows.forEach((row) => {
                    const ddocName = row.key.substring(8); // cuts off '_design/'
                    docsToViews.get(row.key).forEach((viewName) => {
                        let fullViewName = `${ddocName}/${viewName}`;
                        /* istanbul ignore if */
                        if (!metaDoc.views[fullViewName]) {
                            // new format, without slashes, to support PouchDB 2.2.0
                            // migration test in pouchdb's browser.migration.js verifies this
                            fullViewName = viewName;
                        }
                        const viewDBNames = Object.keys(metaDoc.views[fullViewName]);
                        // design doc deleted, or view function nonexistent
                        const statusIsGood = row.doc && row.doc.views &&
                            row.doc.views[viewName];
                        viewDBNames.forEach((viewDBName) => {
                            viewsToStatus[viewDBName] =
                                viewsToStatus[viewDBName] || statusIsGood;
                        });
                    });
                });
                const dbsToDelete = Object.keys(viewsToStatus).filter(
                    (viewDBName) => {
                        return !viewsToStatus[viewDBName];
                    });
                const destroyPromises = dbsToDelete.map((viewDBName) => {
                    return sequentialize(getQueue(viewDBName), () => {
                        return new db.constructor(viewDBName, db.__opts).destroy();
                    })();
                });
                return Promise.all(destroyPromises).then(() => {
                    return { ok: true };
                });
            });
        }, defaultsTo({ ok: true }));
    };

    const queryPromised = (db, fun, opts) => {
        /* istanbul ignore next */
        if (is.function(db._query)) {
            return customQuery(db, fun, opts);
        }
        if (isRemote(db)) {
            return httpQuery(db, fun, opts);
        }

        if (!is.string(fun)) {
            // temp_view
            checkQueryParseError(opts, fun);

            tempViewQueue.add(() => {
                const createViewPromise = createView(
                    /* sourceDB */ db,
                    /* viewName */ "temp_view/temp_view",
                    /* mapFun */ fun.map,
                    /* reduceFun */ fun.reduce,
                    /* temporary */ true,
                    /* localDocName */ localDocName);
                return createViewPromise.then((view) => {
                    return adone.promise.finally(updateView(view).then(() => {
                        return queryView(view, opts);
                    }), () => {
                        return view.db.destroy();
                    });
                });
            });
            return tempViewQueue.finish();
        }
        // persistent view
        const fullViewName = fun;
        const parts = parseViewName(fullViewName);
        const designDocName = parts[0];
        const viewName = parts[1];
        return db.get(`_design/${designDocName}`).then((doc) => {
            const fun = doc.views && doc.views[viewName];

            if (!fun) {
                // basic validator; it's assumed that every subclass would want this
                throw x.createError(x.NOT_FOUND, `ddoc ${doc._id} has no view named ${viewName}`);
            }

            ddocValidator(doc, viewName);
            checkQueryParseError(opts, fun);

            const createViewPromise = createView(
                /* sourceDB */ db,
                /* viewName */ fullViewName,
                /* mapFun */ fun.map,
                /* reduceFun */ fun.reduce,
                /* temporary */ false,
                /* localDocName */ localDocName);
            return createViewPromise.then((view) => {
                if (opts.stale === "ok" || opts.stale === "update_after") {
                    if (opts.stale === "update_after") {
                        process.nextTick(() => {
                            updateView(view);
                        });
                    }
                    return queryView(view, opts);
                } // stale not ok
                return updateView(view).then(() => {
                    return queryView(view, opts);
                });

            });
        });

    };

    const abstractQuery = function (fun, opts, callback) {
        const db = this;
        if (is.function(opts)) {
            callback = opts;
            opts = {};
        }
        opts = opts ? coerceOptions(opts) : {};

        if (is.function(fun)) {
            fun = { map: fun };
        }

        const promise = Promise.resolve().then(() => {
            return queryPromised(db, fun, opts);
        });
        return adone.promise.nodeify(promise, callback);
    };

    const abstractViewCleanup = adone.promise.callbackify(function () {
        const db = this;
        /* istanbul ignore next */
        if (is.function(db._viewCleanup)) {
            return customViewCleanup(db);
        }
        if (isRemote(db)) {
            return httpViewCleanup(db);
        }
        return localViewCleanup(db);
    });

    return {
        query: abstractQuery,
        viewCleanup: abstractViewCleanup
    };
};

export default createAbstractMapReduce;
