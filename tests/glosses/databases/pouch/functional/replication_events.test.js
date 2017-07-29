require("./node.setup");

describe("db", "pouch", "suite2 replication_events", () => {
    const dbs = {};

    beforeEach((done) => {
        dbs.name = testUtils.adapterUrl("local", "testdb");
        dbs.remote = testUtils.adapterUrl("local", "test_repl_remote");
        testUtils.cleanup([dbs.name, dbs.remote], done);
    });

    after((done) => {
        testUtils.cleanup([dbs.name, dbs.remote], done);
    });


    it("#3852 Test basic starting empty", (done) => {

        const db = new PouchDB(dbs.name);
        const repl = db.replicate.to(dbs.remote, { retry: true, live: true });
        let counter = 0;

        repl.on("complete", () => {
            done();
        });

        repl.on("active", () => {
            counter++;
            if (!(counter === 2 || counter === 4)) {
                done("active fired incorrectly");
            }
        });

        repl.on("paused", () => {
            counter++;
            // We should receive a paused event when replication
            // starts because there is nothing to replicate
            if (counter === 1) {
                db.bulkDocs([{ _id: "a" }, { _id: "b" }]);
            } else if (counter === 3) {
                db.bulkDocs([{ _id: "c" }, { _id: "d" }]);
            } else if (counter === 5) {
                repl.cancel();
            } else {
                done("paused fired incorrectly");
            }
        });
    });


    it("#3852 Test basic starting with docs", (done) => {

        const db = new PouchDB(dbs.name);

        db.bulkDocs([{ _id: "a" }, { _id: "b" }]).then(() => {

            const repl = db.replicate.to(dbs.remote, { retry: true, live: true });

            let counter = 0;

            repl.on("complete", () => {
                done();
            });

            repl.on("active", () => {
                counter++;
                if (!(counter === 1 || counter === 3 || counter === 5)) {
                    done(`active fired incorrectly:${counter}`);
                }
            });

            repl.on("paused", () => {
                counter++;
                // We should receive a paused event when replication
                // starts because there is nothing to replicate
                if (counter === 2) {
                    db.bulkDocs([{ _id: "c" }, { _id: "d" }]);
                } else if (counter === 4) {
                    db.bulkDocs([{ _id: "e" }, { _id: "f" }]);
                } else if (counter === 6) {
                    repl.cancel();
                } else {
                    done("paused fired incorrectly");
                }
            });
        });
    });

    // this test sets up a 2 way replication which initially transfers
    // documents from a remote to a local database.
    // At the same time, we insert documents locally - the changes
    // should propagate to the remote database and then back to the
    // local database via the live replications.
    // Previously, this test resulted in 'change' events being
    // generated for already-replicated documents. When PouchDB is working
    // as expected, each remote document should be passed to a
    // change event exactly once (though a change might contain multiple docs)
    it("#4627 Test no duplicate changes in live replication", (done) => {
        const db = new PouchDB(dbs.name);
        const remote = new PouchDB(dbs.remote);
        let docId = -1;
        const docsToGenerate = 10;
        let lastChange = -1;
        let firstReplication;
        let secondReplication;
        let completeCalls = 0;

        function generateDocs(n) {
            return Array.apply(null, new Array(n)).map(() => {
                docId += 1;
                return {
                    _id: docId.toString(),
                    foo: Math.random().toString()
                };
            });
        }

        function complete() {
            completeCalls++;
            if (completeCalls === 2) {
                done();
            }
        }

        remote.bulkDocs(generateDocs(docsToGenerate)).then(() => {
            firstReplication = db.replicate.to(remote, {
                live: true,
                retry: true,
                since: 0
            })
                .on("error", done)
                .on("complete", complete);

            secondReplication = remote.replicate.to(db, {
                live: true,
                retry: true,
                since: 0
            })
                .on("error", done)
                .on("complete", complete)
                .on("change", (feed) => {
                    // attempt to detect changes loop
                    const ids = feed.docs.map((d) => {
                        return parseInt(d._id, 10);
                    }).sort();

                    const firstChange = ids[0];
                    if (firstChange <= lastChange) {
                        done(new Error("Duplicate change events detected"));
                    }

                    lastChange = ids[ids.length - 1];

                    if (lastChange === docsToGenerate - 1) {
                        // if a change loop doesn't occur within 2 seconds, assume success
                        setTimeout(() => {
                            // success!
                            // cancelling the replications to clean up and trigger
                            // the 'complete' event, which in turn ends the test
                            firstReplication.cancel();
                            secondReplication.cancel();
                        }, 2000);
                    }

                    // write doc to local db - should round trip in _changes
                    // but not generate a change event
                    db.bulkDocs(generateDocs(1));
                });
        }).catch(done);
    });

    describe("#5172 triggering error when replicating", () => {
        let securedDbs = [], source, dest, previousAjax;
        beforeEach(() => {
            const err = {
                status: 401,
                name: "unauthorized",
                message: "You are not authorized to access this db."
            };

            source = new PouchDB(dbs.name);
            dest = new PouchDB(dbs.remote);
        });

        afterEach(() => {
            securedDbs.forEach((db) => {
                db._ajax = previousAjax;
            });
        });

        function attachHandlers(replication) {
            const invokedHandlers = [];
            ["change", "complete", "paused", "active", "denied", "error"].forEach((type) => {
                replication.on(type, () => {
                    invokedHandlers.push(type);
                });
            });
            return invokedHandlers;
        }
    });
});
