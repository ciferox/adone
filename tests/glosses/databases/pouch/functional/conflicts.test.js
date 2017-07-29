require("./node.setup");

describe("db", "pouch", "conflicts", () => {
    const dbs = {};

    beforeEach(function (done) {
        this.timeout(30000);
        dbs.name = testUtils.adapterUrl("local", "testdb");
        testUtils.cleanup([dbs.name], done);
    });

    after((done) => {
        testUtils.cleanup([dbs.name], done);
    });


    it("Testing conflicts", (done) => {
        const db = new PouchDB(dbs.name);
        const doc = { _id: "foo", a: 1, b: 1 };
        db.put(doc, (err, res) => {
            doc._rev = res.rev;
            assert.exists(res.ok, "Put first document");
            db.get("foo", (err, doc2) => {
                assert.equal(doc._id, doc2._id);
                assert.property(doc, "_rev");
                assert.property(doc2, "_rev");
                doc.a = 2;
                doc2.a = 3;
                db.put(doc, (err, res) => {
                    assert.exists(res.ok, "Put second doc");
                    db.put(doc2, (err) => {
                        assert.equal(err.name, "conflict", "Put got a conflicts");
                        db.changes().on("complete", (results) => {
                            assert.lengthOf(results.results, 1);
                            doc2._rev = undefined;
                            db.put(doc2, (err) => {
                                assert.equal(err.name, "conflict", "Another conflict");
                                done();
                            });
                        }).on("error", done);
                    });
                });
            });
        });
    });

    it("Testing conflicts", (done) => {
        const doc = { _id: "fubar", a: 1, b: 1 };
        const db = new PouchDB(dbs.name);
        db.put(doc, (err, ndoc) => {
            doc._rev = ndoc.rev;
            db.remove(doc, () => {
                delete doc._rev;
                db.put(doc, (err, ndoc) => {
                    if (err) {
                        return done(err);
                    }
                    assert.exists(ndoc.ok, "written previously deleted doc without rev");
                    done();
                });
            });
        });
    });

    it("#2882/#2883 last_seq for empty db", () => {
        // CouchDB 2.0 sequence numbers are not
        // incremental so skip this test
        if (testUtils.isCouchMaster()) {
            return true;
        }

        const db = new PouchDB(dbs.name);
        return db.changes().then((changes) => {
            assert.equal(changes.last_seq, 0);
            assert.lengthOf(changes.results, 0);
            return db.info();
        }).then((info) => {
            assert.equal(info.update_seq, 0);
        });
    });

    it("#2882/#2883 last_seq when putting parent before leaf", () => {
        // CouchDB 2.0 sequence numbers are not
        // incremental so skip this test
        if (testUtils.isCouchMaster()) {
            return true;
        }

        const db = new PouchDB(dbs.name);
        let lastSeq;
        return db.bulkDocs({
            docs: [
                {
                    _id: "fubar",
                    _rev: "2-a2",
                    _revisions: { start: 2, ids: ["a2", "a1"] }
                }, {
                    _id: "fubar",
                    _rev: "1-a1",
                    _revisions: { start: 1, ids: ["a1"] }
                }
            ],
            new_edits: false
        }).then(() => {
            return db.changes();
        }).then((changes) => {
            lastSeq = changes.last_seq;
            assert.equal(changes.results[0].changes[0].rev, "2-a2");
            assert.equal(changes.results[0].seq, lastSeq);
            return db.info();
        }).then((info) => {
            assert.equal(info.update_seq, lastSeq);
        });
    });

    it("force put ok on 1st level", () => {
        const db = new PouchDB(dbs.name);
        const docId = "docId";
        let rev1, rev2, rev3, rev2_;
        // given
        return db.put({ _id: docId, update: 1 }).then((result) => {
            rev1 = result.rev;
            return db.put({ _id: docId, update: 2.1, _rev: rev1 });
        }).then((result) => {
            rev2 = result.rev;
            return db.put({ _id: docId, update: 3, _rev: rev2 });
        })
            // when
            .then((result) => {
                rev3 = result.rev;
                return db.put({ _id: docId, update: 2.2, _rev: rev1 }, { force: true });
            })
            // then
            .then((result) => {
                rev2_ = result.rev;
                assert.notEqual(rev2_, rev3);
                assert.equal(rev2_.substring(0, 2), "2-");
                assert.exists(result.ok, "update based on nonleaf revision");

                return db.get(docId, { conflicts: true, revs: true });
            }).then((doc) => {
                assert.equal(doc._rev, rev3);
                assert.deepEqual(doc._conflicts, [rev2_]);

                return db.get(docId, { conflicts: true, revs: true, rev: rev2_ });
            }).then((doc) => {
                console.log("the force doc", doc);
            });
    });

    it("force put ok on 2nd level", () => {
        const db = new PouchDB(dbs.name);
        const docId = "docId";
        let rev2, rev3, rev4, rev3_;
        // given
        return db.put({ _id: docId, update: 1 }).then((result) => {
            return db.put({ _id: docId, update: 2, _rev: result.rev });
        }).then((result) => {
            rev2 = result.rev;
            return db.put({ _id: docId, update: 3.1, _rev: rev2 });
        }).then((result) => {
            rev3 = result.rev;
            return db.put({ _id: docId, update: 4, _rev: rev3 });
        })
            // when
            .then((result) => {
                rev4 = result.rev;
                return db.put({ _id: docId, update: 3.2, _rev: rev2 }, { force: true });
            })
            // then
            .then((result) => {
                rev3_ = result.rev;
                assert.notEqual(rev3_, rev4);
                assert.equal(rev3_.substring(0, 2), "3-");
                assert.exists(result.ok, "update based on nonleaf revision");

                return db.get(docId, { conflicts: true, revs: true });
            }).then((doc) => {
                assert.equal(doc._rev, rev4);
                assert.deepEqual(doc._conflicts, [rev3_]);

                return db.get(docId, { conflicts: true, revs: true, rev: rev3_ });
            }).then((doc) => {
                console.log("the force put doc", doc);
            });
    });

    // Each revision includes a list of previous revisions. The
    // revision with the longest revision history list becomes the
    // winning revision. If they are the same, the _rev values are
    // compared in ASCII sort order, and the highest wins. So, in our
    // example, 2-de0ea16f8621cbac506d23a0fbbde08a beats
    // 2-7c971bb974251ae8541b8fe045964219.

    it("Conflict resolution 1", () => {
        const docs = [
            {
                _id: "fubar",
                _rev: "1-a",
                _revisions: {
                    start: 1,
                    ids: ["a"]
                }
            }, {
                _id: "fubar",
                _rev: "1-b",
                _revisions: {
                    start: 1,
                    ids: ["b"]
                }
            }, {
                _id: "fubar",
                _rev: "1-1",
                _revisions: {
                    start: 1,
                    ids: ["1"]
                }
            }
        ];
        const db = new PouchDB(dbs.name);
        return db.bulkDocs({ docs, new_edits: false }).then(() => {
            return db.get("fubar");
        }).then((doc) => {
            assert.equal(doc._rev, "1-b", "Correct revision wins");
            return db.bulkDocs({
                new_edits: false,
                docs: [{
                    _id: "fubar",
                    _rev: "2-2",
                    _revisions: {
                        start: 2,
                        ids: ["2", "1"]
                    }
                }]
            });
        }).then(() => {
            return db.get("fubar");
        }).then((doc) => {
            assert.equal(doc._rev, "2-2", "Correct revision wins");
        });
    });

    it("Conflict resolution 2", () => {
        const docs = [
            {
                _id: "fubar",
                _rev: "2-a",
                _revisions: {
                    start: 2,
                    ids: ["a"]
                }
            }, {
                _id: "fubar",
                _rev: "1-b",
                _revisions: {
                    start: 1,
                    ids: ["b"]
                }
            }
        ];
        const db = new PouchDB(dbs.name);
        return db.bulkDocs({ docs, new_edits: false }).then(() => {
            return db.get("fubar");
        }).then((doc) => {
            assert.equal(doc._rev, "2-a", "Correct revision wins");
            return db.info();
        }).then((info) => {
            assert.equal(info.doc_count, 1, "Correct number of docs");
        });
    });

    it("Conflict resolution 3", () => {
        const docs = [
            {
                _id: "fubar",
                _rev: "10-a",
                _revisions: {
                    start: 10,
                    ids: ["a"]
                }
            }, {
                _id: "fubar",
                _rev: "2-b",
                _revisions: {
                    start: 2,
                    ids: ["b"]
                }
            }
        ];
        const db = new PouchDB(dbs.name);
        return db.bulkDocs({ docs, new_edits: false }).then(() => {
            return db.get("fubar");
        }).then((doc) => {
            assert.equal(doc._rev, "10-a", "Correct revision wins");
            return db.info();
        }).then((info) => {
            assert.equal(info.doc_count, 1, "Correct number of docs");
        });
    });

    it("Conflict resolution 4-a", () => {
        const docs = [
            {
                _id: "fubar",
                _rev: "1-a1",
                _revisions: { start: 1, ids: ["a1"] }
            }, {
                _id: "fubar",
                _rev: "2-a2",
                _revisions: { start: 2, ids: ["a2", "a1"] }
            }, {
                _id: "fubar",
                _deleted: true,
                _rev: "3-a3",
                _revisions: { start: 3, ids: ["a3", "a2", "a1"] }
            }, {
                _id: "fubar",
                _rev: "1-b1",
                _revisions: { start: 1, ids: ["b1"] }
            }
        ];
        const db = new PouchDB(dbs.name);
        return db.bulkDocs({ docs, new_edits: false }).then(() => {
            return db.get("fubar");
        }).then((doc) => {
            assert.equal(doc._rev, "1-b1", "Correct revision wins");
            return db.info();
        }).then((info) => {
            assert.equal(info.doc_count, 1, "Correct number of docs");
        });
    });

    it("Conflict resolution 4-b", () => {
        const docs = [
            {
                _id: "fubar",
                _deleted: true,
                _rev: "3-a3",
                _revisions: { start: 3, ids: ["a3", "a2", "a1"] }
            }, {
                _id: "fubar",
                _rev: "2-a2",
                _revisions: { start: 2, ids: ["a2", "a1"] }
            }, {
                _id: "fubar",
                _rev: "1-a1",
                _revisions: { start: 1, ids: ["a1"] }
            }, {
                _id: "fubar",
                _rev: "1-b1",
                _revisions: { start: 1, ids: ["b1"] }
            }
        ];
        const db = new PouchDB(dbs.name);
        return db.bulkDocs({ docs, new_edits: false }).then(() => {
            return db.get("fubar");
        }).then((doc) => {
            assert.equal(doc._rev, "1-b1", "Correct revision wins");
            return db.info();
        }).then((info) => {
            assert.equal(info.doc_count, 1, "Correct number of docs");
        });
    });

    it("Conflict resolution 4-c", () => {
        const docs = [
            {
                _id: "fubar",
                _rev: "1-a1",
                _revisions: { start: 1, ids: ["a1"] }
            }, {
                _id: "fubar",
                _rev: "1-b1",
                _revisions: { start: 1, ids: ["b1"] }
            }, {
                _id: "fubar",
                _rev: "2-a2",
                _revisions: { start: 2, ids: ["a2", "a1"] }
            }, {
                _id: "fubar",
                _deleted: true,
                _rev: "3-a3",
                _revisions: { start: 3, ids: ["a3", "a2", "a1"] }
            }
        ];
        const db = new PouchDB(dbs.name);
        return db.bulkDocs({ docs, new_edits: false }).then(() => {
            return db.get("fubar");
        }).then((doc) => {
            assert.equal(doc._rev, "1-b1", "Correct revision wins");
            return db.info();
        }).then((info) => {
            assert.equal(info.doc_count, 1, "Correct number of docs");
        });
    });

    it("Conflict resolution 4-d", () => {
        const docs = [
            {
                _id: "fubar",
                _rev: "1-a1",
                _revisions: { start: 1, ids: ["a1"] }
            }, {
                _id: "fubar",
                _rev: "1-b1",
                _revisions: { start: 1, ids: ["b1"] }
            }, {
                _id: "fubar",
                _rev: "2-a2",
                _revisions: { start: 2, ids: ["a2", "a1"] }
            }, {
                _id: "fubar",
                _deleted: true,
                _rev: "3-a3",
                _revisions: { start: 3, ids: ["a3", "a2", "a1"] }
            }
        ];
        const db = new PouchDB(dbs.name);
        return db.bulkDocs({ docs, new_edits: false }).then(() => {
            return db.get("fubar");
        }).then((doc) => {
            assert.equal(doc._rev, "1-b1", "Correct revision wins");
            return db.info();
        }).then((info) => {
            assert.equal(info.doc_count, 1, "Correct number of docs");
        });
    });

    it("Conflict resolution 4-e", () => {
        const docs = [
            {
                _id: "fubar",
                _deleted: true,
                _rev: "3-a3",
                _revisions: { start: 3, ids: ["a3", "a2", "a1"] }
            }, {
                _id: "fubar",
                _rev: "2-a2",
                _revisions: { start: 2, ids: ["a2", "a1"] }
            }, {
                _id: "fubar",
                _rev: "1-b1",
                _revisions: { start: 1, ids: ["b1"] }
            }, {
                _id: "fubar",
                _rev: "1-a1",
                _revisions: { start: 1, ids: ["a1"] }
            }
        ];
        const db = new PouchDB(dbs.name);
        return db.bulkDocs({ docs, new_edits: false }).then(() => {
            return db.get("fubar");
        }).then((doc) => {
            assert.equal(doc._rev, "1-b1", "Correct revision wins");
            return db.info();
        }).then((info) => {
            assert.equal(info.doc_count, 1, "Correct number of docs");
        });
    });

    it("Conflict resolution 5-a", () => {
        const docs = [
            {
                _id: "fubar",
                _rev: "2-a2",
                _revisions: { start: 2, ids: ["a2", "a1"] }
            }, {
                _id: "fubar",
                _deleted: true,
                _rev: "1-b1",
                _revisions: { start: 1, ids: ["b1"] }
            }, {
                _id: "fubar",
                _deleted: true,
                _rev: "1-c1",
                _revisions: { start: 1, ids: ["c1"] }
            }
        ];
        const db = new PouchDB(dbs.name);
        return db.bulkDocs({ docs, new_edits: false }).then(() => {
            return db.get("fubar");
        }).then((doc) => {
            assert.equal(doc._rev, "2-a2", "Correct revision wins");
            return db.info();
        }).then((info) => {
            assert.equal(info.doc_count, 1, "Correct number of docs");
        });
    });

    it("Conflict resolution 5-b", () => {
        const docs = [
            {
                _id: "fubar",
                _deleted: true,
                _rev: "1-b1",
                _revisions: { start: 1, ids: ["b1"] }
            }, {
                _id: "fubar",
                _rev: "2-a2",
                _revisions: { start: 2, ids: ["a2", "a1"] }
            }, {
                _id: "fubar",
                _deleted: true,
                _rev: "1-c1",
                _revisions: { start: 1, ids: ["c1"] }
            }
        ];
        const db = new PouchDB(dbs.name);
        return db.bulkDocs({ docs, new_edits: false }).then(() => {
            return db.get("fubar");
        }).then((doc) => {
            assert.equal(doc._rev, "2-a2", "Correct revision wins");
            return db.info();
        }).then((info) => {
            assert.equal(info.doc_count, 1, "Correct number of docs");
        });
    });

    it("Conflict resolution 5-c", () => {
        const docs = [
            {
                _id: "fubar",
                _deleted: true,
                _rev: "1-b1",
                _revisions: { start: 1, ids: ["b1"] }
            }, {
                _id: "fubar",
                _deleted: true,
                _rev: "1-c1",
                _revisions: { start: 1, ids: ["c1"] }
            }, {
                _id: "fubar",
                _rev: "2-a2",
                _revisions: { start: 2, ids: ["a2", "a1"] }
            }
        ];
        const db = new PouchDB(dbs.name);
        return db.bulkDocs({ docs, new_edits: false }).then(() => {
            return db.get("fubar");
        }).then((doc) => {
            assert.equal(doc._rev, "2-a2", "Correct revision wins");
            return db.info();
        }).then((info) => {
            assert.equal(info.doc_count, 1, "Correct number of docs");
        });
    });

    it("#2543 excessive recursion with merging", () => {
        let chain = Promise.resolve();

        const db = new PouchDB(dbs.name);

        function addTask(batch) {
            return function () {
                const docs = [];
                for (let i = 0; i < 50; i++) {
                    const hash = `${batch}a${i}`;
                    docs.push({
                        _id: "foo",
                        _rev: `2-${hash}`,
                        _revisions: {
                            start: 2,
                            ids: [hash, "a"]
                        }
                    });
                }
                return db.bulkDocs(docs, { new_edits: false });
            };
        }

        chain = chain.then(() => {
            return db.bulkDocs([{
                _id: "foo",
                _rev: "1-a"
            }], { new_edits: false });
        });

        for (let i = 0; i < 10; i++) {
            chain = chain.then(addTask(i));
        }
        return chain;
    });

    it("local conflicts", () => {
        if (testUtils.isCouchMaster()) {
            return true;
        }
        const db = new PouchDB(dbs.name);
        return db.put({ foo: "bar" }, "_local/baz").then((result) => {
            return db.put({ foo: "bar" }, "_local/baz", result.res);
        }).then(() => {
            return db.put({ foo: "bar" }, "_local/baz");
        }, (e) => {
            assert.isNull(e, "shouldn't error yet");
            throw e;
        }).then(undefined, (e) => {
            assert.exists(e, "error when you have a conflict");
        });
    });

    it("5832 - update losing leaf returns correct rev", () => {
        // given
        const docs = [
            {
                _id: "fubar",
                _rev: "1-a1",
                _revisions: { start: 1, ids: ["a1"] }
            }, {
                _id: "fubar",
                _rev: "2-a2",
                _revisions: { start: 2, ids: ["a2", "a1"] }
            }, {
                _id: "fubar",
                _rev: "2-b2",
                _revisions: { start: 2, ids: ["b2", "a1"] }
            }
        ];
        const db = new PouchDB(dbs.name);
        return db.bulkDocs({
            docs, new_edits: false
        }).then(() => {
            return db.get("fubar", { conflicts: true });
        }).then((doc) => {
            return db.remove(doc);
        }).then((result) => {
            assert.equal(result.rev[0], "3");
        });
    });
});
