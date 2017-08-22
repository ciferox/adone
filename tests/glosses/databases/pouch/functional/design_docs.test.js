import * as util from "./utils";

describe("database", "pouch", "design_docs", () => {
    const dbName = "testdb";
    let DB = null;

    beforeEach(async () => {
        DB = await util.setup();
        await util.cleanup(dbName);
    });

    after(async () => {
        await util.destroy();
    });

    const doc = {
        _id: "_design/foo",
        views: {
            scores: {
                map: "function (doc) { if (doc.score) { emit(null, doc.score); } }",
                reduce: "function (keys, values, rereduce) { return sum(values); }"
            }
        },
        filters: { even: "function (doc) { return doc.integer % 2 === 0; }" }
    };

    it("Test writing design doc", (done) => {
        const db = new DB(dbName);
        db.post(doc).then(() => {
            db.get("_design/foo").then(() => done(), done);
        });
    });

    it("Changes filter", (done) => {
        const docs1 = [
            doc,
            { _id: "0", integer: 0 },
            { _id: "1", integer: 1 },
            { _id: "2", integer: 2 },
            { _id: "3", integer: 3 }
        ];
        const docs2 = [
            { _id: "4", integer: 4 },
            { _id: "5", integer: 5 },
            { _id: "6", integer: 6 },
            { _id: "7", integer: 7 }
        ];

        const db = new DB(dbName);
        let count = 0;
        db.bulkDocs({ docs: docs1 }).then(() => {
            const changes = db.changes({
                live: true,
                filter: "foo/even"
            }).on("change", () => {
                count += 1;
                if (count === 4) {
                    changes.cancel();
                }
            }).on("complete", (result) => {
                assert.equal(result.status, "cancelled");
                done();
            }).on("error", done);
            db.bulkDocs({ docs: docs2 }, {});
        });
    });

    it("Basic views", (done) => {

        const docs1 = [
            doc,
            { _id: "dale", score: 3 },
            { _id: "mikeal", score: 5 },
            { _id: "max", score: 4 },
            { _id: "nuno", score: 3 }
        ];
        const db = new DB(dbName);
        // Test invalid if adapter doesnt support mapreduce
        if (!db.query) {
            return done();
        }

        db.bulkDocs({ docs: docs1 }).then(() => {
            db.query("foo/scores", { reduce: false }, (err, result) => {
                assert.lengthOf(result.rows, 4, "Correct # of results");
                db.query("foo/scores").then((result) => {
                    assert.equal(result.rows[0].value, 15, "Reduce gave correct result");
                    done();
                });
            });
        });
    });

    it("Concurrent queries", (done) => {
        const db = new DB(dbName);
        // Test invalid if adapter doesnt support mapreduce
        if (!db.query) {
            return done();
        }

        db.bulkDocs({
            docs: [
                doc,
                { _id: "dale", score: 3 }
            ]
        }).then(() => {
            let cnt = 0;
            db.query("foo/scores", { reduce: false }).then((result) => {
                assert.lengthOf(result.rows, 1, "Correct # of results");
                if (++cnt === 2) {
                    done();
                }
            });
            db.query("foo/scores", { reduce: false }).then((result) => {
                assert.lengthOf(result.rows, 1, "Correct # of results");
                if (++cnt === 2) {
                    done();
                }
            });
        });
    });
});
