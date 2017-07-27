require("./node.setup");

const adapters = ["local", "http"];

function makeDocs(start, end, templateDoc) {
    const templateDocSrc = templateDoc ? JSON.stringify(templateDoc) : "{}";
    if (end === undefined) {
        end = start;
        start = 0;
    }
    const docs = [];
    for (let i = start; i < end; i++) {
        /*jshint evil:true */
        const newDoc = eval(`(${templateDocSrc})`);
        newDoc._id = i.toString();
        newDoc.integer = i;
        newDoc.string = i.toString();
        docs.push(newDoc);
    }
    return docs;
}

adapters.forEach((adapter) => {
    describe(`test.bulk_docs.js-${adapter}`, () => {

        const dbs = {};

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl(adapter, "testdb");
            testUtils.cleanup([dbs.name], done);
        });

        after((done) => {
            testUtils.cleanup([dbs.name], done);
        });


        const authors = [
            { name: "Dale Harvey", commits: 253 },
            { name: "Mikeal Rogers", commits: 42 },
            { name: "Johannes J. Schmidt", commits: 13 },
            { name: "Randall Leeds", commits: 9 }
        ];

        it("Testing bulk docs", () => {
            const db = new PouchDB(dbs.name);
            const docs = makeDocs(5);
            return db.bulkDocs({ docs }).then((results) => {
                assert.lengthOf(results, 5, "results length matches");
                for (let i = 0; i < 5; i++) {
                    assert.equal(results[i].id, docs[i]._id, "id matches");
                    assert.exists(results[i].rev, "rev is set");
                    // Update the doc
                    docs[i]._rev = results[i].rev;
                    docs[i].string = `${docs[i].string}.00`;
                }
                return db.bulkDocs({ docs });
            }).then((results) => {
                assert.lengthOf(results, 5, "results length matches");
                for (let i = 0; i < 5; i++) {
                    assert.equal(results[i].id, i.toString(), "id matches again");
                    // set the delete flag to delete the docs in the next step
                    docs[i]._rev = results[i].rev;
                    docs[i]._deleted = true;
                }
                return db.put(docs[0]);
            }).then(() => {
                return db.bulkDocs({ docs }).then((results) => {
                    assert.equal(results[0].name, "conflict", "First doc should be in conflict");
                    assert.isUndefined(results[0].rev, "no rev in conflict");
                    assert.exists(results[0].id);
                    assert.equal(results[0].id, "0");
                    for (let i = 1; i < 5; i++) {
                        assert.equal(results[i].id, i.toString());
                        assert.exists(results[i].rev);
                    }
                });
            });
        });

        it("#6039 test id in bulk docs for conflict", () => {
            const db = new PouchDB(dbs.name);
            const docs = makeDocs(5);
            return db.bulkDocs(docs).then((res) => {
                docs.forEach((doc, i) => {
                    doc._rev = res[i].rev;
                });
                docs[2]._rev = "3-totally_fake_rev";
                delete docs[4]._rev;
                return db.bulkDocs(docs);
            }).then((res) => {
                const expected = [{
                    id: "0",
                    rev: "rev_placeholder"
                }, {
                    id: "1",
                    rev: "rev_placeholder"
                }, {
                    id: "2",
                    error: true,
                    name: "conflict",
                    status: 409
                }, {
                    id: "3",
                    rev: "rev_placeholder"
                }, {
                    id: "4",
                    error: true,
                    name: "conflict",
                    status: 409
                }];
                res = res.map((x) => {
                    // parse+stringify to remove undefineds for comparison
                    return JSON.parse(JSON.stringify({
                        id: x.id,
                        error: x.error && true,
                        name: x.name,
                        status: x.status,
                        rev: (x.rev && "rev_placeholder")
                    }));
                });
                assert.deepEqual(res, expected);
            });
        });

        it("No id in bulk docs", (done) => {
            const db = new PouchDB(dbs.name);
            const newdoc = {
                _id: "foobar",
                body: "baz"
            };
            db.put(newdoc, (err, doc) => {
                assert.exists(doc.ok);
                const docs = [
                    {
                        _id: newdoc._id,
                        _rev: newdoc._rev,
                        body: "blam"
                    },
                    {
                        _id: newdoc._id,
                        _rev: newdoc._rev,
                        _deleted: true
                    }
                ];
                db.bulkDocs({ docs }, (err, results) => {
                    assert.property(results[0], "name", "conflict");
                    assert.property(results[1], "name", "conflict");
                    done();
                });
            });
        });

        it("No _rev and new_edits=false", (done) => {
            const db = new PouchDB(dbs.name);
            const docs = [{
                _id: "foo",
                integer: 1
            }];
            db.bulkDocs({ docs }, { new_edits: false }, (err) => {
                assert.exists(err, "error reported");
                done();
            });
        });

        it("Test empty bulkDocs", () => {
            const db = new PouchDB(dbs.name);
            return db.bulkDocs([]);
        });

        it("Test many bulkDocs", () => {
            const db = new PouchDB(dbs.name);
            const docs = [];
            for (let i = 0; i < 201; i++) {
                docs.push({ _id: i.toString() });
            }
            return db.bulkDocs(docs);
        });

        it("Test errors on invalid doc id", (done) => {
            const db = new PouchDB(dbs.name);
            const docs = [{
                _id: "_invalid",
                foo: "bar"
            }];
            db.bulkDocs({ docs }, (err, info) => {
                assert.equal(err.status, testUtils.errors.RESERVED_ID.status, "correct error status returned");
                assert.isUndefined(info, "info is empty");
                done();
            });
        });

        it("Test two errors on invalid doc id", (done) => {
            const docs = [
                { _id: "_invalid", foo: "bar" },
                { _id: 123, foo: "bar" }
            ];

            const db = new PouchDB(dbs.name);
            db.bulkDocs({ docs }, (err, info) => {
                assert.equal(err.status, testUtils.errors.RESERVED_ID.status,
                    "correct error returned");
                assert.isUndefined(info, "info is empty");
                done();
            });
        });

        it("No docs", (done) => {
            const db = new PouchDB(dbs.name);
            db.bulkDocs({ doc: [{ foo: "bar" }] }, (err) => {
                assert.equal(err.status, testUtils.errors.MISSING_BULK_DOCS.status, "correct error returned");
                assert.equal(err.message, testUtils.errors.MISSING_BULK_DOCS.message, "correct error message returned");
                done();
            });
        });

        it("Jira 911", (done) => {
            const db = new PouchDB(dbs.name);
            const docs = [
                { _id: "0", a: 0 },
                { _id: "1", a: 1 },
                { _id: "1", a: 1 },
                { _id: "3", a: 3 }
            ];
            db.bulkDocs({ docs }, (err, results) => {
                assert.equal(results[1].id, "1", "check ordering");
                assert.isUndefined(results[1].name, "first id succeded");
                assert.equal(results[2].name, "conflict", "second conflicted");
                assert.lengthOf(results, 4, "got right amount of results");
                done();
            });
        });

        it("Test multiple bulkdocs", (done) => {
            const db = new PouchDB(dbs.name);
            db.bulkDocs({ docs: authors }, () => {
                db.bulkDocs({ docs: authors }, () => {
                    db.allDocs((err, result) => {
                        assert.equal(result.total_rows, 8, "correct number of results");
                        done();
                    });
                });
            });
        });

        it("#2935 new_edits=false correct number", () => {
            const docs = [
                {
                    _id: "EE35E",
                    _rev: "4-70b26",
                    _deleted: true,
                    _revisions: {
                        start: 4,
                        ids: ["70b26", "9f454", "914bf", "7fdf8"]
                    }
                }, {
                    _id: "EE35E",
                    _rev: "3-f6d28",
                    _revisions: { start: 3, ids: ["f6d28", "914bf", "7fdf8"] }
                }
            ];

            const db = new PouchDB(dbs.name);

            return db.bulkDocs({ docs, new_edits: false }).then((res) => {
                assert.deepEqual(res, []);
                return db.allDocs();
            }).then((res) => {
                assert.equal(res.total_rows, 1);
                return db.info();
            }).then((info) => {
                assert.equal(info.doc_count, 1);
            });
        });

        it("#2935 new_edits=false correct number 2", () => {
            const docs = [
                {
                    _id: "EE35E",
                    _rev: "3-f6d28",
                    _revisions: { start: 3, ids: ["f6d28", "914bf", "7fdf8"] }
                }, {
                    _id: "EE35E",
                    _rev: "4-70b26",
                    _deleted: true,
                    _revisions: {
                        start: 4,
                        ids: ["70b26", "9f454", "914bf", "7fdf8"]
                    }
                }
            ];

            const db = new PouchDB(dbs.name);

            return db.bulkDocs({ docs, new_edits: false }).then((res) => {
                assert.deepEqual(res, []);
                return db.allDocs();
            }).then((res) => {
                assert.equal(res.total_rows, 1);
                return db.info();
            }).then((info) => {
                assert.equal(info.doc_count, 1);
            });
        });

        it("bulk docs update then delete then conflict", () => {
            const db = new PouchDB(dbs.name);
            const docs = [{ _id: "1" }];
            return db.bulkDocs(docs).then((res) => {
                assert.isUndefined(res[0].error, "no error");
                docs[0]._rev = res[0].rev;
                return db.bulkDocs(docs);
            }).then((res) => {
                assert.isUndefined(res[0].error, "no error");
                docs[0]._rev = res[0].rev;
                docs[0]._deleted = true;
                return db.bulkDocs(docs);
            }).then((res) => {
                assert.isUndefined(res[0].error, "no error");
                return db.bulkDocs(docs);
            }).then((res) => {
                assert.exists(res[0].error, "has an error");
                assert.equal(res[0].name, "conflict", "First doc should be in conflict");
            });
        });

        it("bulk docs update then delete then update", () => {
            // Not supported in CouchDB 2.x, see COUCHDB-2386
            if (testUtils.isCouchMaster()) {
                return;
            }

            const db = new PouchDB(dbs.name);
            const docs = [{ _id: "1" }];
            return db.bulkDocs(docs).then((res) => {
                assert.isUndefined(res[0].error, "no error");
                docs[0]._rev = res[0].rev;
                return db.bulkDocs(docs);
            }).then((res) => {
                assert.isUndefined(res[0].error, "no error");
                docs[0]._rev = res[0].rev;
                docs[0]._deleted = true;
                return db.bulkDocs(docs);
            }).then((res) => {
                assert.isUndefined(res[0].error, "no error");
                docs[0]._rev = res[0].rev;
                return db.bulkDocs(docs);
            }).then((res) => {
                assert.isUndefined(res[0].error, "no error");
            });
        });

        it("bulk_docs delete then undelete", () => {
            const db = new PouchDB(dbs.name);
            const doc = { _id: "1" };
            return db.bulkDocs([doc]).then((res) => {
                assert.isUndefined(res[0].error, "should not be an error 1");
                doc._rev = res[0].rev;
                doc._deleted = true;
                return db.bulkDocs([doc]);
            }).then((res) => {
                assert.isUndefined(res[0].error, "should not be an error 2");
                // Not supported in CouchDB 2.x, see COUCHDB-2386
                if (adapter === "http" && testUtils.isCouchMaster()) {
                    delete doc._rev;
                } else {
                    doc._rev = res[0].rev;
                }
                doc._deleted = false;
                return db.bulkDocs([doc]);
            });
        });

        it("bulk_docs delete then update then undelete", () => {
            // Not supported in CouchDB 2.x, see COUCHDB-2386
            if (testUtils.isCouchMaster()) {
                return;
            }

            const db = new PouchDB(dbs.name);
            const doc = { _id: "1" };
            return db.bulkDocs([doc]).then((res) => {
                assert.isUndefined(res[0].error, "should not be an error 1");
                doc._rev = res[0].rev;
                doc._deleted = true;
                return db.bulkDocs([doc]);
            }).then((res) => {
                assert.isUndefined(res[0].error, "should not be an error 2");
                doc._rev = res[0].rev;
                return db.bulkDocs([doc]);
            }).then((res) => {
                assert.isUndefined(res[0].error, "should not be an error 3");
                doc._rev = res[0].rev;
                doc._deleted = false;
                return db.bulkDocs([doc]);
            });
        });

        it("#2935 new_edits=false with single unauthorized", (done) => {

            testUtils.isCouchDB((isCouchDB) => {
                if (adapter !== "http" || !isCouchDB) {
                    return done();
                }

                const ddoc = {
                    _id: "_design/validate",
                    validate_doc_update: function (newDoc) {
                        if (newDoc.foo === undefined) {
                            throw { unauthorized: "Document must have a foo." };
                        }
                    }.toString()
                };

                const db = new PouchDB(dbs.name);

                db.put(ddoc).then(() => {
                    return db.bulkDocs({
                        docs: [
                            {
                                _id: "doc0",
                                _rev: "1-x",
                                foo: "bar",
                                _revisions: {
                                    start: 1,
                                    ids: ["x"]
                                }
                            }, {
                                _id: "doc1",
                                _rev: "1-x",
                                _revisions: {
                                    start: 1,
                                    ids: ["x"]
                                }
                            }, {
                                _id: "doc2",
                                _rev: "1-x",
                                foo: "bar",
                                _revisions: {
                                    start: 1,
                                    ids: ["x"]
                                }
                            }
                        ]
                    }, { new_edits: false });
                }).then((res) => {
                    assert.lengthOf(res, 1);
                    assert.exists(res[0].error);
                    assert.equal(res[0].id, "doc1");
                }).then(done);
            });
        });

        it("Deleting _local docs with bulkDocs", () => {
            const db = new PouchDB(dbs.name);

            let rev1;
            let rev2;
            let rev3;
            return db.put({ _id: "_local/godzilla" }).then((info) => {
                rev1 = info.rev;
                return db.put({ _id: "mothra" });
            }).then((info) => {
                rev2 = info.rev;
                return db.put({ _id: "rodan" });
            }).then((info) => {
                rev3 = info.rev;
                return db.bulkDocs([
                    { _id: "mothra", _rev: rev2, _deleted: true },
                    { _id: "_local/godzilla", _rev: rev1, _deleted: true },
                    { _id: "rodan", _rev: rev3, _deleted: true }
                ]);
            }).then(() => {
                return db.allDocs();
            }).then((info) => {
                assert.lengthOf(info.rows, 0);
                return db.get("_local/godzilla").then(() => {
                    throw new Error("expected 404");
                }, (err) => {
                    assert.exists(err);
                });
            });
        });

        if (adapter === "local") {
            // these tests crash CouchDB with a 500, neat
            // https://issues.apache.org/jira/browse/COUCHDB-2758

            it("Deleting _local docs with bulkDocs, not found", () => {
                const db = new PouchDB(dbs.name);

                let rev2;
                let rev3;
                return db.put({ _id: "mothra" }).then((info) => {
                    rev2 = info.rev;
                    return db.put({ _id: "rodan" });
                }).then((info) => {
                    rev3 = info.rev;
                    return db.bulkDocs([
                        { _id: "mothra", _rev: rev2, _deleted: true },
                        { _id: "_local/godzilla", _rev: "1-fake", _deleted: true },
                        { _id: "rodan", _rev: rev3, _deleted: true }
                    ]);
                }).then((res) => {
                    assert.isUndefined(res[0].error);
                    assert.exists(res[1].error);
                    assert.isUndefined(res[2].error);
                });
            });

            it("Deleting _local docs with bulkDocs, wrong rev", () => {
                const db = new PouchDB(dbs.name);

                let rev2;
                let rev3;
                return db.put({ _id: "_local/godzilla" }).then(() => {
                    return db.put({ _id: "mothra" });
                }).then((info) => {
                    rev2 = info.rev;
                    return db.put({ _id: "rodan" });
                }).then((info) => {
                    rev3 = info.rev;
                    return db.bulkDocs([
                        { _id: "mothra", _rev: rev2, _deleted: true },
                        { _id: "_local/godzilla", _rev: "1-fake", _deleted: true },
                        { _id: "rodan", _rev: rev3, _deleted: true }
                    ]);
                }).then((res) => {
                    assert.isUndefined(res[0].error);
                    assert.exists(res[1].error);
                    assert.isUndefined(res[2].error);
                });
            });
        }

        it("Bulk with new_edits=false", (done) => {
            const db = new PouchDB(dbs.name);
            const docs = [{
                _id: "foo",
                _rev: "2-x",
                _revisions: {
                    start: 2,
                    ids: ["x", "a"]
                }
            }, {
                _id: "foo",
                _rev: "2-y",
                _revisions: {
                    start: 2,
                    ids: ["y", "a"]
                }
            }];
            db.bulkDocs({ docs }, { new_edits: false }, () => {
                db.get("foo", { open_revs: "all" }, (err, res) => {
                    res.sort((a, b) => {
                        return a.ok._rev < b.ok._rev ? -1 :
                            a.ok._rev > b.ok._rev ? 1 : 0;
                    });
                    assert.equal(res.length, 2);
                    assert.equal(res[0].ok._rev, "2-x", "doc1 ok");
                    assert.equal(res[1].ok._rev, "2-y", "doc2 ok");
                    done();
                });
            });
        });

        it("Testing successive new_edits to the same doc", (done) => {

            const db = new PouchDB(dbs.name);
            const docs = [{
                _id: "foobar123",
                _rev: "1-x",
                bar: "huzzah",
                _revisions: {
                    start: 1,
                    ids: ["x"]
                }
            }];

            db.bulkDocs({ docs, new_edits: false }, (err) => {
                assert.isNull(err);
                db.bulkDocs({ docs, new_edits: false }, (err) => {
                    assert.isNull(err);
                    db.get("foobar123", (err, res) => {
                        assert.equal(res._rev, "1-x");
                        done();
                    });
                });
            });
        });

        it("#3062 bulkDocs with staggered seqs", () => {
            const db = new PouchDB(dbs.name);
            const docs = [];
            for (let i = 10; i <= 20; i++) {
                docs.push({ _id: `doc-${i}` });
            }
            return db.bulkDocs({ docs }).then((infos) => {
                docs.forEach((doc, i) => {
                    doc._rev = infos[i].rev;
                });
                const docsToUpdate = docs.filter((doc, i) => {
                    return i % 2 === 1;
                });
                docsToUpdate.reverse();
                return db.bulkDocs({ docs: docsToUpdate });
            }).then((infos) => {
                assert.deepEqual(infos.map((x) => {
                    return { id: x.id, error: Boolean(x.error), rev: (typeof x.rev) };
                }), [
                        { error: false, id: "doc-19", rev: "string" },
                        { error: false, id: "doc-17", rev: "string" },
                        { error: false, id: "doc-15", rev: "string" },
                        { error: false, id: "doc-13", rev: "string" },
                        { error: false, id: "doc-11", rev: "string" }
                    ]);
            });
        });

        it("Testing successive new_edits to the same doc, different content",
            (done) => {

                const db = new PouchDB(dbs.name);
                const docsA = [{
                    _id: "foo321",
                    _rev: "1-x",
                    bar: "baz",
                    _revisions: {
                        start: 1,
                        ids: ["x"]
                    }
                }, {
                    _id: "fee321",
                    bar: "quux",
                    _rev: "1-x",
                    _revisions: {
                        start: 1,
                        ids: ["x"]
                    }
                }];

                const docsB = [{
                    _id: "foo321",
                    _rev: "1-x",
                    bar: "zam", // this update should be rejected
                    _revisions: {
                        start: 1,
                        ids: ["x"]
                    }
                }, {
                    _id: "faa321",
                    _rev: "1-x",
                    bar: "zul",
                    _revisions: {
                        start: 1,
                        ids: ["x"]
                    }
                }];

                db.bulkDocs({ docs: docsA, new_edits: false }, (err) => {
                    assert.isNull(err);
                    db.changes().on("complete", (result) => {
                        const ids = result.results.map((row) => {
                            return row.id;
                        });
                        assert.include(ids, "foo321");
                        assert.include(ids, "fee321");
                        assert.notInclude(ids, "faa321");

                        const update_seq = result.last_seq;
                        db.bulkDocs({ docs: docsB, new_edits: false }, (err) => {
                            assert.isNull(err);
                            db.changes({
                                since: update_seq
                            }).on("complete", (result) => {
                                const ids = result.results.map((row) => {
                                    return row.id;
                                });
                                assert.notInclude(ids, "foo321");
                                assert.notInclude(ids, "fee321");
                                assert.include(ids, "faa321");

                                db.get("foo321", (err, res) => {
                                    assert.equal(res._rev, "1-x");
                                    assert.equal(res.bar, "baz");
                                    db.info((err, info) => {
                                        assert.equal(info.doc_count, 3);
                                        done();
                                    });
                                });
                            }).on("error", done);
                        });
                    }).on("error", done);
                });
            });

        it("Testing successive new_edits to two doc", () => {

            const db = new PouchDB(dbs.name);
            const doc1 = {
                _id: "foo",
                _rev: "1-x",
                _revisions: {
                    start: 1,
                    ids: ["x"]
                }
            };
            const doc2 = {
                _id: "bar",
                _rev: "1-x",
                _revisions: {
                    start: 1,
                    ids: ["x"]
                }
            };

            return db.put(doc1, { new_edits: false }).then(() => {
                return db.put(doc2, { new_edits: false });
            }).then(() => {
                return db.put(doc1, { new_edits: false });
            }).then(() => {
                return db.get("foo");
            }).then(() => {
                return db.get("bar");
            });
        });

        it("Deletion with new_edits=false", () => {

            const db = new PouchDB(dbs.name);
            const doc1 = {
                _id: "foo",
                _rev: "1-x",
                _revisions: {
                    start: 1,
                    ids: ["x"]
                }
            };
            const doc2 = {
                _deleted: true,
                _id: "foo",
                _rev: "2-y",
                _revisions: {
                    start: 2,
                    ids: ["y", "x"]
                }
            };

            return db.put(doc1, { new_edits: false }).then(() => {
                return db.put(doc2, { new_edits: false });
            }).then(() => {
                return db.allDocs({ keys: ["foo"] });
            }).then((res) => {
                assert.equal(res.rows[0].value.rev, "2-y");
                assert.equal(res.rows[0].value.deleted, true);
            });
        });

        it("Deletion with new_edits=false, no history", () => {

            const db = new PouchDB(dbs.name);
            const doc1 = {
                _id: "foo",
                _rev: "1-x",
                _revisions: {
                    start: 1,
                    ids: ["x"]
                }
            };
            const doc2 = {
                _deleted: true,
                _id: "foo",
                _rev: "2-y"
            };

            return db.put(doc1, { new_edits: false }).then(() => {
                return db.put(doc2, { new_edits: false });
            }).then(() => {
                return db.allDocs({ keys: ["foo"] });
            }).then((res) => {
                assert.equal(res.rows[0].value.rev, "1-x");
                assert.equal(Boolean(res.rows[0].value.deleted), false);
            });
        });

        it("Modification with new_edits=false, no history", () => {

            const db = new PouchDB(dbs.name);
            const doc1 = {
                _id: "foo",
                _rev: "1-x",
                _revisions: {
                    start: 1,
                    ids: ["x"]
                }
            };
            const doc2 = {
                _id: "foo",
                _rev: "2-y"
            };

            return db.put(doc1, { new_edits: false }).then(() => {
                return db.put(doc2, { new_edits: false });
            }).then(() => {
                return db.allDocs({ keys: ["foo"] });
            }).then((res) => {
                assert.equal(res.rows[0].value.rev, "2-y");
            });
        });

        it("Deletion with new_edits=false, no history, no revisions", () => {

            const db = new PouchDB(dbs.name);
            const doc = {
                _deleted: true,
                _id: "foo",
                _rev: "2-y"
            };

            return db.put(doc, { new_edits: false }).then(() => {
                return db.allDocs({ keys: ["foo"] });
            }).then((res) => {
                assert.equal(res.rows[0].value.rev, "2-y");
                assert.equal(res.rows[0].value.deleted, true);
            });
        });

        it("Testing new_edits=false in req body", (done) => {
            const db = new PouchDB(dbs.name);
            const docs = [{
                _id: "foo",
                _rev: "2-x",
                _revisions: {
                    start: 2,
                    ids: ["x", "a"]
                }
            }, {
                _id: "foo",
                _rev: "2-y",
                _revisions: {
                    start: 2,
                    ids: ["y", "a"]
                }
            }];
            db.bulkDocs({ docs, new_edits: false }, () => {
                db.get("foo", { open_revs: "all" }, (err, res) => {
                    res.sort((a, b) => {
                        return a.ok._rev < b.ok._rev ? -1 :
                            a.ok._rev > b.ok._rev ? 1 : 0;
                    });
                    assert.equal(res.length, 2);
                    assert.equal(res[0].ok._rev, "2-x", "doc1 ok");
                    assert.equal(res[1].ok._rev, "2-y", "doc2 ok");
                    done();
                });
            });
        });

        it("656 regression in handling deleted docs", (done) => {
            const db = new PouchDB(dbs.name);
            db.bulkDocs({
                docs: [{
                    _id: "foo",
                    _rev: "1-a",
                    _deleted: true
                }]
            }, { new_edits: false }, () => {
                db.get("foo", (err) => {
                    assert.exists(err, "deleted");
                    assert.equal(err.name, "not_found");
                    assert.equal(err.status, testUtils.errors.MISSING_DOC.status, "correct error status returned");
                    done();
                });
            });
        });

        it("Test quotes in doc ids", (done) => {
            const db = new PouchDB(dbs.name);
            const docs = [{ _id: "'your_sql_injection_script_here'" }];
            db.bulkDocs({ docs }, (err) => {
                assert.isNull(err, `got error: ${JSON.stringify(err)}`);
                db.get("foo", (err) => {
                    assert.exists(err, "deleted");
                    done();
                });
            });
        });

        it("Bulk docs empty list", (done) => {
            const db = new PouchDB(dbs.name);
            db.bulkDocs({ docs: [] }, (err) => {
                done(err);
            });
        });

        it("handles simultaneous writes", (done) => {
            const db1 = new PouchDB(dbs.name);
            const db2 = new PouchDB(dbs.name);
            const id = "fooId";
            const errorNames = [];
            const ids = [];
            let numDone = 0;
            function callback(err, res) {
                assert.isNull(err);
                if (res[0].error) {
                    errorNames.push(res[0].name);
                } else {
                    ids.push(res[0].id);
                }
                if (++numDone === 2) {
                    assert.deepEqual(errorNames, ["conflict"]);
                    assert.deepEqual(ids, [id]);
                    done();
                }
            }
            db1.bulkDocs({ docs: [{ _id: id }] }, callback);
            db2.bulkDocs({ docs: [{ _id: id }] }, callback);
        });

        it("bulk docs input by array", (done) => {
            const db = new PouchDB(dbs.name);
            const docs = makeDocs(5);
            db.bulkDocs(docs, (err, results) => {
                assert.lengthOf(results, 5, "results length matches");
                for (var i = 0; i < 5; i++) {
                    assert.equal(results[i].id, docs[i]._id, "id matches");
                    assert.exists(results[i].rev, "rev is set");
                    // Update the doc
                    docs[i]._rev = results[i].rev;
                    docs[i].string = `${docs[i].string}.00`;
                }
                db.bulkDocs(docs, (err, results) => {
                    assert.lengthOf(results, 5, "results length matches");
                    for (i = 0; i < 5; i++) {
                        assert.equal(results[i].id, i.toString(), "id matches again");
                        // set the delete flag to delete the docs in the next step
                        docs[i]._rev = results[i].rev;
                        docs[i]._deleted = true;
                    }
                    db.put(docs[0], () => {
                        db.bulkDocs(docs, (err, results) => {
                            assert.equal(results[0].name, "conflict", "First doc should be in conflict");
                            assert.isUndefined(results[0].rev, "no rev in conflict");
                            for (i = 1; i < 5; i++) {
                                assert.equal(results[i].id, i.toString());
                                assert.exists(results[i].rev);
                            }
                            done();
                        });
                    });
                });
            });
        });

        it("Bulk empty list", (done) => {
            const db = new PouchDB(dbs.name);
            db.bulkDocs([], (err) => {
                done(err);
            });
        });

        it("Bulk docs not an array", (done) => {
            const db = new PouchDB(dbs.name);
            db.bulkDocs({ docs: "foo" }, (err) => {
                assert.exists(err, "error reported");
                assert.equal(err.status, testUtils.errors.MISSING_BULK_DOCS.status,
                    "correct error status returned");
                assert.equal(err.message, testUtils.errors.MISSING_BULK_DOCS.message,
                    "correct error message returned");
                done();
            });
        });

        it("Bulk docs not an object", (done) => {
            const db = new PouchDB(dbs.name);
            db.bulkDocs({ docs: ["foo"] }, (err) => {
                assert.exists(err, "error reported");
                assert.equal(err.status, testUtils.errors.NOT_AN_OBJECT.status,
                    "correct error status returned");
                assert.equal(err.message, testUtils.errors.NOT_AN_OBJECT.message,
                    "correct error message returned");
            });
            db.bulkDocs({ docs: [[]] }, (err) => {
                assert.exists(err, "error reported");
                assert.equal(err.status, testUtils.errors.NOT_AN_OBJECT.status,
                    "correct error status returned");
                assert.equal(err.message, testUtils.errors.NOT_AN_OBJECT.message,
                    "correct error message returned");
                done();
            });
        });

        it("Bulk docs two different revisions to same document id", () => {
            const db = new PouchDB(dbs.name);
            const docid = "mydoc";

            function uuid() {
                return testUtils.rev();
            }

            // create a few of rando, good revisions
            const numRevs = 3;
            const uuids = [];
            for (let i = 0; i < numRevs - 1; i++) {
                uuids.push(uuid());
            }

            // branch 1
            const a_conflict = uuid();
            const a_doc = {
                _id: docid,
                _rev: `${numRevs}-${a_conflict}`,
                _revisions: {
                    start: numRevs,
                    ids: [a_conflict].concat(uuids)
                }
            };

            // branch 2
            const b_conflict = uuid();
            const b_doc = {
                _id: docid,
                _rev: `${numRevs}-${b_conflict}`,
                _revisions: {
                    start: numRevs,
                    ids: [b_conflict].concat(uuids)
                }
            };

            // push the conflicted documents
            return db.bulkDocs([a_doc, b_doc], { new_edits: false }).then(() => {
                return db.get(docid, { open_revs: "all" });
            }).then((resp) => {
                assert.equal(resp.length, 2, "correct number of open revisions");
                assert.equal(resp[0].ok._id, docid, "rev 1, correct document id");
                assert.equal(resp[1].ok._id, docid, "rev 2, correct document id");

                // order of revisions is not specified
                assert.isTrue((resp[0].ok._rev === a_doc._rev &&
                    resp[1].ok._rev === b_doc._rev) ||
                    (resp[0].ok._rev === b_doc._rev &&
                        resp[1].ok._rev === a_doc._rev));
            });
        });

        it("4204 respect revs_limit", () => {
            const db = new PouchDB(dbs.name);

            // simulate 5000 normal commits with two conflicts at the very end

            const isSafari = (typeof process === "undefined" || process.browser) &&
                /Safari/.test(window.navigator.userAgent) &&
                !/Chrome/.test(window.navigator.userAgent);

            const numRevs = isSafari ? 10 : 5000;
            const expected = isSafari ? 10 : 1000;
            const uuids = [];

            for (let i = 0; i < numRevs - 1; i++) {
                uuids.push(testUtils.rev());
            }
            const conflict1 = `a${testUtils.rev()}`;

            const doc1 = {
                _id: "doc",
                _rev: `${numRevs}-${conflict1}`,
                _revisions: {
                    start: numRevs,
                    ids: [conflict1].concat(uuids)
                }
            };

            return db.bulkDocs([doc1], { new_edits: false }).then(() => {
                return db.get("doc", { revs: true });
            }).then((doc) => {
                assert.equal(doc._revisions.ids.length, expected);
            });
        });

        it("2839 implement revs_limit", (done) => {

            // We only implement revs_limit locally
            if (adapter === "http") {
                return done();
            }

            const LIMIT = 50;
            const db = new PouchDB(dbs.name, { revs_limit: LIMIT });

            // simulate 5000 normal commits with two conflicts at the very end
            function uuid() {
                return testUtils.rev();
            }

            const numRevs = 5000;
            const uuids = [];
            for (let i = 0; i < numRevs - 1; i++) {
                uuids.push(uuid());
            }
            const conflict1 = `a${uuid()}`;
            const doc1 = {
                _id: "doc",
                _rev: `${numRevs}-${conflict1}`,
                _revisions: {
                    start: numRevs,
                    ids: [conflict1].concat(uuids)
                }
            };

            db.bulkDocs([doc1], { new_edits: false }).then(() => {
                return db.get("doc", { revs: true });
            }).then((doc) => {
                assert.equal(doc._revisions.ids.length, LIMIT);
                done();
            }).catch(done);
        });

        it("4372 revs_limit deletes old revisions of the doc", (done) => {

            // We only implement revs_limit locally
            if (adapter === "http") {
                return done();
            }

            const db = new PouchDB(dbs.name, { revs_limit: 2 });

            // old revisions are always deleted with auto compaction
            if (db.auto_compaction) {
                return done();
            }

            const revs = [];
            db.put({ _id: "doc", v: 1 }).then((v1) => {
                revs.push(v1.rev);
                return db.put({ _id: "doc", _rev: revs[0], v: 2 });
            }).then((v2) => {
                revs.push(v2.rev);
                return db.put({ _id: "doc", _rev: revs[1], v: 3 });
            }).then(() => {
                // the v2 revision is still in the db
                return db.get("doc", { rev: revs[1] });
            }).then((v2) => {
                assert.equal(v2.v, 2);

                return db.get("doc", { rev: revs[0] }).then(() => {
                    // the v1 revision is not in the db anymore
                    done(new Error("v1 should be missing"));
                }).catch((error) => {
                    assert.equal(error.message, "missing");
                    done();
                });
            }).catch(done);
        });

        it("4712 invalid rev for new doc generates conflict", () => {
            // CouchDB 1.X has a bug which allows this insertion via bulk_docs
            // (which PouchDB uses for all document insertions)
            if (adapter === "http" && !testUtils.isCouchMaster()) {
                return;
            }

            const db = new PouchDB(dbs.name);
            const newdoc = {
                _id: "foobar",
                _rev: "1-123"
            };

            return db.bulkDocs({ docs: [newdoc] }).then((results) => {
                assert.property(results[0], "status", 409);
            });
        });

        it("5793 bulk docs accepts _conflicts when new_edits=false", () => {
            const db = new PouchDB(dbs.name);
            const newdoc = {
                _id: "foobar",
                _rev: "1-123",
                _conflicts: []
            };

            return db.bulkDocs({ docs: [newdoc] },
                { new_edits: false }
            ).then(() => {
                return db.allDocs();
            }).then((result) => {
                assert.equal(result.rows.length, 1);
            });
        });
    });
});
