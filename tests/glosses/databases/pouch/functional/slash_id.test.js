require("./node.setup");

describe("db", "pouch", "slash_ids", () => {
    const dbs = {};

    beforeEach((done) => {
        dbs.name = testUtils.adapterUrl("local", "test_slash_ids");
        dbs.remote = testUtils.adapterUrl("local", "test_slash_ids_remote");
        testUtils.cleanup([dbs.name, dbs.remote], done);
    });

    afterEach((done) => {
        testUtils.cleanup([dbs.name, dbs.remote], done);
    });


    it("Insert a doc, putAttachment and allDocs", (done) => {
        const db = new PouchDB(dbs.name);
        const docId = "doc/with/slashes";
        const attachmentId = "attachment/with/slashes";
        const blobData = "attachment content";
        const blob = testUtils.makeBlob(blobData);
        const doc = { _id: docId, test: true };
        db.put(doc, (err, info) => {
            assert.isNull(err, "saved doc");
            assert.equal(info.id, "doc/with/slashes", "id is the same as inserted");
            db.putAttachment(docId, attachmentId, info.rev, blob, "text/plain",
                () => {
                    db.getAttachment(docId, attachmentId, (err, res) => {
                        testUtils.readBlob(res, () => {
                            db.get(docId, (err, res) => {
                                assert.equal(res._id, docId);
                                assert.include(Object.keys(res._attachments), attachmentId);
                                done();
                            });
                        });
                    });
                });
        });
    });

    it("BulkDocs and changes", (done) => {
        const db = new PouchDB(dbs.name);
        const docs = [
            { _id: "part/doc1", int: 1 },
            {
                _id: "part/doc2", int: 2, _attachments: {
                    "attachment/with/slash": {
                        content_type: "text/plain",
                        data: "c29tZSBkYXRh"
                    }
                }
            },
            { _id: "part/doc3", int: 3 }
        ];
        db.bulkDocs({ docs }, (err, res) => {
            for (let i = 0; i < 3; i++) {
                assert.equal(res[i].ok, true, `correctly inserted ${docs[i]._id}`);
            }
            db.allDocs({
                include_docs: true,
                attachments: true
            }, (err, res) => {
                res.rows.sort((a, b) => {
                    return a.doc.int - b.doc.int;
                });
                for (let i = 0; i < 3; i++) {
                    assert.equal(res.rows[i].doc._id, docs[i]._id, `(allDocs) correctly inserted ${docs[i]._id}`);
                }
                assert.include(Object.keys(res.rows[1].doc._attachments), "attachment/with/slash");
                db.changes().on("complete", (res) => {
                    res.results.sort((a, b) => {
                        return a.id.localeCompare(b.id);
                    });
                    for (let i = 0; i < 3; i++) {
                        assert.equal(res.results[i].id, docs[i]._id, "correctly inserted");
                    }
                    done();
                }).on("error", done);
            });
        });
    });

    it("Attachments replicate", (done) => {
        const binAttDoc = {
            _id: "bin_doc/with/slash",
            _attachments: {
                "foo/with/slash.txt": {
                    content_type: "text/plain",
                    data: "VGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIHRleHQ="
                }
            }
        };
        const docs1 = [
            binAttDoc,
            { _id: "0", integer: 0 },
            { _id: "1", integer: 1 },
            { _id: "2", integer: 2 },
            { _id: "3", integer: 3 }
        ];
        const db = new PouchDB(dbs.name);
        const remote = new PouchDB(dbs.remote);
        remote.bulkDocs({ docs: docs1 }, () => {
            db.replicate.from(remote, () => {
                db.get("bin_doc/with/slash", { attachments: true },
                    (err, doc) => {
                        assert.equal(binAttDoc._attachments["foo/with/slash.txt"].data, doc._attachments["foo/with/slash.txt"].data);
                        done();
                    });
            });
        });
    });
});

