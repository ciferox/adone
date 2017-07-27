require("./node.setup");
const adapters = ["http", "local"];

adapters.forEach((adapter) => {
    describe(`test.taskqueue.js-${  adapter}`, () => {

        const dbs = {};

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl(adapter, "testdb");
            testUtils.cleanup([dbs.name], done);
        });

        after((done) => {
            testUtils.cleanup([dbs.name], done);
        });


        it("Add a doc", (done) => {
            const db = new PouchDB(dbs.name);
            db.post({ test: "somestuff" }, (err) => {
                done(err);
            });
        });

        it("Query", (done) => {
            // temp views are not supported in CouchDB 2.0
            if (testUtils.isCouchMaster()) {
                return done();
            }

            const db = new PouchDB(dbs.name);
            // Test invalid if adapter doesnt support mapreduce
            if (!db.query) {
                return done();
            }

            const queryFun = {
                map() { }
            };
            db.query(queryFun, { reduce: false }, (_, res) => {
                assert.lengthOf(res.rows, 0);
                done();
            });
        });

        it("Bulk docs", (done) => {
            const db = new PouchDB(dbs.name);
            db.bulkDocs({
                docs: [
                    { test: "somestuff" },
                    { test: "another" }
                ]
            }, (err, infos) => {
                assert.isUndefined(infos[0].error);
                assert.isUndefined(infos[1].error);
                done();
            });
        });

        it("Get", (done) => {
            const db = new PouchDB(dbs.name);
            db.get("0", (err) => {
                assert.exists(err);
                done();
            });
        });

        it("Info", (done) => {
            const db = new PouchDB(dbs.name);
            db.info((err, info) => {
                assert.equal(info.doc_count, 0);
                done();
            });
        });

    });
});
