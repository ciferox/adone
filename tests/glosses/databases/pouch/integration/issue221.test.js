require("./node.setup");

const adapters = [
    ["local", "http"],
    ["http", "http"],
    ["http", "local"],
    ["local", "local"]
];

adapters.forEach((adapters) => {
    describe(`test.issue221.js-${adapters[0]}-${adapters[1]}`, () => {

        const dbs = {};

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl(adapters[0], "testdb");
            dbs.remote = testUtils.adapterUrl(adapters[1], "test_repl_remote");
            testUtils.cleanup([dbs.name, dbs.remote], done);
        });

        after((done) => {
            testUtils.cleanup([dbs.name, dbs.remote], done);
        });


        it("Testing issue #221", () => {
            const doc = { _id: "0", integer: 0 };
            const local = new PouchDB(dbs.name);
            const remote = new PouchDB(dbs.remote);

            // Write a doc in CouchDB.
            return remote.put(doc).then((results) => {
                // Update the doc.
                doc._rev = results.rev;
                doc.integer = 1;
                return remote.put(doc);
            }).then(() => {
                // Compact the db.
                return remote.compact();
            }).then(() => {
                return remote.get(doc._id, { revs_info: true });
            }).then((data) => {
                const correctRev = data._revs_info[0];
                return local.replicate.from(remote).then(() => {
                    // Check the Pouch doc.
                    return local.get(doc._id, (err, results) => {
                        assert.equal(results._rev, correctRev.rev);
                        assert.equal(results.integer, 1);
                    });
                });
            });
        });

        it("Testing issue #221 again", () => {
            if (testUtils.isCouchMaster()) {
                return;
            }
            const doc = { _id: "0", integer: 0 };
            const local = new PouchDB(dbs.name);
            const remote = new PouchDB(dbs.remote);

            // Write a doc in CouchDB.
            return remote.put(doc).then((results) => {
                doc._rev = results.rev;
                // Second doc so we get 2 revisions from replicate.
                return remote.put(doc);
            }).then((results) => {
                doc._rev = results.rev;
                return local.replicate.from(remote);
            }).then(() => {
                doc.integer = 1;
                // One more change
                return remote.put(doc);
            }).then(() => {
                // Testing if second replications fails now
                return local.replicate.from(remote);
            }).then(() => {
                return local.get(doc._id);
            }).then((results) => {
                assert.equal(results.integer, 1);
            });
        });

    });
});
