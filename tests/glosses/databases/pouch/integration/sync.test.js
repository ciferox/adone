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
    describe(`test.sync.js-${adapters[0]}-${adapters[1]}`, () => {

        const dbs = {};

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl(adapters[0], "testdb");
            dbs.remote = testUtils.adapterUrl(adapters[1], "test_repl_remote");
            testUtils.cleanup([dbs.name, dbs.remote], done);
        });

        after((done) => {
            testUtils.cleanup([dbs.name, dbs.remote], done);
        });

        it("PouchDB.sync event", (done) => {
            const doc1 = {
                _id: "adoc",
                foo: "bar"
            };
            const doc2 = {
                _id: "anotherdoc",
                foo: "baz"
            };
            const db = new PouchDB(dbs.name);
            const remote = new PouchDB(dbs.remote);
            db.put(doc1, () => {
                remote.put(doc2, () => {
                    PouchDB.sync(db, remote).on("complete", (result) => {
                        assert.equal(result.pull.ok, true);
                        assert.equal(result.pull.docs_read, 1);
                        assert.equal(result.pull.docs_written, 1);
                        assert.lengthOf(result.pull.errors, 0);
                        done();
                    });
                });
            });
        });

        it("sync throws errors in promise", () => {
            const doc1 = {
                _id: "adoc",
                foo: "bar"
            };
            const doc2 = {
                _id: "anotherdoc",
                foo: "baz"
            };
            const db = new PouchDB(dbs.name);
            const remote = new PouchDB(dbs.remote);

            // intentionally throw an error during replication
            remote.allDocs = function () {
                return testUtils.Promise.reject(new Error("flunking you"));
            };

            return db.put(doc1).then(() => {
                return remote.put(doc2);
            }).then(() => {
                return db.sync(remote);
            }).then(() => {
                throw new Error("expected an error");
            }, (err) => {
                assert.exists(err);
                assert.instanceOf(err, Error);
            });
        });

        it("sync throws errors in promise catch()", () => {
            const doc1 = {
                _id: "adoc",
                foo: "bar"
            };
            const doc2 = {
                _id: "anotherdoc",
                foo: "baz"
            };
            const db = new PouchDB(dbs.name);
            const remote = new PouchDB(dbs.remote);

            // intentionally throw an error during replication
            remote.allDocs = function () {
                return testUtils.Promise.reject(new Error("flunking you"));
            };

            let landedInCatch = false;
            return db.put(doc1).then(() => {
                return remote.put(doc2);
            }).then(() => {
                return db.sync(remote).catch((err) => {
                    landedInCatch = true;
                    assert.exists(err);
                    assert.instanceOf(err, Error);
                });
            }).then(() => {
                if (!landedInCatch) {
                    throw new Error("expected catch(), not then()");
                }
            });
        });

        it("sync throws errors in error listener", () => {
            const doc1 = {
                _id: "adoc",
                foo: "bar"
            };
            const doc2 = {
                _id: "anotherdoc",
                foo: "baz"
            };
            const db = new PouchDB(dbs.name);
            const remote = new PouchDB(dbs.remote);

            // intentionally throw an error during replication
            remote.allDocs = function () {
                return testUtils.Promise.reject(new Error("flunking you"));
            };

            return db.put(doc1).then(() => {
                return remote.put(doc2);
            }).then(() => {
                return new testUtils.Promise((resolve) => {
                    db.sync(remote).on("error", resolve);
                });
            }).then((err) => {
                assert.exists(err);
                assert.instanceOf(err, Error);
            });
        });

        it("sync throws errors in callback", () => {
            const doc1 = {
                _id: "adoc",
                foo: "bar"
            };
            const doc2 = {
                _id: "anotherdoc",
                foo: "baz"
            };
            const db = new PouchDB(dbs.name);
            const remote = new PouchDB(dbs.remote);

            // intentionally throw an error during replication
            remote.allDocs = function () {
                return testUtils.Promise.reject(new Error("flunking you"));
            };

            return db.put(doc1).then(() => {
                return remote.put(doc2);
            }).then(() => {
                return new testUtils.Promise((resolve) => {
                    db.sync(remote, (err) => {
                        resolve(err);
                    }).catch(() => {
                        // avoid annoying chrome warning about uncaught (in promise)
                    });
                });
            }).then((err) => {
                assert.exists(err);
                assert.instanceOf(err, Error);
            });
        });

        it("sync returns result in callback", () => {
            const doc1 = {
                _id: "adoc",
                foo: "bar"
            };
            const doc2 = {
                _id: "anotherdoc",
                foo: "baz"
            };
            const db = new PouchDB(dbs.name);
            const remote = new PouchDB(dbs.remote);

            return db.put(doc1).then(() => {
                return remote.put(doc2);
            }).then(() => {
                return new testUtils.Promise((resolve, reject) => {
                    db.sync(remote, (err, res) => {
                        if (err) {
                            return reject(err);
                        }
                        resolve(res);
                    });
                });
            }).then((res) => {
                assert.exists(res);
            });
        });

        it("PouchDB.sync callback", (done) => {
            const doc1 = {
                _id: "adoc",
                foo: "bar"
            };
            const doc2 = {
                _id: "anotherdoc",
                foo: "baz"
            };
            const db = new PouchDB(dbs.name);
            const remote = new PouchDB(dbs.remote);
            db.put(doc1, () => {
                remote.put(doc2, () => {
                    PouchDB.sync(db, remote, (err, result) => {
                        assert.equal(result.pull.ok, true);
                        assert.equal(result.pull.docs_read, 1);
                        assert.equal(result.pull.docs_written, 1);
                        assert.lengthOf(result.pull.errors, 0);
                        done();
                    });
                });
            });
        });

        it("PouchDB.sync promise", (done) => {
            const doc1 = {
                _id: "adoc",
                foo: "bar"
            };
            const doc2 = {
                _id: "anotherdoc",
                foo: "baz"
            };
            const db = new PouchDB(dbs.name);
            const remote = new PouchDB(dbs.remote);
            db.put(doc1).then(() => {
                return remote.put(doc2);
            }).then(() => {
                return PouchDB.sync(db, remote);
            }).then((result) => {
                assert.equal(result.pull.ok, true);
                assert.equal(result.pull.docs_read, 1);
                assert.equal(result.pull.docs_written, 1);
                assert.lengthOf(result.pull.errors, 0);
                done();
            }, done);
        });

        it("db.sync event", (done) => {
            const doc1 = {
                _id: "adoc",
                foo: "bar"
            };
            const doc2 = {
                _id: "anotherdoc",
                foo: "baz"
            };
            const db = new PouchDB(dbs.name);
            const remote = new PouchDB(dbs.remote);
            db.put(doc1, () => {
                remote.put(doc2, () => {
                    db.sync(remote).on("complete", (result) => {
                        assert.equal(result.pull.ok, true);
                        assert.equal(result.pull.docs_read, 1);
                        assert.equal(result.pull.docs_written, 1);
                        assert.lengthOf(result.pull.errors, 0);
                        done();
                    });
                });
            });
        });

        it("db.sync callback", (done) => {
            const doc1 = {
                _id: "adoc",
                foo: "bar"
            };
            const doc2 = {
                _id: "anotherdoc",
                foo: "baz"
            };
            const db = new PouchDB(dbs.name);
            const remote = new PouchDB(dbs.remote);
            db.put(doc1, () => {
                remote.put(doc2, () => {
                    db.sync(remote, (err, result) => {
                        assert.equal(result.pull.ok, true);
                        assert.equal(result.pull.docs_read, 1);
                        assert.equal(result.pull.docs_written, 1);
                        assert.lengthOf(result.pull.errors, 0);
                        done();
                    });
                });
            });
        });

        it("db.sync promise", (done) => {
            const doc1 = {
                _id: "adoc",
                foo: "bar"
            };
            const doc2 = {
                _id: "anotherdoc",
                foo: "baz"
            };
            const db = new PouchDB(dbs.name);
            const remote = new PouchDB(dbs.remote);
            db.put(doc1).then(() => {
                return remote.put(doc2);
            }).then(() => {
                return db.sync(remote);
            }).then((result) => {
                assert.equal(result.pull.ok, true);
                assert.equal(result.pull.docs_read, 1);
                assert.equal(result.pull.docs_written, 1);
                assert.lengthOf(result.pull.errors, 0);
                done();
            }, done);
        });

        it.skip("Test sync cancel", (done) => {
            const db = new PouchDB(dbs.name);
            const remote = new PouchDB(dbs.remote);
            const replications = db.sync(remote).on("complete", () => {
                done();
            });
            assert.exists(replications);
            replications.cancel();
        });

        it.skip("Test sync cancel called twice", (done) => {
            const db = new PouchDB(dbs.name);
            const remote = new PouchDB(dbs.remote);
            const replications = db.sync(remote).on("complete", () => {
                setTimeout(done); // let cancel() get called twice before finishing
            });
            assert.exists(replications);
            replications.cancel();
            replications.cancel();
        });

        it("Test syncing two endpoints (issue 838)", () => {
            const doc1 = {
                _id: "adoc",
                foo: "bar"
            };
            const doc2 = {
                _id: "anotherdoc",
                foo: "baz"
            };
            const db = new PouchDB(dbs.name);
            const remote = new PouchDB(dbs.remote);
            return db.put(doc1).then(() => {
                return remote.put(doc2);
            }).then(() => {
                return new testUtils.Promise((resolve, reject) => {
                    db.sync(remote).on("complete", resolve).on("error", reject);
                });
            }).then(() => {
                // Replication isn't finished until onComplete has been called twice
                return db.allDocs().then((res1) => {
                    return remote.allDocs().then((res2) => {
                        assert.equal(res1.total_rows, res2.total_rows);
                    });
                });
            });
        });

        it.skip("3894 re-sync after immediate cancel", () => {

            let db = new PouchDB(dbs.name);
            let remote = new PouchDB(dbs.remote);

            db.setMaxListeners(100);
            remote.setMaxListeners(100);

            let promise = testUtils.Promise.resolve();

            function syncThenCancel() {
                promise = promise.then(() => {
                    return new testUtils.Promise((resolve, reject) => {
                        db = new PouchDB(dbs.name);
                        remote = new PouchDB(dbs.remote);
                        const sync = db.sync(remote)
                            .on("error", reject)
                            .on("complete", resolve);
                        sync.cancel();
                    }).then(() => {
                        return testUtils.Promise.all([
                            db.destroy(),
                            remote.destroy()
                        ]);
                    });
                });
            }

            for (let i = 0; i < 5; i++) {
                syncThenCancel();
            }

            return promise;
        });

        it("Syncing should stop if one replication fails (issue 838)",
            (done) => {
                const doc1 = { _id: "adoc", foo: "bar" };
                const doc2 = { _id: "anotherdoc", foo: "baz" };
                const db = new PouchDB(dbs.name);
                const remote = new PouchDB(dbs.remote);
                const replications = db.sync(remote, { live: true });

                replications.on("complete", () => {
                    remote.put(doc2, () => {
                        assert.equal(changes, 1);
                        done();
                    });
                });

                var changes = 0;
                replications.on("change", () => {
                    changes++;
                    if (changes === 1) {
                        replications.pull.cancel();
                    }
                });
                db.put(doc1);
            });

        it("Push and pull changes both fire (issue 2555)", (done) => {
            const db = new PouchDB(dbs.name);
            const remote = new PouchDB(dbs.remote);
            let correct = false;
            db.post({}).then(() => {
                return remote.post({});
            }).then(() => {
                let numChanges = 0;
                let lastChange;
                const sync = db.sync(remote);
                sync.on("change", (change) => {
                    assert.include(["push", "pull"], change.direction);
                    assert.equal(change.change.docs_read, 1);
                    assert.equal(change.change.docs_written, 1);
                    if (!lastChange) {
                        lastChange = change.direction;
                    } else {
                        assert.notEqual(lastChange, change.direction);
                    }
                    if (++numChanges === 2) {
                        correct = true;
                        sync.cancel();
                    }
                }).on("complete", () => {
                    assert.equal(correct, true, "things happened right");
                    done();
                });
            });
        });

        it("Change event should be called exactly once per listener (issue 5479)", (done) => {
            const db = new PouchDB(dbs.name);
            const remote = new PouchDB(dbs.remote);
            db.post({}).then(() => {
                let counter = 0;
                const sync = db.sync(remote);
                const increaseCounter = function () {
                    counter++;
                };
                sync.on("change", increaseCounter)
                    .on("change", increaseCounter)
                    .on("complete", () => {
                        assert.equal(counter, 2);
                        done();
                    });
            });
        });

        it("Remove an event listener", (done) => {
            const db = new PouchDB(dbs.name);
            const remote = new PouchDB(dbs.remote);

            db.bulkDocs([{}, {}, {}]).then(() => {
                return remote.bulkDocs([{}, {}, {}]);
            }).then(() => {

                function changesCallback() {
                    changeCalled = true;
                }

                const sync = db.replicate.to(remote);
                var changeCalled = false;
                sync.on("change", changesCallback);
                sync.removeListener("change", changesCallback);
                sync.on("error", () => { });
                sync.on("complete", () => {
                    setTimeout(() => {
                        assert.lengthOf(Object.keys(sync._events), 0);
                        assert.equal(changeCalled, false);
                        done();
                    });
                });
            });
        });

        it("Remove an invalid event listener", (done) => {
            const db = new PouchDB(dbs.name);
            const remote = new PouchDB(dbs.remote);

            db.bulkDocs([{}, {}, {}]).then(() => {
                return remote.bulkDocs([{}, {}, {}]);
            }).then(() => {
                function otherCallback() { }
                function realCallback() {
                    changeCalled = true;
                }
                const sync = db.replicate.to(remote);
                var changeCalled = false;
                sync.on("change", realCallback);
                sync.removeListener("change", otherCallback);
                sync.on("error", () => { });
                sync.on("complete", () => {
                    setTimeout(() => {
                        assert.lengthOf(Object.keys(sync._events), 0);
                        assert.equal(changeCalled, true);
                        done();
                    });
                });
            });
        });

        it("Doesn't have a memory leak (push)", (done) => {
            const db = new PouchDB(dbs.name);
            const remote = new PouchDB(dbs.remote);

            db.bulkDocs([{}, {}, {}]).then(() => {
                return remote.bulkDocs([{}, {}, {}]);
            }).then(() => {
                const sync = db.replicate.to(remote);
                sync.on("change", () => { });
                sync.on("error", () => { });
                sync.on("complete", () => {
                    setTimeout(() => {
                        assert.lengthOf(Object.keys(sync._events), 0);
                        done();
                    });
                });
            });
        });

        it("Doesn't have a memory leak (pull)", (done) => {
            const db = new PouchDB(dbs.name);
            const remote = new PouchDB(dbs.remote);

            db.bulkDocs([{}, {}, {}]).then(() => {
                return remote.bulkDocs([{}, {}, {}]);
            }).then(() => {
                const sync = db.replicate.from(remote);
                sync.on("change", () => { });
                sync.on("error", () => { });
                sync.on("complete", () => {
                    setTimeout(() => {
                        assert.lengthOf(Object.keys(sync._events), 0);
                        done();
                    });
                });
            });
        });

        it("Doesn't have a memory leak (bi)", (done) => {
            const db = new PouchDB(dbs.name);
            const remote = new PouchDB(dbs.remote);

            db.bulkDocs([{}, {}, {}]).then(() => {
                return remote.bulkDocs([{}, {}, {}]);
            }).then(() => {
                const sync = db.sync(remote);
                sync.on("change", () => { });
                sync.on("error", () => { });
                sync.on("complete", () => {
                    setTimeout(() => {
                        assert.lengthOf(Object.keys(sync._events), 0);
                        done();
                    });
                });
            });
        });
        it("PouchDB.sync with strings for dbs", (done) => {
            const doc1 = {
                _id: "adoc",
                foo: "bar"
            };
            const doc2 = {
                _id: "anotherdoc",
                foo: "baz"
            };
            const db = new PouchDB(dbs.name);
            const remote = new PouchDB(dbs.remote);
            db.put(doc1).then(() => {
                return remote.put(doc2);
            }).then(() => {
                return PouchDB.sync(dbs.name, dbs.remote);
            }).then((result) => {
                assert.equal(result.pull.ok, true);
                assert.equal(result.pull.docs_read, 1);
                assert.equal(result.pull.docs_written, 1);
                assert.lengthOf(result.pull.errors, 0);
                done();
            }, done);
        });

        it('#3270 triggers "denied" events',
            (done) => {
                testUtils.isCouchDB((isCouchDB) => {
                    if (/*adapters[1] !== 'http' || */!isCouchDB) {
                        return done();
                    }
                    if (adapters[0] !== "local" || adapters[1] !== "http") {
                        return done();
                    }

                    const deniedErrors = [];
                    const ddoc = {
                        _id: "_design/validate",
                        validate_doc_update: function (newDoc) {
                            if (newDoc.foo) {
                                throw { unauthorized: "go away, no picture" };
                            }
                        }.toString()
                    };

                    const remote = new PouchDB(dbs.remote);
                    const db = new PouchDB(dbs.name);

                    return remote.put(ddoc).then(() => {
                        const docs = [
                            { _id: "foo1", foo: "string" },
                            { _id: "nofoo" },
                            { _id: "foo2", foo: "object" }
                        ];
                        return db.bulkDocs({ docs });
                    }).then(() => {
                        const sync = db.sync(dbs.remote);
                        sync.on("denied", (error) => {
                            deniedErrors.push(error);
                        });
                        return sync;
                    }).then(() => {
                        assert.equal(deniedErrors.length, 2);
                        assert.equal(deniedErrors[0].doc.name, "unauthorized");
                        assert.equal(deniedErrors[1].doc.name, "unauthorized");
                        assert.equal(deniedErrors[0].direction, "push");
                    }).then(done, done);
                });
            });

        it('#3270 triggers "denied" events, reverse direction',
            (done) => {
                testUtils.isCouchDB((isCouchDB) => {
                    if (/*adapters[1] !== 'http' || */!isCouchDB) {
                        return done();
                    }
                    if (adapters[0] !== "local" || adapters[1] !== "http") {
                        return done();
                    }

                    const deniedErrors = [];
                    const ddoc = {
                        _id: "_design/validate",
                        validate_doc_update: function (newDoc) {
                            if (newDoc.foo) {
                                throw { unauthorized: "go away, no picture" };
                            }
                        }.toString()
                    };

                    const remote = new PouchDB(dbs.remote);
                    const db = new PouchDB(dbs.name);

                    return remote.put(ddoc).then(() => {
                        const docs = [
                            { _id: "foo1", foo: "string" },
                            { _id: "nofoo" },
                            { _id: "foo2", foo: "object" }
                        ];
                        return db.bulkDocs({ docs });
                    }).then(() => {
                        const sync = remote.sync(db);
                        sync.on("denied", (error) => {
                            deniedErrors.push(error);
                        });
                        return sync;
                    }).then(() => {
                        assert.equal(deniedErrors.length, 2);
                        assert.equal(deniedErrors[0].doc.name, "unauthorized");
                        assert.equal(deniedErrors[1].doc.name, "unauthorized");
                        assert.equal(deniedErrors[0].direction, "pull");
                    }).then(done, done);
                });
            });

        it('#3270 triggers "change" events with .docs property', (done) => {
            let syncedDocs = [];
            const db = new PouchDB(dbs.name);
            const docs = [
                { _id: "1" },
                { _id: "2" },
                { _id: "3" }
            ];

            db.bulkDocs({ docs }, {}).then(() => {
                const sync = db.sync(dbs.remote);
                sync.on("change", (change) => {
                    syncedDocs = syncedDocs.concat(change.change.docs);
                });
                return sync;
            })
                .then(() => {
                    syncedDocs.sort((a, b) => {
                        return a._id > b._id ? 1 : -1;
                    });

                    assert.equal(syncedDocs.length, 3);
                    assert.equal(syncedDocs[0]._id, "1");
                    assert.equal(syncedDocs[1]._id, "2");
                    assert.equal(syncedDocs[2]._id, "3");
                    done();
                })
                .catch(done);
        });

        it("4791 Single filter", () => {

            const db = new PouchDB(dbs.name);
            const remote = new PouchDB(dbs.remote);

            const localDocs = [{ _id: "0" }, { _id: "1" }];
            const remoteDocs = [{ _id: "a" }, { _id: "b" }];

            return remote.bulkDocs(remoteDocs).then(() => {
                return db.bulkDocs(localDocs);
            }).then(() => {
                return db.sync(remote, {
                    filter(doc) {
                        return doc._id !== "0" && doc._id !== "a";
                    }
                });
            }).then(() => {
                return db.allDocs();
            }).then((docs) => {
                assert.equal(docs.total_rows, 3);
                return remote.allDocs();
            }).then((docs) => {
                assert.equal(docs.total_rows, 3);
            });
        });


        it("4791 Single filter, live/retry", () => {

            const db = new PouchDB(dbs.name);
            const remote = new PouchDB(dbs.remote);

            const localDocs = [{ _id: "0" }, { _id: "1" }];
            const remoteDocs = [{ _id: "a" }, { _id: "b" }];

            return remote.bulkDocs(remoteDocs).then(() => {
                return db.bulkDocs(localDocs);
            }).then(() => {
                return new testUtils.Promise((resolve, reject) => {
                    const filter = function (doc) {
                        return doc._id !== "0" && doc._id !== "a";
                    };
                    let changes = 0;
                    const onChange = function (c) {
                        changes += c.change.docs.length;
                        if (changes === 2) {
                            sync.cancel();
                        }
                    };
                    var sync = db.sync(remote, { filter, live: true, retry: true })
                        .on("error", reject)
                        .on("change", onChange)
                        .on("complete", resolve);
                });
            }).then(() => {
                return db.allDocs();
            }).then((docs) => {
                assert.equal(docs.total_rows, 3);
                return remote.allDocs();
            }).then((docs) => {
                assert.equal(docs.total_rows, 3);
            });
        });

        it("4289 Separate to / from filters", () => {

            const db = new PouchDB(dbs.name);
            const remote = new PouchDB(dbs.remote);

            const localDocs = [{ _id: "0" }, { _id: "1" }];
            const remoteDocs = [{ _id: "a" }, { _id: "b" }];

            return remote.bulkDocs(remoteDocs).then(() => {
                return db.bulkDocs(localDocs);
            }).then(() => {
                return db.sync(remote, {
                    push: {
                        filter(doc) {
                            return doc._id === "0";
                        }
                    },
                    pull: {
                        filter(doc) {
                            return doc._id === "a";
                        }
                    }
                });
            }).then(() => {
                return db.allDocs();
            }).then((docs) => {
                assert.equal(docs.total_rows, 3);
                return remote.allDocs();
            }).then((docs) => {
                assert.equal(docs.total_rows, 3);
            });
        });

        it("5007 sync 2 databases", (done) => {

            const db = new PouchDB(dbs.name);

            const remote1 = new PouchDB(dbs.remote);
            const remote2 = new PouchDB(`${dbs.remote}_2`);

            const sync1 = db.sync(remote1, { live: true });
            const sync2 = db.sync(remote2, { live: true });

            let numChanges = 0;
            function onChange() {
                if (++numChanges === 2) {
                    complete();
                }
            }

            var changes1 = remote1.changes({ live: true }).on("change", onChange);
            var changes2 = remote2.changes({ live: true }).on("change", onChange);

            db.post({ foo: 'bar' });

            var toCancel = [changes1, changes2, sync1, sync2];
            function complete() {
                if (!toCancel.length) {
                    return remote2.destroy().then(function () {
                        done();
                    });
                }
                var cancelling = toCancel.shift();
                cancelling.on('complete', complete);
                cancelling.cancel();
            }
        });

        it("5782 sync rev-1 conflicts", () => {
            const local = new PouchDB(dbs.name);
            const remote = new PouchDB(dbs.remote);

            function update(a, id) {
                return a.get(id).then((doc) => {
                    doc.updated = Date.now();
                    return a.put(doc);
                });
            }

            function remove(a, id) {
                return a.get(id).then((doc) => {
                    return a.remove(doc);
                });
            }

            function conflict(docTemplate) {
                return local.put(docTemplate).then(() => {
                    docTemplate.baz = "fubar";
                    return remote.put(docTemplate);
                });
            }

            const doc1 = {
                _id: `random-${Date.now()}`,
                foo: "bar"
            };

            const doc2 = {
                _id: `random2-${Date.now()}`,
                foo: "bar"
            };

            return conflict(doc2)
                .then(() => {
                    return local.replicate.to(remote);
                })
                .then(() => {
                    return update(local, doc2._id);
                })
                .then(() => {
                    return remove(local, doc2._id);
                })
                .then(() => {
                    return local.replicate.to(remote);
                })
                .then(() => {
                    return conflict(doc1);
                })
                .then(() => {
                    return update(remote, doc2._id);
                })
                .then(() => {
                    return local.replicate.to(remote);
                })
                .then(() => {
                    return remove(local, doc1._id);
                })
                .then(() => {
                    return local.sync(remote);
                })
                .then(() => {
                    return testUtils.Promise.all([
                        local.allDocs({ include_docs: true }),
                        remote.allDocs({ include_docs: true })
                    ]);
                }).then((res) => {
                    assert.deepEqual(res[0], res[1]);
                });
        });
    });
});
