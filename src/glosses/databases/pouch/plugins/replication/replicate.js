const {
    is,
    util,
    database: { pouch }
} = adone;

const {
    x: { createError, BAD_REQUEST },
    plugin: { replication }
} = pouch;

const {
    util: {
        toPouch,
        filterChange,
        uuid
    }
} = adone.private(pouch);

const _replicate = (src, target, opts, returnValue, result) => {
    let batches = []; // list of batches to be processed
    let currentBatch; // the batch currently being processed
    let pendingBatch = {
        seq: 0,
        changes: [],
        docs: []
    }; // next batch, not yet ready to be processed
    let writingCheckpoint = false; // true while checkpoint is being written
    let changesCompleted = false; // true when all changes received
    let replicationCompleted = false; // true when replication has completed
    let last_seq = 0;
    const continuous = opts.continuous || opts.live || false;
    const batch_size = opts.batch_size || 100;
    const batches_limit = opts.batches_limit || 10;
    let changesPending = false; // true while src.changes is running
    const doc_ids = opts.doc_ids;
    const selector = opts.selector;
    let repId;
    let checkpointer;
    let changedDocs = [];
    // Like couchdb, every replication gets a unique session id
    const session = uuid();
    const seq_interval = opts.seq_interval;

    result = result || {
        ok: true,
        start_time: new Date(),
        docs_read: 0,
        docs_written: 0,
        doc_write_failures: 0,
        errors: []
    };

    let changesOpts = {};
    returnValue.ready(src, target);

    const initCheckpointer = () => {
        if (checkpointer) {
            return Promise.resolve();
        }
        return replication.generateReplicationId(src, target, opts).then((res) => {
            repId = res;

            let checkpointOpts = {};
            if (opts.checkpoint === false) {
                checkpointOpts = { writeSourceCheckpoint: false, writeTargetCheckpoint: false };
            } else if (opts.checkpoint === "source") {
                checkpointOpts = { writeSourceCheckpoint: true, writeTargetCheckpoint: false };
            } else if (opts.checkpoint === "target") {
                checkpointOpts = { writeSourceCheckpoint: false, writeTargetCheckpoint: true };
            } else {
                checkpointOpts = { writeSourceCheckpoint: true, writeTargetCheckpoint: true };
            }

            checkpointer = new replication.Checkpointer(src, target, repId, returnValue, checkpointOpts);
        });
    };

    const completeReplication = (fatalError) => {
        if (replicationCompleted) {
            return;
        }
        /* istanbul ignore if */
        if (returnValue.cancelled) {
            result.status = "cancelled";
            if (writingCheckpoint) {
                return;
            }
        }
        result.status = result.status || "complete";
        result.end_time = new Date();
        result.last_seq = last_seq;
        replicationCompleted = true;

        if (fatalError) {
            // need to extend the error because Firefox considers ".result" read-only
            fatalError = createError(fatalError);
            fatalError.result = result;

            if (fatalError.name === "unauthorized" || fatalError.name === "forbidden") {
                returnValue.emit("error", fatalError);
                returnValue.removeAllListeners();
            } else {
                replication.backOff(opts, returnValue, fatalError, () => {
                    replicate(src, target, opts, returnValue);
                });
            }
        } else {
            returnValue.emit("complete", result);
            returnValue.removeAllListeners();
        }
    };


    const onChangesError = (err) => {
        changesPending = false;
        /* istanbul ignore if */
        if (returnValue.cancelled) {
            return completeReplication();
        }
        abortReplication("changes rejected", err);
    };


    const getChanges = () => {
        if (!(
            !changesPending &&
            !changesCompleted &&
            batches.length < batches_limit
        )) {
            return;
        }
        changesPending = true;
        const abortChanges = () => {
            changes.cancel();
        };
        const removeListener = () => {
            returnValue.removeListener("cancel", abortChanges);
        };

        if (returnValue._changes) { // remove old changes() and listeners
            returnValue.removeListener("cancel", returnValue._abortChanges);
            returnValue._changes.cancel();
        }
        returnValue.once("cancel", abortChanges);

        var changes = src.changes(changesOpts)
            .on("change", onChange);
        changes.then(removeListener, removeListener);
        changes.then(onChangesComplete)
            .catch(onChangesError);

        if (opts.retry) {
            // save for later so we can cancel if necessary
            returnValue._changes = changes;
            returnValue._abortChanges = abortChanges;
        }
    };


    const startChanges = () => {
        initCheckpointer().then(() => {
            /* istanbul ignore if */
            if (returnValue.cancelled) {
                completeReplication();
                return;
            }
            return checkpointer.getCheckpoint().then((checkpoint) => {
                last_seq = checkpoint;
                changesOpts = {
                    since: last_seq,
                    limit: batch_size,
                    batch_size,
                    style: "all_docs",
                    doc_ids,
                    selector,
                    return_docs: true // required so we know when we're done
                };
                if (seq_interval !== false) {
                    changesOpts.seq_interval = seq_interval || batch_size;
                }
                if (opts.filter) {
                    if (!is.string(opts.filter)) {
                        // required for the client-side filter in onChange
                        changesOpts.include_docs = true;
                    } else { // ddoc filter
                        changesOpts.filter = opts.filter;
                    }
                }
                if ("heartbeat" in opts) {
                    changesOpts.heartbeat = opts.heartbeat;
                }
                if ("timeout" in opts) {
                    changesOpts.timeout = opts.timeout;
                }
                if (opts.query_params) {
                    changesOpts.query_params = opts.query_params;
                }
                if (opts.view) {
                    changesOpts.view = opts.view;
                }
                getChanges();
            });
        }).catch((err) => {
            abortReplication("getCheckpoint rejected with ", err);
        });
    };

    /* istanbul ignore next */
    const onCheckpointError = (err) => {
        writingCheckpoint = false;
        abortReplication("writeCheckpoint completed with error", err);
    };

    const writeDocs = () => {
        changedDocs = [];

        if (currentBatch.docs.length === 0) {
            return;
        }
        const docs = currentBatch.docs;
        const bulkOpts = { timeout: opts.timeout };
        return target.bulkDocs({ docs, new_edits: false }, bulkOpts).then((res) => {
            /* istanbul ignore if */
            if (returnValue.cancelled) {
                completeReplication();
                throw new Error("cancelled");
            }

            // `res` doesn't include full documents (which live in `docs`), so we create a map of
            // (id -> error), and check for errors while iterating over `docs`
            const errorsById = Object.create(null);
            res.forEach((res) => {
                if (res.error) {
                    errorsById[res.id] = res;
                }
            });

            const errorsNo = Object.keys(errorsById).length;
            result.doc_write_failures += errorsNo;
            result.docs_written += docs.length - errorsNo;

            docs.forEach((doc) => {
                const error = errorsById[doc._id];
                if (error) {
                    result.errors.push(error);
                    if (error.name === "unauthorized" || error.name === "forbidden") {
                        returnValue.emit("denied", util.clone(error));
                    } else {
                        throw error;
                    }
                } else {
                    changedDocs.push(doc);
                }
            });

        }, (err) => {
            result.doc_write_failures += docs.length;
            throw err;
        });
    };

    const finishBatch = () => {
        if (currentBatch.error) {
            throw new Error("There was a problem getting docs.");
        }
        result.last_seq = last_seq = currentBatch.seq;
        const outResult = util.clone(result);
        if (changedDocs.length) {
            outResult.docs = changedDocs;
            // Attach 'pending' property if server supports it (CouchDB 2.0+)
            /* istanbul ignore if */
            if (is.number(currentBatch.pending)) {
                outResult.pending = currentBatch.pending;
                delete currentBatch.pending;
            }
            returnValue.emit("change", outResult);
        }
        writingCheckpoint = true;
        return checkpointer.writeCheckpoint(currentBatch.seq, session).then(() => {
            writingCheckpoint = false;
            /* istanbul ignore if */
            if (returnValue.cancelled) {
                completeReplication();
                throw new Error("cancelled");
            }
            currentBatch = undefined;
            getChanges();
        }).catch((err) => {
            onCheckpointError(err);
            throw err;
        });
    };

    const getDiffs = () => {
        const diff = {};
        currentBatch.changes.forEach((change) => {
            // Couchbase Sync Gateway emits these, but we can ignore them
            /* istanbul ignore if */
            if (change.id === "_user/") {
                return;
            }
            diff[change.id] = change.changes.map((x) => {
                return x.rev;
            });
        });
        return target.revsDiff(diff).then((diffs) => {
            /* istanbul ignore if */
            if (returnValue.cancelled) {
                completeReplication();
                throw new Error("cancelled");
            }
            // currentBatch.diffs elements are deleted as the documents are written
            currentBatch.diffs = diffs;
        });
    };

    const getBatchDocs = () => {
        return replication.getDocs(src, target, currentBatch.diffs, returnValue).then((got) => {
            currentBatch.error = !got.ok;
            got.docs.forEach((doc) => {
                delete currentBatch.diffs[doc._id];
                result.docs_read++;
                currentBatch.docs.push(doc);
            });
        });
    };

    const startNextBatch = () => {
        if (returnValue.cancelled || currentBatch) {
            return;
        }
        if (batches.length === 0) {
            processPendingBatch(true);
            return;
        }
        currentBatch = batches.shift();
        getDiffs()
            .then(getBatchDocs)
            .then(writeDocs)
            .then(finishBatch)
            .then(startNextBatch)
            .catch((err) => {
                abortReplication("batch processing terminated with error", err);
            });
    };

    const processPendingBatch = (immediate) => {
        if (pendingBatch.changes.length === 0) {
            if (batches.length === 0 && !currentBatch) {
                if ((continuous && changesOpts.live) || changesCompleted) {
                    returnValue.state = "pending";
                    returnValue.emit("paused");
                }
                if (changesCompleted) {
                    completeReplication();
                }
            }
            return;
        }
        if (
            immediate ||
            changesCompleted ||
            pendingBatch.changes.length >= batch_size
        ) {
            batches.push(pendingBatch);
            pendingBatch = {
                seq: 0,
                changes: [],
                docs: []
            };
            if (returnValue.state === "pending" || returnValue.state === "stopped") {
                returnValue.state = "active";
                returnValue.emit("active");
            }
            startNextBatch();
        }
    };


    const abortReplication = (reason, err) => {
        if (replicationCompleted) {
            return;
        }
        if (!err.message) {
            err.message = reason;
        }
        result.ok = false;
        result.status = "aborting";
        batches = [];
        pendingBatch = {
            seq: 0,
            changes: [],
            docs: []
        };
        completeReplication(err);
    };

    const onChange = (change, pending, lastSeq) => {
        /* istanbul ignore if */
        if (returnValue.cancelled) {
            return completeReplication();
        }
        // Attach 'pending' property if server supports it (CouchDB 2.0+)
        /* istanbul ignore if */
        if (is.number(pending)) {
            pendingBatch.pending = pending;
        }

        const filter = filterChange(opts)(change);
        if (!filter) {
            return;
        }
        pendingBatch.seq = change.seq || lastSeq;
        pendingBatch.changes.push(change);
        processPendingBatch(batches.length === 0 && changesOpts.live);
    };

    const onChangesComplete = (changes) => {
        changesPending = false;
        /* istanbul ignore if */
        if (returnValue.cancelled) {
            return completeReplication();
        }

        // if no results were returned then we're done,
        // else fetch more
        if (changes.results.length > 0) {
            changesOpts.since = changes.last_seq;
            getChanges();
            processPendingBatch(true);
        } else {

            const complete = function () {
                if (continuous) {
                    changesOpts.live = true;
                    getChanges();
                } else {
                    changesCompleted = true;
                }
                processPendingBatch(true);
            };

            // update the checkpoint so we start from the right seq next time
            if (!currentBatch && changes.results.length === 0) {
                writingCheckpoint = true;
                checkpointer.writeCheckpoint(changes.last_seq,
                    session).then(() => {
                    writingCheckpoint = false;
                    result.last_seq = last_seq = changes.last_seq;
                    complete();
                })
                    .catch(onCheckpointError);
            } else {
                complete();
            }
        }
    };

    /* istanbul ignore if */
    if (returnValue.cancelled) { // cancelled immediately
        completeReplication();
        return;
    }

    if (!returnValue._addedListeners) {
        returnValue.once("cancel", completeReplication);

        if (is.function(opts.complete)) {
            returnValue.once("error", opts.complete);
            returnValue.once("complete", (result) => {
                opts.complete(null, result);
            });
        }
        returnValue._addedListeners = true;
    }

    if (is.undefined(opts.since)) {
        startChanges();
    } else {
        initCheckpointer().then(() => {
            writingCheckpoint = true;
            return checkpointer.writeCheckpoint(opts.since, session);
        }).then(() => {
            writingCheckpoint = false;
            /* istanbul ignore if */
            if (returnValue.cancelled) {
                completeReplication();
                return;
            }
            last_seq = opts.since;
            startChanges();
        }).catch(onCheckpointError);
    }
};

export default function replicate(src, target, opts, callback) {
    if (is.function(opts)) {
        callback = opts;
        opts = {};
    }
    if (is.undefined(opts)) {
        opts = {};
    }

    if (opts.doc_ids && !is.array(opts.doc_ids)) {
        throw createError(BAD_REQUEST, "`doc_ids` filter parameter is not a list.");
    }

    opts.complete = callback;
    opts = util.clone(opts);
    opts.continuous = opts.continuous || opts.live;
    opts.retry = ("retry" in opts) ? opts.retry : false;
    /*jshint validthis:true */
    opts.PouchConstructor = opts.PouchConstructor || this;
    const replicateRet = new replication.Replication(opts);
    const srcPouch = toPouch(src, opts);
    const targetPouch = toPouch(target, opts);
    _replicate(srcPouch, targetPouch, opts, replicateRet);
    return replicateRet;
}
