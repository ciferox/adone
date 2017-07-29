require("./node.setup");

describe("db", "pouch", "compaction", () => {
    if (testUtils.isCouchMaster()) {
        return true;
    }

    const dbs = {};

    beforeEach((done) => {
        dbs.name = testUtils.adapterUrl("local", "testdb");
        testUtils.cleanup([dbs.name], done);
    });

    after((done) => {
        testUtils.cleanup([dbs.name], done);
    });

    it("#3350 compact should return {ok: true}", (done) => {
        const db = new PouchDB(dbs.name);
        db.compact((err, result) => {
            assert.isNull(err);
            assert.deepEqual(result, { ok: true });

            done();
        });
    });

    it("compact with options object", () => {
        const db = new PouchDB(dbs.name);
        return db.compact({}).then((result) => {
            assert.deepEqual(result, { ok: true });
        });
    });

    it("#2913 massively parallel compaction", () => {
        const db = new PouchDB(dbs.name);
        const tasks = [];
        for (let i = 0; i < 30; i++) {
            tasks.push(i);
        }

        return Promise.all(tasks.map((i) => {
            const doc = { _id: `doc_${i}` };
            return db.put(doc).then(() => {
                return db.compact();
            }).then(() => {
                return db.get(`doc_${i}`);
            }).then((doc) => {
                return db.put(doc);
            }).then(() => {
                return db.compact();
            });
        }));
    });

    it("Compaction document with no revisions to remove", (done) => {
        const db = new PouchDB(dbs.name);
        const doc = { _id: "foo", value: "bar" };
        db.put(doc, () => {
            db.compact(() => {
                db.get("foo", (err) => {
                    done(err);
                });
            });
        });
    });

    it("Compation on empty db", (done) => {
        const db = new PouchDB(dbs.name);
        db.compact(() => {
            done();
        });
    });

    it("Compation on empty db with interval option", (done) => {
        const db = new PouchDB(dbs.name);
        db.compact({ interval: 199 }, () => {
            done();
        });
    });

    it("Simple compation test", (done) => {
        const db = new PouchDB(dbs.name);
        const doc = {
            _id: "foo",
            value: "bar"
        };
        db.post(doc, (err, res) => {
            const rev1 = res.rev;
            doc._rev = rev1;
            doc.value = "baz";
            db.post(doc, (err, res) => {
                const rev2 = res.rev;
                db.compact(() => {
                    db.get("foo", { rev: rev1 }, (err) => {
                        assert.equal(err.status, 404);
                        assert.equal(err.name, "not_found", "compacted document is missing");
                        db.get("foo", { rev: rev2 }, (err) => {
                            done(err);
                        });
                    });
                });
            });
        });
    });

    const checkBranch = function (db, docs, callback) {
        function check(i) {
            const doc = docs[i];
            db.get(doc._id, { rev: doc._rev }, (err) => {
                if (i < docs.length - 1) {
                    assert.exists(err, `should be compacted: ${doc._rev}`);
                    assert.equal(err.status, 404, "compacted!");
                    check(i + 1);
                } else {
                    assert.isNull(err, `should not be compacted: ${doc._rev}`);
                    callback();
                }
            });
        }
        check(0);
    };

    const checkTree = function (db, tree, callback) {
        function check(i) {
            checkBranch(db, tree[i], () => {
                if (i < tree.length - 1) {
                    check(i + 1);
                } else {
                    callback();
                }
            });
        }
        check(0);
    };

    const exampleTree = [
        [{ _id: "foo", _rev: "1-a", value: "foo a" },
        { _id: "foo", _rev: "2-b", value: "foo b" },
        { _id: "foo", _rev: "3-c", value: "foo c" }
        ],
        [{ _id: "foo", _rev: "1-a", value: "foo a" },
        { _id: "foo", _rev: "2-d", value: "foo d" },
        { _id: "foo", _rev: "3-e", value: "foo e" },
        { _id: "foo", _rev: "4-f", value: "foo f" }
        ],
        [{ _id: "foo", _rev: "1-a", value: "foo a" },
        { _id: "foo", _rev: "2-g", value: "foo g" },
        { _id: "foo", _rev: "3-h", value: "foo h" },
        { _id: "foo", _rev: "4-i", value: "foo i" },
        { _id: "foo", _rev: "5-j", _deleted: true, value: "foo j" }
        ]
    ];

    const exampleTree2 = [
        [{ _id: "bar", _rev: "1-m", value: "bar m" },
        { _id: "bar", _rev: "2-n", value: "bar n" },
        { _id: "bar", _rev: "3-o", _deleted: true, value: "foo o" }
        ],
        [{ _id: "bar", _rev: "2-n", value: "bar n" },
        { _id: "bar", _rev: "3-p", value: "bar p" },
        { _id: "bar", _rev: "4-r", value: "bar r" },
        { _id: "bar", _rev: "5-s", value: "bar s" }
        ],
        [{ _id: "bar", _rev: "3-p", value: "bar p" },
        { _id: "bar", _rev: "4-t", value: "bar t" },
        { _id: "bar", _rev: "5-u", value: "bar u" }
        ]
    ];

    it("Compact more complicated tree", (done) => {
        const db = new PouchDB(dbs.name);
        testUtils.putTree(db, exampleTree, () => {
            db.compact(() => {
                checkTree(db, exampleTree, () => {
                    done();
                });
            });
        });
    });

    it("Compact two times more complicated tree", (done) => {
        const db = new PouchDB(dbs.name);
        testUtils.putTree(db, exampleTree, () => {
            db.compact(() => {
                db.compact(() => {
                    checkTree(db, exampleTree, () => {
                        done();
                    });
                });
            });
        });
    });

    it("Compact database with at least two documents", (done) => {
        const db = new PouchDB(dbs.name);
        testUtils.putTree(db, exampleTree, () => {
            testUtils.putTree(db, exampleTree2, () => {
                db.compact(() => {
                    checkTree(db, exampleTree, () => {
                        checkTree(db, exampleTree2, () => {
                            done();
                        });
                    });
                });
            });
        });
    });

    it("Compact deleted document", (done) => {
        const db = new PouchDB(dbs.name);
        db.put({ _id: "foo" }, (err, res) => {
            const firstRev = res.rev;
            db.remove({
                _id: "foo",
                _rev: firstRev
            }, () => {
                db.compact(() => {
                    db.get("foo", { rev: firstRev }, (err) => {
                        assert.exists(err, "got error");
                        assert.equal(err.status, testUtils.errors.MISSING_DOC.status,
                            "correct error status returned");
                        assert.equal(err.message, testUtils.errors.MISSING_DOC.message,
                            "correct error message returned");
                        done();
                    });
                });
            });
        });
    });

    it("Compact db with sql-injecty doc id", (done) => {
        const db = new PouchDB(dbs.name);
        const id = "'sql_injection_here";
        db.put({ _id: id }, (err, res) => {
            const firstRev = res.rev;
            db.remove({
                _id: id,
                _rev: firstRev
            }, () => {
                db.compact(() => {
                    db.get(id, { rev: firstRev }, (err) => {
                        assert.exists(err, "got error");
                        assert.equal(err.status, testUtils.errors.MISSING_DOC.status,
                            "correct error status returned");
                        assert.equal(err.message, testUtils.errors.MISSING_DOC.message,
                            "correct error message returned");
                        done();
                    });
                });
            });
        });
    });


    function getRevisions(db, docId) {
        return db.get(docId, {
            revs: true,
            open_revs: "all"
        }).then((docs) => {
            let combinedResult = [];
            return Promise.all(docs.map((doc) => {
                doc = doc.ok;
                // convert revision IDs into full _rev hashes
                const start = doc._revisions.start;
                return Promise.all(
                    doc._revisions.ids.map((id, i) => {
                        const rev = `${start - i}-${id}`;
                        return db.get(docId, { rev }).then((doc) => {
                            return { rev, doc };
                        }).catch((err) => {
                            if (err.status !== 404) {
                                throw err;
                            }
                            return { rev };
                        });
                    })).then((docsAndRevs) => {
                        combinedResult = combinedResult.concat(docsAndRevs);
                    });
            })).then(() => {
                return combinedResult;
            });
        });
    }

    it("Compaction removes non-leaf revs (#2807)", () => {
        const db = new PouchDB(dbs.name, { auto_compaction: false });
        const doc = { _id: "foo" };
        return db.put(doc).then((res) => {
            doc._rev = res.rev;
            return getRevisions(db, "foo");
        }).then((docsAndRevs) => {
            assert.lengthOf(docsAndRevs, 1);
            return db.put(doc);
        }).then((res) => {
            doc._rev = res.rev;
            return getRevisions(db, "foo");
        }).then((docsAndRevs) => {
            assert.lengthOf(docsAndRevs, 2);
            assert.exists(docsAndRevs[0].doc);
            assert.exists(docsAndRevs[1].doc);
            return db.compact();
        }).then(() => {
            return getRevisions(db, "foo");
        }).then((docsAndRevs) => {
            assert.lengthOf(docsAndRevs, 2);
            assert.exists(docsAndRevs[0].doc);
            assert.isUndefined(docsAndRevs[1].doc);
        });
    });

    it("Compaction removes non-leaf revs pt 2 (#2807)", () => {
        const db = new PouchDB(dbs.name, { auto_compaction: false });
        const doc = { _id: "foo" };
        return db.put(doc).then((res) => {
            doc._rev = res.rev;
            return db.put(doc);
        }).then((res) => {
            doc._rev = res.rev;
            return db.put(doc);
        }).then(() => {
            return db.compact();
        }).then(() => {
            return getRevisions(db, "foo");
        }).then((docsAndRevs) => {
            assert.lengthOf(docsAndRevs, 3);
            assert.exists(docsAndRevs[0].doc);
            assert.isUndefined(docsAndRevs[1].doc);
            assert.isUndefined(docsAndRevs[2].doc);
        });
    });

    it("Compaction removes non-leaf revs pt 3 (#2807)", () => {
        const db = new PouchDB(dbs.name, { auto_compaction: false });

        const docs = [
            {
                _id: "foo",
                _rev: "1-a1",
                _revisions: { start: 1, ids: ["a1"] }
            }, {
                _id: "foo",
                _rev: "2-a2",
                _revisions: { start: 2, ids: ["a2", "a1"] }
            }, {
                _id: "foo",
                _deleted: true,
                _rev: "3-a3",
                _revisions: { start: 3, ids: ["a3", "a2", "a1"] }
            }, {
                _id: "foo",
                _rev: "1-b1",
                _revisions: { start: 1, ids: ["b1"] }
            }
        ];

        return db.bulkDocs(docs, { new_edits: false }).then(() => {
            return getRevisions(db, "foo");
        }).then((docsAndRevs) => {
            assert.lengthOf(docsAndRevs, 4);
            assert.exists(docsAndRevs[0].doc);
            assert.exists(docsAndRevs[1].doc);
            assert.exists(docsAndRevs[2].doc);
            assert.exists(docsAndRevs[3].doc);
            return db.compact();
        }).then(() => {
            return getRevisions(db, "foo");
        }).then((docsAndRevs) => {
            assert.lengthOf(docsAndRevs, 4);
            const asMap = {};
            docsAndRevs.forEach((docAndRev) => {
                asMap[docAndRev.rev] = docAndRev.doc;
            });
            // only leafs remain
            assert.isUndefined(asMap["1-a1"]);
            assert.isUndefined(asMap["2-a2"]);
            assert.exists(asMap["3-a3"]);
            assert.exists(asMap["1-b1"]);
        });
    });

    it("Compaction removes non-leaf revs pt 4 (#2807)", () => {
        if (testUtils.isCouchMaster()) {
            return true;
        }
        const db = new PouchDB(dbs.name, { auto_compaction: false });
        const doc = { _id: "foo" };
        return db.put(doc).then((res) => {
            doc._rev = res.rev;
            doc._deleted = true;
            return db.put(doc);
        }).then((res) => {
            doc._rev = res.rev;
            delete doc._deleted;
            return db.put(doc);
        }).then(() => {
            return db.compact();
        }).then(() => {
            return getRevisions(db, "foo");
        }).then((docsAndRevs) => {
            assert.lengthOf(docsAndRevs, 3);
            assert.exists(docsAndRevs[0].doc);
            assert.isUndefined(docsAndRevs[1].doc);
            assert.isUndefined(docsAndRevs[2].doc);
        });
    });

    it("Compaction removes non-leaf revs pt 5 (#2807)", () => {
        const db = new PouchDB(dbs.name, { auto_compaction: false });
        const doc = { _id: "foo" };
        return db.put(doc).then((res) => {
            doc._rev = res.rev;
            return db.put(doc);
        }).then((res) => {
            doc._rev = res.rev;
            doc._deleted = true;
            return db.put(doc);
        }).then(() => {
            return db.compact();
        }).then(() => {
            return getRevisions(db, "foo");
        }).then((docsAndRevs) => {
            assert.lengthOf(docsAndRevs, 3);
            assert.exists(docsAndRevs[0].doc);
            assert.isUndefined(docsAndRevs[1].doc);
            assert.isUndefined(docsAndRevs[2].doc);
        });
    });

    it("#2931 - synchronous putAttachment + compact", () => {

        const db = new PouchDB(dbs.name);
        let queue = db.put({ _id: "doc" });

        const otherPromises = [];

        for (let i = 0; i < 50; i++) {
            /* jshint loopfunc:true */
            queue = queue.then(() => {
                return db.get("doc").then((doc) => {
                    doc._attachments = doc._attachments || {};
                    const blob = testUtils.makeBlob(
                        testUtils.btoa(Math.random().toString()),
                        "text/plain");
                    return db.putAttachment(doc._id, "att.txt", doc._rev, blob,
                        "text/plain");
                });
            });
            queue.then(() => {
                const promise = Promise.all([
                    db.compact(),
                    db.compact(),
                    db.compact(),
                    db.compact(),
                    db.compact()
                ]);
                otherPromises.push(promise);
                return promise;
            });
        }
        return queue.then(() => {
            return Promise.all(otherPromises);
        });
    });

    it("#2931 - synchronous putAttachment + compact 2", () => {

        const db = new PouchDB(dbs.name);
        let queue = db.put({ _id: "doc" });

        let compactQueue = Promise.resolve();

        for (let i = 0; i < 50; i++) {
            /* jshint loopfunc:true */
            queue = queue.then(() => {
                return db.get("doc").then((doc) => {
                    doc._attachments = doc._attachments || {};
                    const blob = testUtils.makeBlob(
                        testUtils.btoa(Math.random().toString()),
                        "text/plain");
                    return db.putAttachment(doc._id, "att.txt", doc._rev, blob,
                        "text/plain");
                });
            });
            queue.then(() => {
                compactQueue = compactQueue.then(() => {
                    return Promise.all([
                        db.compact(),
                        db.compact(),
                        db.compact(),
                        db.compact(),
                        db.compact()
                    ]);
                });
            });
        }
        return queue.then(() => {
            return compactQueue;
        });
    });

    //
    // Tests for issue #2818 follow, which make some assumptions
    // about how binary data is stored, so they don't pass in
    // CouchDB. Namely, PouchDB dedups attachments based on
    // md5sum, whereas CouchDB does not.
    //

    // per https://en.wikipedia.org/wiki/MD5,
    // these two should have colliding md5sums
    const att1 = "0THdAsXm7sRpPZoGmK/5XC/KtQcSRn6r" +
        "QARYPrj7f4lVrTQGCfSzAoPkiIMl8UFaCFEl6PfNyZ/Z" +
        "Hb1ygDc8W9iCPjFWNI9brm2s1DbJGcbdU+I0h9oD/" +
        "QI5YwbSSM2g6Z8zQg9XfujOVLZwgCgNHsaY" +
        "Iby2qIOTlvllq2/3KnA=";
    const att2 = "0THdAsXm7sRpPZoGmK/5XC/KtYcSRn6r" +
        "QARYPrj7f4lVrTQGCfSzAoPkiIMlcUFaCFEl6PfNyZ/Z" +
        "Hb3ygDc8W9iCPjFWNI9brm2s1DbJGcbdU+K0h9oD/" +
        "QI5YwbSSM2g6Z8zQg9XfujOVLZwgKgNHsaY" +
        "Iby2qIOTlvllK2/3KnA=";

    it("#2818 md5 collision (sanity check)", () => {
        //
        // CouchDB will throw!
        //
        const db = new PouchDB(dbs.name, { auto_compaction: false });
        const doc1 = {
            _id: "doc1",
            _attachments: {
                "att.txt": {
                    data: att1,
                    content_type: "application/octet-stream"
                }
            }
        };
        const doc2 = {
            _id: "doc2",
            _attachments: {
                "att.txt": {
                    data: att2,
                    content_type: "application/octet-stream"
                }
            }
        };
        const doc3 = {
            _id: "doc3",
            _attachments: {
                "att.txt": {
                    data: `1${att2.substring(1)}`, // distractor
                    content_type: "application/octet-stream"
                }
            }
        };
        return db.put(doc1).then(() => {
            return db.put(doc2);
        }).then(() => {
            return db.put(doc3);
        }).then(() => {
            return db.allDocs({ include_docs: true });
        }).then((res) => {
            const md1 = res.rows[0].doc._attachments["att.txt"].digest;
            const md2 = res.rows[1].doc._attachments["att.txt"].digest;
            const md3 = res.rows[2].doc._attachments["att.txt"].digest;
            assert.notEqual(md1, md3, "md5 sums should not collide");
            assert.notEqual(md2, md3, "md5 sums should not collide");
            assert.equal(md1, md2, "md5 sums should collide. if not, other #2818 tests will fail");
        }).then(() => {
            return Promise.all(["doc1", "doc2"].map((id) => {
                return db.get(id, { attachments: true });
            })).then((docs) => {
                const data1 = docs[0]._attachments["att.txt"].data;
                const data2 = docs[1]._attachments["att.txt"].data;
                assert.equal(data1, data2, "yay, we are vulnerable to md5sum collision (1)");
                assert.equal(att1, data2, "att1 is the final one, not att2");
            });
        });
    });

    it("#2818 md5 collision between revs (sanity check)", () => {
        //
        // CouchDB will throw!
        //
        const db = new PouchDB(dbs.name, { auto_compaction: false });
        const doc1 = {
            _id: "doc1",
            _attachments: {
                "att.txt": {
                    data: att1,
                    content_type: "application/octet-stream"
                }
            }
        };
        let rev1;
        let rev2;
        return db.put(doc1).then((res) => {
            rev1 = doc1._rev = res.rev;
            doc1._attachments["att.txt"].data = att2;
            return db.put(doc1);
        }).then((res) => {
            rev2 = res.rev;
            return Promise.all([rev1, rev2].map((rev) => {
                return db.get("doc1", { rev, attachments: true });
            }));
        }).then((docs) => {
            const data1 = docs[0]._attachments["att.txt"].data;
            const data2 = docs[1]._attachments["att.txt"].data;
            assert.equal(data1, data2, "yay, we are vulnerable to md5sum collision");
        });
    });

    it("#2818 doesn't throw 412, thanks to digest", () => {
        //
        // CouchDB will throw!
        //
        const db = new PouchDB(dbs.name, { auto_compaction: false });
        const doc1 = {
            _id: "doc1",
            _attachments: {
                "att.txt": {
                    data: "Zm9vYmFy", // 'foobar'
                    content_type: "text/plain"
                }
            }
        };

        return db.put(doc1).then(() => {
            return db.get("doc1");
        }).then((doc1) => {
            const doc2 = {
                _id: "doc2",
                _attachments: {
                    "att.txt": {
                        stub: true,
                        digest: doc1._attachments["att.txt"].digest,
                        content_type: "text/plain"
                    }
                }
            };
            return db.put(doc2);
        });
    });

    it("#2818 Compaction removes attachments", () => {
        // now that we've established no 412s thanks to digests,
        // we can use that to detect true attachment deletion
        const db = new PouchDB(dbs.name, { auto_compaction: false });
        const doc = {
            _id: "doc1",
            _attachments: {
                "deleteme.txt": {
                    data: "Zm9vYmFy", // 'foobar'
                    content_type: "text/plain"
                }
            }
        };
        let digest;
        return db.put(doc).then(() => {
            return db.get("doc1");
        }).then((doc) => {
            digest = doc._attachments["deleteme.txt"].digest;
            delete doc._attachments["deleteme.txt"];
            doc._attachments["retainme.txt"] = {
                data: "dG90bw==", // 'toto'
                content_type: "text/plain"
            };
            return db.put(doc);
        }).then(() => {
            return db.compact();
        }).then(() => {
            return db.get("doc1");
        }).then((doc) => {
            doc._attachments["newatt.txt"] = {
                content_type: "text/plain",
                digest,
                stub: true
            };
            return db.put(doc).then(() => {
                throw new Error("shouldn't have gotten here");
            }, (err) => {
                assert.equal(err.status, 412);
            });
        });
    });

    it("#2818 Compaction removes attachments given conflicts", () => {
        const db = new PouchDB(dbs.name, { auto_compaction: false });

        const docs = [
            {
                _id: "fubar",
                _rev: "1-a1",
                _revisions: { start: 1, ids: ["a1"] },
                _attachments: {
                    "att.txt": {
                        data: "Zm9vYmFy", // 'foobar'
                        content_type: "text/plain"
                    }
                }
            }, {
                _id: "fubar",
                _rev: "2-a2",
                _revisions: { start: 2, ids: ["a2", "a1"] },
                _attachments: {
                    "att.txt": {
                        data: "dG90bw==", // 'toto'
                        content_type: "text/plain"
                    }
                }
            }, {
                _id: "fubar",
                _rev: "3-a3",
                _revisions: { start: 3, ids: ["a3", "a2", "a1"] },
                _attachments: {
                    "att.txt": {
                        data: "Ym9uZ28=", // 'bongo'
                        content_type: "text/plain"
                    }
                }
            }, {
                _id: "fubar",
                _rev: "1-b1",
                _revisions: { start: 1, ids: ["b1"] },
                _attachments: {
                    "att.txt": {
                        data: "enV6dQ==", // 'zuzu'
                        content_type: "text/plain"
                    }
                }
            }
        ];

        let allDigests = [];
        const digestsToForget = [];
        const digestsToRemember = [];
        return db.bulkDocs({
            docs,
            new_edits: false
        }).then(() => {
            return Promise.all([
                "1-a1", "2-a2", "3-a3", "1-b1"
            ].map((rev) => {
                return db.get("fubar", { rev, attachments: true });
            }));
        }).then((docs) => {
            digestsToForget.push(docs[0]._attachments["att.txt"].digest);
            digestsToForget.push(docs[1]._attachments["att.txt"].digest);
            digestsToRemember.push(docs[2]._attachments["att.txt"].digest);
            digestsToRemember.push(docs[3]._attachments["att.txt"].digest);

            allDigests = allDigests.concat(digestsToForget).concat(
                digestsToRemember);

            return Promise.all(allDigests.map((digest) => {
                const doc = {
                    _attachments: {
                        "newatt.txt": {
                            content_type: "text/plain",
                            digest,
                            stub: true
                        }
                    }
                };
                return db.post(doc).then((res) => {
                    return db.remove(res.id, res.rev);
                });
            }));
        }).then(() => {
            return db.compact();
        }).then(() => {
            return Promise.all(digestsToForget.map(
                (digest) => {
                    const doc = {
                        _attachments: {
                            "newatt.txt": {
                                content_type: "text/plain",
                                digest,
                                stub: true
                            }
                        }
                    };
                    return db.post(doc).then(() => {
                        throw new Error("shouldn't have gotten here");
                    }, (err) => {
                        assert.equal(err.status, 412);
                    });
                }));
        }).then(() => {
            return Promise.all(digestsToRemember.map(
                (digest) => {
                    const doc = {
                        _attachments: {
                            "newatt.txt": {
                                content_type: "text/plain",
                                digest,
                                stub: true
                            }
                        }
                    };
                    return db.post(doc);
                }));
        });
    });

    it("#2818 Compaction retains attachments if unorphaned", () => {
        const db = new PouchDB(dbs.name, { auto_compaction: false });
        const doc = {
            _id: "doc1",
            _attachments: {
                "deleteme.txt": {
                    data: "Zm9vYmFy", // 'foobar'
                    content_type: "text/plain"
                }
            }
        };
        let digest;
        return db.put(doc).then(() => {
            return db.get("doc1");
        }).then((doc) => {
            digest = doc._attachments["deleteme.txt"].digest;
            delete doc._attachments["deleteme.txt"];
            doc._attachments["retainme.txt"] = {
                data: "dG90bw==", // 'toto'
                content_type: "text/plain"
            };
            return db.put(doc);
        }).then(() => {
            return db.put({
                _id: "doc2",
                _attachments: {
                    "nodontdeleteme.txt": {
                        data: "Zm9vYmFy", // 'foobar'
                        content_type: "text/plain"
                    }
                }
            });
        }).then(() => {
            return db.compact();
        }).then(() => {
            return db.get("doc1");
        }).then((doc) => {
            doc._attachments["newatt.txt"] = {
                content_type: "text/plain",
                digest,
                stub: true
            };
            return db.put(doc);
        }).then(() => {
            return db.allDocs();
        }).then((res) => {
            // ok, now let's really delete them
            const docs = [
                {
                    _id: "doc1",
                    _rev: res.rows[0].value.rev
                },
                {
                    _id: "doc2",
                    _rev: res.rows[1].value.rev
                }
            ];
            return db.bulkDocs(docs);
        }).then(() => {
            return db.compact();
        }).then(() => {
            const doc = {
                _attachments: {
                    "foo.txt": {
                        content_type: "text/plain",
                        digest,
                        stub: true
                    }
                }
            };
            return db.post(doc).then(() => {
                throw new Error("shouldn't have gotten here");
            }, (err) => {
                assert.equal(err.status, 412);
            });
        });
    });

    it("#2818 successive new_edits okay with attachments", () => {
        const db = new PouchDB(dbs.name);
        const docs = [{
            _id: "foo",
            _rev: "1-x",
            _revisions: {
                start: 1,
                ids: ["x"]
            },
            _attachments: {
                "att.txt": {
                    data: "Zm9vYmFy", // 'foobar'
                    content_type: "text/plain"
                }
            }
        }];
        let digest;
        return db.bulkDocs({ docs, new_edits: false }).then(() => {
            return db.bulkDocs({ docs, new_edits: false });
        }).then(() => {
            return db.get("foo", { attachments: true });
        }).then((doc) => {
            assert.equal(doc._rev, "1-x");
            digest = doc._attachments["att.txt"].digest;
        }).then(() => {
            const doc = {
                _attachments: {
                    "foo.txt": {
                        content_type: "text/plain",
                        digest,
                        stub: true
                    }
                }
            };
            return db.post(doc);
        });
    });

    it("#2818 Compaction really replaces attachments", () => {
        // now that we've established md5sum collisions,
        // we can use that to detect true attachment replacement
        const db = new PouchDB(dbs.name, { auto_compaction: false });
        return db.put({
            _id: "doc1",
            _attachments: {
                "att.txt": {
                    data: att1,
                    content_type: "application/octet-stream"
                }
            }
        }).then(() => {
            return db.get("doc1", { attachments: true });
        }).then((doc1) => {
            assert.equal(doc1._attachments["att.txt"].data, att1, "doc1");
            return db.put({
                _id: "doc2",
                _attachments: {
                    "att.txt": {
                        data: att2,
                        content_type: "application/octet-stream"
                    }
                }
            });
        }).then(() => {
            return db.allDocs({ include_docs: true });
        }).then((res) => {
            assert.equal(res.rows[0].doc._attachments["att.txt"].digest, res.rows[1].doc._attachments["att.txt"].digest, "digests collide"
            );
            return db.get("doc1", { attachments: true });
        }).then((doc1) => {
            assert.equal(doc1._attachments["att.txt"].data, att1, "doc1 has original att, indicating we didn't overwrite it");
            return db.get("doc2", { attachments: true });
        }).then((doc2) => {
            assert.equal(doc2._attachments["att.txt"].data, att1, "doc2 also has original att");
            return db.remove(doc2);
        }).then(() => {
            return db.get("doc1");
        }).then((doc1) => {
            return db.remove(doc1);
        }).then(() => {
            return db.compact();
        }).then(() => {
            return db.put({
                _id: "doc3",
                _attachments: {
                    "att.txt": {
                        data: att2,
                        content_type: "application/octet-stream"
                    }
                }
            });
        }).then(() => {
            return db.put({
                _id: "doc4",
                _attachments: {
                    "att.txt": {
                        data: att1,
                        content_type: "application/octet-stream"
                    }
                }
            });
        }).then(() => {
            return db.get("doc3", { attachments: true });
        }).then((doc3) => {
            assert.equal(doc3._attachments["att.txt"].data, att2, "md5-colliding content was really replaced");
            return db.get("doc4", { attachments: true });
        }).then((doc4) => {
            assert.equal(doc4._attachments["att.txt"].data, att2, "md5-colliding content was really replaced");
        });
    });

    it("#2818 Many orphaned attachments", () => {
        // now that we've established md5sum collisions,
        // we can use that to detect true attachment replacement
        const db = new PouchDB(dbs.name, { auto_compaction: false });
        const docs = [
            {
                _id: "doc1",
                _attachments: {
                    "att1.txt": {
                        data: testUtils.btoa("1"),
                        content_type: "text/plain"
                    },
                    "att2.txt": {
                        data: testUtils.btoa("2"),
                        content_type: "text/plain"
                    },
                    "att3.txt": {
                        data: testUtils.btoa("3"),
                        content_type: "text/plain"
                    },
                    "att4.txt": {
                        data: testUtils.btoa("4"),
                        content_type: "text/plain"
                    },
                    "att5.txt": {
                        data: testUtils.btoa("5"),
                        content_type: "text/plain"
                    }
                }
            }, {
                _id: "doc2",
                _attachments: {
                    "att3.txt": {
                        data: testUtils.btoa("3"),
                        content_type: "text/plain"
                    },
                    "att4.txt": {
                        data: testUtils.btoa("4"),
                        content_type: "text/plain"
                    },
                    "att5.txt": {
                        data: testUtils.btoa("5"),
                        content_type: "text/plain"
                    },
                    "att6.txt": {
                        data: testUtils.btoa("6"),
                        content_type: "text/plain"
                    }
                }
            }, {
                _id: "doc3",
                _attachments: {
                    "att1.txt": {
                        data: testUtils.btoa("1"),
                        content_type: "text/plain"
                    },
                    "att6.txt": {
                        data: testUtils.btoa("6"),
                        content_type: "text/plain"
                    },
                    "att7.txt": {
                        data: testUtils.btoa("7"),
                        content_type: "text/plain"
                    }
                }
            }
        ];

        let digestsToForget;
        let digestsToRemember;
        return db.bulkDocs(docs).then(() => {
            return db.compact();
        }).then(() => {
            return db.allDocs({ include_docs: true });
        }).then((res) => {
            const allAtts = {};
            res.rows.forEach((row) => {
                Object.keys(row.doc._attachments).forEach((attName) => {
                    const att = row.doc._attachments[attName];
                    allAtts[attName] = att.digest;
                });
            });
            digestsToForget = [
                allAtts["att2.txt"],
                allAtts["att3.txt"],
                allAtts["att4.txt"],
                allAtts["att5.txt"]
            ];
            digestsToRemember = [
                allAtts["att1.txt"],
                allAtts["att6.txt"],
                allAtts["att7.txt"]
            ];
            return db.get("doc1");
        }).then((doc1) => {
            return db.remove(doc1);
        }).then(() => {
            return db.get("doc2");
        }).then((doc2) => {
            return db.remove(doc2);
        }).then(() => {
            return db.compact();
        }).then(() => {
            return Promise.all(
                digestsToRemember.map((digest) => {
                    return db.post({
                        _attachments: {
                            "baz.txt": {
                                stub: true,
                                digest,
                                content_type: "text/plain"
                            }
                        }
                    });
                }));
        }).then(() => {
            return Promise.all(
                digestsToForget.map((digest) => {
                    return db.post({
                        _attachments: {
                            "baz.txt": {
                                stub: true,
                                digest,
                                content_type: "text/plain"
                            }
                        }
                    }).then(() => {
                        throw new Error("shouldn't have gotten here");
                    }, (err) => {
                        assert.equal(err.status, 412);
                    });
                }));
        });
    });

    it("#3092 atts should be ignored when _deleted - bulkDocs", () => {
        // now that we've established md5sum collisions,
        // we can use that to detect true attachment replacement
        const db = new PouchDB(dbs.name, { auto_compaction: false });
        const doc = { _id: "doc1" };
        return db.put(doc).then((info) => {
            doc._rev = info.rev;
            doc._deleted = true;
            doc._attachments = {
                "att1.txt": {
                    data: testUtils.btoa("1"),
                    content_type: "application/octet-stream"
                }
            };
            return db.bulkDocs([doc]);
        }).then(() => {
            return db.post({
                _attachments: {
                    "baz.txt": {
                        stub: true,
                        digest: "md5-xMpCOKC5I4INzFCab3WEmw==",
                        content_type: "application/octet-stream"
                    }
                }
            }).then(() => {
                throw new Error("shouldn't have gotten here");
            }, (err) => {
                assert.equal(err.status, 412);
            });
        });
    });

    it("#3091 atts should be ignored when _deleted - put", () => {
        // now that we've established md5sum collisions,
        // we can use that to detect true attachment replacement
        const db = new PouchDB(dbs.name, { auto_compaction: false });
        const doc = { _id: "doc1" };
        return db.put(doc).then((info) => {
            doc._rev = info.rev;
            doc._deleted = true;
            doc._attachments = {
                "att1.txt": {
                    data: testUtils.btoa("1"),
                    content_type: "application/octet-stream"
                }
            };
            return db.put(doc);
        }).then(() => {
            return db.post({
                _attachments: {
                    "baz.txt": {
                        stub: true,
                        digest: "md5-xMpCOKC5I4INzFCab3WEmw==",
                        content_type: "application/octet-stream"
                    }
                }
            }).then(() => {
                throw new Error("shouldn't have gotten here");
            }, (err) => {
                assert.equal(err.status, 412);
            });
        });
    });

    it("#3089 Many orphaned atts w/ parallel compaction", () => {
        // now that we've established md5sum collisions,
        // we can use that to detect true attachment replacement
        const db = new PouchDB(dbs.name, { auto_compaction: false });
        const docs = [
            {
                _id: "doc1",
                _attachments: {
                    "att1.txt": {
                        data: testUtils.btoa("1"),
                        content_type: "text/plain"
                    },
                    "att2.txt": {
                        data: testUtils.btoa("2"),
                        content_type: "text/plain"
                    },
                    "att3.txt": {
                        data: testUtils.btoa("3"),
                        content_type: "text/plain"
                    },
                    "att4.txt": {
                        data: testUtils.btoa("4"),
                        content_type: "text/plain"
                    },
                    "att5.txt": {
                        data: testUtils.btoa("5"),
                        content_type: "text/plain"
                    }
                }
            }, {
                _id: "doc2",
                _attachments: {
                    "att3.txt": {
                        data: testUtils.btoa("3"),
                        content_type: "text/plain"
                    },
                    "att4.txt": {
                        data: testUtils.btoa("4"),
                        content_type: "text/plain"
                    },
                    "att5.txt": {
                        data: testUtils.btoa("5"),
                        content_type: "text/plain"
                    },
                    "att6.txt": {
                        data: testUtils.btoa("6"),
                        content_type: "text/plain"
                    }
                }
            }, {
                _id: "doc3",
                _attachments: {
                    "att1.txt": {
                        data: testUtils.btoa("1"),
                        content_type: "text/plain"
                    },
                    "att6.txt": {
                        data: testUtils.btoa("6"),
                        content_type: "text/plain"
                    },
                    "att7.txt": {
                        data: testUtils.btoa("7"),
                        content_type: "text/plain"
                    }
                }
            }
        ];

        let digestsToForget;
        let digestsToRemember;
        return db.bulkDocs(docs).then(() => {
            return db.allDocs({ include_docs: true });
        }).then((res) => {
            const allAtts = {};
            res.rows.forEach((row) => {
                Object.keys(row.doc._attachments).forEach((attName) => {
                    const att = row.doc._attachments[attName];
                    allAtts[attName] = att.digest;
                });
            });
            digestsToForget = [
                allAtts["att2.txt"],
                allAtts["att3.txt"],
                allAtts["att4.txt"],
                allAtts["att5.txt"]
            ];
            digestsToRemember = [
                allAtts["att1.txt"],
                allAtts["att6.txt"],
                allAtts["att7.txt"]
            ];
            return db.allDocs({ keys: ["doc1", "doc2"] });
        }).then((res) => {
            const docs = res.rows.map((row) => {
                return {
                    _deleted: true,
                    _id: row.id,
                    _rev: row.value.rev
                };
            });
            return db.bulkDocs(docs);
        }).then(() => {
            return db.compact();
        }).then(() => {
            return Promise.all(
                digestsToRemember.map((digest) => {
                    return db.post({
                        _attachments: {
                            "baz.txt": {
                                stub: true,
                                digest,
                                content_type: "text/plain"
                            }
                        }
                    });
                }));
        }).then(() => {
            return Promise.all(
                digestsToForget.map((digest) => {
                    return db.post({
                        _attachments: {
                            "baz.txt": {
                                stub: true,
                                digest,
                                content_type: "text/plain"
                            }
                        }
                    }).then(() => {
                        throw new Error("shouldn't have gotten here");
                    }, (err) => {
                        assert.equal(err.status, 412);
                    });
                }));
        });
    });

    it("#3089 Same att orphaned by many documents", () => {
        // In this test, a single attachment is shared by many docs,
        // which are all deleted in a single bulkDocs. This is to
        // hunt down race conditions in our orphan compaction.

        const db = new PouchDB(dbs.name, { auto_compaction: false });

        const docs = [];
        for (let i = 0; i < 100; i++) {
            docs.push({
                _id: i.toString(),
                _attachments: {
                    "att1.txt": {
                        data: testUtils.btoa("1"),
                        content_type: "text/plain"
                    }
                }
            });
        }

        return db.bulkDocs(docs).then((results) => {
            results.forEach((res, i) => {
                docs[i]._rev = res.rev;
            });
            return db.get(docs[0]._id);
        }).then((doc) => {
            const digest = doc._attachments["att1.txt"].digest;
            docs.forEach((doc) => {
                doc._deleted = true;
            });
            return db.bulkDocs(docs).then(() => {
                return db.compact();
            }).then(() => {
                return db.post({
                    _attachments: {
                        "baz.txt": {
                            stub: true,
                            digest,
                            content_type: "text/plain"
                        }
                    }
                }).then(() => {
                    throw new Error("shouldn't have gotten here");
                }, (err) => {
                    assert.equal(err.status, 412);
                });
            });
        });
    });

    //
    // AUTO-COMPACTION TESTS FOLLOW
    // http adapters need not apply!
    //

    it("Auto-compaction test", (done) => {
        const db = new PouchDB(dbs.name, { auto_compaction: true });
        const doc = { _id: "doc", val: "1" };
        db.post(doc, (err, res) => {
            const rev1 = res.rev;
            doc._rev = rev1;
            doc.val = "2";
            db.post(doc, (err, res) => {
                const rev2 = res.rev;
                doc._rev = rev2;
                doc.val = "3";
                db.post(doc, (err, res) => {
                    const rev3 = res.rev;
                    db.get("doc", { rev: rev1 }, (err) => {
                        assert.equal(err.status, 404, "rev-1 should be missing");
                        assert.equal(err.name,
                            "not_found", "rev-1 should be missing"
                        );
                        db.get("doc", { rev: rev2 }, (err) => {
                            assert.equal(err.status, 404, "rev-2 should be missing");
                            assert.equal(err.name,
                                "not_found", "rev-2 should be missing"
                            );
                            db.get("doc", { rev: rev3 }, (err) => {
                                done(err);
                            });
                        });
                    });
                });
            });
        });
    });

    it("#3251 massively parallel autocompaction while getting", () => {
        const db = new PouchDB(dbs.name, { auto_compaction: true });

        const doc = { _id: "foo" };

        return db.put(doc).then((res) => {
            doc._rev = res.rev;
        }).then(() => {

            let updatePromise = Promise.resolve();

            for (let i = 0; i < 20; i++) {
                /* jshint loopfunc: true */
                updatePromise = updatePromise.then(() => {
                    return db.put(doc).then((res) => {
                        doc._rev = res.rev;
                    });
                });
            }

            const tasks = [updatePromise];
            for (let ii = 0; ii < 300; ii++) {
                /* jshint loopfunc: true */
                let task = db.get("foo");
                for (let j = 0; j < 10; j++) {
                    task = task.then(() => {
                        return new Promise((resolve) => {
                            setTimeout(resolve, Math.floor(Math.random() * 10));
                        });
                    }).then(() => {
                        return db.get("foo");
                    });
                }
                tasks.push(task);
            }
            return Promise.all(tasks);
        });
    });

    it("#3251 massively parallel autocompaction while allDocsing", () => {
        const db = new PouchDB(dbs.name, { auto_compaction: true });

        const doc = { _id: "foo" };

        return db.put(doc).then((res) => {
            doc._rev = res.rev;
        }).then(() => {

            let updatePromise = Promise.resolve();

            for (let i = 0; i < 20; i++) {
                /* jshint loopfunc: true */
                updatePromise = updatePromise.then(() => {
                    return db.put(doc).then((res) => {
                        doc._rev = res.rev;
                    });
                });
            }

            const tasks = [updatePromise];
            for (let ii = 0; ii < 300; ii++) {
                /* jshint loopfunc: true */
                let task = db.allDocs({ key: "foo", include_docs: true });
                for (let j = 0; j < 10; j++) {
                    task = task.then(() => {
                        return new Promise((resolve) => {
                            setTimeout(resolve, Math.floor(Math.random() * 10));
                        });
                    }).then(() => {
                        return db.allDocs({ key: "foo", include_docs: true });
                    });
                }
                tasks.push(task);
            }
            return Promise.all(tasks);
        });
    });

    it("#3251 massively parallel autocompaction while changesing", () => {
        const db = new PouchDB(dbs.name, { auto_compaction: true });

        const doc = { _id: "foo" };

        // we know we're going to reach this because of all the changes()
        // we're doing at once
        db.setMaxListeners(1000);

        return db.put(doc).then((res) => {
            doc._rev = res.rev;
        }).then(() => {

            let updatePromise = Promise.resolve();

            for (let i = 0; i < 20; i++) {
                /* jshint loopfunc: true */
                updatePromise = updatePromise.then(() => {
                    return db.put(doc).then((res) => {
                        doc._rev = res.rev;
                    });
                });
            }

            const tasks = [updatePromise];
            for (let ii = 0; ii < 300; ii++) {
                /* jshint loopfunc: true */
                let task = db.changes({ include_docs: true });
                for (let j = 0; j < 10; j++) {
                    task = task.then(() => {
                        return new Promise((resolve) => {
                            setTimeout(resolve, Math.floor(Math.random() * 10));
                        });
                    }).then(() => {
                        return db.changes({ include_docs: true });
                    });
                }
                tasks.push(task);
            }
            return Promise.all(tasks);
        });
    });

    it("#3089 Many orphaned attachments w/ auto-compaction", () => {
        // now that we've established md5sum collisions,
        // we can use that to detect true attachment replacement
        const db = new PouchDB(dbs.name, { auto_compaction: true });
        const docs = [
            {
                _id: "doc1",
                _attachments: {
                    "att1.txt": {
                        data: testUtils.btoa("1"),
                        content_type: "text/plain"
                    },
                    "att2.txt": {
                        data: testUtils.btoa("2"),
                        content_type: "text/plain"
                    },
                    "att3.txt": {
                        data: testUtils.btoa("3"),
                        content_type: "text/plain"
                    },
                    "att4.txt": {
                        data: testUtils.btoa("4"),
                        content_type: "text/plain"
                    },
                    "att5.txt": {
                        data: testUtils.btoa("5"),
                        content_type: "text/plain"
                    }
                }
            }, {
                _id: "doc2",
                _attachments: {
                    "att3.txt": {
                        data: testUtils.btoa("3"),
                        content_type: "text/plain"
                    },
                    "att4.txt": {
                        data: testUtils.btoa("4"),
                        content_type: "text/plain"
                    },
                    "att5.txt": {
                        data: testUtils.btoa("5"),
                        content_type: "text/plain"
                    },
                    "att6.txt": {
                        data: testUtils.btoa("6"),
                        content_type: "text/plain"
                    }
                }
            }, {
                _id: "doc3",
                _attachments: {
                    "att1.txt": {
                        data: testUtils.btoa("1"),
                        content_type: "text/plain"
                    },
                    "att6.txt": {
                        data: testUtils.btoa("6"),
                        content_type: "text/plain"
                    },
                    "att7.txt": {
                        data: testUtils.btoa("7"),
                        content_type: "text/plain"
                    }
                }
            }
        ];

        let digestsToForget;
        let digestsToRemember;
        return db.bulkDocs(docs).then(() => {
            return db.allDocs({ include_docs: true });
        }).then((res) => {
            const allAtts = {};
            res.rows.forEach((row) => {
                Object.keys(row.doc._attachments).forEach((attName) => {
                    const att = row.doc._attachments[attName];
                    allAtts[attName] = att.digest;
                });
            });
            digestsToForget = [
                allAtts["att2.txt"],
                allAtts["att3.txt"],
                allAtts["att4.txt"],
                allAtts["att5.txt"]
            ];
            digestsToRemember = [
                allAtts["att1.txt"],
                allAtts["att6.txt"],
                allAtts["att7.txt"]
            ];
            return db.get("doc1");
        }).then((doc1) => {
            return db.remove(doc1);
        }).then(() => {
            return db.get("doc2");
        }).then((doc2) => {
            return db.remove(doc2);
        }).then(() => {
            return Promise.all(
                digestsToRemember.map((digest) => {
                    return db.post({
                        _attachments: {
                            "baz.txt": {
                                stub: true,
                                digest,
                                content_type: "text/plain"
                            }
                        }
                    });
                }));
        }).then(() => {
            return Promise.all(
                digestsToForget.map((digest) => {
                    return db.post({
                        _attachments: {
                            "baz.txt": {
                                stub: true,
                                digest,
                                content_type: "text/plain"
                            }
                        }
                    }).then(() => {
                        throw new Error("shouldn't have gotten here");
                    }, (err) => {
                        assert.equal(err.status, 412);
                    });
                }));
        });
    });

    it("#3089 Many orphaned atts w/ parallel auto-compaction", () => {
        // now that we've established md5sum collisions,
        // we can use that to detect true attachment replacement
        const db = new PouchDB(dbs.name, { auto_compaction: true });
        const docs = [
            {
                _id: "doc1",
                _attachments: {
                    "att1.txt": {
                        data: testUtils.btoa("1"),
                        content_type: "text/plain"
                    },
                    "att2.txt": {
                        data: testUtils.btoa("2"),
                        content_type: "text/plain"
                    },
                    "att3.txt": {
                        data: testUtils.btoa("3"),
                        content_type: "text/plain"
                    },
                    "att4.txt": {
                        data: testUtils.btoa("4"),
                        content_type: "text/plain"
                    },
                    "att5.txt": {
                        data: testUtils.btoa("5"),
                        content_type: "text/plain"
                    }
                }
            }, {
                _id: "doc2",
                _attachments: {
                    "att3.txt": {
                        data: testUtils.btoa("3"),
                        content_type: "text/plain"
                    },
                    "att4.txt": {
                        data: testUtils.btoa("4"),
                        content_type: "text/plain"
                    },
                    "att5.txt": {
                        data: testUtils.btoa("5"),
                        content_type: "text/plain"
                    },
                    "att6.txt": {
                        data: testUtils.btoa("6"),
                        content_type: "text/plain"
                    }
                }
            }, {
                _id: "doc3",
                _attachments: {
                    "att1.txt": {
                        data: testUtils.btoa("1"),
                        content_type: "text/plain"
                    },
                    "att6.txt": {
                        data: testUtils.btoa("6"),
                        content_type: "text/plain"
                    },
                    "att7.txt": {
                        data: testUtils.btoa("7"),
                        content_type: "text/plain"
                    }
                }
            }
        ];

        let digestsToForget;
        let digestsToRemember;
        return db.bulkDocs(docs).then(() => {
            return db.allDocs({ include_docs: true });
        }).then((res) => {
            const allAtts = {};
            res.rows.forEach((row) => {
                Object.keys(row.doc._attachments).forEach((attName) => {
                    const att = row.doc._attachments[attName];
                    allAtts[attName] = att.digest;
                });
            });
            digestsToForget = [
                allAtts["att2.txt"],
                allAtts["att3.txt"],
                allAtts["att4.txt"],
                allAtts["att5.txt"]
            ];
            digestsToRemember = [
                allAtts["att1.txt"],
                allAtts["att6.txt"],
                allAtts["att7.txt"]
            ];
            return db.allDocs({ keys: ["doc1", "doc2"] });
        }).then((res) => {
            const docs = res.rows.map((row) => {
                return {
                    _deleted: true,
                    _id: row.id,
                    _rev: row.value.rev
                };
            });
            return db.bulkDocs(docs);
        }).then(() => {
            return Promise.all(
                digestsToRemember.map((digest) => {
                    return db.post({
                        _attachments: {
                            "baz.txt": {
                                stub: true,
                                digest,
                                content_type: "text/plain"
                            }
                        }
                    });
                }));
        }).then(() => {
            return Promise.all(
                digestsToForget.map((digest) => {
                    return db.post({
                        _attachments: {
                            "baz.txt": {
                                stub: true,
                                digest,
                                content_type: "text/plain"
                            }
                        }
                    }).then(() => {
                        throw new Error("shouldn't have gotten here");
                    }, (err) => {
                        assert.equal(err.status, 412);
                    });
                }));
        });
    });

    it("#3089 Auto-compaction retains atts if unorphaned", () => {
        const db = new PouchDB(dbs.name, { auto_compaction: true });
        const doc = {
            _id: "doc1",
            _attachments: {
                "deleteme.txt": {
                    data: "Zm9vYmFy", // 'foobar'
                    content_type: "text/plain"
                }
            }
        };
        let digest;
        return db.put(doc).then(() => {
            return db.get("doc1");
        }).then((doc) => {
            digest = doc._attachments["deleteme.txt"].digest;
            delete doc._attachments["deleteme.txt"];
            doc._attachments["retainme.txt"] = {
                data: "dG90bw==", // 'toto'
                content_type: "text/plain"
            };
            return db.put(doc);
        }).then(() => {
            return db.put({
                _id: "doc2",
                _attachments: {
                    "nodontdeleteme.txt": {
                        data: "Zm9vYmFy", // 'foobar'
                        content_type: "text/plain"
                    }
                }
            });
        }).then(() => {
            return db.get("doc1");
        }).then((doc) => {
            doc._attachments["newatt.txt"] = {
                content_type: "text/plain",
                digest,
                stub: true
            };
            return db.put(doc);
        }).then(() => {
            return db.allDocs();
        }).then((res) => {
            // ok, now let's really delete them
            const docs = [
                {
                    _id: "doc1",
                    _rev: res.rows[0].value.rev
                },
                {
                    _id: "doc2",
                    _rev: res.rows[1].value.rev
                }
            ];
            return db.bulkDocs(docs);
        }).then(() => {
            const doc = {
                _attachments: {
                    "foo.txt": {
                        content_type: "text/plain",
                        digest,
                        stub: true
                    }
                }
            };
            return db.post(doc).then(() => {
                throw new Error("shouldn't have gotten here");
            }, (err) => {
                assert.equal(err.status, 412);
            });
        });
    });

    it("#2818 successive new_edits okay with attachments", () => {
        const db = new PouchDB(dbs.name);
        const docs = [{
            _id: "foo",
            _rev: "1-x",
            _revisions: {
                start: 1,
                ids: ["x"]
            },
            _attachments: {
                "att.txt": {
                    data: "Zm9vYmFy", // 'foobar'
                    content_type: "text/plain"
                }
            }
        }];
        let digest;
        return db.bulkDocs({ docs, new_edits: false }).then(() => {
            return db.bulkDocs({ docs, new_edits: false });
        }).then(() => {
            return db.get("foo", { attachments: true });
        }).then((doc) => {
            assert.equal(doc._rev, "1-x");
            digest = doc._attachments["att.txt"].digest;
        }).then(() => {
            const doc = {
                _attachments: {
                    "foo.txt": {
                        content_type: "text/plain",
                        digest,
                        stub: true
                    }
                }
            };
            return db.post(doc);
        });
    });

    it("Auto-compaction removes non-leaf revs (#2807)", () => {
        const db = new PouchDB(dbs.name, { auto_compaction: true });
        const doc = { _id: "foo" };
        return db.put(doc).then((res) => {
            doc._rev = res.rev;
            return getRevisions(db, "foo");
        }).then((docsAndRevs) => {
            assert.lengthOf(docsAndRevs, 1);
            return db.put(doc);
        }).then((res) => {
            doc._rev = res.rev;
            return getRevisions(db, "foo");
        }).then((docsAndRevs) => {
            assert.lengthOf(docsAndRevs, 2);
            assert.exists(docsAndRevs[0].doc);
            assert.isUndefined(docsAndRevs[1].doc);
        });
    });

    it("Auto-compaction removes non-leaf revs pt 2 (#2807)", () => {
        const db = new PouchDB(dbs.name, { auto_compaction: true });
        const doc = { _id: "foo" };
        return db.put(doc).then((res) => {
            doc._rev = res.rev;
            return db.put(doc);
        }).then((res) => {
            doc._rev = res.rev;
            return db.put(doc);
        }).then(() => {
            return getRevisions(db, "foo");
        }).then((docsAndRevs) => {
            assert.lengthOf(docsAndRevs, 3);
            assert.exists(docsAndRevs[0].doc);
            assert.isUndefined(docsAndRevs[1].doc);
            assert.isUndefined(docsAndRevs[2].doc);
        });
    });

    it("Auto-compaction removes non-leaf revs pt 3 (#2807)", () => {
        const db = new PouchDB(dbs.name, { auto_compaction: true });

        const docs = [
            {
                _id: "foo",
                _rev: "1-a1",
                _revisions: { start: 1, ids: ["a1"] }
            }, {
                _id: "foo",
                _rev: "2-a2",
                _revisions: { start: 2, ids: ["a2", "a1"] }
            }, {
                _id: "foo",
                _deleted: true,
                _rev: "3-a3",
                _revisions: { start: 3, ids: ["a3", "a2", "a1"] }
            }, {
                _id: "foo",
                _rev: "1-b1",
                _revisions: { start: 1, ids: ["b1"] }
            }
        ];

        return db.bulkDocs(docs, { new_edits: false }).then(() => {
            return getRevisions(db, "foo");
        }).then((docsAndRevs) => {
            assert.lengthOf(docsAndRevs, 4);
            const asMap = {};
            docsAndRevs.forEach((docAndRev) => {
                asMap[docAndRev.rev] = docAndRev.doc;
            });
            // only leafs remain
            assert.isUndefined(asMap["1-a1"]);
            assert.isUndefined(asMap["2-a2"]);
            assert.exists(asMap["3-a3"]);
            assert.exists(asMap["1-b1"]);
        });
    });

    it("Auto-compaction removes non-leaf revs pt 4 (#2807)", () => {
        const db = new PouchDB(dbs.name, { auto_compaction: true });
        const doc = { _id: "foo" };
        return db.put(doc).then((res) => {
            doc._rev = res.rev;
            doc._deleted = true;
            return db.put(doc);
        }).then((res) => {
            doc._rev = res.rev;
            delete doc._deleted;
            return db.put(doc);
        }).then(() => {
            return getRevisions(db, "foo");
        }).then((docsAndRevs) => {
            assert.lengthOf(docsAndRevs, 3);
            assert.exists(docsAndRevs[0].doc);
            assert.isUndefined(docsAndRevs[1].doc);
            assert.isUndefined(docsAndRevs[2].doc);
        });
    });

    it("Auto-compaction removes non-leaf revs pt 5 (#2807)", () => {
        const db = new PouchDB(dbs.name, { auto_compaction: true });
        const doc = { _id: "foo" };
        return db.put(doc).then((res) => {
            doc._rev = res.rev;
            return db.put(doc);
        }).then((res) => {
            doc._rev = res.rev;
            doc._deleted = true;
            return db.put(doc);
        }).then(() => {
            return getRevisions(db, "foo");
        }).then((docsAndRevs) => {
            assert.lengthOf(docsAndRevs, 3);
            assert.exists(docsAndRevs[0].doc);
            assert.isUndefined(docsAndRevs[1].doc);
            assert.isUndefined(docsAndRevs[2].doc);
        });
    });

    it("#3089 Same att orphaned by many docs, auto-compact", () => {
        // In this test, a single attachment is shared by many docs,
        // which are all deleted in a single bulkDocs. This is to
        // hunt down race conditions in our orphan compaction.

        const db = new PouchDB(dbs.name, { auto_compaction: true });

        const docs = [];
        for (let i = 0; i < 100; i++) {
            docs.push({
                _id: i.toString(),
                _attachments: {
                    "att1.txt": {
                        data: testUtils.btoa("1"),
                        content_type: "text/plain"
                    }
                }
            });
        }

        return db.bulkDocs(docs).then((results) => {
            results.forEach((res, i) => {
                docs[i]._rev = res.rev;
            });
            return db.get(docs[0]._id);
        }).then((doc) => {
            const digest = doc._attachments["att1.txt"].digest;
            docs.forEach((doc) => {
                doc._deleted = true;
            });
            return db.bulkDocs(docs).then(() => {
                return db.post({
                    _attachments: {
                        "baz.txt": {
                            stub: true,
                            digest,
                            content_type: "text/plain"
                        }
                    }
                }).then(() => {
                    throw new Error("shouldn't have gotten here");
                }, (err) => {
                    assert.equal(err.status, 412);
                });
            });
        });
    });
});
