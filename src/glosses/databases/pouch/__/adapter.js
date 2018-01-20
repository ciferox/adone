const {
    is,
    util,
    database: { pouch },
    event
} = adone;

const {
    x
} = pouch;

const {
    Changes,
    util: {
        rev,
        isRemote,
        upsert,
        bulkGetShim,
        invalidIdError,
        toPromise,
        merge: {
            traverseRevTree,
            collectLeaves,
            rootToLeaf,
            collectConflicts,
            isDeleted,
            isLocalId
        }
    }
} = adone.private(pouch);

/**
 * A generic pouch adapter
 */
const compare = (left, right) => {
    return left < right ? -1 : left > right ? 1 : 0;
};

// Wrapper for functions that call the bulkdocs api with a single doc,
// if the first result is an error, return an error
const yankError = (callback, docId) => {
    return function (err, results) {
        if (err || (results[0] && results[0].error)) {
            err = err || results[0];
            err.docId = docId;
            callback(err);
        } else {
            callback(null, results.length ? results[0] : results);
        }
    };
};

// clean docs given to us by the user
const cleanDocs = (docs) => {
    for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];
        if (doc._deleted) {
            delete doc._attachments; // ignore atts for deleted docs
        } else if (doc._attachments) {
            // filter out extraneous keys from _attachments
            const atts = Object.keys(doc._attachments);
            for (let j = 0; j < atts.length; j++) {
                const att = atts[j];
                doc._attachments[att] = util.pick(doc._attachments[att],
                    ["data", "digest", "content_type", "length", "revpos", "stub"]);
            }
        }
    }
};

// compare two docs, first by _id then by _rev
const compareByIdThenRev = (a, b) => {
    const idCompare = compare(a._id, b._id);
    if (idCompare !== 0) {
        return idCompare;
    }
    const aStart = a._revisions ? a._revisions.start : 0;
    const bStart = b._revisions ? b._revisions.start : 0;
    return compare(aStart, bStart);
};

// for every node in a revision tree computes its distance from the closest
// leaf
const computeHeight = (revs) => {
    const height = {};
    const edges = [];
    traverseRevTree(revs, (isLeaf, pos, id, prnt) => {
        const rev = `${pos}-${id}`;
        if (isLeaf) {
            height[rev] = 0;
        }
        if (!is.undefined(prnt)) {
            edges.push({ from: prnt, to: rev });
        }
        return rev;
    });

    edges.reverse();
    edges.forEach((edge) => {
        if (is.undefined(height[edge.from])) {
            height[edge.from] = 1 + height[edge.to];
        } else {
            height[edge.from] = Math.min(height[edge.from], 1 + height[edge.to]);
        }
    });
    return height;
};

const allDocsKeysParse = (opts) => {
    const keys = ("limit" in opts) ?
        opts.keys.slice(opts.skip, opts.limit + opts.skip) :
        (opts.skip > 0) ? opts.keys.slice(opts.skip) : opts.keys;
    opts.keys = keys;
    opts.skip = 0;
    if (opts.descending) {
        keys.reverse();
        opts.descending = false;
    }
};

// all compaction is done in a queue, to avoid attaching
// too many listeners at once
const doNextCompaction = (self) => {
    const task = self._compactionQueue[0];
    const opts = task.opts;
    const callback = task.callback;
    self.get("_local/compaction").catch(() => {
        return false;
    }).then((doc) => {
        if (doc && doc.last_seq) {
            opts.last_seq = doc.last_seq;
        }
        self._compact(opts, (err, res) => {
            /* istanbul ignore if */
            if (err) {
                callback(err);
            } else {
                callback(null, res);
            }
            process.nextTick(() => {
                self._compactionQueue.shift();
                if (self._compactionQueue.length) {
                    doNextCompaction(self);
                }
            });
        });
    });
};

const attachmentNameError = (name) => {
    if (name[0] === "_") {
        return `${name} is not a valid attachment name, attachment names cannot start with '_'`;
    }
    return false;
};

const logApiCall = (self, name, args) => {
    /* istanbul ignore if */
    if (self.constructor.listeners("debug").length) {
        const logArgs = ["api", self.name, name];
        for (let i = 0; i < args.length - 1; i++) {
            logArgs.push(args[i]);
        }
        self.constructor.emit("debug", logArgs);

        // override the callback itself to log the response
        const origCallback = args[args.length - 1];
        args[args.length - 1] = function (err, res) {
            let responseArgs = ["api", self.name, name];
            responseArgs = responseArgs.concat(
                err ? ["error", err] : ["success", res]
            );
            self.constructor.emit("debug", responseArgs);
            origCallback(err, res);
        };
    }
};

const adapterFun = (target, key, descriptor) => {
    const { value } = descriptor;
    descriptor.value = toPromise(function (...args) {
        if (this._closed) {
            return Promise.reject(new Error("database is closed"));
        }
        if (this._destroyed) {
            return Promise.reject(new Error("database is destroyed"));
        }
        logApiCall(this, key, args);
        if (!this.taskqueue.isReady) {
            return new Promise(((fulfill, reject) => {
                this.taskqueue.addTask((failed) => {
                    if (failed) {
                        reject(failed);
                    } else {
                        fulfill(this[key].apply(this, args));
                    }
                });
            }));
        }
        return value.apply(this, args);
    });
};

export default class AbstractPouchDB extends event.Emitter {
    @adapterFun
    post(doc, opts, callback) {
        if (is.function(opts)) {
            callback = opts;
            opts = {};
        }
        if (!is.object(doc) || is.array(doc)) {
            return callback(x.createError(x.NOT_AN_OBJECT));
        }
        this.bulkDocs({ docs: [doc] }, opts, yankError(callback, doc._id));
    }

    @adapterFun
    put(doc, opts, cb) {
        if (is.function(opts)) {
            cb = opts;
            opts = {};
        }
        if (!is.object(doc) || is.array(doc)) {
            return cb(x.createError(x.NOT_AN_OBJECT));
        }
        invalidIdError(doc._id);
        if (isLocalId(doc._id) && is.function(this._putLocal)) {
            if (doc._deleted) {
                return this._removeLocal(doc, cb);
            }
            return this._putLocal(doc, cb);

        }

        const transformForceOptionToNewEditsOption = () => {
            const parts = doc._rev.split("-");
            const oldRevId = parts[1];
            const oldRevNum = parseInt(parts[0], 10);

            const newRevNum = oldRevNum + 1;
            const newRevId = rev();

            doc._revisions = {
                start: newRevNum,
                ids: [newRevId, oldRevId]
            };
            doc._rev = `${newRevNum}-${newRevId}`;
            opts.new_edits = false;
        };
        const putDoc = (next) => {
            if (is.function(this._put) && opts.new_edits !== false) {
                this._put(doc, opts, next);
            } else {
                this.bulkDocs({ docs: [doc] }, opts, yankError(next, doc._id));
            }
        };

        if (opts.force && doc._rev) {
            transformForceOptionToNewEditsOption();
            putDoc((err) => {
                const result = err ? null : { ok: true, id: doc._id, rev: doc._rev };
                cb(err, result);
            });
        } else {
            putDoc(cb);
        }
    }

    @adapterFun
    putAttachment(docId, attachmentId, rev, blob, type) {
        if (is.function(type)) {
            type = blob;
            blob = rev;
            rev = null;
        }
        // Lets fix in https://github.com/pouchdb/pouchdb/issues/3267
        /* istanbul ignore if */
        if (is.undefined(type)) {
            type = blob;
            blob = rev;
            rev = null;
        }
        if (!type) {
            adone.warn("Attachment", attachmentId, "on document", docId, "is missing content_type");
        }

        const createAttachment = (doc) => {
            let prevrevpos = "_rev" in doc ? parseInt(doc._rev, 10) : 0;
            doc._attachments = doc._attachments || {};
            doc._attachments[attachmentId] = {
                content_type: type,
                data: blob,
                revpos: ++prevrevpos
            };
            return this.put(doc);
        };

        return this.get(docId).then((doc) => {
            if (doc._rev !== rev) {
                throw x.createError(x.REV_CONFLICT);
            }

            return createAttachment(doc);
        }, (err) => {
            // create new doc
            /* istanbul ignore else */
            if (err.reason === x.MISSING_DOC.message) {
                return createAttachment({ _id: docId });
            }
            throw err;

        });
    }

    @adapterFun
    removeAttachment(docId, attachmentId, rev, callback) {
        this.get(docId, (err, obj) => {
            /* istanbul ignore if */
            if (err) {
                callback(err);
                return;
            }
            if (obj._rev !== rev) {
                callback(x.createError(x.REV_CONFLICT));
                return;
            }
            /* istanbul ignore if */
            if (!obj._attachments) {
                return callback();
            }
            delete obj._attachments[attachmentId];
            if (Object.keys(obj._attachments).length === 0) {
                delete obj._attachments;
            }
            this.put(obj, callback);
        });
    }

    @adapterFun
    remove(docOrId, optsOrRev, opts, callback) {
        let doc;
        if (is.string(optsOrRev)) {
            // id, rev, opts, callback style
            doc = {
                _id: docOrId,
                _rev: optsOrRev
            };
            if (is.function(opts)) {
                callback = opts;
                opts = {};
            }
        } else {
            // doc, opts, callback style
            doc = docOrId;
            if (is.function(optsOrRev)) {
                callback = optsOrRev;
                opts = {};
            } else {
                callback = opts;
                opts = optsOrRev;
            }
        }
        opts = opts || {};
        opts.was_delete = true;
        const newDoc = { _id: doc._id, _rev: (doc._rev || opts.rev) };
        newDoc._deleted = true;
        if (isLocalId(newDoc._id) && is.function(this._removeLocal)) {
            return this._removeLocal(doc, callback);
        }
        this.bulkDocs({ docs: [newDoc] }, opts, yankError(callback, newDoc._id));
    }

    @adapterFun
    revsDiff(req, opts, callback) {
        if (is.function(opts)) {
            callback = opts;
            opts = {};
        }
        const ids = Object.keys(req);

        if (!ids.length) {
            return callback(null, {});
        }

        let count = 0;
        const missing = new Map();

        const addToMissing = (id, revId) => {
            if (!missing.has(id)) {
                missing.set(id, { missing: [] });
            }
            missing.get(id).missing.push(revId);
        };

        const processDoc = (id, rev_tree) => {
            // Is this fast enough? Maybe we should switch to a set simulated by a map
            const missingForId = req[id].slice(0);
            traverseRevTree(rev_tree, (isLeaf, pos, revHash, ctx,
                opts) => {
                const rev = `${pos}-${revHash}`;
                const idx = missingForId.indexOf(rev);
                if (idx === -1) {
                    return;
                }

                missingForId.splice(idx, 1);
                /* istanbul ignore if */
                if (opts.status !== "available") {
                    addToMissing(id, rev);
                }
            });

            // Traversing the tree is synchronous, so now `missingForId` contains
            // revisions that were not found in the tree
            missingForId.forEach((rev) => {
                addToMissing(id, rev);
            });
        };

        ids.forEach((id) => {
            this._getRevisionTree(id, (err, rev_tree) => {
                if (err && err.status === 404 && err.message === "missing") {
                    missing.set(id, { missing: req[id] });
                } else if (err) {
                    /* istanbul ignore next */
                    return callback(err);
                } else {
                    processDoc(id, rev_tree);
                }

                if (++count === ids.length) {
                    // convert LazyMap to object
                    const missingObj = {};
                    missing.forEach((value, key) => {
                        missingObj[key] = value;
                    });
                    return callback(null, missingObj);
                }
            });
        }, this);
    }

    // _bulk_get API for faster replication, as described in
    // https://github.com/apache/couchdb-chttpd/pull/33
    // At the "abstract" level, it will just run multiple get()s in
    // parallel, because this isn't much of a performance cost
    // for local databases (except the cost of multiple transactions, which is
    // small). The http adapter overrides this in order
    // to do a more efficient single HTTP request.
    @adapterFun
    bulkGet(opts, callback) {
        bulkGetShim(this, opts, callback);
    }

    // compact one document and fire callback
    // by compacting we mean removing all revisions which
    // are further from the leaf in revision tree than max_height
    @adapterFun
    compactDocument(docId, maxHeight, callback) {
        this._getRevisionTree(docId, (err, revTree) => {
            /* istanbul ignore if */
            if (err) {
                return callback(err);
            }
            const height = computeHeight(revTree);
            const candidates = [];
            const revs = [];
            Object.keys(height).forEach((rev) => {
                if (height[rev] > maxHeight) {
                    candidates.push(rev);
                }
            });

            traverseRevTree(revTree, (isLeaf, pos, revHash, ctx, opts) => {
                const rev = `${pos}-${revHash}`;
                if (opts.status === "available" && candidates.indexOf(rev) !== -1) {
                    revs.push(rev);
                }
            });
            this._doCompaction(docId, revs, callback);
        });
    }

    // compact the whole database using single document
    // compaction
    @adapterFun
    compact(opts, callback) {
        if (is.function(opts)) {
            callback = opts;
            opts = {};
        }

        opts = opts || {};

        this._compactionQueue = this._compactionQueue || [];
        this._compactionQueue.push({ opts, callback });
        if (this._compactionQueue.length === 1) {
            doNextCompaction(this);
        }
    }

    _compact(opts, callback) {
        const self = this;
        const changesOpts = {
            return_docs: false,
            last_seq: opts.last_seq || 0
        };
        const promises = [];

        const onChange = (row) => {
            promises.push(self.compactDocument(row.id, 0));
        };
        const onComplete = (resp) => {
            const lastSeq = resp.last_seq;
            Promise.all(promises).then(() => {
                return upsert(self, "_local/compaction", function deltaFunc(doc) {
                    if (!doc.last_seq || doc.last_seq < lastSeq) {
                        doc.last_seq = lastSeq;
                        return doc;
                    }
                    return false; // somebody else got here first, don't update
                });
            }).then(() => {
                callback(null, { ok: true });
            }).catch(callback);
        };
        self.changes(changesOpts)
            .on("change", onChange)
            .on("complete", onComplete)
            .on("error", callback);
    }


    /**
     * Begin api wrappers. Specific functionality to storage belongs in the
     */
    @adapterFun
    get(id, opts, cb) {
        if (is.function(opts)) {
            cb = opts;
            opts = {};
        }
        if (!is.string(id)) {
            return cb(x.createError(x.INVALID_ID));
        }
        if (isLocalId(id) && is.function(this._getLocal)) {
            return this._getLocal(id, cb);
        }
        let leaves = [];

        const finishOpenRevs = () => {
            const result = [];
            let count = leaves.length;
            /* istanbul ignore if */
            if (!count) {
                return cb(null, result);
            }

            // order with open_revs is unspecified
            leaves.forEach((leaf) => {
                this.get(id, {
                    rev: leaf,
                    revs: opts.revs,
                    latest: opts.latest,
                    attachments: opts.attachments,
                    binary: opts.binary
                }, (err, doc) => {
                    if (!err) {
                        // using latest=true can produce duplicates
                        let existing;
                        for (let i = 0, l = result.length; i < l; i++) {
                            if (result[i].ok && result[i].ok._rev === doc._rev) {
                                existing = true;
                                break;
                            }
                        }
                        if (!existing) {
                            result.push({ ok: doc });
                        }
                    } else {
                        result.push({ missing: leaf });
                    }
                    count--;
                    if (!count) {
                        cb(null, result);
                    }
                });
            });
        };

        if (opts.open_revs) {
            if (opts.open_revs === "all") {
                this._getRevisionTree(id, (err, rev_tree) => {
                    if (err) {
                        return cb(err);
                    }
                    leaves = collectLeaves(rev_tree).map((leaf) => {
                        return leaf.rev;
                    });
                    finishOpenRevs();
                });
            } else {
                if (is.array(opts.open_revs)) {
                    leaves = opts.open_revs;
                    for (let i = 0; i < leaves.length; i++) {
                        const l = leaves[i];
                        // looks like it's the only thing couchdb checks
                        if (!(is.string(l) && /^\d+-/.test(l))) {
                            return cb(x.createError(x.INVALID_REV));
                        }
                    }
                    finishOpenRevs();
                } else {
                    return cb(x.createError(x.UNKNOWN_ERROR, "function_clause"));
                }
            }
            return; // open_revs does not like other options
        }

        return this._get(id, opts, (err, result) => {
            if (err) {
                err.docId = id;
                return cb(err);
            }

            const doc = result.doc;
            const metadata = result.metadata;
            const ctx = result.ctx;

            if (opts.conflicts) {
                const conflicts = collectConflicts(metadata);
                if (conflicts.length) {
                    doc._conflicts = conflicts;
                }
            }

            if (isDeleted(metadata, doc._rev)) {
                doc._deleted = true;
            }

            if (opts.revs || opts.revs_info) {
                const splittedRev = doc._rev.split("-");
                const revNo = parseInt(splittedRev[0], 10);
                const revHash = splittedRev[1];

                const paths = rootToLeaf(metadata.rev_tree);
                let path = null;

                for (let i = 0; i < paths.length; i++) {
                    const currentPath = paths[i];
                    const hashIndex = currentPath.ids.map((x) => {
                        return x.id;
                    })
                        .indexOf(revHash);
                    const hashFoundAtRevPos = hashIndex === (revNo - 1);

                    if (hashFoundAtRevPos || (!path && hashIndex !== -1)) {
                        path = currentPath;
                    }
                }

                const indexOfRev = path.ids.map((x) => {
                    return x.id;
                })
                    .indexOf(doc._rev.split("-")[1]) + 1;
                const howMany = path.ids.length - indexOfRev;
                path.ids.splice(indexOfRev, howMany);
                path.ids.reverse();

                if (opts.revs) {
                    doc._revisions = {
                        start: (path.pos + path.ids.length) - 1,
                        ids: path.ids.map((rev) => {
                            return rev.id;
                        })
                    };
                }
                if (opts.revs_info) {
                    let pos = path.pos + path.ids.length;
                    doc._revs_info = path.ids.map((rev) => {
                        pos--;
                        return {
                            rev: `${pos}-${rev.id}`,
                            status: rev.opts.status
                        };
                    });
                }
            }

            if (opts.attachments && doc._attachments) {
                const attachments = doc._attachments;
                let count = Object.keys(attachments).length;
                if (count === 0) {
                    return cb(null, doc);
                }
                Object.keys(attachments).forEach(function (key) {
                    this._getAttachment(doc._id, key, attachments[key], {
                        // Previously the revision handling was done in adapter.js
                        // getAttachment, however since idb-next doesnt we need to
                        // pass the rev through
                        rev: doc._rev,
                        binary: opts.binary,
                        ctx
                    }, (err, data) => {
                        const att = doc._attachments[key];
                        att.data = data;
                        delete att.stub;
                        delete att.length;
                        if (!--count) {
                            cb(null, doc);
                        }
                    });
                }, this);
            } else {
                if (doc._attachments) {
                    for (const key in doc._attachments) {
                        /* istanbul ignore else */
                        if (doc._attachments.hasOwnProperty(key)) {
                            doc._attachments[key].stub = true;
                        }
                    }
                }
                cb(null, doc);
            }
        });
    }

    // TODO: I dont like this, it forces an extra read for every
    // attachment read and enforces a confusing api between
    // adapter.js and the adapter implementation
    @adapterFun
    getAttachment(docId, attachmentId, opts, callback) {
        if (is.function(opts)) {
            callback = opts;
            opts = {};
        }
        this._get(docId, opts, (err, res) => {
            if (err) {
                return callback(err);
            }
            if (res.doc._attachments && res.doc._attachments[attachmentId]) {
                opts.ctx = res.ctx;
                opts.binary = true;
                this._getAttachment(docId, attachmentId,
                    res.doc._attachments[attachmentId], opts, callback);
            } else {
                return callback(x.createError(x.MISSING_DOC));
            }
        });
    }

    @adapterFun
    allDocs(opts, callback) {
        if (is.function(opts)) {
            callback = opts;
            opts = {};
        }
        opts.skip = !is.undefined(opts.skip) ? opts.skip : 0;
        if (opts.start_key) {
            opts.startkey = opts.start_key;
        }
        if (opts.end_key) {
            opts.endkey = opts.end_key;
        }
        if ("keys" in opts) {
            if (!is.array(opts.keys)) {
                return callback(new TypeError("options.keys must be an array"));
            }
            const incompatibleOpt =
                ["startkey", "endkey", "key"].filter((incompatibleOpt) => {
                    return incompatibleOpt in opts;
                })[0];
            if (incompatibleOpt) {
                callback(x.createError(x.QUERY_PARSE_ERROR,
                    `Query parameter \`${incompatibleOpt
                    }\` is not compatible with multi-get`
                ));
                return;
            }
            if (!isRemote(this)) {
                allDocsKeysParse(opts);
                if (opts.keys.length === 0) {
                    return this._allDocs({ limit: 0 }, callback);
                }
            }
        }

        return this._allDocs(opts, callback);
    }

    changes(opts, callback) {
        if (is.function(opts)) {
            callback = opts;
            opts = {};
        }
        return new Changes(this, opts, callback);
    }

    @adapterFun
    close(callback) {
        this._closed = true;
        this.emit("closed");
        return this._close(callback);
    }

    @adapterFun
    info(callback) {
        this._info((err, info) => {
            if (err) {
                return callback(err);
            }
            // assume we know better than the adapter, unless it informs us
            info.db_name = info.db_name || this.name;
            info.auto_compaction = Boolean(this.auto_compaction && !isRemote(this));
            info.adapter = this.adapter;
            callback(null, info);
        });
    }

    @adapterFun
    id(callback) {
        return this._id(callback);
    }

    type() {
        return (is.function(this._type)) ? this._type() : this.adapter;
    }

    @adapterFun
    bulkDocs(req, opts, callback) {
        if (is.function(opts)) {
            callback = opts;
            opts = {};
        }

        opts = opts || {};

        if (is.array(req)) {
            req = {
                docs: req
            };
        }

        if (!req || !req.docs || !is.array(req.docs)) {
            return callback(x.createError(x.MISSING_BULK_DOCS));
        }

        for (let i = 0; i < req.docs.length; ++i) {
            if (typeof req.docs[i] !== "object" || is.array(req.docs[i])) {
                return callback(x.createError(x.NOT_AN_OBJECT));
            }
        }

        let attachmentError;
        req.docs.forEach((doc) => {
            if (doc._attachments) {
                Object.keys(doc._attachments).forEach((name) => {
                    attachmentError = attachmentError || attachmentNameError(name);
                    if (!doc._attachments[name].content_type) {
                        adone.warn("Attachment", name, "on document", doc._id, "is missing content_type");
                    }
                });
            }
        });

        if (attachmentError) {
            return callback(x.createError(x.BAD_REQUEST, attachmentError));
        }

        if (!("new_edits" in opts)) {
            if ("new_edits" in req) {
                opts.new_edits = req.new_edits;
            } else {
                opts.new_edits = true;
            }
        }

        if (!opts.new_edits && !isRemote(this)) {
            // ensure revisions of the same doc are sorted, so that
            // the local adapter processes them correctly (#2935)
            req.docs.sort(compareByIdThenRev);
        }

        cleanDocs(req.docs);

        // in the case of conflicts, we want to return the _ids to the user
        // however, the underlying adapter may destroy the docs array, so
        // create a copy here
        const ids = req.docs.map((doc) => {
            return doc._id;
        });

        return this._bulkDocs(req, opts, (err, res) => {
            if (err) {
                return callback(err);
            }
            if (!opts.new_edits) {
                // this is what couch does when new_edits is false
                res = res.filter((x) => {
                    return x.error;
                });
            }
            // add ids for error/conflict responses (not required for CouchDB)
            if (!isRemote(this)) {
                for (let i = 0, l = res.length; i < l; i++) {
                    res[i].id = res[i].id || ids[i];
                }
            }

            callback(null, res);
        });
    }

    @adapterFun
    registerDependentDatabase(dependentDb, callback) {
        const depDB = new this.constructor(dependentDb, this.__opts);

        const diffFun = (doc) => {
            doc.dependentDbs = doc.dependentDbs || {};
            if (doc.dependentDbs[dependentDb]) {
                return false; // no update required
            }
            doc.dependentDbs[dependentDb] = true;
            return doc;
        };
        upsert(this, "_local/_pouch_dependentDbs", diffFun)
            .then(() => {
                callback(null, { db: depDB });
            }).catch(callback);
    }

    @adapterFun
    destroy(opts, callback) {
        if (is.function(opts)) {
            callback = opts;
            opts = {};
        }

        const usePrefix = "use_prefix" in this ? this.use_prefix : true;

        const destroyDb = () => {
            // call destroy method of the particular adaptor
            this._destroy(opts, (err, resp) => {
                if (err) {
                    return callback(err);
                }
                this._destroyed = true;
                this.emit("destroyed");
                callback(null, resp || { ok: true });
            });
        };

        if (isRemote(this)) {
            // no need to check for dependent DBs if it's a remote DB
            return destroyDb();
        }

        this.get("_local/_pouch_dependentDbs", (err, localDoc) => {
            if (err) {
                /* istanbul ignore if */
                if (err.status !== 404) {
                    return callback(err);
                } // no dependencies
                return destroyDb();

            }
            const dependentDbs = localDoc.dependentDbs;
            const PouchDB = this.constructor;
            const deletedMap = Object.keys(dependentDbs).map((name) => {
                // use_prefix is only false in the browser
                /**
                 * istanbul ignore next
                 */
                const trueName = usePrefix ?
                    name.replace(new RegExp(`^${PouchDB.prefix}`), "") : name;
                return new PouchDB(trueName, this.__opts).destroy();
            });
            Promise.all(deletedMap).then(destroyDb, callback);
        });
    }
}
