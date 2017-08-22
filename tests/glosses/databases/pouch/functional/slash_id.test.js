import * as util from "./utils";

describe("database", "pouch", "slash_ids", () => {
    const dbName = "test_slash_ids";
    const dbRemote = "test_slash_ids_remote";
    let DB = null;

    beforeEach(async () => {
        DB = await util.setup();
        await util.cleanup(dbName, dbRemote);
    });

    after(async () => {
        await util.destroy();
    });

    it("Insert a doc, putAttachment and allDocs", (done) => {
        const db = new DB(dbName);
        const docId = "doc/with/slashes";
        const attachmentId = "attachment/with/slashes";
        const blobData = "attachment content";
        const blob = Buffer.from(blobData);
        const doc = { _id: docId, test: true };
        db.put(doc).then((info) => {
            assert.equal(info.id, "doc/with/slashes", "id is the same as inserted");
            db.putAttachment(docId, attachmentId, info.rev, blob, "text/plain").then(() => {
                db.getAttachment(docId, attachmentId).then(() => {
                    db.get(docId).then((res) => {
                        assert.equal(res._id, docId);
                        assert.include(Object.keys(res._attachments), attachmentId);
                        done();
                    });
                });
            });
        });
    });

    it("BulkDocs and changes", (done) => {
        const db = new DB(dbName);
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
        db.bulkDocs({ docs }).then((res) => {
            for (let i = 0; i < 3; i++) {
                assert.equal(res[i].ok, true, `correctly inserted ${docs[i]._id}`);
            }
            db.allDocs({
                include_docs: true,
                attachments: true
            }).then((res) => {
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
        const db = new DB(dbName);
        const remote = new DB(dbRemote);
        remote.bulkDocs({ docs: docs1 }).then(() => {
            db.replicate.from(remote).then(() => {
                db.get("bin_doc/with/slash", { attachments: true }).then((doc) => {
                    assert.equal(binAttDoc._attachments["foo/with/slash.txt"].data, doc._attachments["foo/with/slash.txt"].data);
                    done();
                });
            });
        });
    });
});

