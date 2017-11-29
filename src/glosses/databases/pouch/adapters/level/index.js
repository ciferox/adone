import sublevel from "./sublevel";
import migrate from "./migrate";
import LevelTransaction from "./transaction";

const DOC_STORE = "document-store";
const BY_SEQ_STORE = "by-sequence";
const ATTACHMENT_STORE = "attach-store";
const BINARY_STORE = "attach-binary-store";
const LOCAL_STORE = "local-store";
const META_STORE = "meta-store";

const {
    is,
    data: { json },
    util,
    database: { pouch }
} = adone;

const {
    x: {
        MISSING_DOC,
        REV_CONFLICT,
        NOT_OPEN,
        BAD_ARG,
        MISSING_STUB,
        createError
    }
} = pouch;

const {
    util: {
        uuid,
        ChangesHandler,
        filterChange,
        merge: {
            winningRev: calculateWinningRev,
            traverseRevTree,
            compactTree,
            collectConflicts,
            latest: getLatest,
            isDeleted,
            isLocalId
        },
        adapter: {
            parseDoc,
            processDocs,
            allDocsKeysQuery
        },
        binary: {
            typedBuffer,
            atob,
            binaryStringToBuffer
        },
        md5: { binary: binaryMd5 }
    }
} = adone.private(pouch);

const createEmptyBluffer = (type) => {
    return typedBuffer("", "binary", type);
};

const readAsBluffer = (storedObject, type) => {
    // In Node, we've stored a buffer
    storedObject.type = type; // non-standard, but used for consistency
    return storedObject;
};

// leveldb barks if we try to open a db multiple times
// so we cache opened connections here for initstore()
const dbStores = new Map();

// store the value of update_seq in the by-sequence store the key name will
// never conflict, since the keys in the by-sequence store are integers
const UPDATE_SEQ_KEY = "_local_last_update_seq";
const DOC_COUNT_KEY = "_local_doc_count";
const UUID_KEY = "_local_uuid";

const MD5_PREFIX = "md5-";

const safeJsonEncoding = {
    encode: json.encodeSafe,
    decode: json.decodeSafe,
    buffer: false,
    type: "cheap-json"
};

const levelChanges = new ChangesHandler();

// winningRev and deleted are performance-killers, but
// in newer versions of PouchDB, they are cached on the metadata
const getWinningRev = (metadata) => {
    return "winningRev" in metadata
        ? metadata.winningRev
        : calculateWinningRev(metadata);
};

const getIsDeleted = (metadata, winningRev) => {
    return "deleted" in metadata
        ? metadata.deleted
        : isDeleted(metadata, winningRev);
};

const fetchAttachment = (att, stores, opts) => {
    const type = att.content_type;
    return new Promise(((resolve, reject) => {
        stores.binaryStore.get(att.digest, (err, buffer) => {
            let data;
            if (err) {
                /* istanbul ignore if */
                if (err.name !== "NotFoundError") {
                    return reject(err);
                }
                // empty
                if (!opts.binary) {
                    data = "";
                } else {
                    data = binaryStringToBuffer("", type);
                }

            } else { // non-empty
                if (opts.binary) {
                    data = readAsBluffer(buffer, type);
                } else {
                    data = buffer.toString("base64");
                }
            }
            delete att.stub;
            delete att.length;
            att.data = data;
            resolve();
        });
    }));
};

const fetchAttachments = (results, stores, opts) => {
    const atts = [];
    results.forEach((row) => {
        if (!(row.doc && row.doc._attachments)) {
            return;
        }
        const attNames = Object.keys(row.doc._attachments);
        attNames.forEach((attName) => {
            const att = row.doc._attachments[attName];
            if (!("data" in att)) {
                atts.push(att);
            }
        });
    });

    return Promise.all(atts.map((att) => {
        return fetchAttachment(att, stores, opts);
    }));
};

export const adapter = function (opts, callback) {
    opts = {
        db: adone.database.level.backend.LevelDB,
        migrate,
        ...opts
    };

    const api = this;
    let instanceId;
    const stores = {};
    const revLimit = opts.revs_limit;
    let db;
    const name = opts.name;
    // TODO: this is undocumented and unused probably
    /* istanbul ignore else */
    if (is.undefined(opts.createIfMissing)) {
        opts.createIfMissing = true;
    }

    const leveldown = opts.db;

    let dbStore;
    const leveldownName = util.functionName(leveldown);
    if (dbStores.has(leveldownName)) {
        dbStore = dbStores.get(leveldownName);
    } else {
        dbStore = new Map();
        dbStores.set(leveldownName, dbStore);
    }

    const afterLastMigration = () => {
        stores.metaStore.get(UPDATE_SEQ_KEY, (err, value) => {
            if (is.undefined(db._updateSeq)) {
                db._updateSeq = value || 0;
            }
            stores.metaStore.get(DOC_COUNT_KEY, (err, value) => {
                db._docCount = !err ? value : 0;
                stores.metaStore.get(UUID_KEY, (err, value) => {
                    instanceId = !err ? value : uuid();
                    stores.metaStore.put(UUID_KEY, instanceId, () => {
                        process.nextTick(() => {
                            callback(null, api);
                        });
                    });
                });
            });
        });
    };

    const afterDBCreated = () => {
        stores.docStore = db.sublevel(DOC_STORE, { valueEncoding: safeJsonEncoding });
        stores.bySeqStore = db.sublevel(BY_SEQ_STORE, { valueEncoding: "json" });
        stores.attachmentStore =
            db.sublevel(ATTACHMENT_STORE, { valueEncoding: "json" });
        stores.binaryStore = db.sublevel(BINARY_STORE, { valueEncoding: "binary" });
        stores.localStore = db.sublevel(LOCAL_STORE, { valueEncoding: "json" });
        stores.metaStore = db.sublevel(META_STORE, { valueEncoding: "json" });
        /* istanbul ignore else */
        if (typeof opts.migrate === "object") { // migration for leveldown
            opts.migrate.doMigrationTwo(db, stores, afterLastMigration);
        } else {
            afterLastMigration();
        }
    };

    if (dbStore.has(name)) {
        dbStore.get(name).then(({ db: _db, err }) => {
            if (err) {
                callback(err);
                return;
            }
            db = _db;
            afterDBCreated();
        });
    } else {
        // dbStore.set(name, sublevel(levelup(name, opts, (err) => {
        //     /* istanbul ignore if */
        //     if (err) {
        //         dbStore.delete(name);
        //         return callback(err);
        //     }
        //     db = dbStore.get(name);
        //     db._docCount = -1;
        //     db._queue = new Deque();
        //     /* istanbul ignore else */
        //     if (typeof opts.migrate === "object") { // migration for leveldown
        //         opts.migrate.doMigrationOne(name, db, afterDBCreated);
        //     } else {
        //         afterDBCreated();
        //     }
        // })));
        dbStore.set(name, new Promise((resolve) => {
            const _db = new adone.database.level.DB({ ...opts, location: name });
            db = sublevel(_db);
            _db.open().then(() => {
                resolve({ db, err: null });
                db._docCount = -1;
                db._queue = new adone.collection.LinkedList();
                /* istanbul ignore else */
                if (is.object(opts.migrate)) { // migration for leveldown
                    opts.migrate.doMigrationOne(name, db, afterDBCreated);
                } else {
                    afterDBCreated();
                }
            }, (err) => {
                dbStore.delete(name);
                resolve({ db: null, err });
                callback(err);
            });
        }));
    }

    const countDocs = (callback) => {
        /* istanbul ignore if */
        if (db.isClosed()) {
            return callback(new Error("database is closed"));
        }
        return callback(null, db._docCount); // use cached value
    };

    api._remote = false;
    /* istanbul ignore next */
    api.type = function () {
        return "leveldb";
    };

    api._id = function (callback) {
        callback(null, instanceId);
    };

    api._info = function (callback) {
        const res = {
            doc_count: db._docCount,
            update_seq: db._updateSeq,
            backend_adapter: util.functionName(leveldown)
        };
        return process.nextTick(() => {
            callback(null, res);
        });
    };

    const tryCode = (fun, args) => {
        try {
            fun.apply(null, args);
        } catch (err) {
            args[args.length - 1](err);
        }
    };

    const executeNext = () => {
        const firstTask = db._queue.front;

        if (firstTask.type === "read") {
            runReadOperation(firstTask);
        } else { // write, only do one at a time
            runWriteOperation(firstTask);
        }
    };

    const runReadOperation = (firstTask) => {
        // do multiple reads at once simultaneously, because it's safe

        const readTasks = [firstTask];
        db._queue.forEach((task, index) => {
            if (index === 0) {
                return;
            }
            if (task.type !== "read") {
                // we found a non-read operation, stop iterating
                return false;
            }
            readTasks.push(task);
        });

        let numDone = 0;

        readTasks.forEach((readTask) => {
            const args = readTask.args;
            const callback = args[args.length - 1];
            args[args.length - 1] = (...args) => {
                callback.apply(null, args);
                if (++numDone === readTasks.length) {
                    process.nextTick(() => {
                        // all read tasks have finished
                        readTasks.forEach(() => {
                            db._queue.shift();
                        });
                        if (!db._queue.empty) {
                            executeNext();
                        }
                    });
                }
            };
            tryCode(readTask.fun, args);
        });
    };

    const runWriteOperation = (firstTask) => {
        const args = firstTask.args;
        const callback = args[args.length - 1];
        args[args.length - 1] = (...args) => {
            callback.apply(null, args);
            process.nextTick(() => {
                db._queue.shift();
                if (!db._queue.empty) {
                    executeNext();
                }
            });
        };
        tryCode(firstTask.fun, args);
    };

    // all read/write operations to the database are done in a queue,
    // similar to how websql/idb works. this avoids problems such
    // as e.g. compaction needing to have a lock on the database while
    // it updates stuff. in the future we can revisit this.
    const writeLock = (fun) => {
        return (...args) => {
            db._queue.push({
                fun,
                args,
                type: "write"
            });

            if (db._queue.length === 1) {
                process.nextTick(executeNext);
            }
        };
    };

    // same as the writelock, but multiple can run at once
    const readLock = (fun) => {
        return (...args) => {
            db._queue.push({
                fun,
                args,
                type: "read"
            });

            if (db._queue.length === 1) {
                process.nextTick(executeNext);
            }
        };
    };

    const formatSeq = (n) => {
        return (`0000000000000000${n}`).slice(-16);
    };

    const parseSeq = (s) => {
        return parseInt(s, 10);
    };

    api._get = readLock((id, opts, callback) => {
        opts = util.clone(opts);

        stores.docStore.get(id, (err, metadata) => {

            if (err || !metadata) {
                return callback(createError(MISSING_DOC, "missing"));
            }

            let rev;
            if (!opts.rev) {
                rev = getWinningRev(metadata);
                const deleted = getIsDeleted(metadata, rev);
                if (deleted) {
                    return callback(createError(MISSING_DOC, "deleted"));
                }
            } else {
                rev = opts.latest ? getLatest(opts.rev, metadata) : opts.rev;
            }

            const seq = metadata.rev_map[rev];

            stores.bySeqStore.get(formatSeq(seq), (err, doc) => {
                if (!doc) {
                    return callback(createError(MISSING_DOC));
                }
                /* istanbul ignore if */
                if ("_id" in doc && doc._id !== metadata.id) {
                    // this failing implies something very wrong
                    return callback(new Error("wrong doc returned"));
                }
                doc._id = metadata.id;
                if ("_rev" in doc) {
                    /* istanbul ignore if */
                    if (doc._rev !== rev) {
                        // this failing implies something very wrong
                        return callback(new Error("wrong doc returned"));
                    }
                } else {
                    // we didn't always store this
                    doc._rev = rev;
                }
                return callback(null, { doc, metadata });
            });
        });
    });

    // not technically part of the spec, but if putAttachment has its own
    // method...
    api._getAttachment = function (docId, attachId, attachment, opts, callback) {
        const digest = attachment.digest;
        const type = attachment.content_type;

        stores.binaryStore.get(digest, (err, attach) => {
            if (err) {
                /* istanbul ignore if */
                if (err.name !== "NotFoundError") {
                    return callback(err);
                }
                // Empty attachment
                return callback(null, opts.binary ? createEmptyBluffer(type) : "");
            }

            if (opts.binary) {
                callback(null, readAsBluffer(attach, type));
            } else {
                callback(null, attach.toString("base64"));
            }
        });
    };

    api._bulkDocs = writeLock((req, opts, callback) => {
        const newEdits = opts.new_edits;
        const results = new Array(req.docs.length);
        const fetchedDocs = new Map();
        const stemmedRevs = new Map();

        const txn = new LevelTransaction();
        let docCountDelta = 0;
        let newUpdateSeq = db._updateSeq;

        // parse the docs and give each a sequence number
        const userDocs = req.docs;
        const docInfos = userDocs.map((doc) => {
            if (doc._id && isLocalId(doc._id)) {
                return doc;
            }
            const newDoc = parseDoc(doc, newEdits);

            if (newDoc.metadata && !newDoc.metadata.rev_map) {
                newDoc.metadata.rev_map = {};
            }

            return newDoc;
        });
        const infoErrors = docInfos.filter((doc) => {
            return doc.error;
        });

        if (infoErrors.length) {
            return callback(infoErrors[0]);
        }

        // verify any stub attachments as a precondition test

        const verifyAttachment = (digest, callback) => {
            txn.get(stores.attachmentStore, digest, (levelErr) => {
                if (levelErr) {
                    const err = createError(MISSING_STUB,
                        `unknown stub attachment with digest ${
                            digest}`);
                    callback(err);
                } else {
                    callback();
                }
            });
        };

        const verifyAttachments = (finish) => {
            const digests = [];
            userDocs.forEach((doc) => {
                if (doc && doc._attachments) {
                    Object.keys(doc._attachments).forEach((filename) => {
                        const att = doc._attachments[filename];
                        if (att.stub) {
                            digests.push(att.digest);
                        }
                    });
                }
            });
            if (!digests.length) {
                return finish();
            }
            let numDone = 0;
            let err;

            digests.forEach((digest) => {
                verifyAttachment(digest, (attErr) => {
                    if (attErr && !err) {
                        err = attErr;
                    }

                    if (++numDone === digests.length) {
                        finish(err);
                    }
                });
            });
        };

        const fetchExistingDocs = (finish) => {
            let numDone = 0;
            let overallErr;
            const checkDone = () => {
                if (++numDone === userDocs.length) {
                    return finish(overallErr);
                }
            };

            userDocs.forEach((doc) => {
                if (doc._id && isLocalId(doc._id)) {
                    // skip local docs
                    return checkDone();
                }
                txn.get(stores.docStore, doc._id, (err, info) => {
                    if (err) {
                        /* istanbul ignore if */
                        if (err.name !== "NotFoundError") {
                            overallErr = err;
                        }
                    } else {
                        fetchedDocs.set(doc._id, info);
                    }
                    checkDone();
                });
            });
        };

        const compact = (revsMap, callback) => {
            let promise = Promise.resolve();
            revsMap.forEach((revs, docId) => {
                // TODO: parallelize, for now need to be sequential to
                // pass orphaned attachment tests
                promise = promise.then(() => {
                    return new Promise(((resolve, reject) => {
                        api._doCompactionNoLock(docId, revs, { ctx: txn }, (err) => {
                            /* istanbul ignore if */
                            if (err) {
                                return reject(err);
                            }
                            resolve();
                        });
                    }));
                });
            });

            promise.then(() => {
                callback();
            }, callback);
        };

        const autoCompact = (callback) => {
            const revsMap = new Map();
            fetchedDocs.forEach((metadata, docId) => {
                revsMap.set(docId, compactTree(metadata));
            });
            compact(revsMap, callback);
        };

        const finish = () => {
            compact(stemmedRevs, (error) => {
                /* istanbul ignore if */
                if (error) {
                    complete(error);
                }
                if (api.auto_compaction) {
                    return autoCompact(complete);
                }
                complete();
            });
        };

        const writeDoc = (docInfo, winningRev, winningRevIsDeleted, newRevIsDeleted,
            isUpdate, delta, resultsIdx, callback2) => {
            docCountDelta += delta;

            let err = null;
            let recv = 0;

            docInfo.metadata.winningRev = winningRev;
            docInfo.metadata.deleted = winningRevIsDeleted;

            docInfo.data._id = docInfo.metadata.id;
            docInfo.data._rev = docInfo.metadata.rev;

            if (newRevIsDeleted) {
                docInfo.data._deleted = true;
            }

            if (docInfo.stemmedRevs.length) {
                stemmedRevs.set(docInfo.metadata.id, docInfo.stemmedRevs);
            }

            const attachments = docInfo.data._attachments ?
                Object.keys(docInfo.data._attachments) :
                [];

            const attachmentSaved = (attachmentErr) => {
                recv++;
                if (!err) {
                    /* istanbul ignore if */
                    if (attachmentErr) {
                        err = attachmentErr;
                        callback2(err);
                    } else if (recv === attachments.length) {
                        finish();
                    }
                }
            };

            const onMD5Load = (doc, key, data, attachmentSaved) => {
                return function (result) {
                    saveAttachment(doc, MD5_PREFIX + result, key, data, attachmentSaved);
                };
            };

            const doMD5 = (doc, key, attachmentSaved) => {
                return function (data) {
                    binaryMd5(data, onMD5Load(doc, key, data, attachmentSaved));
                };
            };

            for (let i = 0; i < attachments.length; i++) {
                const key = attachments[i];
                const att = docInfo.data._attachments[key];

                if (att.stub) {
                    // still need to update the refs mapping
                    const id = docInfo.data._id;
                    const rev = docInfo.data._rev;
                    saveAttachmentRefs(id, rev, att.digest, attachmentSaved);
                    continue;
                }
                let data;
                if (is.string(att.data)) {
                    // input is assumed to be a base64 string
                    try {
                        data = atob(att.data);
                    } catch (e) {
                        callback(createError(BAD_ARG,
                            "Attachment is not a valid base64 string"));
                        return;
                    }
                    doMD5(docInfo, key, attachmentSaved)(data);
                } else {
                    doMD5(docInfo, key, attachmentSaved)(att.data);
                }
            }

            const finish = () => {
                let seq = docInfo.metadata.rev_map[docInfo.metadata.rev];
                /* istanbul ignore if */
                if (seq) {
                    // check that there aren't any existing revisions with the same
                    // revision id, else we shouldn't do anything
                    return callback2();
                }
                seq = ++newUpdateSeq;
                docInfo.metadata.rev_map[docInfo.metadata.rev] =
                    docInfo.metadata.seq = seq;
                const seqKey = formatSeq(seq);
                const batch = [{
                    key: seqKey,
                    value: docInfo.data,
                    prefix: stores.bySeqStore,
                    type: "put"
                }, {
                    key: docInfo.metadata.id,
                    value: docInfo.metadata,
                    prefix: stores.docStore,
                    type: "put"
                }];
                txn.batch(batch);
                results[resultsIdx] = {
                    ok: true,
                    id: docInfo.metadata.id,
                    rev: docInfo.metadata.rev
                };
                fetchedDocs.set(docInfo.metadata.id, docInfo.metadata);
                callback2();
            };

            if (!attachments.length) {
                finish();
            }
        };

        // attachments are queued per-digest, otherwise the refs could be
        // overwritten by concurrent writes in the same bulkDocs session
        const attachmentQueues = {};

        const saveAttachmentRefs = (id, rev, digest, callback) => {

            const fetchAtt = () => {
                return new Promise(((resolve, reject) => {
                    txn.get(stores.attachmentStore, digest, (err, oldAtt) => {
                        /* istanbul ignore if */
                        if (err && err.name !== "NotFoundError") {
                            return reject(err);
                        }
                        resolve(oldAtt);
                    });
                }));
            };

            const saveAtt = (oldAtt) => {
                const ref = [id, rev].join("@");
                const newAtt = {};

                if (oldAtt) {
                    if (oldAtt.refs) {
                        // only update references if this attachment already has them
                        // since we cannot migrate old style attachments here without
                        // doing a full db scan for references
                        newAtt.refs = oldAtt.refs;
                        newAtt.refs[ref] = true;
                    }
                } else {
                    newAtt.refs = {};
                    newAtt.refs[ref] = true;
                }

                return new Promise(((resolve) => {
                    txn.batch([{
                        type: "put",
                        prefix: stores.attachmentStore,
                        key: digest,
                        value: newAtt
                    }]);
                    resolve(!oldAtt);
                }));
            };

            // put attachments in a per-digest queue, to avoid two docs with the same
            // attachment overwriting each other
            const queue = attachmentQueues[digest] || Promise.resolve();
            attachmentQueues[digest] = queue.then(() => {
                return fetchAtt().then(saveAtt).then((isNewAttachment) => {
                    callback(null, isNewAttachment);
                }, callback);
            });
        };

        const saveAttachment = (docInfo, digest, key, data, callback) => {
            const att = docInfo.data._attachments[key];
            delete att.data;
            att.digest = digest;
            att.length = data.length;
            const id = docInfo.metadata.id;
            const rev = docInfo.metadata.rev;
            att.revpos = parseInt(rev, 10);

            saveAttachmentRefs(id, rev, digest, (err, isNewAttachment) => {
                /* istanbul ignore if */
                if (err) {
                    return callback(err);
                }
                // do not try to store empty attachments
                if (data.length === 0) {
                    return callback(err);
                }
                if (!isNewAttachment) {
                    // small optimization - don't bother writing it again
                    return callback(err);
                }
                txn.batch([{
                    type: "put",
                    prefix: stores.binaryStore,
                    key: digest,
                    value: Buffer.from(data, "binary")
                }]);
                callback();
            });
        };

        const complete = (err) => {
            /* istanbul ignore if */
            if (err) {
                return process.nextTick(() => {
                    callback(err);
                });
            }
            txn.batch([
                {
                    prefix: stores.metaStore,
                    type: "put",
                    key: UPDATE_SEQ_KEY,
                    value: newUpdateSeq
                },
                {
                    prefix: stores.metaStore,
                    type: "put",
                    key: DOC_COUNT_KEY,
                    value: db._docCount + docCountDelta
                }
            ]);
            txn.execute(db, (err) => {
                /* istanbul ignore if */
                if (err) {
                    return callback(err);
                }
                db._docCount += docCountDelta;
                db._updateSeq = newUpdateSeq;
                levelChanges.notify(name);
                process.nextTick(() => {
                    callback(null, results);
                });
            });
        };

        if (!docInfos.length) {
            return callback(null, []);
        }

        verifyAttachments((err) => {
            if (err) {
                return callback(err);
            }
            fetchExistingDocs((err) => {
                /* istanbul ignore if */
                if (err) {
                    return callback(err);
                }
                processDocs(revLimit, docInfos, api, fetchedDocs, txn, results,
                    writeDoc, opts, finish);
            });
        });
    });

    api._allDocs = function (opts, callback) {
        if ("keys" in opts) {
            return allDocsKeysQuery(this, opts);
        }
        return readLock((opts, callback) => {
            opts = util.clone(opts);
            countDocs((err, docCount) => {
            /* istanbul ignore if */
                if (err) {
                    return callback(err);
                }
                const readstreamOpts = {};
                let skip = opts.skip || 0;
                if (opts.startkey) {
                    readstreamOpts.gte = opts.startkey;
                }
                if (opts.endkey) {
                    readstreamOpts.lte = opts.endkey;
                }
                if (opts.key) {
                    readstreamOpts.gte = readstreamOpts.lte = opts.key;
                }
                if (opts.descending) {
                    readstreamOpts.reverse = true;
                    // switch start and ends
                    const tmp = readstreamOpts.lte;
                    readstreamOpts.lte = readstreamOpts.gte;
                    readstreamOpts.gte = tmp;
                }
                let limit;
                if (is.number(opts.limit)) {
                    limit = opts.limit;
                }
                if (limit === 0 ||
                ("gte" in readstreamOpts && "lte" in readstreamOpts &&
                    readstreamOpts.gte > readstreamOpts.lte)) {
                // should return 0 results when start is greater than end.
                // normally level would "fix" this for us by reversing the order,
                // so short-circuit instead
                    const returnVal = {
                        total_rows: docCount,
                        offset: opts.skip,
                        rows: []
                    };

                    if (opts.update_seq) {
                        returnVal.update_seq = db._updateSeq;
                    }
                    return callback(null, returnVal);
                }
                const results = [];
                const docstream = stores.docStore.readStream(readstreamOpts);

                const throughStream = adone.stream.through.obj((entry, _, next) => {
                    const metadata = entry.value;
                    // winningRev and deleted are performance-killers, but
                    // in newer versions of PouchDB, they are cached on the metadata
                    const winningRev = getWinningRev(metadata);
                    const deleted = getIsDeleted(metadata, winningRev);
                    if (!deleted) {
                        if (skip-- > 0) {
                            next();
                            return;
                        } else if (is.number(limit) && limit-- <= 0) {
                            docstream.unpipe();
                            docstream.destroy();
                            next();
                            return;
                        }
                    } else if (opts.deleted !== "ok") {
                        next();
                        return;
                    }
                    const allDocsInner = (data) => {
                        const doc = {
                            id: metadata.id,
                            key: metadata.id,
                            value: {
                                rev: winningRev
                            }
                        };
                        if (opts.include_docs) {
                            doc.doc = data;
                            doc.doc._rev = doc.value.rev;
                            if (opts.conflicts) {
                                const conflicts = collectConflicts(metadata);
                                if (conflicts.length) {
                                    doc.doc._conflicts = conflicts;
                                }
                            }
                            for (const att in doc.doc._attachments) {
                                if (doc.doc._attachments.hasOwnProperty(att)) {
                                    doc.doc._attachments[att].stub = true;
                                }
                            }
                        }
                        if (opts.inclusive_end === false && metadata.id === opts.endkey) {
                            return next();
                        } else if (deleted) {
                            if (opts.deleted === "ok") {
                                doc.value.deleted = true;
                                doc.doc = null;
                            } else {
                            /* istanbul ignore next */
                                return next();
                            }
                        }
                        results.push(doc);
                        next();
                    };
                    if (opts.include_docs) {
                        const seq = metadata.rev_map[winningRev];
                        stores.bySeqStore.get(formatSeq(seq), (err, data) => {
                            allDocsInner(data);
                        });
                    } else {
                        allDocsInner();
                    }
                }, (next) => {
                    Promise.resolve().then(() => {
                        if (opts.include_docs && opts.attachments) {
                            return fetchAttachments(results, stores, opts);
                        }
                    }).then(() => {
                        const returnVal = {
                            total_rows: docCount,
                            offset: opts.skip,
                            rows: results
                        };

                        if (opts.update_seq) {
                            returnVal.update_seq = db._updateSeq;
                        }
                        callback(null, returnVal);
                    }, callback);
                    next();
                }).on("unpipe", () => {
                    throughStream.end();
                });

                docstream.on("error", callback);

                docstream.pipe(throughStream);
            });
        })(opts, callback);
    };

    api._changes = function (opts) {
        opts = util.clone(opts);

        if (opts.continuous) {
            const id = `${name}:${uuid()}`;
            levelChanges.addListener(name, id, api, opts);
            levelChanges.notify(name);
            return {
                cancel() {
                    levelChanges.removeListener(name, id);
                }
            };
        }

        const descending = opts.descending;
        const results = [];
        let lastSeq = opts.since || 0;
        let called = 0;
        const streamOpts = {
            reverse: descending
        };
        let limit;
        if ("limit" in opts && opts.limit > 0) {
            limit = opts.limit;
        }
        if (!streamOpts.reverse) {
            streamOpts.start = formatSeq(opts.since || 0);
        }

        const docIds = opts.doc_ids && new Set(opts.doc_ids);
        const filter = filterChange(opts);
        const docIdsToMetadata = new Map();

        let returnDocs;
        if ("return_docs" in opts) {
            returnDocs = opts.return_docs;
        } else if ("returnDocs" in opts) {
            // TODO: Remove 'returnDocs' in favor of 'return_docs' in a future release
            returnDocs = opts.returnDocs;
        } else {
            returnDocs = true;
        }

        const complete = () => {
            opts.done = true;
            if (returnDocs && opts.limit) {
                /* istanbul ignore if */
                if (opts.limit < results.length) {
                    results.length = opts.limit;
                }
            }
            changeStream.unpipe(throughStream);
            changeStream.destroy();
            if (!opts.continuous && !opts.cancelled) {
                if (opts.include_docs && opts.attachments) {
                    fetchAttachments(results, stores, opts).then(() => {
                        opts.complete(null, { results, last_seq: lastSeq });
                    });
                } else {
                    opts.complete(null, { results, last_seq: lastSeq });
                }
            }
        };
        const changeStream = stores.bySeqStore.readStream(streamOpts);
        const throughStream = adone.stream.through.obj((data, _, next) => {
            if (limit && called >= limit) {
                complete();
                return next();
            }
            if (opts.cancelled || opts.done) {
                return next();
            }

            const seq = parseSeq(data.key);
            const doc = data.value;

            if (seq === opts.since && !descending) {
                // couchdb ignores `since` if descending=true
                return next();
            }

            if (docIds && !docIds.has(doc._id)) {
                return next();
            }

            const onGetMetadata = (metadata) => {
                const winningRev = getWinningRev(metadata);

                const onGetWinningDoc = (winningDoc) => {

                    const change = opts.processChange(winningDoc, metadata, opts);
                    change.seq = metadata.seq;

                    const filtered = filter(change);
                    if (typeof filtered === "object") {
                        return opts.complete(filtered);
                    }

                    if (filtered) {
                        called++;

                        if (opts.attachments && opts.include_docs) {
                            // fetch attachment immediately for the benefit
                            // of live listeners
                            fetchAttachments([change], stores, opts).then(() => {
                                opts.onChange(change);
                            });
                        } else {
                            opts.onChange(change);
                        }

                        if (returnDocs) {
                            results.push(change);
                        }
                    }
                    next();
                };

                if (metadata.seq !== seq) {
                    // some other seq is later
                    return next();
                }

                lastSeq = seq;

                if (winningRev === doc._rev) {
                    return onGetWinningDoc(doc);
                }

                // fetch the winner

                const winningSeq = metadata.rev_map[winningRev];

                stores.bySeqStore.get(formatSeq(winningSeq), (err, doc) => {
                    onGetWinningDoc(doc);
                });
            };

            const metadata = docIdsToMetadata.get(doc._id);
            if (metadata) { // cached
                return onGetMetadata(metadata);
            }
            // metadata not cached, have to go fetch it
            stores.docStore.get(doc._id, (err, metadata) => {
                /* istanbul ignore if */
                if (opts.cancelled || opts.done || db.isClosed() ||
                    isLocalId(metadata.id)) {
                    return next();
                }
                docIdsToMetadata.set(doc._id, metadata);
                onGetMetadata(metadata);
            });
        }, (next) => {
            if (opts.cancelled) {
                return next();
            }
            if (returnDocs && opts.limit) {
                /* istanbul ignore if */
                if (opts.limit < results.length) {
                    results.length = opts.limit;
                }
            }

            next();
        }).on("unpipe", () => {
            throughStream.end();
            complete();
        });
        changeStream.pipe(throughStream);
        return {
            cancel() {
                opts.cancelled = true;
                complete();
            }
        };
    };

    api._close = function (callback) {
        /* istanbul ignore if */
        if (db.isClosed()) {
            return callback(createError(NOT_OPEN));
        }
        db.close((err) => {
            /* istanbul ignore if */
            if (err) {
                callback(err);
            } else {
                dbStore.delete(name);
                callback();
            }
        });
    };

    api._getRevisionTree = function (docId, callback) {
        stores.docStore.get(docId, (err, metadata) => {
            if (err) {
                callback(createError(MISSING_DOC));
            } else {
                callback(null, metadata.rev_tree);
            }
        });
    };

    api._doCompaction = writeLock((docId, revs, opts, callback) => {
        api._doCompactionNoLock(docId, revs, opts, callback);
    });

    // the NoLock version is for use by bulkDocs
    api._doCompactionNoLock = function (docId, revs, opts, callback) {
        if (is.function(opts)) {
            callback = opts;
            opts = {};
        }

        if (!revs.length) {
            return callback();
        }
        const txn = opts.ctx || new LevelTransaction();

        txn.get(stores.docStore, docId, (err, metadata) => {
            /* istanbul ignore if */
            if (err) {
                return callback(err);
            }
            const seqs = revs.map((rev) => {
                const seq = metadata.rev_map[rev];
                delete metadata.rev_map[rev];
                return seq;
            });
            traverseRevTree(metadata.rev_tree, (isLeaf, pos,
                revHash, ctx, opts) => {
                const rev = `${pos}-${revHash}`;
                if (revs.indexOf(rev) !== -1) {
                    opts.status = "missing";
                }
            });

            let batch = [];
            batch.push({
                key: metadata.id,
                value: metadata,
                type: "put",
                prefix: stores.docStore
            });

            const digestMap = {};
            let numDone = 0;
            let overallErr;
            const checkDone = (err) => {
                /* istanbul ignore if */
                if (err) {
                    overallErr = err;
                }
                if (++numDone === revs.length) { // done
                    /* istanbul ignore if */
                    if (overallErr) {
                        return callback(overallErr);
                    }
                    deleteOrphanedAttachments();
                }
            };

            const finish = (err) => {
                /* istanbul ignore if */
                if (err) {
                    return callback(err);
                }
                txn.batch(batch);
                if (opts.ctx) {
                    // don't execute immediately
                    return callback();
                }
                txn.execute(db, callback);
            };

            const deleteOrphanedAttachments = () => {
                const possiblyOrphanedAttachments = Object.keys(digestMap);
                if (!possiblyOrphanedAttachments.length) {
                    return finish();
                }
                let numDone = 0;
                let overallErr;
                const checkDone = (err) => {
                    /* istanbul ignore if */
                    if (err) {
                        overallErr = err;
                    }
                    if (++numDone === possiblyOrphanedAttachments.length) {
                        finish(overallErr);
                    }
                };
                const refsToDelete = new Map();
                revs.forEach((rev) => {
                    refsToDelete.set(`${docId}@${rev}`, true);
                });
                possiblyOrphanedAttachments.forEach((digest) => {
                    txn.get(stores.attachmentStore, digest, (err, attData) => {
                        /* istanbul ignore if */
                        if (err) {
                            if (err.name === "NotFoundError") {
                                return checkDone();
                            }
                            return checkDone(err);

                        }
                        const refs = Object.keys(attData.refs || {}).filter((ref) => {
                            return !refsToDelete.has(ref);
                        });
                        const newRefs = {};
                        refs.forEach((ref) => {
                            newRefs[ref] = true;
                        });
                        if (refs.length) { // not orphaned
                            batch.push({
                                key: digest,
                                type: "put",
                                value: { refs: newRefs },
                                prefix: stores.attachmentStore
                            });
                        } else { // orphaned, can safely delete
                            batch = batch.concat([{
                                key: digest,
                                type: "del",
                                prefix: stores.attachmentStore
                            }, {
                                key: digest,
                                type: "del",
                                prefix: stores.binaryStore
                            }]);
                        }
                        checkDone();
                    });
                });
            };

            seqs.forEach((seq) => {
                batch.push({
                    key: formatSeq(seq),
                    type: "del",
                    prefix: stores.bySeqStore
                });
                txn.get(stores.bySeqStore, formatSeq(seq), (err, doc) => {
                    /* istanbul ignore if */
                    if (err) {
                        if (err.name === "NotFoundError") {
                            return checkDone();
                        }
                        return checkDone(err);

                    }
                    const atts = Object.keys(doc._attachments || {});
                    atts.forEach((attName) => {
                        const digest = doc._attachments[attName].digest;
                        digestMap[digest] = true;
                    });
                    checkDone();
                });
            });
        });
    };

    api._getLocal = function (id, callback) {
        stores.localStore.get(id, (err, doc) => {
            if (err) {
                callback(createError(MISSING_DOC));
            } else {
                callback(null, doc);
            }
        });
    };

    api._putLocal = function (doc, opts, callback) {
        if (is.function(opts)) {
            callback = opts;
            opts = {};
        }
        if (opts.ctx) {
            api._putLocalNoLock(doc, opts, callback);
        } else {
            api._putLocalWithLock(doc, opts, callback);
        }
    };

    api._putLocalWithLock = writeLock((doc, opts, callback) => {
        api._putLocalNoLock(doc, opts, callback);
    });

    // the NoLock version is for use by bulkDocs
    api._putLocalNoLock = function (doc, opts, callback) {
        delete doc._revisions; // ignore this, trust the rev
        const oldRev = doc._rev;
        const id = doc._id;

        const txn = opts.ctx || new LevelTransaction();

        txn.get(stores.localStore, id, (err, resp) => {
            if (err && oldRev) {
                return callback(createError(REV_CONFLICT));
            }
            if (resp && resp._rev !== oldRev) {
                return callback(createError(REV_CONFLICT));
            }
            doc._rev =
                oldRev ? `0-${parseInt(oldRev.split("-")[1], 10) + 1}` : "0-1";
            const batch = [
                {
                    type: "put",
                    prefix: stores.localStore,
                    key: id,
                    value: doc
                }
            ];

            txn.batch(batch);
            const ret = { ok: true, id: doc._id, rev: doc._rev };

            if (opts.ctx) {
                // don't execute immediately
                return callback(null, ret);
            }
            txn.execute(db, (err) => {
                /* istanbul ignore if */
                if (err) {
                    return callback(err);
                }
                callback(null, ret);
            });
        });
    };

    api._removeLocal = function (doc, opts, callback) {
        if (is.function(opts)) {
            callback = opts;
            opts = {};
        }
        if (opts.ctx) {
            api._removeLocalNoLock(doc, opts, callback);
        } else {
            api._removeLocalWithLock(doc, opts, callback);
        }
    };

    api._removeLocalWithLock = writeLock((doc, opts, callback) => {
        api._removeLocalNoLock(doc, opts, callback);
    });

    // the NoLock version is for use by bulkDocs
    api._removeLocalNoLock = function (doc, opts, callback) {
        const txn = opts.ctx || new LevelTransaction();
        txn.get(stores.localStore, doc._id, (err, resp) => {
            if (err) {
                /* istanbul ignore if */
                if (err.name !== "NotFoundError") {
                    return callback(err);
                }
                return callback(createError(MISSING_DOC));

            }
            if (resp._rev !== doc._rev) {
                return callback(createError(REV_CONFLICT));
            }
            txn.batch([{
                prefix: stores.localStore,
                type: "del",
                key: doc._id
            }]);
            const ret = { ok: true, id: doc._id, rev: "0-0" };
            if (opts.ctx) {
                // don't execute immediately
                return callback(null, ret);
            }
            txn.execute(db, (err) => {
                /* istanbul ignore if */
                if (err) {
                    return callback(err);
                }
                callback(null, ret);
            });
        });
    };

    const callDestroy = (name, cb) => {
        opts.db.destroy(name, cb);

    };

    // close and delete open leveldb stores
    api._destroy = function (opts, callback) {
        let dbStore;
        const leveldownName = util.functionName(leveldown);
        /* istanbul ignore else */
        if (dbStores.has(leveldownName)) {
            dbStore = dbStores.get(leveldownName);
        } else {
            return callDestroy(name, callback);
        }

        /* istanbul ignore else */
        if (dbStore.has(name)) {
            levelChanges.removeAllListeners(name);
            dbStore.get(name).then(({ db }) => {
                db.close(() => {
                    dbStore.delete(name);
                    callDestroy(name, callback);
                });
            });
        } else {
            callDestroy(name, callback);
        }
    };
};

// overrides for normal LevelDB behavior on Node
adapter.valid = adone.truly;
adapter.use_prefix = false;
