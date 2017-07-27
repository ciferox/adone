require("./node.setup");

const adapters = ["http", "local"];

adapters.forEach((adapter) => {
    describe(`test.revs_diff.js-${adapter}`, () => {

        const dbs = {};

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl(adapter, "testdb");
            testUtils.cleanup([dbs.name], done);
        });

        afterEach((done) => {
            testUtils.cleanup([dbs.name], done);
        });


        it("Test revs diff", (done) => {
            const db = new PouchDB(dbs.name, { auto_compaction: false });
            const revs = [];
            db.post({
                test: "somestuff",
                _id: "somestuff"
            }, (err, info) => {
                revs.push(info.rev);
                db.put({
                    _id: info.id,
                    _rev: info.rev,
                    another: "test"
                }, (err, info2) => {
                    revs.push(info2.rev);
                    db.revsDiff({ somestuff: revs }, (err, results) => {
                        assert.notInclude(Object.keys(results), "somestuff");
                        revs.push("2-randomid");
                        db.revsDiff({ somestuff: revs }, (err, results) => {
                            assert.include(Object.keys(results), "somestuff");
                            assert.lengthOf(results.somestuff.missing, 1);
                            done();
                        });
                    });
                });
            });
        });

        it("Test revs diff with opts object", (done) => {
            const db = new PouchDB(dbs.name, { auto_compaction: false });
            const revs = [];
            db.post({
                test: "somestuff",
                _id: "somestuff"
            }, (err, info) => {
                revs.push(info.rev);
                db.put({
                    _id: info.id,
                    _rev: info.rev,
                    another: "test"
                }, (err, info2) => {
                    revs.push(info2.rev);
                    db.revsDiff({ somestuff: revs }, {}, (err, results) => {
                        assert.notInclude(Object.keys(results), "somestuff");
                        revs.push("2-randomid");
                        db.revsDiff({ somestuff: revs }, (err, results) => {
                            assert.include(Object.keys(results), "somestuff");
                            assert.lengthOf(results.somestuff.missing, 1);
                            done();
                        });
                    });
                });
            });
        });

        it("Missing docs should be returned with all revisions", (done) => {
            const db = new PouchDB(dbs.name);
            const revs = ["1-a", "2-a", "2-b"];
            db.revsDiff({ foo: revs }, (err, results) => {
                assert.include(Object.keys(results), "foo");
                assert.deepEqual(results.foo.missing, revs, "listed all revs");
                done();
            });
        });

        it("Conflicting revisions that are available", (done) => {
            const doc = { _id: "939", _rev: "1-a" };
            function createConflicts(db, callback) {
                db.put(doc, { new_edits: false }, () => {
                    testUtils.putAfter(db, {
                        _id: "939",
                        _rev: "2-a"
                    }, "1-a", () => {
                        testUtils.putAfter(db, {
                            _id: "939",
                            _rev: "2-b"
                        }, "1-a", callback);
                    });
                });
            }
            const db = new PouchDB(dbs.name, { auto_compaction: false });
            createConflicts(db, () => {
                db.revsDiff({ 939: ["1-a", "2-a", "2-b"] }, (err, results) => {
                    assert.notInclude(Object.keys(results), "939");
                    done();
                });
            });
        });

        it("Deleted revisions that are available", (done) => {
            function createDeletedRevision(db, callback) {
                db.put({
                    _id: "935",
                    _rev: "1-a"
                }, { new_edits: false }, () => {
                    testUtils.putAfter(db, {
                        _id: "935",
                        _rev: "2-a",
                        _deleted: true
                    }, "1-a", callback);
                });
            }
            const db = new PouchDB(dbs.name);
            createDeletedRevision(db, () => {
                db.revsDiff({ 935: ["1-a", "2-a"] }, (err, results) => {
                    assert.notInclude(Object.keys(results), "939");
                    done();
                });
            });
        });

        it("Revs diff with empty revs", () => {
            const db = new PouchDB(dbs.name);
            return db.revsDiff({}).then((res) => {
                assert.exists(res);
            });
        });

        it("Test revs diff with reserved ID", (done) => {
            const db = new PouchDB(dbs.name, { auto_compaction: false });
            const revs = [];
            db.post({
                test: "constructor",
                _id: "constructor"
            }, (err, info) => {
                revs.push(info.rev);
                db.put({
                    _id: info.id,
                    _rev: info.rev,
                    another: "test"
                }, (err, info2) => {
                    revs.push(info2.rev);
                    db.revsDiff({ constructor: revs }, (err, results) => {
                        assert.notInclude(Object.keys(results), "constructor");
                        revs.push("2-randomid");
                        db.revsDiff({ constructor: revs }, (err, results) => {
                            assert.include(Object.keys(results), "constructor");
                            assert.lengthOf(results.constructor.missing, 1);
                            done();
                        });
                    });
                });
            });
        });

    });
});
