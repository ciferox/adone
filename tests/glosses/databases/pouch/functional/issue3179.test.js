require("./node.setup");

describe("db", "pouch", "issue3179", () => {
    const dbs = {};

    beforeEach((done) => {
        dbs.name = testUtils.adapterUrl("local", "testdb");
        dbs.remote = testUtils.adapterUrl("local", "test_repl_remote");
        testUtils.cleanup([dbs.name, dbs.remote], done);
    });

    after((done) => {
        testUtils.cleanup([dbs.name, dbs.remote], done);
    });

    it("#3179 conflicts synced, non-live replication", () => {
        const local = new PouchDB(dbs.name);
        const remote = new PouchDB(dbs.remote);

        return local.put({ _id: "1" }).then(() => {
            return local.replicate.to(remote).then(() => {
                return remote.replicate.to(local);
            });
        }).then(() => {
            return local.get("1").then((doc) => {
                doc.foo = Math.random();
                return local.put(doc);
            });
        }).then(() => {
            return remote.get("1").then((doc) => {
                doc.foo = Math.random();
                return remote.put(doc);
            });
        }).then(() => {
            return local.replicate.to(remote).then(() => {
                return remote.replicate.to(local);
            });
        }).then(() => {
            return local.get("1", { conflicts: true }).then((doc) => {
                return local.remove(doc._id, doc._conflicts[0]);
            });
        }).then(() => {
            return local.replicate.to(remote).then(() => {
                return remote.replicate.to(local);
            });
        }).then(() => {
            return local.get("1", { conflicts: true, revs: true });
        }).then((localDoc) => {
            return remote.get("1", {
                conflicts: true,
                revs: true
            }).then((remoteDoc) => {
                assert.deepEqual(remoteDoc, localDoc);
            });
        });
    });

    it("#3179 conflicts synced, non-live sync", () => {
        const local = new PouchDB(dbs.name);
        const remote = new PouchDB(dbs.remote);

        return local.put({ _id: "1" }).then(() => {
            return local.sync(remote);
        }).then(() => {
            return local.get("1").then((doc) => {
                doc.foo = Math.random();
                return local.put(doc);
            });
        }).then(() => {
            return remote.get("1").then((doc) => {
                doc.foo = Math.random();
                return remote.put(doc);
            });
        }).then(() => {
            return local.sync(remote);
        }).then(() => {
            return local.get("1", { conflicts: true }).then((doc) => {
                return local.remove(doc._id, doc._conflicts[0]);
            });
        }).then(() => {
            return local.sync(remote);
        }).then(() => {
            return local.get("1", { conflicts: true, revs: true });
        }).then((localDoc) => {
            return remote.get("1", {
                conflicts: true,
                revs: true
            }).then((remoteDoc) => {
                assert.deepEqual(remoteDoc, localDoc);
            });
        });
    });

    it("#3179 conflicts synced, live sync", () => {
        const local = new PouchDB(dbs.name);
        const remote = new PouchDB(dbs.remote);

        let sync = local.sync(remote, { live: true });

        function waitForUptodate() {

            function defaultToEmpty(promise) {
                return promise.catch((err) => {
                    if (err.status !== 404) {
                        throw err;
                    }
                    return { _revisions: [] };
                });
            }

            return defaultToEmpty(local.get("1", {
                revs: true,
                conflicts: true
            })).then((localDoc) => {
                return defaultToEmpty(remote.get("1", {
                    revs: true,
                    conflicts: true
                })).then((remoteDoc) => {
                    const revsEqual = JSON.stringify(localDoc._revisions) ===
                        JSON.stringify(remoteDoc._revisions);
                    const conflictsEqual = JSON.stringify(localDoc._conflicts || []) ===
                        JSON.stringify(remoteDoc._conflicts || []);
                    if (!revsEqual || !conflictsEqual) {
                        // we can get caught in an infinite loop here when using adapters based
                        // on microtasks, e.g. memdown, so use setTimeout() to get a macrotask
                        return new Promise((resolve) => {
                            setTimeout(resolve, 0);
                        }).then(waitForUptodate);
                    }
                });
            });
        }

        function waitForConflictsResolved() {
            return new Promise((resolve) => {
                var changes = remote.changes({
                    live: true,
                    include_docs: true,
                    conflicts: true
                }).on("change", (change) => {
                    if (!("_conflicts" in change.doc)) {
                        changes.cancel();
                    }
                });
                changes.on("complete", resolve);
            });
        }

        function cleanup() {
            return new Promise((resolve, reject) => {
                sync.on("complete", resolve);
                sync.on("error", reject);
                sync.cancel();
                sync = null;
            });
        }

        return local.put({ _id: "1" }).then(() => {
            return waitForUptodate();
        }).then(() => {
            sync.cancel();
            return waitForUptodate();
        }).then(() => {
            return local.get("1").then((doc) => {
                doc.foo = Math.random();
                return local.put(doc);
            });
        }).then(() => {
            return remote.get("1").then((doc) => {
                doc.foo = Math.random();
                return remote.put(doc);
            });
        }).then(() => {
            sync = local.sync(remote, { live: true });
            return waitForUptodate();
        }).then(() => {
            return local.get("1", { conflicts: true }).then((doc) => {
                return local.remove(doc._id, doc._conflicts[0]);
            });
        }).then(() => {
            return waitForConflictsResolved();
        }).then(() => {
            return local.get("1", { conflicts: true, revs: true });
        }).then((localDoc) => {
            return remote.get("1", {
                conflicts: true,
                revs: true
            }).then((remoteDoc) => {
                assert.deepEqual(remoteDoc, localDoc);
            });
        }).then(() => {
            return cleanup();
        }, (err) => {
            return cleanup().then(() => {
                throw err;
            });
        });
    });

    it("#3179 conflicts synced, live repl", () => {
        const local = new PouchDB(dbs.name);
        const remote = new PouchDB(dbs.remote);

        let repl1 = local.replicate.to(remote, { live: true });
        let repl2 = local.replicate.from(remote, { live: true });

        function waitForConflictsResolved() {
            return new Promise((resolve) => {
                var changes = remote.changes({
                    live: true,
                    include_docs: true,
                    conflicts: true
                }).on("change", (change) => {
                    if (!("_conflicts" in change.doc)) {
                        changes.cancel();
                    }
                });
                changes.on("complete", resolve);
            });
        }

        function waitForUptodate() {

            function defaultToEmpty(promise) {
                return promise.catch((err) => {
                    if (err.status !== 404) {
                        throw err;
                    }
                    return { _revisions: [] };
                });
            }

            return defaultToEmpty(local.get("1", {
                revs: true,
                conflicts: true
            })).then((localDoc) => {
                return defaultToEmpty(remote.get("1", {
                    revs: true,
                    conflicts: true
                })).then((remoteDoc) => {
                    const revsEqual = JSON.stringify(localDoc._revisions) ===
                        JSON.stringify(remoteDoc._revisions);
                    const conflictsEqual = JSON.stringify(localDoc._conflicts || []) ===
                        JSON.stringify(remoteDoc._conflicts || []);
                    if (!revsEqual || !conflictsEqual) {
                        // we can get caught in an infinite loop here when using adapters based
                        // on microtasks, e.g. memdown, so use setTimeout() to get a macrotask
                        return new Promise((resolve) => {
                            setTimeout(resolve, 0);
                        }).then(waitForUptodate);
                    }
                });
            });
        }

        function cleanup() {
            return new Promise((resolve, reject) => {
                let numDone = 0;

                function checkDone() {
                    if (++numDone === 2) {
                        resolve();
                    }
                }
                repl1.on("complete", checkDone);
                repl2.on("complete", checkDone);
                repl1.on("error", reject);
                repl2.on("error", reject);
                repl1.cancel();
                repl2.cancel();
                repl1 = null;
                repl2 = null;
            });
        }

        return local.put({ _id: "1" }).then(() => {
            return waitForUptodate();
        }).then(() => {
            repl1.cancel();
            repl2.cancel();
            return waitForUptodate();
        }).then(() => {
            return local.get("1").then((doc) => {
                doc.foo = Math.random();
                return local.put(doc);
            });
        }).then(() => {
            return remote.get("1").then((doc) => {
                doc.foo = Math.random();
                return remote.put(doc);
            });
        }).then(() => {
            repl1 = local.replicate.to(remote, { live: true });
            repl2 = local.replicate.from(remote, { live: true });
            return waitForUptodate();
        }).then(() => {
            return local.get("1", { conflicts: true }).then((doc) => {
                return local.remove(doc._id, doc._conflicts[0]);
            });
        }).then(() => {
            return waitForConflictsResolved();
        }).then(() => {
            return local.get("1", { conflicts: true, revs: true });
        }).then((localDoc) => {
            return remote.get("1", {
                conflicts: true,
                revs: true
            }).then((remoteDoc) => {
                assert.deepEqual(remoteDoc, localDoc);
            });
        }).then(() => {
            return cleanup();
        }, (err) => {
            return cleanup().then(() => {
                throw err;
            });
        });
    });
});
