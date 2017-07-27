require("./node.setup");

let adapters = [
    ["local", "http"],
    ["http", "http"],
    ["http", "local"],
    ["local", "local"]
];

if ("saucelabs" in testUtils.params()) {
    adapters = [["local", "http"], ["http", "local"]];
}

adapters.forEach((adapters) => {
    const suiteName = `test.retry.js-${adapters[0]}-${adapters[1]}`;
    describe.skip(suiteName, () => {

        const dbs = {};

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl(adapters[0], "testdb");
            dbs.remote = testUtils.adapterUrl(adapters[1], "test_repl_remote");
            testUtils.cleanup([dbs.name, dbs.remote], done);
        });

        after((done) => {
            testUtils.cleanup([dbs.name, dbs.remote], done);
        });

        it("retry stuff", (done) => {
            const remote = new PouchDB(dbs.remote);
            const Promise = testUtils.Promise;
            const allDocs = remote.allDocs;

            // Reject attempting to write 'foo' 3 times, then let it succeed
            let i = 0;
            remote.allDocs = function (opts) {
                if (opts.keys[0] === "foo") {
                    if (++i !== 3) {
                        return Promise.reject(new Error("flunking you"));
                    }
                }
                return allDocs.apply(remote, arguments);
            };

            const db = new PouchDB(dbs.name);
            const rep = db.replicate.from(remote, {
                live: true,
                retry: true,
                back_off_function() {
                    return 0;
                }
            });

            let paused = 0;
            rep.on("paused", (e) => {
                ++paused;
                // The first paused event is the replication up to date
                // and waiting on changes (no error)
                if (paused === 1) {
                    assert.isNull(e);
                    return remote.put({ _id: "foo" }).then(() => {
                        return remote.put({ _id: "bar" });
                    });
                }
                // Second paused event is due to failed writes, should
                // have an error
                if (paused === 2) {
                    assert.exists(e);
                }
            });

            let active = 0;
            rep.on("active", () => {
                ++active;
            });

            rep.on("complete", () => {
                assert.isAtLeast(active, 2);
                assert.isAtLeast(paused, 2);
                done();
            });

            rep.catch(done);

            let numChanges = 0;
            rep.on("change", (c) => {
                numChanges += c.docs_written;
                if (numChanges === 3) {
                    rep.cancel();
                }
            });

            remote.put({ _id: "hazaa" });
        });

        it("#3687 active event only fired once...", (done) => {

            const remote = new PouchDB(dbs.remote);
            const db = new PouchDB(dbs.name);
            const rep = db.replicate.from(remote, {
                live: true,
                retry: true,
                back_off_function() {
                    return 0;
                }
            });

            let paused = 0;
            let error;
            rep.on("paused", (e) => {
                ++paused;
                // The first paused event is the replication up to date
                // and waiting on changes (no error)
                try {
                    should.not.exist(e);
                } catch (err) {
                    error = err;
                    rep.cancel();
                }
                if (paused === 1) {
                    return remote.put({ _id: "foo" });
                }
                rep.cancel();

            });

            let active = 0;
            rep.on("active", () => {
                ++active;
            });

            let numChanges = 0;
            rep.on("change", () => {
                ++numChanges;
            });

            rep.on("complete", () => {
                try {
                    adone.log(active);
                    active.should.be.within(1, 2);
                    assert.equal(paused, 2);
                    assert.equal(numChanges, 2);
                    done(error);
                } catch (err) {
                    done(err);
                }
            });

            rep.catch(done);

            remote.put({ _id: "hazaa" });
        });

        it('source doesn\'t leak "destroyed" event', () => {

            const db = new PouchDB(dbs.name);
            const remote = new PouchDB(dbs.remote);
            const Promise = testUtils.Promise;

            const origGet = remote.get;
            let i = 0;
            remote.get = function () {
                // Reject three times, every 5th time
                if ((++i % 5 === 0) && i <= 15) {
                    return Promise.reject(new Error("flunking you"));
                }
                return origGet.apply(remote, arguments);
            };

            const rep = db.replicate.from(remote, {
                live: true,
                retry: true,
                back_off_function() {
                    return 0;
                }
            });

            const numDocsToWrite = 10;

            return remote.post({}).then(() => {
                let originalNumListeners;
                let posted = 0;

                return new Promise((resolve, reject) => {

                    let error;
                    function cleanup(err) {
                        if (err) {
                            error = err;
                        }
                        rep.cancel();
                    }
                    function finish() {
                        if (error) {
                            return reject(error);
                        }
                        resolve();
                    }

                    rep.on("complete", finish).on("error", cleanup);
                    rep.on("change", () => {
                        if (++posted < numDocsToWrite) {
                            remote.post({}).catch(cleanup);
                        } else {
                            db.info().then((info) => {
                                if (info.doc_count === numDocsToWrite) {
                                    cleanup();
                                }
                            }).catch(cleanup);
                        }

                        try {
                            const numListeners = db.listeners("destroyed").length;
                            if (!is.number(originalNumListeners)) {
                                originalNumListeners = numListeners;
                            } else {
                                numListeners.should.equal(originalNumListeners,
                                    "numListeners should never increase");
                            }
                        } catch (err) {
                            cleanup(err);
                        }
                    });
                });
            });
        });

        it('target doesn\'t leak "destroyed" event', () => {

            const db = new PouchDB(dbs.name);
            const remote = new PouchDB(dbs.remote);
            const Promise = testUtils.Promise;

            const origGet = remote.get;
            let i = 0;
            remote.get = function () {
                // Reject three times, every 5th time
                if ((++i % 5 === 0) && i <= 15) {
                    return Promise.reject(new Error("flunking you"));
                }
                return origGet.apply(remote, arguments);
            };

            const rep = db.replicate.from(remote, {
                live: true,
                retry: true,
                back_off_function() {
                    return 0;
                }
            });

            const numDocsToWrite = 10;

            return remote.post({}).then(() => {
                let originalNumListeners;
                let posted = 0;

                return new Promise((resolve, reject) => {

                    let error;
                    function cleanup(err) {
                        if (err) {
                            error = err;
                        }
                        rep.cancel();
                    }
                    function finish() {
                        if (error) {
                            return reject(error);
                        }
                        resolve();
                    }

                    rep.on("complete", finish).on("error", cleanup);
                    rep.on("change", () => {
                        if (++posted < numDocsToWrite) {
                            remote.post({}).catch(cleanup);
                        } else {
                            db.info().then((info) => {
                                if (info.doc_count === numDocsToWrite) {
                                    cleanup();
                                }
                            }).catch(cleanup);
                        }

                        try {
                            const numListeners = remote.listeners("destroyed").length;
                            if (!is.number(originalNumListeners)) {
                                originalNumListeners = numListeners;
                            } else {
                                // special case for "destroy" - because there are
                                // two Changes() objects for local databases,
                                // there can briefly be one extra listener or one
                                // fewer listener. The point of this test is to ensure
                                // that the listeners don't grow out of control.
                                numListeners.should.be.within(
                                    originalNumListeners - 1,
                                    originalNumListeners + 1,
                                    "numListeners should never increase by +1/-1");
                            }
                        } catch (err) {
                            cleanup(err);
                        }
                    });
                });
            });
        });

        [
            "complete", "error", "paused", "active",
            "change", "cancel"
        ].forEach((event) => {
            it(`returnValue doesn't leak "${event}" event`, () => {

                const db = new PouchDB(dbs.name);
                const remote = new PouchDB(dbs.remote);
                const Promise = testUtils.Promise;

                const origGet = remote.get;
                let i = 0;
                remote.get = function () {
                    // Reject three times, every 5th time
                    if ((++i % 5 === 0) && i <= 15) {
                        return Promise.reject(new Error("flunking you"));
                    }
                    return origGet.apply(remote, arguments);
                };

                const rep = db.replicate.from(remote, {
                    live: true,
                    retry: true,
                    back_off_function() {
                        return 0;
                    }
                });

                const numDocsToWrite = 10;

                return remote.post({}).then(() => {
                    let originalNumListeners;
                    let posted = 0;

                    return new Promise((resolve, reject) => {

                        let error;
                        function cleanup(err) {
                            if (err) {
                                error = err;
                            }
                            rep.cancel();
                        }
                        function finish() {
                            if (error) {
                                return reject(error);
                            }
                            resolve();
                        }

                        rep.on("complete", finish).on("error", cleanup);
                        rep.on("change", () => {
                            if (++posted < numDocsToWrite) {
                                remote.post({}).catch(cleanup);
                            } else {
                                db.info().then((info) => {
                                    if (info.doc_count === numDocsToWrite) {
                                        cleanup();
                                    }
                                }).catch(cleanup);
                            }

                            try {
                                const numListeners = rep.listeners(event).length;
                                if (!is.number(originalNumListeners)) {
                                    originalNumListeners = numListeners;
                                } else {
                                    if (event === "paused") {
                                        Math.abs(numListeners - originalNumListeners).should.be.at.most(1);
                                    } else {
                                        Math.abs(numListeners - originalNumListeners).should.be.eql(0);
                                    }
                                }
                            } catch (err) {
                                cleanup(err);
                            }
                        });
                    });
                });
            });
        });

        it('returnValue doesn\'t leak "change" event w/ onChange', () => {

            const db = new PouchDB(dbs.name);
            const remote = new PouchDB(dbs.remote);
            const Promise = testUtils.Promise;

            const origGet = remote.get;
            let i = 0;
            remote.get = function () {
                // Reject three times, every 5th time
                if ((++i % 5 === 0) && i <= 15) {
                    return Promise.reject(new Error("flunking you"));
                }
                return origGet.apply(remote, arguments);
            };

            const rep = db.replicate.from(remote, {
                live: true,
                retry: true,
                back_off_function() {
                    return 0;
                }
            }).on("change", () => { });

            const numDocsToWrite = 10;

            return remote.post({}).then(() => {
                let originalNumListeners;
                let posted = 0;

                return new Promise((resolve, reject) => {

                    let error;
                    function cleanup(err) {
                        if (err) {
                            error = err;
                        }
                        rep.cancel();
                    }
                    function finish() {
                        if (error) {
                            return reject(error);
                        }
                        resolve();
                    }

                    rep.on("complete", finish).on("error", cleanup);
                    rep.on("change", () => {
                        if (++posted < numDocsToWrite) {
                            remote.post({}).catch(cleanup);
                        } else {
                            db.info().then((info) => {
                                if (info.doc_count === numDocsToWrite) {
                                    cleanup();
                                }
                            }).catch(cleanup);
                        }

                        try {
                            const numListeners = rep.listeners("change").length;
                            if (!is.number(originalNumListeners)) {
                                originalNumListeners = numListeners;
                            } else {
                                numListeners.should.equal(originalNumListeners,
                                    "numListeners should never increase");
                            }
                        } catch (err) {
                            cleanup(err);
                        }
                    });
                });
            });
        });

        it("retry many times, no leaks on any events", function () {
            this.timeout(200000);
            const db = new PouchDB(dbs.name);
            const remote = new PouchDB(dbs.remote);
            const Promise = testUtils.Promise;

            let flunked = 0;
            const origGet = remote.get;
            let i = 0;
            remote.get = function () {
                // Reject five times, every 5th time
                if ((++i % 5 === 0) && i <= 25) {
                    flunked++;
                    return Promise.reject(new Error("flunking you"));
                }
                return origGet.apply(remote, arguments);
            };

            const rep = db.replicate.from(remote, {
                live: true,
                retry: true,
                back_off_function() {
                    return 0;
                }
            });

            let active = 0;
            let paused = 0;
            const numDocsToWrite = 50;

            return remote.post({}).then(() => {
                let originalNumListeners;
                let posted = 0;

                return new Promise((resolve, reject) => {

                    let error;
                    function cleanup(err) {
                        if (err) {
                            error = err;
                        }
                        rep.cancel();
                    }
                    function finish() {
                        if (error) {
                            return reject(error);
                        }
                        resolve();
                    }
                    function getTotalListeners() {
                        const events = ["complete", "error", "paused", "active",
                            "change", "cancel"];
                        return events.map((event) => {
                            return rep.listeners(event).length;
                        }).reduce((a, b) => {
                            return a + b;
                        }, 0);
                    }

                    rep.on("complete", finish)
                        .on("error", cleanup)
                        .on("active", () => {
                            active++;
                        }).on("paused", () => {
                            paused++;
                        }).on("change", () => {
                            if (++posted < numDocsToWrite) {
                                remote.post({}).catch(cleanup);
                            } else {
                                db.info().then((info) => {
                                    if (info.doc_count === numDocsToWrite) {
                                        cleanup();
                                    }
                                }).catch(cleanup);
                            }

                            try {
                                const numListeners = getTotalListeners();
                                if (!is.number(originalNumListeners)) {
                                    originalNumListeners = numListeners;
                                } else {
                                    Math.abs(numListeners - originalNumListeners).should.be.at.most(1);
                                }
                            } catch (err) {
                                cleanup(err);
                            }
                        });
                });
            }).then(() => {
                flunked.should.equal(5);
                active.should.be.at.least(5);
                paused.should.be.at.least(5);
            });
        });


        it("4049 retry while starting offline", (done) => {

            const db = new PouchDB(dbs.name);
            const remote = new PouchDB(dbs.remote);

            const ajax = remote._ajax;
            let _called = 0;
            let startFailing = false;

            remote._ajax = function (opts, cb) {
                if (!startFailing || ++_called > 3) {
                    ajax.apply(this, arguments);
                } else {
                    cb(new Error("flunking you"));
                }
            };

            remote.post({ a: "doc" }).then(() => {
                startFailing = true;
                var rep = db.replicate.from(remote, { live: true, retry: true })
                    .on("change", () => {
                        rep.cancel();
                    });

                rep.on("complete", () => {
                    remote._ajax = ajax;
                    done();
                });
            });

        });

        it("#5157 replicate many docs with live+retry", () => {
            const Promise = testUtils.Promise;
            const numDocs = 512; // uneven number
            const docs = [];
            for (let i = 0; i < numDocs; i++) {
                // mix of generation-1 and generation-2 docs
                if (i % 2 === 0) {
                    docs.push({
                        _id: testUtils.uuid(),
                        _rev: "1-x",
                        _revisions: { start: 1, ids: ["x"] }
                    });
                } else {
                    docs.push({
                        _id: testUtils.uuid(),
                        _rev: "2-x",
                        _revisions: { start: 2, ids: ["x", "y"] }
                    });
                }
            }
            const db = new PouchDB(dbs.name);
            const remote = new PouchDB(dbs.remote);
            return db.bulkDocs({
                docs,
                new_edits: false
            }).then(() => {
                function replicatePromise(fromDB, toDB) {
                    return new Promise((resolve, reject) => {
                        var replication = fromDB.replicate.to(toDB, {
                            live: true,
                            retry: true,
                            batches_limit: 10,
                            batch_size: 20
                        }).on("paused", (err) => {
                            if (!err) {
                                replication.cancel();
                            }
                        }).on("complete", resolve)
                            .on("error", reject);
                    });
                }
                return Promise.all([
                    replicatePromise(db, remote),
                    replicatePromise(remote, db)
                ]);
            }).then(() => {
                return remote.info();
            }).then((info) => {
                info.doc_count.should.equal(numDocs);
            });
        });

        it("6510 no changes live+retry does not call backoff function", () => {
            const Promise = testUtils.Promise;
            const db = new PouchDB(dbs.name);
            const remote = new PouchDB(dbs.remote);
            let called = false;
            let replication;

            function replicatePromise(fromDB, toDB) {
                return new Promise((resolve, reject) => {
                    replication = fromDB.replicate.to(toDB, {
                        live: true,
                        retry: true,
                        heartbeat: 5,
                        back_off_function() {
                            called = true;
                            replication.cancel();
                        }
                    }).on("complete", resolve).on("error", reject);
                });
            }

            setTimeout(() => {
                if (replication) {
                    replication.cancel();
                }
            }, 2000);

            return replicatePromise(remote, db)
                .then(() => {
                    called.should.equal(false);
                });
        });
    });
});
