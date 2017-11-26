const {
    is,
    event: { EventEmitter },
    util,
    database: { pouch }
} = adone;
const {
    util: {
        merge: {
            isDeleted,
            collectLeaves,
            collectConflicts
        }
    }
} = adone.private(pouch);


const tryCatchInChangeListener = (self, change, pending, lastSeq) => {
    // isolate try/catches to avoid V8 deoptimizations
    try {
        self.emit("change", change, pending, lastSeq);
    } catch (e) {
        adone.error('Error in .on("change", function):', e);
    }
};

const processChange = (doc, metadata, opts) => {
    let changeList = [{ rev: doc._rev }];
    if (opts.style === "all_docs") {
        changeList = collectLeaves(metadata.rev_tree)
            .map((x) => {
                return { rev: x.rev };
            });
    }
    const change = {
        id: metadata.id,
        changes: changeList,
        doc
    };

    if (isDeleted(metadata, doc._rev)) {
        change.deleted = true;
    }
    if (opts.conflicts) {
        change.doc._conflicts = collectConflicts(metadata);
        if (!change.doc._conflicts.length) {
            delete change.doc._conflicts;
        }
    }
    return change;
};

export default class Changes extends EventEmitter {
    constructor(db, opts, callback) {
        super();
        this.db = db;
        opts = opts ? util.clone(opts) : {};
        const onDestroy = () => {
            this.cancel();
        };
        const complete = opts.complete = util.once((err, resp) => {
            if (err) {
                if (this.listenerCount("error") > 0) {
                    this.emit("error", err);
                }
            } else {
                this.emit("complete", resp);
            }
            this.removeAllListeners();
            db.removeListener("destroyed", onDestroy);
        });
        if (callback) {
            this.on("complete", (resp) => {
                callback(null, resp);
            });
            this.on("error", callback);
        }
        db.once("destroyed", onDestroy);

        opts.onChange = (change, pending, lastSeq) => {
            /* istanbul ignore if */
            if (this.isCancelled) {
                return;
            }
            tryCatchInChangeListener(this, change, pending, lastSeq);
        };

        const promise = new Promise((fulfill, reject) => {
            opts.complete = (err, res) => {
                if (err) {
                    reject(err);
                } else {
                    fulfill(res);
                }
            };
        });
        this.once("cancel", () => {
            db.removeListener("destroyed", onDestroy);
            opts.complete(null, { status: "cancelled" });
        });
        this.then = promise.then.bind(promise);
        this.catch = promise.catch.bind(promise);
        this.then((result) => {
            complete(null, result);
        }, complete);

        if (!db.taskqueue.isReady) {
            db.taskqueue.addTask((failed) => {
                if (failed) {
                    opts.complete(failed);
                } else if (this.isCancelled) {
                    this.emit("cancel");
                } else {
                    this.validateChanges(opts);
                }
            });
        } else {
            this.validateChanges(opts);
        }
    }

    cancel() {
        this.isCancelled = true;
        if (this.db.taskqueue.isReady) {
            this.emit("cancel");
        }
    }

    validateChanges(opts) {
        const callback = opts.complete;

        const DB = this.db.constructor;

        /* istanbul ignore else */
        if (DB._changesFilterPlugin) {
            DB._changesFilterPlugin.validate(opts, (err) => {
                if (err) {
                    return callback(err);
                }
                this.doChanges(opts);
            });
        } else {
            this.doChanges(opts);
        }
    }

    doChanges(opts) {
        const callback = opts.complete;

        opts = util.clone(opts);
        if ("live" in opts && !("continuous" in opts)) {
            opts.continuous = opts.live;
        }
        opts.processChange = processChange;

        if (opts.since === "latest") {
            opts.since = "now";
        }
        if (!opts.since) {
            opts.since = 0;
        }
        if (opts.since === "now") {
            this.db.info().then((info) => {
                /* istanbul ignore if */
                if (this.isCancelled) {
                    callback(null, { status: "cancelled" });
                    return;
                }
                opts.since = info.update_seq;
                this.doChanges(opts);
            }, callback);
            return;
        }

        const DB = this.db.constructor;

        /* istanbul ignore else */
        if (DB._changesFilterPlugin) {
            DB._changesFilterPlugin.normalize(opts);
            if (DB._changesFilterPlugin.shouldFilter(this, opts)) {
                return DB._changesFilterPlugin.filter(this, opts);
            }
        } else {
            ["doc_ids", "filter", "selector", "view"].forEach((key) => {
                if (key in opts) {
                    adone.warn(
                        `The "${key}" option was passed in to changes/replicate, ` +
                        "but changes-filter plugin is not installed, so it " +
                        "was ignored. Please install the plugin to enable filtering."
                    );
                }
            });
        }

        if (!("descending" in opts)) {
            opts.descending = false;
        }

        // 0 and 1 should return 1 document
        opts.limit = opts.limit === 0 ? 1 : opts.limit;
        opts.complete = callback;
        const newPromise = this.db._changes(opts);
        /* istanbul ignore else */
        if (newPromise && is.function(newPromise.cancel)) {
            const cancel = this.cancel;
            this.cancel = function (...args) {
                newPromise.cancel();
                cancel.apply(this, args);
            };
        }
    }
}
