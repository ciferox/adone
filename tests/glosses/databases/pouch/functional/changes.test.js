import * as util from "./utils";

describe("database", "pouch", "changes", () => {
    const dbs = {};

    // if it exists, return the single element
    // which has the specific id. Else retun null.
    // useful for finding elements within a _changes feed
    const findById = (array, id) => {
        const result = array.filter((i) => {
            return i.id === id;
        });

        //
        if (result.length === 1) {
            return result[0];
        }
    };

    const dbName = "testdb";
    const dbRemote = "test_repl_remote";
    let DB = null;

    beforeEach(async () => {
        DB = await util.setup();
        await util.cleanup(dbName, dbRemote);
    });

    after(async () => {
        await util.destroy();
    });

    it("All changes", (done) => {
        const db = new DB(dbName);
        db.post({ test: "somestuff" }).then(() => {
            const promise = db.changes({
            }).on("change", (change) => {
                assert.notProperty(change, "doc");
                assert.property(change, "seq");
                done();
            });
            assert.exists(promise);
            assert.isFunction(promise.cancel);
        });
    });

    it("Promise resolved when changes cancelled", (done) => {
        const docs = [
            { _id: "0", integer: 0 },
            { _id: "1", integer: 1 },
            { _id: "2", integer: 2 },
            { _id: "3", integer: 3 },
            { _id: "4", integer: 4 },
            { _id: "5", integer: 5 },
            { _id: "6", integer: 6 },
            { _id: "7", integer: 7 },
            { _id: "8", integer: 9 },
            { _id: "9", integer: 9 },
            { _id: "10", integer: 10 }
        ];
        const db = new DB(dbName);
        db.bulkDocs({ docs }).then(() => {
            let changeCount = 0;
            const promise = db.changes().on("change", function handler() {
                changeCount++;
                if (changeCount === 5) {
                    promise.cancel();
                    promise.removeListener("change", handler);
                }
            });
            assert.exists(promise);
            assert.exists(promise.then);
            assert.isFunction(promise.then);
            promise.then(
                (result) => {
                    assert.equal(changeCount, 5, "changeCount");
                    assert.exists(result);
                    assert.deepEqual(result, { status: "cancelled" });
                    done();
                }, (err) => {
                    assert.equal(changeCount, 5, "changeCount");
                    assert.exists(err);
                    done();
                });
        });
    });

    it("Live changes should clean listener when cancelled", () => {
        const db = new DB(dbName);

        // TODO: The bug was fixed for the 'idb' adapter in
        // https://github.com/pouchdb/pouchdb/pull/6504, but still happens with
        // the 'websql' adapter. It needs to be fixed!
        if (db.adapter === "websql") {
            return;
        }

        return new Promise((resolve, reject) => {
            // Capture logs
            const logs = [];
            const oldLog = console.error;
            console.error = function () {
                const args = Array.prototype.slice.call(arguments);
                logs.push(args);
                oldLog.apply(console, arguments);
            };

            // Try to trigger the problem
            let changes;
            let i = 0;
            const renewChangeListener = () => {
                changes = db.changes({ live: true });
                if (i++ < 20) {
                    setTimeout(() => {
                        changes.cancel();
                        changes.on("complete", renewChangeListener);
                    }, 0);
                } else {
                    changes.cancel();

                    // Check whether error logs have been output or not
                    changes.on("complete", () => {
                        console.error = oldLog;

                        const badLogs = logs.filter((args) => {
                            return args[0].indexOf("possible EventEmitter memory leak detected") !== -1;
                        });

                        if (badLogs.length > 0) {
                            reject(new Error(badLogs));
                        } else {
                            resolve();
                        }
                    });
                }
            };
            renewChangeListener();
        });
    });

    it("Changes Since", (done) => {
        const docs1 = [
            { _id: "0", integer: 0 },
            { _id: "1", integer: 1 },
            { _id: "2", integer: 2 },
            { _id: "3", integer: 3 },
            { _id: "4", integer: 4 },
            { _id: "5", integer: 5 },
            { _id: "6", integer: 6 },
            { _id: "7", integer: 7 },
            { _id: "8", integer: 9 },
            { _id: "9", integer: 9 },
            { _id: "10", integer: 10 },
            { _id: "11", integer: 11 }
        ];
        const db = new DB(dbName);

        db.bulkDocs({ docs: docs1 }).then(() => {
            db.info().then((info) => {
                const update_seq = info.update_seq;

                const docs2 = [
                    { _id: "12", integer: 12 },
                    { _id: "13", integer: 13 }
                ];

                db.bulkDocs({ docs: docs2 }).then(() => {
                    const promise = db.changes({
                        since: update_seq
                    }).on("complete", (results) => {
                        assert.isAtLeast(results.results.length, 2);
                        done();
                    });
                    assert.exists(promise);
                    assert.isFunction(promise.cancel);
                });
            });
        });
    });

    it("Changes Since and limit limit 1", (done) => {
        const docs1 = [
            { _id: "0", integer: 0 },
            { _id: "1", integer: 1 },
            { _id: "2", integer: 2 }
        ];
        const db = new DB(dbName);
        db.bulkDocs({ docs: docs1 }).then(() => {
            db.info().then((info) => {
                const update_seq = info.update_seq;

                const docs2 = [
                    { _id: "3", integer: 3 },
                    { _id: "4", integer: 4 }
                ];

                db.bulkDocs({ docs: docs2 }).then(() => {
                    db.changes({
                        since: update_seq,
                        limit: 1
                    }).on("complete", (results) => {
                        assert.equal(results.results.length, 1);
                        done();
                    });
                });
            });
        });
    });

    it("Changes Since and limit limit 0", (done) => {
        const docs1 = [
            { _id: "0", integer: 0 },
            { _id: "1", integer: 1 },
            { _id: "2", integer: 2 }
        ];
        const db = new DB(dbName);
        db.bulkDocs({ docs: docs1 }).then(() => {
            db.info().then((info) => {
                const update_seq = info.update_seq;

                const docs2 = [
                    { _id: "3", integer: 3 },
                    { _id: "4", integer: 4 }
                ];

                db.bulkDocs({ docs: docs2 }, () => {
                    db.changes({
                        since: update_seq,
                        limit: 0
                    }).on("complete", (results) => {
                        assert.equal(results.results.length, 1);
                        done();
                    });
                });
            });
        });
    });

    it("Changes limit", async () => {
        const docs1 = [
            { _id: "0", integer: 0 },
            { _id: "1", integer: 1 },
            { _id: "2", integer: 2 },
            { _id: "3", integer: 3 }
        ];
        const docs2 = [
            { _id: "2", integer: 11 },
            { _id: "3", integer: 12 }
        ];
        const db = new DB(dbName);
        // we use writeDocs since bulkDocs looks to have undefined
        // order of doing insertions
        let info = await util.writeDocs(db, docs1);

        docs2[0]._rev = info[2].rev;
        docs2[1]._rev = info[3].rev;

        info = await db.info();
        const update_seq = info.update_seq;

        info = await db.put(docs2[0]);
        docs2[0]._rev = info.rev;
        info = await db.put(docs2[1]);
        docs2[1]._rev = info.rev;
        await new Promise((resolve, reject) => {
            db.changes({
                limit: 2,
                since: update_seq,
                include_docs: true
            }).on("complete", (results) => {
                results = results.results;
                assert.equal(results.length, 2);

                // order is not guaranteed
                let first = results[0];
                let second = results[1];
                if (first.id === "3") {
                    second = first;
                    first = results[1];
                }
                assert.equal(first.id, "2");
                assert.equal(first.doc.integer, docs2[0].integer);
                assert.equal(first.doc._rev, docs2[0]._rev);
                assert.equal(second.id, "3");
                assert.equal(second.doc.integer, docs2[1].integer);
                assert.equal(second.doc._rev, docs2[1]._rev);
                resolve();
            }).on("error", reject);
        });
    });

    it("Changes with filter not present in ddoc", async () => {
        const docs = [
            { _id: "1", integer: 1 },
            {
                _id: "_design/foo",
                integer: 4,
                filters: { even: "function (doc) { return doc.integer % 2 === 1; }" }
            }
        ];
        const db = new DB(dbName);
        await util.writeDocs(db, docs);
        await new Promise((resolve) => {
            db.changes({
                filter: "foo/odd",
                limit: 2,
                include_docs: true
            }).on("error", (err) => {
                assert.equal(err.name, "not_found");
                assert.equal(err.status, util.x.MISSING_DOC.status,
                    "correct error status returned");
                resolve();
            });
        });
    });

    it("Changes with `filters` key not present in ddoc", async () => {
        const docs = [
            { _id: "0", integer: 0 },
            { _id: "1", integer: 1 },
            {
                _id: "_design/foo",
                integer: 4,
                views: {
                    even: {
                        map: "function (doc) { if (doc.integer % 2 === 1)" +
                        " { emit(doc._id, null) }; }"
                    }
                }
            }
        ];
        const db = new DB(dbName);
        await util.writeDocs(db, docs);
        await new Promise((resolve) => {
            db.changes({
                filter: "foo/even",
                limit: 2,
                include_docs: true
            }).on("error", (err) => {
                assert.equal(err.status, util.x.MISSING_DOC.status, "correct error status returned");
                assert.equal(err.name, "not_found");
                resolve();
            });
        });
    });

    it("Changes limit and filter", async () => {
        const docs1 = [
            { _id: "0", integer: 0 },
            { _id: "1", integer: 1 },
            { _id: "2", integer: 2 }
        ];
        const db = new DB(dbName);

        const docs2 = [
            { _id: "3", integer: 3 },
            { _id: "4", integer: 4 },
            { _id: "5", integer: 5 },
            {
                _id: "_design/foo",
                integer: 4,
                filters: { even: "function (doc) { return doc.integer % 2 === 1; }" }
            }
        ];

        await db.bulkDocs({ docs: docs1 });
        const info = await db.info();
        const update_seq = info.update_seq;
        await util.writeDocs(db, docs2);
        await new Promise((resolve, reject) => {
            const promise = db.changes({
                filter: "foo/even",
                limit: 2,
                since: update_seq,
                include_docs: true
            }).on("complete", (results) => {
                assert.equal(results.results.length, 2);
                const three = findById(results.results, "3");
                assert.equal(three.doc.integer, 3);
                const five = findById(results.results, "5");
                assert.equal(five.doc.integer, 5);
                resolve();
            }).on("error", reject);

            assert.exists(promise);
            assert.isFunction(promise.cancel);
        });
    });

    it("Changes with shorthand function name", (done) => {
        const docs = [
            { _id: "0", integer: 0 },
            { _id: "1", integer: 1 },
            { _id: "2", integer: 2 },
            {
                _id: "_design/even",
                integer: 3,
                filters: { even: "function (doc) { return doc.integer % 2 === 0; }" }
            }
        ];
        const db = new DB(dbName);

        db.bulkDocs({ docs }).then(() => {
            const promise = db.changes({
                filter: "even",
                include_docs: true
            }).on("complete", (results) => {
                assert.equal(results.results.length, 2);
                const zero = findById(results.results, "0");
                assert.equal(zero.doc.integer, 0);
                const two = findById(results.results, "2");
                assert.equal(two.doc.integer, 2);
                done();
            }).on("error", done);
            assert.exists(promise);
            assert.isFunction(promise.cancel);
        });
    });

    it("Changes with filter from nonexistent ddoc", async () => {
        const docs = [
            { _id: "0", integer: 0 },
            { _id: "1", integer: 1 }
        ];
        const db = new DB(dbName);
        await util.writeDocs(db, docs);
        await new Promise((resolve) => {
            db.changes({
                filter: "foobar/odd"
            }).on("error", (err) => {
                assert.exists(err);
                resolve();
            });
        });
    });

    it("Changes with view not present in ddoc", async () => {
        const docs = [
            { _id: "0", integer: 0 },
            { _id: "1", integer: 1 },
            {
                _id: "_design/foo",
                integer: 4,
                views:
                {
                    even:
                    {
                        map: "function (doc) { if (doc.integer % 2 === 1) { " +
                        "emit(doc._id, null) }; }"
                    }
                }
            }
        ];
        const db = new DB(dbName);
        await util.writeDocs(db, docs);
        await new Promise((resolve) => {
            db.changes({
                filter: "_view",
                view: "foo/odd"
            }).on("error", (err) => {
                assert.equal(err.status, util.x.MISSING_DOC.status,
                    "correct error status returned");
                assert.equal(err.name, "not_found");
                resolve();
            });
        });
    });

    it("Changes with `views` key not present in ddoc", async () => {
        const docs = [
            { _id: "1", integer: 1 },
            {
                _id: "_design/foo",
                integer: 4,
                filters: { even: "function (doc) { return doc.integer % 2 === 1; }" }
            }
        ];
        const db = new DB(dbName);
        await util.writeDocs(db, docs);
        await new Promise((resolve) => {
            db.changes({
                filter: "_view",
                view: "foo/even"
            }).on("error", (err) => {
                assert.equal(err.status, util.x.MISSING_DOC.status,
                    "correct error status returned");
                assert.equal(err.name, "not_found");
                resolve();
            });
        });
    });

    it("#4451 Changes with invalid view filter", (done) => {
        const docs = [
            { _id: "1", integer: 1 },
            {
                _id: "_design/foo",
                filters: { even: "function (doc) { return doc.integer % 2 === 1; }" }
            }
        ];
        const db = new DB(dbName);
        db.bulkDocs(docs).then(() => {
            db.changes({ filter: "a/b/c" }).on("error", () => {
                done("should not be called");
            }).on("complete", () => {
                done();
            });
        });
    });

    it("3356 throw inside a filter", async () => {
        const db = new DB(dbName);
        await db.put({
            _id: "_design/test",
            filters: {
                test: function () {
                    throw new Error(); // syntaxerrors can't be caught either.
                }.toString()
            }
        });
        await assert.throws(async () => db.changes({ filter: "test/test" }));
    });

    it("Changes with missing param `view` in request", async () => {
        const docs = [
            { _id: "0", integer: 0 },
            { _id: "1", integer: 1 },
            {
                _id: "_design/foo",
                integer: 4,
                views: {
                    even: {
                        map: "function (doc) { if (doc.integer % 2 === 1) " +
                        "{ emit(doc._id, null) }; }"
                    }
                }
            }
        ];
        const db = new DB(dbName);
        await util.writeDocs(db, docs);
        await new Promise((resolve) => {
            db.changes({
                filter: "_view"
            }).on("error", (err) => {
                assert.equal(err.status, util.x.BAD_REQUEST.status,
                    "correct error status returned");
                assert.equal(err.name, "bad_request");
                resolve();
            });
        });
    });

    it("Changes limit and view instead of filter", (done) => {
        const docs1 = [
            { _id: "0", integer: 0 },
            { _id: "1", integer: 1 },
            { _id: "2", integer: 2 }
        ];
        const db = new DB(dbName);
        db.bulkDocs({ docs: docs1 }).then(() => {
            db.info().then((info) => {
                const update_seq = info.update_seq;

                const docs2 = [
                    { _id: "3", integer: 3 },
                    { _id: "4", integer: 4 },
                    { _id: "5", integer: 5 },
                    {
                        _id: "_design/foo",
                        integer: 4,
                        views: {
                            even: {
                                map: "function (doc) " +
                                "{ if (doc.integer % 2 === 1) " +
                                "{ emit(doc._id, null) }; }"
                            }
                        }
                    }
                ];

                db.bulkDocs({ docs: docs2 }).then(() => {

                    db.changes({
                        filter: "_view",
                        view: "foo/even",
                        limit: 2,
                        since: update_seq,
                        include_docs: true
                    }).on("complete", (results) => {
                        const changes = results.results;
                        assert.equal(changes.length, 2);

                        assert.equal(findById(changes, "3").doc.integer, 3);

                        assert.equal(findById(changes, "5").doc.integer, 5);

                        done();
                    }).on("error", done);
                });
            });
        });
    });

    it("#3609 view option implies filter: _view", () => {
        const docs = [
            { _id: "0", integer: 0 },
            { _id: "1", integer: 1 },
            { _id: "2", integer: 2 },
            {
                _id: "_design/foo", integer: 3,
                views: {
                    even: {
                        map: "function (doc) { if (doc.integer % 2 === 1) " +
                        "{ emit(doc._id, null) }; }"
                    }
                }
            }
        ];

        const db = new DB(dbName);
        return db.bulkDocs(docs).then(() => {
            return db.changes({ view: "foo/even" });
        }).then((changes) => {
            assert.equal(changes.results.length, 2);
        });
    });

    it("Changes last_seq", (done) => {
        const docs = [
            { _id: "0", integer: 0 },
            { _id: "1", integer: 1 },
            { _id: "2", integer: 2 },
            { _id: "3", integer: 3 },
            {
                _id: "_design/foo",
                integer: 4,
                filters: { even: "function (doc) { return doc.integer % 2 === 1; }" }
            }
        ];
        const db = new DB(dbName);
        db.changes().on("complete", (results) => {
            assert.equal(results.last_seq, 0);
            db.bulkDocs({ docs }).then(() => {
                db.changes().on("complete", (results) => {
                    assert.equal(results.last_seq, 5);
                    db.changes({
                        filter: "foo/even"
                    }).on("complete", (results) => {
                        assert.equal(results.last_seq, 5);
                        assert.equal(results.results.length, 2);
                        done();
                    }).on("error", done);
                }).on("error", done);
            });
        }).on("error", done);
    });

    it("Immediately cancel changes", () => {
        // fixes code coverage by ensuring the changes() listener
        // emits 'complete' even if the db's task queue isn't
        // ready yet
        return new Promise((resolve, reject) => {
            const db = new DB(dbName);
            const changes = db.changes({ live: true });
            changes.on("error", reject);
            changes.on("complete", resolve);
            changes.cancel();
        });
    });

    it("Changes with invalid ddoc view name", () => {
        return new Promise((resolve, reject) => {
            const db = new DB(dbName);
            db.post({});
            const changes = db.changes({ live: true, filter: "_view", view: "" });
            changes.on("error", resolve);
            changes.on("change", reject);
        });
    });

    it("Changes with invalid ddoc view name 2", () => {
        return new Promise((resolve, reject) => {
            const db = new DB(dbName);
            db.post({});
            const changes = db.changes({ live: true, filter: "_view", view: "a/b/c" });
            changes.on("error", resolve);
            changes.on("change", reject);
        });
    });

    // This test crashes due to an invalid JSON response from CouchDB:
    // https://issues.apache.org/jira/browse/COUCHDB-2765
    // We could remove the "if" check and put a try/catch in our
    // JSON parsing, but since this is a super-rare bug it may not be
    // worth our time. This test does increase code coverage for our
    // own local code, though.
    it("Changes with invalid ddoc with no map function", () => {
        const db = new DB(dbName);
        return db.put({
            _id: "_design/name",
            views: {
                name: {
                    empty: "sad face"
                }
            }
        }).then(() => {
            return new Promise((resolve, reject) => {
                const changes = db.changes({
                    live: true,
                    filter: "_view",
                    view: "name/name"
                });
                changes.on("error", resolve);
                changes.on("change", reject);
            });
        });
    });

    it("Changes with invalid ddoc with no filter function", () => {
        const db = new DB(dbName);
        return db.put({
            _id: "_design/name",
            views: {
                name: {
                    empty: "sad face"
                }
            }
        }).then(() => {
            return new Promise((resolve, reject) => {
                const changes = db.changes({
                    live: true,
                    filter: "name/name"
                });
                changes.on("error", resolve);
                changes.on("change", reject);
            });
        });
    });

    it("Changes last_seq with view instead of filter", (done) => {
        const docs = [
            { _id: "0", integer: 0 },
            { _id: "1", integer: 1 },
            { _id: "2", integer: 2 },
            { _id: "3", integer: 3 },
            {
                _id: "_design/foo",
                integer: 4,
                views:
                {
                    even:
                    {
                        map: "function (doc) { if (doc.integer % 2 === 1) { " +
                        "emit(doc._id, null) }; }"
                    }
                }
            }
        ];
        const db = new DB(dbName);
        db.changes().on("complete", (results) => {
            assert.equal(results.last_seq, 0);
            db.bulkDocs({ docs }).then(() => {
                db.changes().on("complete", (results) => {
                    assert.equal(results.last_seq, 5);
                    db.changes({
                        filter: "_view",
                        view: "foo/even"
                    }).on("complete", (results) => {
                        assert.equal(results.last_seq, 5);
                        assert.equal(results.results.length, 2);
                        done();
                    }).on("error", done);
                }).on("error", done);
            });
        }).on("error", done);
    });

    it("Changes with style = all_docs", async () => {
        const simpleTree = [
            [{ _id: "foo", _rev: "1-a", value: "foo a" },
                { _id: "foo", _rev: "2-b", value: "foo b" },
                { _id: "foo", _rev: "3-c", value: "foo c" }],
            [{ _id: "foo", _rev: "1-a", value: "foo a" },
                { _id: "foo", _rev: "2-d", value: "foo d" },
                { _id: "foo", _rev: "3-e", value: "foo e" },
                { _id: "foo", _rev: "4-f", value: "foo f" }],
            [{ _id: "foo", _rev: "1-a", value: "foo a" },
                { _id: "foo", _rev: "2-g", value: "foo g", _deleted: true }]
        ];
        const db = new DB(dbName);
        await util.putTree(db, simpleTree);
        await new Promise((resolve, reject) => {
            db.changes().on("complete", (res) => {
                assert.equal(res.results[0].changes.length, 1);
                assert.equal(res.results[0].changes[0].rev, "4-f");
                db.changes({
                    style: "all_docs"
                }).on("complete", (res) => {
                    assert.equal(res.results[0].changes.length, 3);
                    const changes = res.results[0].changes;
                    changes.sort((a, b) => {
                        return a.rev < b.rev;
                    });
                    assert.equal(changes[0].rev, "4-f");
                    assert.equal(changes[1].rev, "3-c");
                    assert.equal(changes[2].rev, "2-g");
                    resolve();
                }).on("error", reject);
            }).on("error", reject);
        });
    });

    it("Changes with style = all_docs and a callback for complete", async () => {
        const simpleTree = [
            [{ _id: "foo", _rev: "1-a", value: "foo a" },
                { _id: "foo", _rev: "2-b", value: "foo b" },
                { _id: "foo", _rev: "3-c", value: "foo c" }],
            [{ _id: "foo", _rev: "1-a", value: "foo a" },
                { _id: "foo", _rev: "2-d", value: "foo d" },
                { _id: "foo", _rev: "3-e", value: "foo e" },
                { _id: "foo", _rev: "4-f", value: "foo f" }],
            [{ _id: "foo", _rev: "1-a", value: "foo a" },
                { _id: "foo", _rev: "2-g", value: "foo g", _deleted: true }]
        ];
        const db = new DB(dbName);
        await util.putTree(db, simpleTree);
        await new Promise((resolve) => {
            db.changes((err, res) => {
                assert.equal(res.results[0].changes.length, 1);
                assert.equal(res.results[0].changes[0].rev, "4-f");
                db.changes({
                    style: "all_docs"
                }, (err, res) => {
                    assert.isNull(err);
                    assert.equal(res.results[0].changes.length, 3);
                    const changes = res.results[0].changes;
                    changes.sort((a, b) => {
                        return a.rev < b.rev;
                    });
                    assert.equal(changes[0].rev, "4-f");
                    assert.equal(changes[1].rev, "3-c");
                    assert.equal(changes[2].rev, "2-g");
                    resolve();
                });
            });
        });
    });

    it("Changes limit = 0", (done) => {
        const docs = [
            { _id: "0", integer: 0 },
            { _id: "1", integer: 1 },
            { _id: "2", integer: 2 },
            { _id: "3", integer: 3 }
        ];
        const db = new DB(dbName);
        db.bulkDocs({ docs }).then(() => {
            db.changes({
                limit: 0
            }).on("complete", (results) => {
                assert.equal(results.results.length, 1);
                done();
            }).on("error", done);
        });
    });

    // Note for the following test that CouchDB's implementation of /_changes
    // with `descending=true` ignores any `since` parameter.
    it("Descending changes", (done) => {
        const db = new DB(dbName);
        db.post({ _id: "0", test: "ing" }).then(() => {
            db.post({ _id: "1", test: "ing" }).then(() => {
                db.post({ _id: "2", test: "ing" }).then(() => {
                    db.changes({
                        descending: true,
                        since: 1
                    }).on("complete", (results) => {
                        assert.equal(results.results.length, 3);
                        const ids = ["2", "1", "0"];
                        results.results.forEach((row, i) => {
                            assert.equal(row.id, ids[i]);
                        });
                        done();
                    }).on("error", done);
                });
            });
        });
    });

    it("Changes doc", (done) => {
        const db = new DB(dbName);
        db.post({ test: "somestuff" }).then(() => {
            db.changes({
                include_docs: true
            }).on("change", (change) => {
                assert.equal(change.doc._id, change.id);
                assert.equal(change.doc._rev, change.changes[change.changes.length - 1].rev);
                done();
            });
        });
    });

    // Note for the following test that CouchDB's implementation of /_changes
    // with `descending=true` ignores any `since` parameter.
    it("Descending many changes", (done) => {
        const db = new DB(dbName);
        const docs = [];
        const num = 100;
        for (let i = 0; i < num; i++) {
            docs.push({
                _id: `doc_${i}`,
                foo: `bar_${i}`
            });
        }
        let changes = 0;
        db.bulkDocs({ docs }).then(() => {
            db.changes({
                descending: true
            }).on("change", () => {
                changes++;
            }).on("complete", () => {
                assert.equal(changes, num, "correct number of changes");
                done();
            }).on("error", (err) => {
                done(err);
            });
        });
    });

    it("changes w/ many modifications of same doc", () => {
        const db = new DB(dbName);
        let promise = Promise.resolve();
        const doc = { _id: "1" };
        const modifyDoc = () => {
            return db.put(doc).then((res) => {
                doc._rev = res.rev;
            });
        };
        for (let i = 0; i < 5; i++) {
            promise = promise.then(modifyDoc);
        }
        return promise.then(() => {
            return db.bulkDocs([
                { _id: "2" },
                { _id: "3" },
                { _id: "4" },
                { _id: "5" }
            ]);
        }).then(() => {
            return db.changes({ since: 0, limit: 3 }).then((res) => {
                assert.deepEqual(res.results.map((x) => {
                    delete x.changes;
                    delete x.seq;
                    return x;
                }), [
                    { id: "1" },
                    { id: "2" },
                    { id: "3" }
                ]);
            });
        });
    });

    it("live-changes", (done) => {
        const db = new DB(dbName);
        let count = 0;
        const changes = db.changes({
            live: true
        }).on("complete", () => {
            assert.equal(count, 1);
            done();
        }).on("change", (change) => {
            count += 1;
            assert.notProperty(change, "doc");
            assert.equal(count, 1);
            changes.cancel();
        });
        db.post({ test: "adoc" });
    });

    it("Multiple watchers", (done) => {
        const db = new DB(dbName);
        let count = 0;
        let changes1Complete = false;
        let changes2Complete = false;
        const checkCount = () => {
            if (changes1Complete && changes2Complete) {
                assert.equal(count, 2);
                done();
            }
        };
        let changes1 = db.changes({
            live: true
        }).on("complete", () => {
            changes1Complete = true;
            checkCount();
        }).on("change", () => {
            count += 1;
            changes1.cancel();
            changes1 = null;
        }).on("error", done);
        let changes2 = db.changes({
            live: true
        }).on("complete", () => {
            changes2Complete = true;
            checkCount();
        }).on("change", () => {
            count += 1;
            changes2.cancel();
            changes2 = null;
        }).on("error", done);
        db.post({ test: "adoc" });
    });

    it("Continuous changes doc", (done) => {
        const db = new DB(dbName);
        const changes = db.changes({
            live: true,
            include_docs: true
        }).on("complete", (result) => {
            assert.equal(result.status, "cancelled");
            done();
        }).on("change", (change) => {
            assert.property(change, "doc");
            assert.property(change.doc, "_rev");
            changes.cancel();
        }).on("error", done);
        db.post({ test: "adoc" });
    });

    it("Cancel changes", (done) => {
        const db = new DB(dbName);
        let count = 0;
        let interval;
        let docPosted = false;

        // We want to wait for a period of time after the final
        // document was posted to ensure we didnt see another
        // change
        const waitForDocPosted = () => {
            if (!docPosted) {
                return;
            }
            clearInterval(interval);
            setTimeout(() => {
                assert.equal(count, 1);
                done();
            }, 200);
        };

        const changes = db.changes({
            live: true
        }).on("complete", (result) => {
            assert.equal(result.status, "cancelled");
            // This setTimeout ensures that once we cancel a change we dont recieve
            // subsequent callbacks, so it is needed
            interval = setInterval(waitForDocPosted, 100);
        }).on("change", () => {
            count += 1;
            if (count === 1) {
                changes.cancel();
                db.post({ test: "another doc" }).then(() => {
                    docPosted = true;
                });
            }
        });
        db.post({ test: "adoc" });
    });


    it("#3579 changes firing 1 too many times", () => {
        const db = new DB(dbName);
        return db.bulkDocs([{}, {}, {}]).then(() => {
            const changes = db.changes({
                since: "now",
                live: true,
                include_docs: true
            });
            return Promise.all([
                new Promise((resolve, reject) => {
                    changes.on("error", reject);
                    changes.on("change", (change) => {
                        changes.cancel();
                        resolve(change);
                    });
                }),
                new Promise((resolve) => {
                    setTimeout(resolve, 50);
                }).then(() => {
                    return db.put({ _id: "foobar" });
                })
            ]);
        }).then((result) => {
            const change = result[0];
            assert.equal(change.id, "foobar");
            assert.equal(change.doc._id, "foobar");
        });
    });

    it("Kill database while listening to live changes", (done) => {
        const db = new DB(dbName);

        db.changes({ live: true })
            .on("error", () => {
                done();
            })
            .on("complete", () => {
                done();
            })
            .on("change", () => {
                db.destroy().catch(done);
            });

        db.post({ test: "adoc" });
    });

    it("#3136 style=all_docs", () => {

        const db = new DB(dbName);

        let chain = Promise.resolve();

        const docIds = ["b", "c", "a", "z", "d", "e"];

        docIds.forEach((docId) => {
            chain = chain.then(() => {
                return db.put({ _id: docId });
            });
        });

        return chain.then(() => {
            return db.changes({ style: "all_docs" });
        }).then((res) => {
            const ids = res.results.map((x) => {
                return x.id;
            });
            assert.includeMembers(ids, docIds);
        });
    });

    it("#4191 revs_diff causes endless loop", () => {
        const db = new DB(dbName, { auto_compaction: false });
        return db.bulkDocs({
            new_edits: false,
            docs: [{ _id: "799", _rev: "1-d22" }
            ]
        }).then(() => {
            return db.bulkDocs({
                new_edits: false,
                docs: [{ _id: "3E1", _rev: "1-ab5" }]
            });
        }).then(() => {
            return db.bulkDocs(
                {
                    new_edits: false,
                    docs:
                    [{ _id: "FB3", _rev: "1-363" },
                        { _id: "27C", _rev: "1-4c3" },
                        { _id: "BD6", _rev: "1-de0" },
                        { _id: "1E9", _rev: "1-451" }]
                }
            );
        }).then(() => {
            return db.changes({ style: "all_docs", limit: 100 });
        }).then((res) => {
            const lastSeq = res.last_seq;
            return db.changes({ since: lastSeq, style: "all_docs", limit: 100 });
        }).then((res) => {
            assert.lengthOf(res.results, 0);
        });
    });

    it("#3136 style=all_docs & include_docs", () => {

        const db = new DB(dbName);

        let chain = Promise.resolve();

        const docIds = ["b", "c", "a", "z", "d", "e"];

        docIds.forEach((docId) => {
            chain = chain.then(() => {
                return db.put({ _id: docId });
            });
        });

        return chain.then(() => {
            return db.changes({
                style: "all_docs",
                include_docs: true
            });
        }).then((res) => {
            const ids = res.results.map((x) => {
                return x.id;
            });
            assert.includeMembers(ids, docIds);
        });
    });

    it("#3136 tricky changes, limit/descending", () => {
        const db = new DB(dbName);

        const docs = [
            {
                _id: "alpha",
                _rev: "1-a",
                _revisions: {
                    start: 1,
                    ids: ["a"]
                }
            }, {
                _id: "beta",
                _rev: "1-b",
                _revisions: {
                    start: 1,
                    ids: ["b"]
                }
            }, {
                _id: "gamma",
                _rev: "1-b",
                _revisions: {
                    start: 1,
                    ids: ["b"]
                }
            }, {
                _id: "alpha",
                _rev: "2-d",
                _revisions: {
                    start: 2,
                    ids: ["d", "a"]
                }
            }, {
                _id: "beta",
                _rev: "2-e",
                _revisions: {
                    start: 2,
                    ids: ["e", "b"]
                }
            }, {
                _id: "beta",
                _rev: "3-f",
                _deleted: true,
                _revisions: {
                    start: 3,
                    ids: ["f", "e", "b"]
                }
            }
        ];

        let chain = Promise.resolve();
        const seqs = [];

        docs.forEach((doc) => {
            chain = chain.then(() => {
                return db.bulkDocs([doc], { new_edits: false }).then(() => {
                    return db.changes({ doc_ids: [doc._id] });
                }).then((res) => {
                    seqs.push(res.results[0].seq);
                });
            });
        });

        const normalizeResult = (result) => {
            // order of changes doesn't matter
            result.results.forEach((ch) => {
                ch.changes = ch.changes.sort((a, b) => {
                    return a.rev < b.rev ? -1 : 1;
                });
            });
        };

        return chain.then(() => {
            return db.changes();
        }).then((result) => {
            normalizeResult(result);
            assert.deepEqual(result, {
                results: [
                    {
                        seq: seqs[2],
                        id: "gamma",
                        changes: [{ rev: "1-b" }
                        ]
                    },
                    {
                        seq: seqs[3],
                        id: "alpha",
                        changes: [{ rev: "2-d" }
                        ]
                    },
                    {
                        seq: seqs[5],
                        id: "beta",
                        deleted: true,
                        changes: [{ rev: "3-f" }
                        ]
                    }
                ],
                last_seq: seqs[5]
            });
            return db.changes({ limit: 0 });
        }).then((result) => {
            normalizeResult(result);
            assert.deepEqual(result, {
                results: [{
                    seq: seqs[2],
                    id: "gamma",
                    changes: [{ rev: "1-b" }]
                }],
                last_seq: seqs[2]
            }, `1:${JSON.stringify(result)}`);
            return db.changes({ limit: 1 });
        }).then((result) => {
            normalizeResult(result);
            assert.deepEqual(result, {
                results: [{
                    seq: seqs[2],
                    id: "gamma",
                    changes: [{ rev: "1-b" }]
                }],
                last_seq: seqs[2]
            }, `2:${JSON.stringify(result)}`);
            return db.changes({ limit: 2 });
        }).then((result) => {
            normalizeResult(result);
            assert.deepEqual(result, {
                results: [{
                    seq: seqs[2],
                    id: "gamma",
                    changes: [{ rev: "1-b" }]
                }, { seq: seqs[3], id: "alpha", changes: [{ rev: "2-d" }] }],
                last_seq: seqs[3]
            }, `3:${JSON.stringify(result)}`);
            return db.changes({ limit: 1, descending: true });
        }).then((result) => {
            normalizeResult(result);
            assert.deepEqual(result, {
                results: [{
                    seq: seqs[5],
                    id: "beta",
                    changes: [{ rev: "3-f" }],
                    deleted: true
                }],
                last_seq: seqs[5]
            }, `4:${JSON.stringify(result)}`);
            return db.changes({ limit: 2, descending: true });
        }).then((result) => {
            normalizeResult(result);
            const expected = {
                results: [{
                    seq: seqs[5],
                    id: "beta",
                    changes: [{ rev: "3-f" }],
                    deleted: true
                }, { seq: seqs[3], id: "alpha", changes: [{ rev: "2-d" }] }],
                last_seq: seqs[3]
            };
            assert.deepEqual(result, expected, `5:${JSON.stringify(result)
            }, shoulda got: ${JSON.stringify(expected)}`);
            return db.changes({ descending: true });
        }).then((result) => {
            normalizeResult(result);
            const expected = {
                results: [{
                    seq: seqs[5],
                    id: "beta",
                    changes: [{ rev: "3-f" }],
                    deleted: true
                }, { seq: seqs[3], id: "alpha", changes: [{ rev: "2-d" }] }, {
                    seq: seqs[2],
                    id: "gamma",
                    changes: [{ rev: "1-b" }]
                }],
                last_seq: seqs[2]
            };
            assert.deepEqual(result, expected, `6:${JSON.stringify(result)
            }, shoulda got: ${JSON.stringify(expected)}`);
        });
    });

    it("#3176 winningRev has a lower seq, descending", () => {
        const db = new DB(dbName);
        const tree = [
            [
                {
                    _id: "foo",
                    _rev: "1-a",
                    _revisions: { start: 1, ids: ["a"] }
                },
                {
                    _id: "foo",
                    _rev: "2-e",
                    _deleted: true,
                    _revisions: { start: 2, ids: ["e", "a"] }
                },
                {
                    _id: "foo",
                    _rev: "3-g",
                    _revisions: { start: 3, ids: ["g", "e", "a"] }
                }
            ],
            [
                {
                    _id: "foo",
                    _rev: "1-a",
                    _revisions: { start: 1, ids: ["a"] }
                },
                {
                    _id: "foo",
                    _rev: "2-b",
                    _revisions: { start: 2, ids: ["b", "a"] }
                },
                {
                    _id: "foo",
                    _rev: "3-c",
                    _revisions: { start: 3, ids: ["c", "b", "a"] }
                }
            ]
        ];

        let chain = Promise.resolve();
        const seqs = [0];

        const getExpected = (i) => {
            const expecteds = [
                {
                    results: [
                        {
                            seq: seqs[1],
                            id: "foo",
                            changes: [{ rev: "3-g" }]
                        }
                    ],
                    last_seq: seqs[1]
                },
                {
                    results: [
                        {
                            seq: seqs[2],
                            id: "foo",
                            changes: [{ rev: "3-g" }]
                        }
                    ],
                    last_seq: seqs[2]
                }
            ];
            return expecteds[i];
        };

        const normalizeResult = (result) => {
            // order of changes doesn't matter
            result.results.forEach((ch) => {
                ch.changes = ch.changes.sort((a, b) => {
                    return a.rev < b.rev ? -1 : 1;
                });
            });
        };

        tree.forEach((docs, i) => {
            chain = chain.then(() => {
                return db.bulkDocs(docs, { new_edits: false }).then(() => {
                    return db.changes({
                        descending: true
                    });
                }).then((result) => {
                    seqs.push(result.last_seq);
                    const expected = getExpected(i);
                    normalizeResult(result);
                    assert.deepEqual(result, expected,
                        `${i}: should get: ${JSON.stringify(expected)
                        }, but got: ${JSON.stringify(result)}`);
                });
            });
        });
        return chain;
    });

    it("#3136 winningRev has a lower seq, style=all_docs", () => {
        const db = new DB(dbName);
        const tree = [
            [
                {
                    _id: "foo",
                    _rev: "1-a",
                    _revisions: { start: 1, ids: ["a"] }
                },
                {
                    _id: "foo",
                    _rev: "2-e",
                    _deleted: true,
                    _revisions: { start: 2, ids: ["e", "a"] }
                },
                {
                    _id: "foo",
                    _rev: "3-g",
                    _revisions: { start: 3, ids: ["g", "e", "a"] }
                }
            ],
            [
                {
                    _id: "foo",
                    _rev: "1-a",
                    _revisions: { start: 1, ids: ["a"] }
                },
                {
                    _id: "foo",
                    _rev: "2-b",
                    _revisions: { start: 2, ids: ["b", "a"] }
                },
                {
                    _id: "foo",
                    _rev: "3-c",
                    _revisions: { start: 3, ids: ["c", "b", "a"] }
                }
            ],
            [
                {
                    _id: "foo",
                    _rev: "1-a",
                    _revisions: { start: 1, ids: ["a"] }
                },
                {
                    _id: "foo",
                    _rev: "2-d",
                    _revisions: { start: 2, ids: ["d", "a"] }
                },
                {
                    _id: "foo",
                    _rev: "3-h",
                    _revisions: { start: 3, ids: ["h", "d", "a"] }
                },
                {
                    _id: "foo",
                    _rev: "4-f",
                    _revisions: { start: 4, ids: ["f", "h", "d", "a"] }
                }
            ]
        ];

        let chain = Promise.resolve();
        const seqs = [0];

        const getExpected = (i) => {
            const expecteds = [
                {
                    results: [
                        {
                            seq: seqs[1],
                            id: "foo",
                            changes: [{ rev: "3-g" }],
                            doc: { _id: "foo", _rev: "3-g" }
                        }
                    ],
                    last_seq: seqs[1]
                },
                {
                    results: [
                        {
                            seq: seqs[2],
                            id: "foo",
                            changes: [{ rev: "3-c" }, { rev: "3-g" }],
                            doc: { _id: "foo", _rev: "3-g" }
                        }
                    ],
                    last_seq: seqs[2]
                },
                {
                    results: [
                        {
                            seq: seqs[3],
                            id: "foo",
                            changes: [{ rev: "3-c" }, { rev: "3-g" }, { rev: "4-f" }],
                            doc: { _id: "foo", _rev: "4-f" }
                        }
                    ],
                    last_seq: seqs[3]
                }
            ];
            return expecteds[i];
        };

        const normalizeResult = (result) => {
            // order of changes doesn't matter
            result.results.forEach((ch) => {
                ch.changes = ch.changes.sort((a, b) => {
                    return a.rev < b.rev ? -1 : 1;
                });
            });
        };

        tree.forEach((docs, i) => {
            chain = chain.then(() => {
                return db.bulkDocs(docs, { new_edits: false }).then(() => {
                    return db.changes({
                        style: "all_docs",
                        since: seqs[seqs.length - 1],
                        include_docs: true
                    });
                }).then((result) => {
                    seqs.push(result.last_seq);
                    const expected = getExpected(i);
                    normalizeResult(result);
                    assert.deepEqual(result, expected,
                        `${i}: should get: ${JSON.stringify(expected)
                        }, but got: ${JSON.stringify(result)}`);
                });
            });
        });
        return chain;
    });

    it("#3136 winningRev has a lower seq, style=all_docs 2", () => {
        const db = new DB(dbName);
        const tree = [
            [
                {
                    _id: "foo",
                    _rev: "1-a",
                    _revisions: { start: 1, ids: ["a"] }
                },
                {
                    _id: "foo",
                    _rev: "2-e",
                    _deleted: true,
                    _revisions: { start: 2, ids: ["e", "a"] }
                },
                {
                    _id: "foo",
                    _rev: "3-g",
                    _revisions: { start: 3, ids: ["g", "e", "a"] }
                }
            ], [
                {
                    _id: "foo",
                    _rev: "1-a",
                    _revisions: { start: 1, ids: ["a"] }
                },
                {
                    _id: "foo",
                    _rev: "2-b",
                    _revisions: { start: 2, ids: ["b", "a"] }
                },
                {
                    _id: "foo",
                    _rev: "3-c",
                    _revisions: { start: 3, ids: ["c", "b", "a"] }
                }
            ], [
                {
                    _id: "bar",
                    _rev: "1-z",
                    _revisions: { start: 1, ids: ["z"] }
                }
            ]
        ];

        let chain = Promise.resolve();
        const seqs = [0];

        tree.forEach((docs) => {
            chain = chain.then(() => {
                return db.bulkDocs(docs, { new_edits: false }).then(() => {
                    return db.changes();
                }).then((result) => {
                    seqs.push(result.last_seq);
                });
            });
        });

        return chain.then(() => {

            const expecteds = [
                {
                    results: [{
                        seq: seqs[2],
                        id: "foo",
                        changes: [{ rev: "3-c" }, { rev: "3-g" }]
                    }, { seq: seqs[3], id: "bar", changes: [{ rev: "1-z" }] }],
                    last_seq: seqs[3]
                },
                {
                    results: [{
                        seq: seqs[2],
                        id: "foo",
                        changes: [{ rev: "3-c" }, { rev: "3-g" }]
                    }, { seq: seqs[3], id: "bar", changes: [{ rev: "1-z" }] }],
                    last_seq: seqs[3]
                },
                {
                    results: [{
                        seq: seqs[3], id: "bar",
                        changes: [{ rev: "1-z" }]
                    }],
                    last_seq: seqs[3]
                },
                { results: [], last_seq: seqs[3] }
            ];

            let chain2 = Promise.resolve();

            const normalizeResult = (result) => {
                // order of changes doesn't matter
                result.results.forEach((ch) => {
                    ch.changes = ch.changes.sort((a, b) => {
                        return a.rev < b.rev ? -1 : 1;
                    });
                });
            };

            seqs.forEach((seq, i) => {
                chain2 = chain2.then(() => {
                    return db.changes({
                        since: seq,
                        style: "all_docs"
                    }).then((res) => {
                        normalizeResult(res);
                        assert.deepEqual(res, expecteds[i], `since=${seq
                        }: got: ${
                            JSON.stringify(res)
                        }, shoulda got: ${
                            JSON.stringify(expecteds[i])}`);
                    });
                });
            });
            return chain2;
        });
    });

    it("#3136 winningRev has a higher seq, using limit", () => {
        const db = new DB(dbName);
        const tree = [
            [
                {
                    _id: "foo",
                    _rev: "1-a",
                    _revisions: { start: 1, ids: ["a"] }
                }
            ], [
                {
                    _id: "foo",
                    _rev: "2-b",
                    _revisions: { start: 2, ids: ["b", "a"] }
                }
            ], [
                {
                    _id: "bar",
                    _rev: "1-x",
                    _revisions: { start: 1, ids: ["x"] }
                }
            ], [
                {
                    _id: "foo",
                    _rev: "2-c",
                    _deleted: true,
                    _revisions: { start: 2, ids: ["c", "a"] }
                }
            ]
        ];

        let chain = Promise.resolve();
        const seqs = [0];

        tree.forEach((docs) => {
            chain = chain.then(() => {
                return db.bulkDocs(docs, { new_edits: false }).then(() => {
                    return db.changes().then((result) => {
                        seqs.push(result.last_seq);
                    });
                });
            });
        });

        return chain.then(() => {

            const expecteds = [{
                results: [{
                    seq: seqs[3],
                    id: "bar",
                    changes: [{ rev: "1-x" }],
                    doc: { _id: "bar", _rev: "1-x" }
                }],
                last_seq: seqs[3]
            },
            {
                results: [{
                    seq: seqs[3],
                    id: "bar",
                    changes: [{ rev: "1-x" }],
                    doc: { _id: "bar", _rev: "1-x" }
                }],
                last_seq: seqs[3]
            },
            {
                results: [{
                    seq: seqs[3],
                    id: "bar",
                    changes: [{ rev: "1-x" }],
                    doc: { _id: "bar", _rev: "1-x" }
                }],
                last_seq: seqs[3]
            },
            {
                results: [{
                    seq: seqs[4],
                    id: "foo",
                    changes: [{ rev: "2-b" }, { rev: "2-c" }],
                    doc: { _id: "foo", _rev: "2-b" }
                }],
                last_seq: seqs[4]
            },
            { results: [], last_seq: seqs[4] }
            ];

            let chain2 = Promise.resolve();

            const normalizeResult = (result) => {
                // order of changes doesn't matter
                result.results.forEach((ch) => {
                    ch.changes = ch.changes.sort((a, b) => {
                        return a.rev < b.rev ? -1 : 1;
                    });
                });
            };

            seqs.forEach((seq, i) => {
                chain2 = chain2.then(() => {
                    return db.changes({
                        style: "all_docs",
                        since: seq,
                        limit: 1,
                        include_docs: true
                    });
                }).then((result) => {
                    normalizeResult(result);
                    assert.deepEqual(result, expecteds[i],
                        `${i}: got: ${JSON.stringify(result)
                        }, shoulda got: ${JSON.stringify(expecteds[i])}`);
                });
            });
            return chain2;
        });
    });

    it("changes-filter", (done) => {
        const docs1 = [
            { _id: "0", integer: 0 },
            { _id: "1", integer: 1 },
            { _id: "2", integer: 2 },
            { _id: "3", integer: 3 }
        ];
        const docs2 = [
            { _id: "4", integer: 4 },
            { _id: "5", integer: 5 },
            { _id: "6", integer: 6 },
            { _id: "7", integer: 7 }
        ];
        const db = new DB(dbName);
        let count = 0;
        db.bulkDocs({ docs: docs1 }).then(() => {
            const changes = db.changes({
                filter(doc) {
                    return doc.integer % 2 === 0;
                },
                live: true
            }).on("complete", (result) => {
                assert.equal(result.status, "cancelled");
                done();
            }).on("change", () => {
                count += 1;
                if (count === 4) {
                    changes.cancel();
                }
            }).on("error", done);
            db.bulkDocs({ docs: docs2 });
        });
    });

    it("changes-filter with query params", (done) => {
        const docs1 = [
            { _id: "0", integer: 0 },
            { _id: "1", integer: 1 },
            { _id: "2", integer: 2 },
            { _id: "3", integer: 3 }
        ];
        const docs2 = [
            { _id: "4", integer: 4 },
            { _id: "5", integer: 5 },
            { _id: "6", integer: 6 },
            { _id: "7", integer: 7 }
        ];
        const params = { abc: true };
        const db = new DB(dbName);
        let count = 0;
        db.bulkDocs({ docs: docs1 }).then(() => {
            const changes = db.changes({
                filter(doc, req) {
                    if (req.query.abc) {
                        return doc.integer % 2 === 0;
                    }
                },
                query_params: params,
                live: true
            }).on("complete", (result) => {
                assert.equal(result.status, "cancelled");
                done();
            }).on("change", () => {
                count += 1;
                if (count === 4) {
                    changes.cancel();
                }
            }).on("error", done);
            db.bulkDocs({ docs: docs2 });
        });
    });

    it("Non-live changes filter", (done) => {
        const docs1 = [
            { _id: "0", integer: 0 },
            { _id: "1", integer: 1 },
            { _id: "2", integer: 2 },
            { _id: "3", integer: 3 }
        ];
        const db = new DB(dbName);
        db.bulkDocs({ docs: docs1 }).then(() => {
            db.changes().on("complete", (allChanges) => {
                db.changes({
                    filter(doc) {
                        return doc.integer % 2 === 0;
                    }
                }).on("complete", (filteredChanges) => {
                    // Should get docs 0 and 2 if the filter
                    // has been applied correctly.
                    assert.equal(filteredChanges.results.length, 2);
                    assert.deepEqual(filteredChanges.last_seq, allChanges.last_seq);
                    done();
                }).on("error", done);
            }).on("error", done);
        });
    });

    it("Non-live changes filter, descending", (done) => {
        const docs1 = [
            { _id: "0", integer: 0 },
            { _id: "1", integer: 1 },
            { _id: "2", integer: 2 },
            { _id: "3", integer: 3 }
        ];
        const db = new DB(dbName);
        db.bulkDocs({ docs: docs1 }).then(() => {
            db.changes({
                descending: true
            }).on("complete", (allChanges) => {
                db.changes({
                    descending: true,
                    filter(doc) {
                        return doc.integer > 2;
                    }
                }).on("complete", (filteredChanges) => {
                    // Should get docs 2 and 3 if the filter
                    // has been applied correctly.
                    assert.equal(filteredChanges.results.length, 1);
                    assert.deepEqual(filteredChanges.last_seq, allChanges.last_seq);
                    done();
                }).on("error", done);
            }).on("error", done);
        });
    });

    it("#2569 Non-live doc_ids filter", () => {
        const docs = [
            { _id: "0" },
            { _id: "1" },
            { _id: "2" },
            { _id: "3" }
        ];
        const db = new DB(dbName);
        return db.bulkDocs(docs).then(() => {
            return db.changes({
                doc_ids: ["1", "3"]
            });
        }).then((changes) => {
            const ids = changes.results.map((x) => {
                return x.id;
            });
            assert.deepEqual(ids.sort(), ["1", "3"]);
        });
    });

    it("#2569 Big non-live doc_ids filter", () => {
        const docs = [];
        for (let i = 0; i < 5; i++) {
            let id = "";
            for (let j = 0; j < 50; j++) {
                // make a huge id
                id += util.btoa(Math.random().toString());
            }
            docs.push({ _id: id });
        }
        const db = new DB(dbName);
        return db.bulkDocs(docs).then(() => {
            return db.changes({
                doc_ids: [docs[1]._id, docs[3]._id]
            });
        }).then((changes) => {
            const ids = changes.results.map((x) => {
                return x.id;
            });
            const expectedIds = [docs[1]._id, docs[3]._id];
            assert.deepEqual(ids.sort(), expectedIds.sort());
        });
    });

    it("#2569 Live doc_ids filter", () => {
        const docs = [
            { _id: "0" },
            { _id: "1" },
            { _id: "2" },
            { _id: "3" }
        ];
        const db = new DB(dbName);
        return db.bulkDocs(docs).then(() => {
            return new Promise((resolve, reject) => {
                const retChanges = [];
                const changes = db.changes({
                    doc_ids: ["1", "3"],
                    live: true
                }).on("change", (change) => {
                    retChanges.push(change);
                    if (retChanges.length === 2) {
                        changes.cancel();
                        resolve(retChanges);
                    }
                }).on("error", reject);
            });
        }).then((changes) => {
            const ids = changes.map((x) => {
                return x.id;
            });
            const expectedIds = ["1", "3"];
            assert.deepEqual(ids.sort(), expectedIds);
        });
    });

    it("#2569 Big live doc_ids filter", () => {
        const docs = [];
        for (let i = 0; i < 5; i++) {
            let id = "";
            for (let j = 0; j < 50; j++) {
                // make a huge id
                id += util.btoa(Math.random().toString());
            }
            docs.push({ _id: id });
        }
        const db = new DB(dbName);
        return db.bulkDocs(docs).then(() => {
            return new Promise((resolve, reject) => {
                const retChanges = [];
                const changes = db.changes({
                    doc_ids: [docs[1]._id, docs[3]._id],
                    live: true
                }).on("change", (change) => {
                    retChanges.push(change);
                    if (retChanges.length === 2) {
                        changes.cancel();
                        resolve(retChanges);
                    }
                }).on("error", reject);
            });
        }).then((changes) => {
            const ids = changes.map((x) => {
                return x.id;
            });
            const expectedIds = [docs[1]._id, docs[3]._id];
            assert.deepEqual(ids.sort(), expectedIds.sort());
        });
    });

    it("#2569 Non-live doc_ids filter with filter=_doc_ids", () => {
        const docs = [
            { _id: "0" },
            { _id: "1" },
            { _id: "2" },
            { _id: "3" }
        ];
        const db = new DB(dbName);
        return db.bulkDocs(docs).then(() => {
            return db.changes({
                filter: "_doc_ids",
                doc_ids: ["1", "3"]
            });
        }).then((changes) => {
            const ids = changes.results.map((x) => {
                return x.id;
            });
            assert.deepEqual(ids.sort(), ["1", "3"]);
        });
    });

    it("#2569 Live doc_ids filter with filter=_doc_ids", () => {
        const docs = [
            { _id: "0" },
            { _id: "1" },
            { _id: "2" },
            { _id: "3" }
        ];
        const db = new DB(dbName);
        return db.bulkDocs(docs).then(() => {
            return db.changes({
                filter: "_doc_ids",
                doc_ids: ["1", "3"]
            });
        }).then((changes) => {
            const ids = changes.results.map((x) => {
                return x.id;
            });
            assert.deepEqual(ids.sort(), ["1", "3"]);
        });
    });

    it("Changes to same doc are grouped", (done) => {
        const docs1 = [
            { _id: "0", integer: 0 },
            { _id: "1", integer: 1 },
            { _id: "2", integer: 2 },
            { _id: "3", integer: 3 }
        ];
        const docs2 = [
            { _id: "2", integer: 11 },
            { _id: "3", integer: 12 }
        ];
        const db = new DB(dbName);
        db.bulkDocs({ docs: docs1 }).then((info) => {
            docs2[0]._rev = info[2].rev;
            docs2[1]._rev = info[3].rev;
            db.put(docs2[0]).then(() => {
                db.put(docs2[1]).then(() => {
                    db.changes({
                        include_docs: true
                    }).on("complete", (changes) => {
                        assert.equal(changes.results.length, 4);

                        const second = findById(changes.results, "2");
                        assert.equal(second.changes.length, 1);
                        assert.equal(second.doc.integer, 11);
                        done();
                    }).on("error", done);
                });
            });
        });
    });

    it("Changes with conflicts are handled correctly", (testDone) => {
        const docs1 = [
            { _id: "0", integer: 0 },
            { _id: "1", integer: 1 },
            { _id: "2", integer: 2 },
            { _id: "3", integer: 3 }
        ];
        const docs2 = [
            { _id: "2", integer: 11 },
            { _id: "3", integer: 12 }
        ];
        const localdb = new DB(dbName);
        const remotedb = new DB(dbRemote);
        localdb.bulkDocs({ docs: docs1 }).then((info) => {
            docs2[0]._rev = info[2].rev;
            docs2[1]._rev = info[3].rev;
            return localdb.put(docs2[0]).then(() => {
                return localdb.put(docs2[1]).then((info) => {
                    const rev2 = info.rev;
                    return DB.replicate(localdb, remotedb).then(() => {
                        // update remote once, local twice, then replicate from
                        // remote to local so the remote losing conflict is later in
                        // the tree
                        return localdb.put({
                            _id: "3",
                            _rev: rev2,
                            integer: 20
                        }).then((resp) => {
                            const rev3Doc = {
                                _id: "3",
                                _rev: resp.rev,
                                integer: 30
                            };
                            return localdb.put(rev3Doc).then((resp) => {
                                const rev4local = resp.rev;
                                const rev4Doc = {
                                    _id: "3",
                                    _rev: rev2,
                                    integer: 100
                                };
                                return remotedb.put(rev4Doc).then((resp) => {
                                    const remoterev = resp.rev;
                                    return DB.replicate(remotedb, localdb).then(
                                        () => {
                                            return localdb.changes({
                                                include_docs: true,
                                                style: "all_docs",
                                                conflicts: true
                                            }).on("error", testDone)
                                                .then((changes) => {
                                                    assert.equal(changes.results.length, 4);
                                                    const ch = findById(changes.results, "3");
                                                    assert.equal(ch.changes.length, 2);
                                                    assert.equal(ch.doc.integer, 30);
                                                    assert.equal(ch.doc._rev, rev4local);
                                                    assert.deepEqual(ch.changes, [
                                                        { rev: rev4local },
                                                        { rev: remoterev }
                                                    ]);

                                                    assert.property(ch.doc, "_conflicts");
                                                    assert.equal(ch.doc._conflicts.length, 1);
                                                    assert.equal(ch.doc._conflicts[0], remoterev);
                                                });
                                        });
                                });
                            });
                        });
                    });
                });
            }).then(() => {
                testDone();
            }, testDone);
        });
    });

    it("Change entry for a deleted doc", (done) => {
        const docs1 = [
            { _id: "0", integer: 0 },
            { _id: "1", integer: 1 },
            { _id: "2", integer: 2 },
            { _id: "3", integer: 3 }
        ];
        const db = new DB(dbName);
        db.bulkDocs({ docs: docs1 }).then((info) => {
            const rev = info[3].rev;
            db.remove({
                _id: "3",
                _rev: rev
            }).then(() => {
                db.changes({
                    include_docs: true
                }).on("complete", (changes) => {
                    assert.equal(changes.results.length, 4);
                    const ch = findById(changes.results, "3");
                    assert.equal(ch.deleted, true);
                    done();
                }).on("error", done);
            });
        });
    });

    it("changes large number of docs", (done) => {
        const docs = [];
        const num = 30;
        for (let i = 0; i < num; i++) {
            docs.push({
                _id: `doc_${i}`,
                foo: `bar_${i}`
            });
        }
        const db = new DB(dbName);
        db.bulkDocs({ docs }).then(() => {
            db.changes().on("complete", (res) => {
                assert.equal(res.results.length, num);
                done();
            }).on("error", done);
        });
    });

    it("Calling db.changes({since: 'now'})", (done) => {
        const db = new DB(dbName);
        db.bulkDocs({ docs: [{ foo: "bar" }] }).then(() => {
            db.info().then(() => {
                const api = db.changes({
                    since: "now"
                }).on("complete", (res) => {
                    done();
                }).on("error", done);
                assert.isObject(api);
                assert.isFunction(api.cancel);
            });
        });
    });

    //Duplicate to make sure both api options work.
    it("Calling db.changes({since: 'latest'})", (done) => {
        const db = new DB(dbName);
        db.bulkDocs({ docs: [{ foo: "bar" }] }).then(() => {
            db.info().then(() => {
                const api = db.changes({
                    since: "latest"
                }).on("complete", (res) => {
                    done();
                }).on("error", done);
                assert.isObject(api);
                assert.isFunction(api.cancel);
            });
        });
    });

    it("Closing db does not cause a crash if changes cancelled", (done) => {
        const db = new DB(dbName);
        let called = 0;
        const checkDone = () => {
            called++;
            if (called === 2) {
                done();
            }
        };
        db.bulkDocs({ docs: [{ foo: "bar" }] }).then(() => {
            const changes = db.changes({
                live: true
            }).on("complete", (result) => {
                assert.equal(result.status, "cancelled");
                checkDone();
            });
            assert.exists(changes);
            assert.isFunction(changes.cancel);
            changes.cancel();
            db.close().then(() => {
                checkDone();
            });
        });
    });

    it("fire-complete-on-cancel", (done) => {
        const db = new DB(dbName);
        let cancelled = false;
        const changes = db.changes({
            live: true
        }).on("complete", (result) => {
            assert.equal(cancelled, true);
            assert.exists(result);
            if (result) {
                assert.equal(result.status, "cancelled");
            }
            done();
        }).on("error", done);
        assert.exists(changes);
        assert.isFunction(changes.cancel);
        setTimeout(() => {
            cancelled = true;
            changes.cancel();
        }, 100);
    });

    it("changes are not duplicated", (done) => {
        const db = new DB(dbName);
        let called = 0;
        const changes = db.changes({
            live: true
        }).on("change", () => {
            called++;
            if (called === 1) {
                setTimeout(() => {
                    changes.cancel();
                }, 1000);
            }
        }).on("complete", () => {
            assert.equal(called, 1);
            done();
        });
        db.post({ key: "value" });
    });

    it("supports return_docs=false", (done) => {
        const db = new DB(dbName);
        const docs = [];
        const num = 10;
        for (let i = 0; i < num; i++) {
            docs.push({ _id: `doc_${i}` });
        }
        let changes = 0;
        db.bulkDocs({ docs }).then(() => {
            db.changes({
                descending: true,
                return_docs: false
            }).on("change", () => {
                changes++;
            }).on("complete", (results) => {
                assert.lengthOf(results.results, 0, "0 results returned");
                assert.equal(changes, num, "correct number of changes");
                done();
            }).on("error", (err) => {
                done(err);
            });
        });
    });

    // TODO: Remove 'returnDocs' in favor of 'return_docs' in a future release
    it("supports returnDocs=false", (done) => {
        const db = new DB(dbName);
        const docs = [];
        const num = 10;
        for (let i = 0; i < num; i++) {
            docs.push({ _id: `doc_${i}` });
        }
        let changes = 0;
        db.bulkDocs({ docs }).then(() => {
            db.changes({
                descending: true,
                returnDocs: false
            }).on("change", () => {
                changes++;
            }).on("complete", (results) => {
                assert.lengthOf(results.results, 0, "0 results returned");
                assert.equal(changes, num, "correct number of changes");
                done();
            }).on("error", (err) => {
                done(err);
            });
        });
    });

    it("should respects limit", (done) => {
        const docs1 = [
            { _id: "_local/foo" },
            { _id: "a", integer: 0 },
            { _id: "b", integer: 1 },
            { _id: "c", integer: 2 },
            { _id: "d", integer: 3 }
        ];
        let called = 0;
        const db = new DB(dbName);
        db.bulkDocs({ docs: docs1 }).then(() => {
            db.changes({
                limit: 1
            }).on("change", () => {
                assert.equal((called++), 0);
            }).on("complete", () => {
                setTimeout(() => {
                    done();
                }, 50);
            });
        });
    });

    it("doesn't throw if opts.complete is undefined", (done) => {
        const db = new DB(dbName);
        db.put({ _id: "foo" }).then(() => {
            db.changes().on("change", () => {
                done();
            }).on("error", (err) => {
                done(err);
            });
        }, done);
    });

    it("it handles a bunch of individual changes in live replication", (done) => {
        const db = new DB(dbName);
        const len = 80;
        let called = 0;
        let changesDone = false;
        let changesWritten = 0;
        const changes = db.changes({ live: true });

        changes.on("change", () => {
            called++;
            if (called === len) {
                changes.cancel();
            }
        }).on("error", done).on("complete", () => {
            changesDone = true;
            maybeDone();
        });

        let i = -1;

        const maybeDone = () => {
            if (changesDone && changesWritten === len) {
                done();
            }
        };

        const after = () => {
            changesWritten++;
            assert.isBelow(db.listeners("destroyed").length, 5);
            maybeDone();
        };

        while (++i < len) {
            db.post({}).then(after).catch(done);
        }

    });

    it("changes-filter without filter", (done) => {
        const docs1 = [
            { _id: "0", integer: 0 },
            { _id: "1", integer: 1 },
            { _id: "2", integer: 2 },
            { _id: "3", integer: 3 }
        ];
        const docs2 = [
            { _id: "4", integer: 4 },
            { _id: "5", integer: 5 },
            { _id: "6", integer: 6 },
            { _id: "7", integer: 7 }
        ];
        const db = new DB(dbName);
        let count = 0;
        db.bulkDocs({ docs: docs1 }).then(() => {
            const changes = db.changes({
                live: true
            }).on("complete", (result) => {
                assert.equal(result.status, "cancelled");
                done();
            }).on("change", () => {
                count += 1;
                if (count === 8) {
                    changes.cancel();
                }
            }).on("error", done);
            db.bulkDocs({ docs: docs2 });
        });
    });


    it("#3539 - Exception in changes is fine", (done) => {
        const db = new DB(dbName);
        let count = 0;

        const changes = db.changes({ live: true });

        changes.on("change", () => {
            ++count;
            if (count === 1) {
                throw new Error("deliberate error in changes");
            } else if (count === 3) {
                changes.cancel();
            }
        });

        changes.on("complete", () => {
            done();
        });

        db.post({ test: "some stuff" }).then(() => {
            return db.post({ test: "more stuff" });
        }).then(() => {
            db.post({ test: "and more stuff" });
        });
    });

    it("Changes with selector", (done) => {
        const docs = [
            { _id: "0", user: "foo" },
            { _id: "1", user: "bar" },
            { _id: "2", user: "foo" }
        ];
        const db = new DB(dbName);

        db.bulkDocs({ docs }).then(() => {
            db.changes({
                selector: { user: "foo" },
                include_docs: true
            }).on("complete", (results) => {
                assert.equal(results.results.length, 2);
                const first = findById(results.results, "0");
                assert.equal(first.doc.user, "foo");
                const second = findById(results.results, "2");
                assert.equal(second.doc.user, "foo");
                done();
            }).on("error", done);
        });
    });

    it("Changes with selector, explicit filter", (done) => {
        const docs = [
            { _id: "0", user: "foo" },
            { _id: "1", user: "bar" },
            { _id: "2", user: "foo" }
        ];
        const db = new DB(dbName);

        db.bulkDocs({ docs }).then(() => {
            db.changes({
                selector: { user: "foo" },
                filter: "_selector",
                include_docs: true
            }).on("complete", (results) => {
                assert.equal(results.results.length, 2);
                const first = findById(results.results, "0");
                assert.equal(first.doc.user, "foo");
                const second = findById(results.results, "2");
                assert.equal(second.doc.user, "foo");
                done();
            }).on("error", done);
        });
    });

    it("Changes with selector and mismatched filter", (done) => {
        const db = new DB(dbName);

        db.changes({
            selector: { user: "foo" },
            filter() {
                return false;
            }
        }).on("complete", () => {
            done("expected failure");
        }).on("error", (err) => {
            assert.equal(err.message, 'selector invalid for filter "function"');
            done();
        });
    });

    it("Changes with limit and selector", (done) => {
        const docs = [
            { _id: "0", user: "foo" },
            { _id: "1", user: "bar" },
            { _id: "2", user: "foo" }
        ];
        const db = new DB(dbName);

        db.bulkDocs({ docs }).then(() => {
            return db.changes({
                limit: 1,
                selector: { user: "foo" },
                include_docs: true
            }).on("complete", (results) => {
                assert.equal(results.results.length, 1);
                const first = results.results[0].doc;
                const last_seq = results.last_seq;

                return db.changes({
                    limit: 1,
                    selector: { user: "foo" },
                    include_docs: true,
                    since: last_seq
                }).on("complete", (results) => {
                    assert.equal(results.results.length, 1);
                    const second = results.results[0].doc;

                    assert.notEqual(first._id, second._id);
                    assert.equal(first.user, "foo");
                    assert.equal(second.user, "foo");
                    done();
                }).on("error", done)
                    .catch(done);
            }).on("error", done);
        }).catch(done);
    });
});
