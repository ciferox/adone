import * as util from "./utils";

describe("database", "pouch", "db.allDocs()", () => {
    const dbName = "testdb";

    let DB;

    beforeEach(async () => {
        DB = await util.setup();
        await util.cleanup(dbName);
    });

    after(async () => {
        await util.destroy();
    });

    const origDocs = [
        { _id: "0", a: 1, b: 1 },
        { _id: "3", a: 4, b: 16 },
        { _id: "1", a: 2, b: 4 },
        { _id: "2", a: 3, b: 9 }
    ];

    it("Testing all docs", async () => {
        const db = new DB(dbName);
        await util.writeDocs(db, origDocs);
        const result = await db.allDocs();
        const rows = result.rows;
        assert.equal(result.total_rows, 4, "correct number of results");
        for (let i = 0; i < rows.length; i++) {
            assert.isAtLeast(Number.parseInt(rows[i].id), 0);
            assert.isAtMost(Number.parseInt(rows[i].id), 4);
        }

        const all = await db.allDocs({
            startkey: "2",
            include_docs: true
        });
        assert.lengthOf(all.rows, 2, "correct number when opts.startkey set");
        assert.equal(all.rows[0].id, "2", "correct docs when opts.startkey set");

        const opts = {
            startkey: "org.couchdb.user:",
            endkey: "org.couchdb.user;"
        };
        const raw = await db.allDocs(opts);
        assert.lengthOf(raw.rows, 0, "raw collation");

        let ids = ["0", "3", "1", "2"];
        await new Promise((resolve, reject) => {
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
                    resolve();
                }).on("error", reject);
            }).on("error", reject);
        });
    });

    it("Testing allDocs opts.keys", () => {
        const db = new DB(dbName);
        const keyFunc = (doc) => doc.key;
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
            expect(result.rows[keys.indexOf("2")].value.deleted).to.be.true;
            expect(result.rows[keys.indexOf("2")].doc).to.be.null;
        });
    });

    it("Testing allDocs opts.keys with skip", () => {
        const db = new DB(dbName);
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
        const db = new DB(dbName);
        return db.allDocs({ keys: 1234 }).then(() => {
            throw new Error("should not be here");
        }).catch((err) => {
            assert.exists(err);
        });
    });

    it("Testing deleting in changes", async () => {
        const db = new DB(dbName);
        const info = await db.info();
        const update_seq = info.update_seq;
        await util.writeDocs(db, origDocs);
        const deleted = await db.remove(await db.get("1"));
        assert.exists(deleted.ok);
        await new Promise((resolve, reject) => {
            db.changes({
                since: update_seq
            }).on("complete", (changes) => {
                const deleted_ids = changes.results.map((c) => {
                    if (c.deleted) {
                        return c.id;
                    }
                });
                assert.include(deleted_ids, "1");

                resolve();
            }).on("error", reject);
        });
    });

    it("Testing updating in changes", async () => {
        const db = new DB(dbName);

        const info = await db.info();
        const update_seq = info.update_seq;
        await util.writeDocs(db, origDocs);
        const doc = await db.get("3");
        doc.updated = "totally";
        await db.put(doc);
        await new Promise((resolve, reject) => {
            db.changes({
                since: update_seq
            }).on("complete", (changes) => {
                const ids = changes.results.map((c) => {
                    return c.id;
                });
                assert.include(ids, "3");

                resolve();
            }).on("error", reject);
        });
    });

    it("Testing include docs", async () => {
        const db = new DB(dbName);
        await util.writeDocs(db, origDocs);
        await new Promise((resolve, reject) => {
            db.changes({
                include_docs: true
            }).on("complete", (changes) => {
                changes.results.forEach((row) => {
                    if (row.id === "0") {
                        assert.equal(row.doc.a, 1);
                    }
                });
                resolve();
            }).on("error", reject);
        });
    });

    it("Testing conflicts", async () => {
        const db = new DB(dbName);
        await util.writeDocs(db, origDocs);
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
        await db.put(conflictDoc1, { new_edits: false });
        await db.put(conflictDoc2, { new_edits: false });
        const winRev = await db.get("3");
        assert.equal(winRev._rev, conflictDoc2._rev);
        await new Promise((resolve, reject) => {
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
                resolve();
            }).on("error", reject);
        });
        const res = await db.allDocs({
            include_docs: true,
            conflicts: true
        });
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
    });

    it("test basic collation", async () => {
        const db = new DB(dbName);
        const docs = {
            docs: [
                { _id: "z", foo: "z" },
                { _id: "a", foo: "a" }
            ]
        };
        await db.bulkDocs(docs);
        const result = await db.allDocs({
            startkey: "z",
            endkey: "z"
        });
        assert.lengthOf(result.rows, 1, "Exclude a result");
    });

    it("3883 start_key end_key aliases", () => {
        const db = new DB(dbName);
        const docs = [{ _id: "a", foo: "a" }, { _id: "z", foo: "z" }];
        return db.bulkDocs(docs).then(() => {
            return db.allDocs({ start_key: "z", end_key: "z" });
        }).then((result) => {
            assert.lengthOf(result.rows, 1, "Exclude a result");
        });
    });

    it("test total_rows with a variety of criteria", function (done) {
        this.timeout(20000);
        const db = new DB(dbName);

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

    it("test total_rows with both skip and limit", async () => {
        const db = new DB(dbName);
        const docs = {
            docs: [
                { _id: "w", foo: "w" },
                { _id: "x", foo: "x" },
                { _id: "y", foo: "y" },
                { _id: "z", foo: "z" }
            ]
        };
        await db.bulkDocs(docs);
        let res = await db.allDocs({ startkey: "x", limit: 1, skip: 1 });
        assert.equal(res.total_rows, 4, "Accurately return total_rows count");
        assert.lengthOf(res.rows, 1, "Correctly limit the returned rows");
        assert.equal(res.rows[0].id, "y", "Correctly skip 1 doc");

        const xDoc = await db.get("x");
        await db.remove(xDoc);

        res = await db.allDocs({ startkey: "w", limit: 2, skip: 1 });
        assert.equal(res.total_rows, 3, "Accurately return total_rows count after delete");
        assert.lengthOf(res.rows, 2, "Correctly limit the returned rows after delete");
        assert.equal(res.rows[0].id, "y", "Correctly skip 1 doc after delete");
    });

    it("test limit option and total_rows", async () => {
        const db = new DB(dbName);
        const docs = {
            docs: [
                { _id: "z", foo: "z" },
                { _id: "a", foo: "a" }
            ]
        };
        await db.bulkDocs(docs);
        const res = await db.allDocs({
            startkey: "a",
            limit: 1
        });
        assert.equal(res.total_rows, 2, "Accurately return total_rows count");
        assert.lengthOf(res.rows, 1, "Correctly limit the returned rows.");
    });

    it("test escaped startkey/endkey", async () => {
        const db = new DB(dbName);
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
        await db.bulkDocs(docs);
        const res = await db.allDocs({
            startkey: id1,
            endkey: id2
        });
        assert.equal(res.total_rows, 2, "Accurately return total_rows count");
    });

    it('test "key" option', async () => {
        const db = new DB(dbName);
        await db.bulkDocs({
            docs: [
                { _id: "0" },
                { _id: "1" },
                { _id: "2" }
            ]
        });
        const res = await db.allDocs({ key: "1" });
        assert.lengthOf(res.rows, 1, "key option returned 1 doc");
        await assert.throws(async () => {
            await db.allDocs({
                key: "1",
                keys: [
                    "1",
                    "2"
                ]
            });
        });
        await db.allDocs({
            key: "1",
            startkey: "1"
        });
        await db.allDocs({
            key: "1",
            endkey: "1"
        });
        // when mixing key/startkey or key/endkey, the results
        // are very weird and probably undefined, so don't go beyond
        // verifying that there's no error
    });

    it("test inclusive_end=false", () => {
        const db = new DB(dbName);
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
        const db = new DB(dbName);
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
        const db = new DB(dbName);
        const docs = [];
        for (let i = 0; i < 1000; i++) {
            docs.push({});
        }

        let lastkey;
        const allkeys = [];

        const paginate = () => {
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
        };

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
        const db = new DB(dbName);
        return db.allDocs().then((res) => {
            assert.lengthOf(res.rows, 0);
            assert.equal(res.total_rows, 0);
        });
    });

    it("test after db close", () => {
        const db = new DB(dbName);
        return db.close().then(() => {
            return db.allDocs().catch((err) => {
                assert.equal(err.message, "database is closed");
            });
        });
    });

    it("test unicode ids and revs", () => {
        const db = new DB(dbName);
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
        const db = new DB(dbName);
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

    it("#6230 Test allDocs opts update_seq: false", () => {
        const db = new DB(dbName);
        return db.bulkDocs(origDocs).then(() => {
            return db.allDocs({
                update_seq: false
            });
        }).then((result) => {
            assert.lengthOf(result.rows, 4);
            assert.notExists(result.update_seq);
        });
    });


    it.skip("#6230 Test allDocs opts update_seq: true", (done) => {
        const db = new DB(dbName);
        testUtils.isPouchDbServer((isPouchDbServer) => {
            if (isPouchDbServer) {
                // pouchdb-server does not currently support opts.update_seq
                return done();
            }
            return db.bulkDocs(origDocs).then(() => {
                return db.allDocs({
                    update_seq: true
                });
            }).then((result) => {
                result.rows.should.have.length(4);
                should.exist(result.update_seq);
                result.update_seq.should.satisfy((update_seq) => {
                    if (is.number(update_seq) || is.string(update_seq)) {
                        return true;
                    }
                    return false;

                });
                const normSeq = normalizeSeq(result.update_seq);
                normSeq.should.be.a("number");
            }).then(done, done);

            function normalizeSeq(seq) {
                try {
                    if (is.string(seq) && seq.indexOf("-") > 0) {
                        return parseInt(seq.substring(0, seq.indexOf("-")));
                    }
                    return seq;
                } catch (err) {
                    return seq;
                }
            }
        });
    });

    it("#6230 Test allDocs opts with update_seq missing", () => {
        const db = new DB(dbName);
        return db.bulkDocs(origDocs).then(() => {
            return db.allDocs();
        }).then((result) => {
            assert.lengthOf(result.rows, 4);
            assert.notExists(result.update_seq);
        });
    });
});
