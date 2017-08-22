const { std: { fs, path }, database: { pouch: { __ } } } = adone;
const {
    util: {
        merge: {
            isLocalId,
            winningRev
        }
    }
} = __;

const LevelWriteStream = (db) => (options) => {
    options = options || {};

    const queue = [];
    // eslint-disable-next-line no-use-before-define

    let pending = false;

    const emit = (err) => {
        pending = false;
        if (err) {
            stream.emit("error", err);
        } else {
            stream.emit("_afterEmit");
        }
    };

    const drain = () => {
        if (queue.length === 1) {
            const chunk = queue[0];
            db.put(chunk.key, chunk.value, options, emit);
        } else {
            const arr = queue.map((chunk) => {
                chunk.type = "put";
                return chunk;
            });

            db.batch(arr, options, emit);
        }

        queue.length = 0;
    };

    const stream = adone.stream.through.obj(function (chunk, _, callback) {
        if (!pending) {
            pending = true;
            process.nextTick(drain);
        }
        this.queue.push(chunk);
        callback();
    }, (callback) => {
        if (pending) {
            stream.once("_afterEmit", callback);
        } else {
            // eslint-disable-next-line callback-return
            callback();
        }
    });
};

const stores = [
    "document-store",
    "by-sequence",
    "attach-store",
    "attach-binary-store"
];
const formatSeq = (n) => {
    return (`0000000000000000${n}`).slice(-16);
};
const UPDATE_SEQ_KEY = "_local_last_update_seq";
const DOC_COUNT_KEY = "_local_doc_count";
const UUID_KEY = "_local_uuid";

const doMigrationOne = function (name, db, callback) {
    // local require to prevent crashing if leveldown isn't installed.
    // const leveldown = require("leveldown");

    const base = path.resolve(name);
    const move = (store, index, cb) => {
        const storePath = path.join(base, store);
        let opts;
        if (index === 3) {
            opts = {
                valueEncoding: "binary"
            };
        } else {
            opts = {
                valueEncoding: "json"
            };
        }
        const sub = db.sublevel(store, opts);
        const orig = new adone.database.level.DB({ ...opts, location: storePath });
        const from = orig.createReadStream();
        const writeStream = new LevelWriteStream(sub);
        const to = writeStream();
        from.on("end", () => {
            orig.close((err) => {
                cb(err, storePath);
            });
        });
        from.pipe(to);
    };
    fs.unlink(`${base}.uuid`, (err) => {
        if (err) {
            return callback();
        }
        let todo = 4;
        const done = [];
        stores.forEach((store, i) => {
            move(store, i, (err, storePath) => {
                /* istanbul ignore if */
                if (err) {
                    return callback(err);
                }
                done.push(storePath);
                if (!(--todo)) {
                    done.forEach((item) => {
                        adone.promise.nodeify(adone.database.level.destroy(item), () => {
                            if (++todo === done.length) {
                                fs.rmdir(base, callback);
                            }
                        });
                    });
                }
            });
        });
    });
};
const doMigrationTwo = function (db, stores, callback) {
    const batches = [];
    stores.bySeqStore.get(UUID_KEY, (err, value) => {
        if (err) {
            // no uuid key, so don't need to migrate;
            return callback();
        }
        batches.push({
            key: UUID_KEY,
            value,
            prefix: stores.metaStore,
            type: "put",
            valueEncoding: "json"
        });
        batches.push({
            key: UUID_KEY,
            prefix: stores.bySeqStore,
            type: "del"
        });
        stores.bySeqStore.get(DOC_COUNT_KEY, (err, value) => {
            if (value) {
                // if no doc count key,
                // just skip
                // we can live with this
                batches.push({
                    key: DOC_COUNT_KEY,
                    value,
                    prefix: stores.metaStore,
                    type: "put",
                    valueEncoding: "json"
                });
                batches.push({
                    key: DOC_COUNT_KEY,
                    prefix: stores.bySeqStore,
                    type: "del"
                });
            }
            stores.bySeqStore.get(UPDATE_SEQ_KEY, (err, value) => {
                if (value) {
                    // if no UPDATE_SEQ_KEY
                    // just skip
                    // we've gone to far to stop.
                    batches.push({
                        key: UPDATE_SEQ_KEY,
                        value,
                        prefix: stores.metaStore,
                        type: "put",
                        valueEncoding: "json"
                    });
                    batches.push({
                        key: UPDATE_SEQ_KEY,
                        prefix: stores.bySeqStore,
                        type: "del"
                    });
                }
                const deletedSeqs = {};
                stores.docStore.createReadStream({
                    startKey: "_",
                    endKey: "_\xFF"
                }).pipe(adone.stream.through.obj(function (ch, _, next) {
                    if (!isLocalId(ch.key)) {
                        return next();
                    }
                    batches.push({
                        key: ch.key,
                        prefix: stores.docStore,
                        type: "del"
                    });
                    const winner = winningRev(ch.value);
                    Object.keys(ch.value.rev_map).forEach(function (key) {
                        if (key !== "winner") {
                            this.push(formatSeq(ch.value.rev_map[key]));
                        }
                    }, this);
                    const winningSeq = ch.value.rev_map[winner];
                    stores.bySeqStore.get(formatSeq(winningSeq), (err, value) => {
                        if (!err) {
                            batches.push({
                                key: ch.key,
                                value,
                                prefix: stores.localStore,
                                type: "put",
                                valueEncoding: "json"
                            });
                        }
                        next();
                    });

                })).pipe(adone.stream.through.obj((seq, _, next) => {
                    /* istanbul ignore if */
                    if (deletedSeqs[seq]) {
                        return next();
                    }
                    deletedSeqs[seq] = true;
                    stores.bySeqStore.get(seq, (err, resp) => {
                        /* istanbul ignore if */
                        if (err || !isLocalId(resp._id)) {
                            return next();
                        }
                        batches.push({
                            key: seq,
                            prefix: stores.bySeqStore,
                            type: "del"
                        });
                        next();
                    });
                }, () => {
                    db.batch(batches, callback);
                }));
            });
        });
    });

};

export default {
    doMigrationOne,
    doMigrationTwo
};
