require("./node.setup");

describe("db", "pouch", "db.allDocs()", () => {
    let dbs = {};
    beforeEach((done) => {
        dbs = { name: testUtils.adapterUrl("local", "testdb") };
        testUtils.cleanup([dbs.name], done);
    });

    afterEach((done) => {
        testUtils.cleanup([dbs.name], done);
    });


    const origDocs = [
        { _id: "0", a: 1, b: 1 },
        { _id: "3", a: 4, b: 16 },
        { _id: "1", a: 2, b: 4 },
        { _id: "2", a: 3, b: 9 }
    ];

    it("Testing all docs", (done) => {
        const db = new PouchDB(dbs.name);
        testUtils.writeDocs(db, JSON.parse(JSON.stringify(origDocs)),
            () => {
                db.allDocs((err, result) => {
                    assert.isNull(err);
                    const rows = result.rows;
                    assert.equal(result.total_rows, 4, "correct number of results");
                    for (let i = 0; i < rows.length; i++) {
                        assert.isAtLeast(Number.parseInt(rows[i].id), 0);
                        assert.isAtMost(Number.parseInt(rows[i].id), 4);
                    }
                    db.allDocs({
                        startkey: "2",
                        include_docs: true
                    }, (err, all) => {
                        assert.lengthOf(all.rows, 2, "correct number when opts.startkey set");
                        assert.equal(all.rows[0].id, "2", "correct docs when opts.startkey set");
                        const opts = {
                            startkey: "org.couchdb.user:",
                            endkey: "org.couchdb.user;"
                        };
                        db.allDocs(opts, (err, raw) => {
                            assert.lengthOf(raw.rows, 0, "raw collation");
                            let ids = ["0", "3", "1", "2"];
                            db.changes().on("complete", (changes) => {
                                // order of changes is not guaranteed in a
                                // clustered changes feed
                                changes.results.forEach((row) => {
                                    assert.include(ids, row.id, "seq order");
                                });
                                db.changes({
                                    descending: true
                                }).on("complete", (changes) => {
                                    // again, order is not guaranteed so
                                    // unsure if this is a useful test
                                    ids = ["2", "1", "3", "0"];
                                    changes.results.forEach((row) => {
                                        assert.include(ids, row.id, "descending=true");
                                    });
                                    done();
                                }).on("error", done);
                            }).on("error", done);
                        });
                    });
                });
            });
    });

    it("Testing allDocs opts.keys", () => {
        const db = new PouchDB(dbs.name);
        function keyFunc(doc) {
            return doc.key;
        }
        let keys;
        return db.bulkDocs(origDocs).then(() => {
            keys = ["3", "1"];
            return db.allDocs({ keys });
        }).then((result) => {
            assert.deepEqual(result.rows.map(keyFunc), keys);
            keys = ["2", "0", "1000"];
            return db.allDocs({ keys });
        }).then((result) => {
            assert.deepEqual(result.rows.map(keyFunc), keys);
            assert.equal(result.rows[2].error, "not_found");
            return db.allDocs({
                keys,
                descending: true
            });
        }).then((result) => {
            assert.deepEqual(result.rows.map(keyFunc), ["1000", "0", "2"]);
            assert.equal(result.rows[0].error, "not_found");
            return db.allDocs({
                keys,
                startkey: "a"
            });
        }).then(() => {
            throw new Error("expected an error");
        }, (err) => {
            assert.exists(err);
            return db.allDocs({
                keys,
                endkey: "a"
            });
        }).then(() => {
            throw new Error("expected an error");
        }, (err) => {
            assert.exists(err);
            return db.allDocs({ keys: [] });
        }).then((result) => {
            assert.lengthOf(result.rows, 0);
            return db.get("2");
        }).then((doc) => {
            return db.remove(doc);
        }).then(() => {
            return db.allDocs({
                keys,
                include_docs: true
            });
        }).then((result) => {
            assert.deepEqual(result.rows.map(keyFunc), keys);
        });
    });

    it("Testing allDocs opts.keys with skip", () => {
        const db = new PouchDB(dbs.name);
        return db.bulkDocs(origDocs).then(() => {
            return db.allDocs({
                keys: ["3", "1"],
                skip: 1
            });
        }).then((res) => {
            assert.equal(res.total_rows, 4);
            assert.lengthOf(res.rows, 1);
            assert.equal(res.rows[0].id, "1");
        });
    });

    it("Testing allDocs invalid opts.keys", () => {
        const db = new PouchDB(dbs.name);
        return db.allDocs({ keys: 1234 }).then(() => {
            throw new Error("should not be here");
        }).catch((err) => {
            assert.exists(err);
        });
    });

    it("Testing deleting in changes", (done) => {
        const db = new PouchDB(dbs.name);

        db.info((err, info) => {
            const update_seq = info.update_seq;

            testUtils.writeDocs(db, JSON.parse(JSON.stringify(origDocs)),
                () => {
                    db.get("1", (err, doc) => {
                        db.remove(doc, (err, deleted) => {
                            assert.exists(deleted.ok);

                            db.changes({
                                since: update_seq
                            }).on("complete", (changes) => {
                                const deleted_ids = changes.results.map((c) => {
                                    if (c.deleted) {
                                        return c.id;
                                    }
                                });
                                assert.include(deleted_ids, "1");

                                done();
                            }).on("error", done);
                        });
                    });
                });
        });
    });

    it("Testing updating in changes", (done) => {
        const db = new PouchDB(dbs.name);

        db.info((err, info) => {
            const update_seq = info.update_seq;

            testUtils.writeDocs(db, JSON.parse(JSON.stringify(origDocs)),
                () => {
                    db.get("3", (err, doc) => {
                        doc.updated = "totally";
                        db.put(doc, () => {
                            db.changes({
                                since: update_seq
                            }).on("complete", (changes) => {
                                const ids = changes.results.map((c) => {
                                    return c.id;
                                });
                                assert.include(ids, "3");

                                done();
                            }).on("error", done);
                        });
                    });
                });
        });
    });

    it("Testing include docs", (done) => {
        const db = new PouchDB(dbs.name);
        testUtils.writeDocs(db, JSON.parse(JSON.stringify(origDocs)),
            () => {
                db.changes({
                    include_docs: true
                }).on("complete", (changes) => {
                    changes.results.forEach((row) => {
                        if (row.id === "0") {
                            assert.equal(row.doc.a, 1);
                        }
                    });
                    done();
                }).on("error", done);
            });
    });

    it("Testing conflicts", (done) => {
        const db = new PouchDB(dbs.name);
        testUtils.writeDocs(db, JSON.parse(JSON.stringify(origDocs)),
            () => {
                // add conflicts
                const conflictDoc1 = {
                    _id: "3",
                    _rev: "2-aa01552213fafa022e6167113ed01087",
                    value: "X"
                };
                const conflictDoc2 = {
                    _id: "3",
                    _rev: "2-ff01552213fafa022e6167113ed01087",
                    value: "Z"
                };
                db.put(conflictDoc1, { new_edits: false }, () => {
                    db.put(conflictDoc2, { new_edits: false }, () => {
                        db.get("3", (err, winRev) => {
                            assert.equal(winRev._rev, conflictDoc2._rev);
                            db.changes({
                                include_docs: true,
                                conflicts: true,
                                style: "all_docs"
                            }).on("complete", (changes) => {
                                assert.deepEqual(changes.results.map((x) => {
                                    return x.id;
                                }).sort(), ["0", "1", "2", "3"], "all ids are in _changes");

                                const result = changes.results.filter((row) => {
                                    return row.id === "3";
                                })[0];

                                assert.lengthOf(result.changes, 3, "correct number of changes");
                                assert.equal(result.doc._rev, conflictDoc2._rev);
                                assert.equal(result.doc._id, "3", "correct doc id");
                                assert.equal(winRev._rev, result.doc._rev);
                                assert.instanceOf(result.doc._conflicts, Array);
                                assert.lengthOf(result.doc._conflicts, 2);
                                assert.equal(conflictDoc1._rev, result.doc._conflicts[0]);

                                db.allDocs({
                                    include_docs: true,
                                    conflicts: true
                                }, (err, res) => {
                                    const row = res.rows[3];
                                    assert.lengthOf(res.rows, 4, "correct number of changes");
                                    assert.equal(row.key, "3", "correct key");
                                    assert.equal(row.id, "3", "correct id");
                                    assert.equal(row.value.rev, winRev._rev, "correct rev");
                                    assert.equal(row.doc._rev, winRev._rev, "correct rev");
                                    assert.equal(row.doc._id, "3", "correct order");
                                    assert.instanceOf(row.doc._conflicts, Array);
                                    assert.lengthOf(row.doc._conflicts, 2);
                                    assert.equal(conflictDoc1._rev, res.rows[3].doc._conflicts[0]);
                                    done();
                                });
                            }).on("error", done);
                        });
                    });
                });
            });
    });

    it("test basic collation", (done) => {
        const db = new PouchDB(dbs.name);
        const docs = {
            docs: [
                { _id: "z", foo: "z" },
                { _id: "a", foo: "a" }
            ]
        };
        db.bulkDocs(docs, () => {
            db.allDocs({
                startkey: "z",
                endkey: "z"
            }, (err, result) => {
                assert.lengthOf(result.rows, 1, "Exclude a result");
                done();
            });
        });
    });

    it("3883 start_key end_key aliases", () => {
        const db = new PouchDB(dbs.name);
        const docs = [{ _id: "a", foo: "a" }, { _id: "z", foo: "z" }];
        return db.bulkDocs(docs).then(() => {
            return db.allDocs({ start_key: "z", end_key: "z" });
        }).then((result) => {
            assert.lengthOf(result.rows, 1, "Exclude a result");
        });
    });

    it("test total_rows with a variety of criteria", function (done) {
        this.timeout(20000);
        const db = new PouchDB(dbs.name);

        const docs = [
            { _id: "0" },
            { _id: "1" },
            { _id: "2" },
            { _id: "3" },
            { _id: "4" },
            { _id: "5" },
            { _id: "6" },
            { _id: "7" },
            { _id: "8" },
            { _id: "9" }
        ];
        db.bulkDocs({ docs }).then((res) => {
            docs[3]._deleted = true;
            docs[7]._deleted = true;
            docs[3]._rev = res[3].rev;
            docs[7]._rev = res[7].rev;
            return db.remove(docs[3]);
        }).then(() => {
            return db.remove(docs[7]);
        }).then(() => {
            return db.allDocs();
        }).then((res) => {
            assert.lengthOf(res.rows, 8, "correctly return rows");
            assert.equal(res.total_rows, 8, "correctly return total_rows");
            return db.allDocs({ startkey: "5" });
        }).then((res) => {
            assert.lengthOf(res.rows, 4, "correctly return rows");
            assert.equal(res.total_rows, 8, "correctly return total_rows");
            return db.allDocs({ startkey: "5", skip: 2, limit: 10 });
        }).then((res) => {
            assert.lengthOf(res.rows, 2, "correctly return rows");
            assert.equal(res.total_rows, 8, "correctly return total_rows");
            return db.allDocs({ startkey: "5", limit: 0 });
        }).then((res) => {
            assert.lengthOf(res.rows, 0, "correctly return rows, startkey w/ limit=0");
            assert.equal(res.total_rows, 8, "correctly return total_rows");
            return db.allDocs({ keys: ["5"], limit: 0 });
        }).then((res) => {
            assert.lengthOf(res.rows, 0, "correctly return rows, keys w/ limit=0");
            assert.equal(res.total_rows, 8, "correctly return total_rows");
            return db.allDocs({ limit: 0 });
        }).then((res) => {
            assert.lengthOf(res.rows, 0, "correctly return rows, limit=0");
            assert.equal(res.total_rows, 8, "correctly return total_rows");
            return db.allDocs({ startkey: "5", descending: true, skip: 1 });
        }).then((res) => {
            assert.lengthOf(res.rows, 4, "correctly return rows");
            assert.equal(res.total_rows, 8, "correctly return total_rows");
            return db.allDocs({ startkey: "5", endkey: "z" });
        }).then((res) => {
            assert.lengthOf(res.rows, 4, "correctly return rows");
            assert.equal(res.total_rows, 8, "correctly return total_rows");
            return db.allDocs({ startkey: "5", endkey: "5" });
        }).then((res) => {
            assert.lengthOf(res.rows, 1, "correctly return rows");
            assert.equal(res.total_rows, 8, "correctly return total_rows");
            return db.allDocs({ startkey: "5", endkey: "4" });
        }).then((res) => {
            assert.lengthOf(res.rows, 0, "correctly return rows");
            assert.equal(res.total_rows, 8, "correctly return total_rows");
            return db.allDocs({ startkey: "5", endkey: "4", descending: true });
        }).then((res) => {
            assert.lengthOf(res.rows, 2, "correctly return rows");
            assert.equal(res.total_rows, 8, "correctly return total_rows");
            return db.allDocs({ startkey: "3", endkey: "7", descending: false });
        }).then((res) => {
            assert.lengthOf(res.rows, 3, "correctly return rows");
            assert.equal(res.total_rows, 8, "correctly return total_rows");
            return db.allDocs({ startkey: "7", endkey: "3", descending: true });
        }).then((res) => {
            assert.lengthOf(res.rows, 3, "correctly return rows");
            assert.equal(res.total_rows, 8, "correctly return total_rows");
            return db.allDocs({ startkey: "", endkey: "0" });
        }).then((res) => {
            assert.lengthOf(res.rows, 1, "correctly return rows");
            assert.equal(res.total_rows, 8, "correctly return total_rows");
            return db.allDocs({ keys: ["0", "1", "3"] });
        }).then((res) => {
            assert.lengthOf(res.rows, 3, "correctly return rows");
            assert.equal(res.total_rows, 8, "correctly return total_rows");
            return db.allDocs({ keys: ["0", "1", "0", "2", "1", "1"] });
        }).then((res) => {
            assert.lengthOf(res.rows, 6, "correctly return rows");
            assert.deepEqual(res.rows.map((row) => {
                return row.key;
            }), ["0", "1", "0", "2", "1", "1"]);
            assert.equal(res.total_rows, 8, "correctly return total_rows");
            return db.allDocs({ keys: [] });
        }).then((res) => {
            assert.lengthOf(res.rows, 0, "correctly return rows");
            assert.equal(res.total_rows, 8, "correctly return total_rows");
            return db.allDocs({ keys: ["7"] });
        }).then((res) => {
            assert.lengthOf(res.rows, 1, "correctly return rows");
            assert.equal(res.total_rows, 8, "correctly return total_rows");
            return db.allDocs({ key: "3" });
        }).then((res) => {
            assert.lengthOf(res.rows, 0, "correctly return rows");
            assert.equal(res.total_rows, 8, "correctly return total_rows");
            return db.allDocs({ key: "2" });
        }).then((res) => {
            assert.lengthOf(res.rows, 1, "correctly return rows");
            assert.equal(res.total_rows, 8, "correctly return total_rows");
            return db.allDocs({ key: "z" });
        }).then((res) => {
            assert.lengthOf(res.rows, 0, "correctly return rows");
            assert.equal(res.total_rows, 8, "correctly return total_rows");
            done();
        }, done);

    });

    it("test total_rows with both skip and limit", (done) => {
        const db = new PouchDB(dbs.name);
        const docs = {
            docs: [
                { _id: "w", foo: "w" },
                { _id: "x", foo: "x" },
                { _id: "y", foo: "y" },
                { _id: "z", foo: "z" }
            ]
        };
        db.bulkDocs(docs, () => {
            db.allDocs({ startkey: "x", limit: 1, skip: 1 }, (err, res) => {
                assert.equal(res.total_rows, 4, "Accurately return total_rows count");
                assert.lengthOf(res.rows, 1, "Correctly limit the returned rows");
                assert.equal(res.rows[0].id, "y", "Correctly skip 1 doc");

                db.get("x", (err, xDoc) => {
                    db.remove(xDoc, () => {
                        db.allDocs({ startkey: "w", limit: 2, skip: 1 }, (err, res) => {
                            assert.equal(res.total_rows, 3, "Accurately return total_rows count after delete");
                            assert.lengthOf(res.rows, 2, "Correctly limit the returned rows after delete");
                            assert.equal(res.rows[0].id, "y", "Correctly skip 1 doc after delete");
                            done();
                        });
                    });
                });
            });
        });
    });

    it("test limit option and total_rows", (done) => {
        const db = new PouchDB(dbs.name);
        const docs = {
            docs: [
                { _id: "z", foo: "z" },
                { _id: "a", foo: "a" }
            ]
        };
        db.bulkDocs(docs, () => {
            db.allDocs({
                startkey: "a",
                limit: 1
            }, (err, res) => {
                assert.equal(res.total_rows, 2, "Accurately return total_rows count");
                assert.lengthOf(res.rows, 1, "Correctly limit the returned rows.");
                done();
            });
        });
    });

    it("test escaped startkey/endkey", (done) => {
        const db = new PouchDB(dbs.name);
        const id1 = '"weird id!" a';
        const id2 = '"weird id!" z';
        const docs = {
            docs: [
                {
                    _id: id1,
                    foo: "a"
                },
                {
                    _id: id2,
                    foo: "z"
                }
            ]
        };
        db.bulkDocs(docs, () => {
            db.allDocs({
                startkey: id1,
                endkey: id2
            }, (err, res) => {
                assert.equal(res.total_rows, 2, "Accurately return total_rows count");
                done();
            });
        });
    });

    it('test "key" option', (done) => {
        const db = new PouchDB(dbs.name);
        db.bulkDocs({
            docs: [
                { _id: "0" },
                { _id: "1" },
                { _id: "2" }
            ]
        }, (err) => {
            assert.isNull(err);
            db.allDocs({ key: "1" }, (err, res) => {
                assert.lengthOf(res.rows, 1, "key option returned 1 doc");
                db.allDocs({
                    key: "1",
                    keys: [
                        "1",
                        "2"
                    ]
                }, (err) => {
                    assert.exists(err);
                    db.allDocs({
                        key: "1",
                        startkey: "1"
                    }, (err) => {
                        assert.isNull(err);
                        db.allDocs({
                            key: "1",
                            endkey: "1"
                        }, (err) => {
                            assert.isNull(err);
                            // when mixing key/startkey or key/endkey, the results
                            // are very weird and probably undefined, so don't go beyond
                            // verifying that there's no error
                            done();
                        });
                    });
                });
            });
        });
    });

    it("test inclusive_end=false", () => {
        const db = new PouchDB(dbs.name);
        const docs = [
            { _id: "1" },
            { _id: "2" },
            { _id: "3" },
            { _id: "4" }
        ];
        return db.bulkDocs({ docs }).then(() => {
            return db.allDocs({ inclusive_end: false, endkey: "2" });
        }).then((res) => {
            assert.lengthOf(res.rows, 1);
            return db.allDocs({ inclusive_end: false, endkey: "1" });
        }).then((res) => {
            assert.lengthOf(res.rows, 0);
            return db.allDocs({
                inclusive_end: false, endkey: "1",
                startkey: "0"
            });
        }).then((res) => {
            assert.lengthOf(res.rows, 0);
            return db.allDocs({ inclusive_end: false, endkey: "5" });
        }).then((res) => {
            assert.lengthOf(res.rows, 4);
            return db.allDocs({ inclusive_end: false, endkey: "4" });
        }).then((res) => {
            assert.lengthOf(res.rows, 3);
            return db.allDocs({
                inclusive_end: false, endkey: "4",
                startkey: "3"
            });
        }).then((res) => {
            assert.lengthOf(res.rows, 1);
            return db.allDocs({
                inclusive_end: false, endkey: "1",
                descending: true
            });
        }).then((res) => {
            assert.lengthOf(res.rows, 3);
            return db.allDocs({ inclusive_end: true, endkey: "4" });
        }).then((res) => {
            assert.lengthOf(res.rows, 4);
            return db.allDocs({
                descending: true,
                startkey: "3",
                endkey: "2",
                inclusive_end: false
            });
        }).then((res) => {
            assert.lengthOf(res.rows, 1);
        });
    });

    it("test descending with startkey/endkey", () => {
        const db = new PouchDB(dbs.name);
        return db.bulkDocs([
            { _id: "a" },
            { _id: "b" },
            { _id: "c" },
            { _id: "d" },
            { _id: "e" }
        ]).then(() => {
            return db.allDocs({
                descending: true,
                startkey: "d",
                endkey: "b"
            });
        }).then((res) => {
            const ids = res.rows.map((x) => {
                return x.id;
            });
            assert.deepEqual(ids, ["d", "c", "b"]);
            return db.allDocs({
                descending: true,
                startkey: "d",
                endkey: "b",
                inclusive_end: false
            });
        }).then((res) => {
            const ids = res.rows.map((x) => {
                return x.id;
            });
            assert.deepEqual(ids, ["d", "c"]);
            return db.allDocs({
                descending: true,
                startkey: "d",
                endkey: "a",
                skip: 1,
                limit: 2
            });
        }).then((res) => {
            const ids = res.rows.map((x) => {
                return x.id;
            });
            assert.deepEqual(ids, ["c", "b"]);
            return db.allDocs({
                descending: true,
                startkey: "d",
                endkey: "a",
                skip: 1
            });
        }).then((res) => {
            const ids = res.rows.map((x) => {
                return x.id;
            });
            assert.deepEqual(ids, ["c", "b", "a"]);
        });
    });

    it("#3082 test wrong num results returned", () => {
        const db = new PouchDB(dbs.name);
        const docs = [];
        for (let i = 0; i < 1000; i++) {
            docs.push({});
        }

        let lastkey;
        const allkeys = [];

        function paginate() {
            const opts = { include_doc: true, limit: 100 };
            if (lastkey) {
                opts.startkey = lastkey;
                opts.skip = 1;
            }
            return db.allDocs(opts).then((res) => {
                if (!res.rows.length) {
                    return;
                }
                if (lastkey) {
                    // assert.isAbove(res.rows[0].key, lastkey);
                }
                assert.lengthOf(res.rows, 100);
                lastkey = res.rows.pop().key;
                allkeys.push(lastkey);
                return paginate();
            });
        }

        return db.bulkDocs(docs).then(() => {
            return paginate().then(() => {
                // try running all queries at once to try to isolate race condition
                return Promise.all(allkeys.map((key) => {
                    return db.allDocs({
                        limit: 100,
                        include_docs: true,
                        startkey: key,
                        skip: 1
                    }).then((res) => {
                        if (!res.rows.length) {
                            return;
                        }
                        // assert.isAbove(res.rows[0].key, key);
                        assert.lengthOf(res.rows, 100);
                    });
                }));
            });
        });
    });

    it("test empty db", () => {
        const db = new PouchDB(dbs.name);
        return db.allDocs().then((res) => {
            assert.lengthOf(res.rows, 0);
            assert.equal(res.total_rows, 0);
        });
    });

    it("test after db close", () => {
        const db = new PouchDB(dbs.name);
        return db.close().then(() => {
            return db.allDocs().catch((err) => {
                assert.equal(err.message, "database is closed");
            });
        });
    });

    it("test unicode ids and revs", () => {
        const db = new PouchDB(dbs.name);
        const id = "baz\u0000";
        let rev;
        return db.put({ _id: id }).then((res) => {
            rev = res.rev;
        }).then(() => {
            return db.get(id);
        }).then((doc) => {
            assert.equal(doc._id, id);
            assert.equal(doc._rev, rev);
            return db.allDocs({ keys: [id] });
        }).then((res) => {
            assert.lengthOf(res.rows, 1);
            assert.equal(res.rows[0].value.rev, rev);
        });
    });

    it("5793 _conflicts should not exist if no conflicts", () => {
        const db = new PouchDB(dbs.name);
        return db.put({
            _id: "0", a: 1
        }).then(() => {
            return db.allDocs({
                include_docs: true,
                conflicts: true
            });
        }).then((result) => {
            assert.isUndefined(result.rows[0].doc._conflicts);
        });
    });
});
