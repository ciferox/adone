require("./node.setup");

const adapters = [
    ["local", "http"],
    ["http", "http"],
    ["http", "local"],
    ["local", "local"]
];

adapters.forEach((adapters) => {
    describe(`test.reserved.js-${adapters[0]}-${adapters[1]}`, () => {

        const dbs = {};

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl(adapters[0], "testdb");
            dbs.remote = testUtils.adapterUrl(adapters[1], "test_repl_remote");
            testUtils.cleanup([dbs.name, dbs.remote], done);
        });

        after((done) => {
            testUtils.cleanup([dbs.name, dbs.remote], done);
        });

        it("test docs with reserved javascript ids", () => {
            const db = new PouchDB(dbs.name);
            const remote = new PouchDB(dbs.remote);
            return db.bulkDocs([
                { _id: "constructor" },
                { _id: "toString" },
                { _id: "valueOf" },
                {
                    _id: "_design/all",
                    views: {
                        all: {
                            map: function (doc) {
                                emit(doc._id);
                            }.toString()
                        }
                    }
                }
            ]).then(() => {
                return db.allDocs({ key: "constructor" });
            }).then((res) => {
                assert.lengthOf(res.rows, 1, "allDocs with key");
                return db.allDocs({ keys: ["constructor"] });
            }).then((res) => {
                assert.lengthOf(res.rows, 1, "allDocs with keys");
                return db.allDocs();
            }).then((res) => {
                assert.lengthOf(res.rows, 4, "allDocs empty opts");
                if (!db.query) {
                    return testUtils.Promise.resolve();
                }
                return db.query("all/all", { key: "constructor" });
            }).then((res) => {
                if (!db.query) {
                    return testUtils.Promise.resolve();
                }
                assert.lengthOf(res.rows, 1, "query with key");
                return db.query("all/all", { keys: ["constructor"] });
            }).then((res) => {
                if (db.query) {
                    assert.lengthOf(res.rows, 1, "query with keys");
                }
                return new testUtils.Promise((resolve, reject) => {
                    db.replicate.to(remote).on("complete", resolve).on("error", reject);
                });
            });
        });

        it("can create db with reserved name", () => {
            const db = new PouchDB("constructor");
            return db.info().then(() => {
                return db.destroy();
            });
        });
    });
});
