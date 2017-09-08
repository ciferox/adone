const {
    is,
    util,
    database: { pouch }
} = adone;

const {
    plugin: { find: plugin }
} = pouch

const {
    collate: { collate },
    selector: { filterInMemoryFields },
    util: {
        selector: {
            massageSelector,
            getValue
        }
    }
} = adone.private(pouch);

const {
    adapter: {
        local: {
            util: {
                massageSort,
                validateFindRequest,
                validateSort,
                reverseOptions,
                filterInclusiveStart,
                massageUseIndex,
                pick
            },
            queryPlanner: planQuery,
            abstractMapper,
            getIndexes
        }
    }
} = plugin;

const indexToSignature = (index) => {
    // remove '_design/'
    return `${index.ddoc.substring(8)}/${index.name}`;
};

const doAllDocs = (db, originalOpts) => {
    const opts = util.clone(originalOpts);

    // CouchDB responds in weird ways when you provide a non-string to _id;
    // we mimic the behavior for consistency. See issue66 tests for details.

    if (opts.descending) {
        if ("endkey" in opts && !is.string(opts.endkey)) {
            opts.endkey = "";
        }
        if ("startkey" in opts && !is.string(opts.startkey)) {
            opts.limit = 0;
        }
    } else {
        if ("startkey" in opts && !is.string(opts.startkey)) {
            opts.startkey = "";
        }
        if ("endkey" in opts && !is.string(opts.endkey)) {
            opts.limit = 0;
        }
    }
    if ("key" in opts && !is.string(opts.key)) {
        opts.limit = 0;
    }

    return db.allDocs(opts)
        .then((res) => {
            // filter out any design docs that _all_docs might return
            res.rows = res.rows.filter((row) => {
                return !/^_design\//.test(row.id);
            });
            return res;
        });
};

const find = (db, requestDef, explain) => {
    if (requestDef.selector) {
        requestDef.selector = massageSelector(requestDef.selector);
    }

    if (requestDef.sort) {
        requestDef.sort = massageSort(requestDef.sort);
    }

    if (requestDef.use_index) {
        requestDef.use_index = massageUseIndex(requestDef.use_index);
    }

    validateFindRequest(requestDef);

    return getIndexes(db).then((getIndexesRes) => {

        db.constructor.emit("debug", ["find", "planning query", requestDef]);
        const queryPlan = planQuery(requestDef, getIndexesRes.indexes);
        db.constructor.emit("debug", ["find", "query plan", queryPlan]);

        const indexToUse = queryPlan.index;

        validateSort(requestDef, indexToUse);

        let opts = {
            include_docs: true,
            reduce: false,
            ...queryPlan.queryOpts
        };

        if ("startkey" in opts && "endkey" in opts &&
            collate(opts.startkey, opts.endkey) > 0) {
            // can't possibly return any results, startkey > endkey
            return { docs: [] };
        }

        const isDescending = requestDef.sort &&
            !is.string(requestDef.sort[0]) &&
            getValue(requestDef.sort[0]) === "desc";

        if (isDescending) {
            // either all descending or all ascending
            opts.descending = true;
            opts = reverseOptions(opts);
        }

        if (!queryPlan.inMemoryFields.length) {
            // no in-memory filtering necessary, so we can let the
            // database do the limit/skip for us
            if ("limit" in requestDef) {
                opts.limit = requestDef.limit;
            }
            if ("skip" in requestDef) {
                opts.skip = requestDef.skip;
            }
        }

        if (explain) {
            return Promise.resolve(queryPlan, opts);
        }

        return Promise.resolve().then(() => {
            if (indexToUse.name === "_all_docs") {
                return doAllDocs(db, opts);
            }
            const signature = indexToSignature(indexToUse);
            return abstractMapper.query.call(db, signature, opts);

        }).then((res) => {
            if (opts.inclusive_start === false) {
                // may have to manually filter the first one,
                // since couchdb has no true inclusive_start option
                res.rows = filterInclusiveStart(res.rows, opts.startkey, indexToUse);
            }

            if (queryPlan.inMemoryFields.length) {
                // need to filter some stuff in-memory
                res.rows = filterInMemoryFields(res.rows, requestDef, queryPlan.inMemoryFields);
            }

            const resp = {
                docs: res.rows.map((row) => {
                    const doc = row.doc;
                    if (requestDef.fields) {
                        return pick(doc, requestDef.fields);
                    }
                    return doc;
                })
            };

            if (indexToUse.defaultUsed) {
                resp.warning = "no matching index found, create an index to optimize query time";
            }

            return resp;
        });
    });
};

const explain = (db, requestDef) => {
    return find(db, requestDef, true)
        .then((queryPlan) => {
            return {
                dbname: db.name,
                index: queryPlan.index,
                selector: requestDef.selector,
                range: {
                    start_key: queryPlan.queryOpts.startkey,
                    end_key: queryPlan.queryOpts.endkey
                },
                opts: {
                    use_index: requestDef.use_index || [],
                    bookmark: "nil", //hardcoded to match CouchDB since its not supported,
                    limit: requestDef.limit,
                    skip: requestDef.skip,
                    sort: requestDef.sort || {},
                    fields: requestDef.fields,
                    conflicts: false, //hardcoded to match CouchDB since its not supported,
                    r: [49] // hardcoded to match CouchDB since its not support
                },
                limit: requestDef.limit,
                skip: requestDef.skip || 0,
                fields: requestDef.fields
            };
        });
};

export { find, explain };
