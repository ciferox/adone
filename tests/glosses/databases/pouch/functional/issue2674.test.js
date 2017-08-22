import * as util from "./utils";

describe("database", "pouch", "issue2674", () => {
    const dbName = "testdb";
    const dbSecond = "test_repl_remote";
    const dbThird = "test_slash_ids";
    const dbFourth = "test_slash_ids_remote";
    let DB = null;

    beforeEach(async () => {
        DB = await util.setup();
        await util.cleanup(dbName, dbSecond, dbThird, dbFourth);
    });

    after(async () => {
        await util.destroy();
    });

    it("Should correctly synchronize attachments (#2674)", function () {
        // 1. So I ran client app on two browsers (let’s call them A and B).
        // 2. Then on client A I created plain document (without any attachments).
        // 3. After that I put two attachments one by one by using putAttachment method.
        //   Let’s call them image1.jpg and image2.jpg.
        // 4. In next step I synchronized local db on A with remote db (by using sync
        // method without any additional options like live mode, retry, etc.).
        // 5. On client B I synchronized its local db with remote db (in the same way
        // like above).
        // 6. On client A I removed one attachment, for example image1.jpg
        // 7. On B I modified plain content of this document (without touching
        // attachments) and put to local db.
        // 8. Then I synchronized dbs on A as first
        // 9. After that I synchronized dbs on B
        // 10. I ran client app on another browser (C) where local db was empty.
        // 11. Then I started the synchronization process on C and got an error (that
        // image1.jpg was not found)
        // 12. As the result the synchronization process failed and the data were not
        // replicated at all (the local db on C was still empty)
        const doc = { _id: "a", a: 1 };

        const img1 = "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAMFBMVEX+9+" +
            "j+9OD+7tL95rr93qT80YD7x2L6vkn6syz5qRT4ogT4nwD4ngD4nQD4nQD4" +
            "nQDT2nT/AAAAcElEQVQY002OUQLEQARDw1D14f7X3TCdbfPnhQTqI5UqvG" +
            "OWIz8gAIXFH9zmC63XRyTsOsCWk2A9Ga7wCXlA9m2S6G4JlVwQkpw/Ymxr" +
            "UgNoMoyxBwSMH/WnAzy5cnfLFu+dK2l5gMvuPGLGJd1/9AOiBQiEgkzOpg" +
            "AAAABJRU5ErkJggg==";
        const img2 = "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAMFBMVEX+9+" +
            "j+9OD+7tL95rr93qT80YD7x2L6vkn6syz5qRT4ogT4nwD4ngD4nQD4nQD4" +
            "nQDT2nT/AAAAcElEQVQY002OUQLEQARDw1D14f7X3TCdbfPnhQTqI5UqvG" +
            "OWIz8gAIXFH9zmC63XRyTsOsCWk2A9Ga7wCXlA9m2S6G4JlVwQkpw/Ymxr" +
            "UgNoMoyxBwSMH/WnAzy5cnfLFu+dK2l5gMvuPGLGJd1/9AOiBQiEgkzOpg" +
            "AAAABJRU5ErkJffQ==";

        const dbA = new DB(dbName);
        const dbB = new DB(dbSecond);
        const dbC = new DB(dbThird);
        const remoteDb = new DB(dbFourth);

        // browser a:
        // create document, no atts
        const createDoc = () => {
            return dbA.put(doc)
                .then(addRev)
                .catch(handleError);
        };

        // add image1.jpg
        const addImg1 = () => {
            return dbA.putAttachment(
                doc._id, "image1.png", doc._rev, img1, "image/png")
                .then(addRev)
                .catch(handleError);
        };

        // add image2.jpg
        const addImg2 = () => {
            return dbA.putAttachment(
                doc._id, "image2.png", doc._rev, img2, "image/png")
                .then(addRev)
                .catch(handleError);
        };

        // sync() with remote CouchDB
        const syncWithRemote = (source) => {
            return new Promise((resolve, reject) => {
                source.sync(remoteDb).on("complete", () => {
                    resolve();
                }).on("error", (error) => {
                    reject(error);
                });
            });
        };

        // remove image1.jpg from doc with an extra revision
        // to guarantee conflict winning revision from dbA
        const removeImg1 = () => {
            return dbA.get(doc._id)
                .then((doc) => {
                    return dbA.put(doc);
                })
                .then(addRev)
                .then(() => {
                    return dbA.removeAttachment(doc._id, "image1.png", doc._rev);
                })
                .catch(handleError);
        };

        // browser b:
        // sync from remote CouchDB
        // sync(updateDoc)
        // update doc json, leave attachments alone
        const updateDoc = () => {
            const newDoc = {
                _id: doc._id,
                _rev: revs[2],
                a: 2
            };
            return dbB.put(newDoc)
                .catch(handleError);
        };

        // utils:
        const handleError = (error) => {
            throw error;
        };

        const revs = [];

        const addRev = (result) => {
            doc._rev = result.rev;
            revs.push(result.rev);
        };

        return createDoc() // create document, no atts
            .then(addImg1) // add image1.jpg
            .then(addImg2) // add image2.jpg
            .then(syncWithRemote.bind(this, dbA))// sync() with remote CouchDB
            .then(removeImg1) // remove image1.jpg from doc
            // go to browser b
            .then(syncWithRemote.bind(this, dbB))// sync from remote CouchDB
            .then(updateDoc) // update doc json, leave attachments alone
            // go to browser a
            .then(syncWithRemote.bind(this, dbA)) // sync with remote CouchDB,
            // syncs up the delete
            // go to browser b
            .then(syncWithRemote.bind(this, dbB)) // sync with remote CouchDB,
            // syncs up the conflictin non-att-change
            // go to browser C
            .then(syncWithRemote.bind(this, dbC)) // sync from remote CouchDB
            // see replication error
            .then(() => {
                return dbC.allDocs({ include_docs: true, attachments: true });
            }).then((res) => {
                res.rows.forEach((row) => {
                    delete row.value;
                    delete row.doc._rev;
                    delete row.doc._attachments["image2.png"].digest;
                    delete row.doc._attachments["image2.png"].revpos;
                });
                const expected = {
                    total_rows: 1,
                    offset: 0,
                    rows: [
                        {
                            id: "a",
                            key: "a",
                            doc: {
                                a: 1,
                                _attachments: {
                                    "image2.png": {
                                        content_type: "image/png",
                                        data: img2
                                    }
                                },
                                _id: "a"
                            }
                        }
                    ]
                };
                assert.deepEqual(res, expected);
            });
    });
});
