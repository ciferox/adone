import * as util from "./utils";

describe("database", "pouch", "bulk_get", () => {
    const dbName = "testdb";
    let DB = null;

    beforeEach(async () => {
        DB = await util.setup();
        await util.cleanup(dbName);
    });

    after(async () => {
        await util.destroy();
    });

    it("test bulk get with rev specified", (done) => {
        const db = new DB(dbName);
        db.put({ _id: "foo", val: 1 }).then((response) => {
            const rev = response.rev;
            db.bulkGet({
                docs: [
                    { id: "foo", rev }
                ]
            }).then((response) => {
                const result = response.results[0];
                assert.equal(result.id, "foo");
                assert.equal(result.docs[0].ok._rev, rev);
                done();
            });
        });
    });

    it("test bulk get with latest=true", () => {
        const db = new DB(dbName);
        let first;

        return db.post({ version: "first" })
            .then((info) => {
                first = info.rev;
                return db.put({
                    _id: info.id,
                    _rev: info.rev,
                    version: "second"
                }).then((info) => {
                    return db.bulkGet({
                        docs: [
                            { id: info.id, rev: first }
                        ],
                        latest: true
                    });
                }).then((response) => {
                    const result = response.results[0];
                    assert.equal(result.docs[0].ok.version, "second");
                });
            });
    });

    it("test bulk get with no rev specified", (done) => {
        const db = new DB(dbName);
        db.put({ _id: "foo", val: 1 }).then((response) => {
            const rev = response.rev;
            db.bulkGet({
                docs: [
                    { id: "foo" }
                ]
            }).then((response) => {
                const result = response.results[0];
                assert.equal(result.id, "foo");
                assert.equal(result.docs[0].ok._rev, rev);
                done();
            });
        });
    });

    it("_revisions is not returned by default", (done) => {
        const db = new DB(dbName);
        db.put({ _id: "foo", val: 1 }).then((response) => {
            const rev = response.rev;
            db.bulkGet({
                docs: [
                    { id: "foo", rev }
                ]
            }).then((response) => {
                const result = response.results[0];
                assert.isUndefined(result.docs[0].ok._revisions);
                done();
            });
        });
    });

    it("#5886 bulkGet with reserved id", (done) => {
        const db = new DB(dbName);
        db.put({ _id: "constructor", val: 1 }).then((response) => {
            const rev = response.rev;
            db.bulkGet({
                docs: [
                    { id: "constructor", rev }
                ]
            }).then((response) => {
                const result = response.results[0];
                assert.equal(result.docs[0].ok._id, "constructor");
                assert.isUndefined(result.docs[0].ok._revisions);
                done();
            });
        });
    });

    it("_revisions is returned when specified", (done) => {
        const db = new DB(dbName);
        db.put({ _id: "foo", val: 1 }).then((response) => {
            const rev = response.rev;
            db.bulkGet({
                docs: [
                    { id: "foo", rev }
                ],
                revs: true
            }).then((response) => {
                const result = response.results[0];
                assert.equal(result.docs[0].ok._revisions.ids[0], rev.substring(2));
                done();
            });
        });
    });

    it("_revisions is returned when specified, using implicit rev",
        (done) => {
            const db = new DB(dbName);
            db.put({ _id: "foo", val: 1 }).then((response) => {
                const rev = response.rev;
                db.bulkGet({
                    docs: [
                        { id: "foo" }
                    ],
                    revs: true
                }).then((response) => {
                    const result = response.results[0];
                    assert.equal(result.docs[0].ok._revisions.ids[0], rev.substring(2));
                    done();
                });
            });
        });

    it("attachments are not included by default", (done) => {
        const db = new DB(dbName);

        db.put({
            _id: "foo",
            _attachments: {
                "foo.txt": {
                    content_type: "text/plain",
                    data: "VGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIHRleHQ="
                }
            }
        }).then((response) => {
            const rev = response.rev;

            db.bulkGet({
                docs: [
                    { id: "foo", rev }
                ]
            }).then((response) => {
                const result = response.results[0];
                assert.equal(result.docs[0].ok._attachments["foo.txt"].stub, true);
                done();
            });
        });
    });

    it("attachments are included when specified", (done) => {
        const db = new DB(dbName);

        db.put({
            _id: "foo",
            _attachments: {
                "foo.txt": {
                    content_type: "text/plain",
                    data: "VGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIHRleHQ="
                }
            }
        }).then((response) => {
            const rev = response.rev;

            db.bulkGet({
                docs: [
                    { id: "foo", rev }
                ],
                attachments: true
            }).then((response) => {
                const result = response.results[0];
                assert.equal(result.docs[0].ok._attachments["foo.txt"].data, "VGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIHRleHQ=");
                done();
            });
        });
    });

    it("attachments are included when specified, using implicit rev", (done) => {
        const db = new DB(dbName);

        db.put({
            _id: "foo",
            _attachments: {
                "foo.txt": {
                    content_type: "text/plain",
                    data: "VGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIHRleHQ="
                }
            }
        }).then(() => {
            db.bulkGet({
                docs: [
                    { id: "foo" }
                ],
                attachments: true
            }).then((response) => {
                const result = response.results[0];
                assert.equal(result.docs[0].ok._attachments["foo.txt"].data, "VGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIHRleHQ=");
                done();
            });
        });
    });
});
