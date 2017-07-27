require("./node.setup");

if (!process.env.LEVEL_ADAPTER &&
    !process.env.LEVEL_PREFIX &&
    !process.env.AUTO_COMPACTION &&
    !process.env.ADAPTER) {
    // these tests don't make sense for anything other than default leveldown

    describe("test.failures.js", () => {

        const invalidPath = "C:\\/path/to/thing/that/doesnt/exist\\with\\backslashes\\too";

        it("fails gracefully in first API call", () => {
            const db = new PouchDB(invalidPath);
            return db.info().then(() => {
                throw new Error("expected an error here");
            }, (err) => {
                assert.exists(err);
            });
        });

        it("fails gracefully in first changes() call", () => {
            const db = new PouchDB(invalidPath);
            return db.changes().then(() => {
                throw new Error("expected an error here");
            }, (err) => {
                assert.exists(err);
            });
        });

        it("fails for all API calls", () => {
            const db = new PouchDB(invalidPath);

            function expectError(promise) {
                return promise.then(() => {
                    throw new Error("expected an error here");
                }, (err) => {
                    assert.exists(err);
                });
            }

            return expectError(db.changes()).then(() => {
                return expectError(db.info());
            }).then(() => {
                return expectError(db.get("foo"));
            });
        });

    });

}
