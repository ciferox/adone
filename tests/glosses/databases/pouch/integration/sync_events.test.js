require("./node.setup");
let adapters = [
    ["local", "http"],
    ["http", "http"],
    ["http", "local"],
    ["local", "local"]
];

if ("saucelabs" in testUtils.params()) {
    adapters = [["local", "http"], ["http", "local"]];
}


adapters.forEach((adapters) => {
    const title = `test.sync_events.js-${adapters[0]}-${adapters[1]}`;
    describe(`suite2 ${title}`, () => {

        const dbs = {};

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl(adapters[0], "testdb");
            dbs.remote = testUtils.adapterUrl(adapters[1], "test_repl_remote");
            testUtils.cleanup([dbs.name, dbs.remote], done);
        });

        after((done) => {
            testUtils.cleanup([dbs.name, dbs.remote], done);
        });


        it("#4251 Should fire paused and active on sync", (done) => {

            const db = new PouchDB(dbs.name);
            const remote = new PouchDB(dbs.remote);

            db.bulkDocs([{ _id: "a" }, { _id: "b" }]).then(() => {

                const repl = db.sync(remote, { retry: true, live: true });
                let counter = 0;

                repl.on("complete", () => {
                    done();
                });

                repl.on("active", () => {
                    counter++;
                    if (counter === 1) {
                        // We are good, initial replication
                    } else if (counter === 3) {
                        remote.bulkDocs([{ _id: "e" }, { _id: "f" }]);
                    }
                });

                repl.on("paused", () => {
                    counter++;
                    if (counter === 1) {
                        // Maybe a bug, if we have data should probably
                        // call active first
                        counter--;
                    } if (counter === 2) {
                        db.bulkDocs([{ _id: "c" }, { _id: "d" }]);
                    } else if (counter === 4) {
                        repl.cancel();
                    }
                });
            });

        });

    });
});
