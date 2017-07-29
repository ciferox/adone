require("./node.setup");

describe("db", "pouch", "events", () => {
    const dbs = {};
    beforeEach((done) => {
        dbs.name = testUtils.adapterUrl("local", "testdb");
        testUtils.cleanup([dbs.name], done);
    });

    after((done) => {
        testUtils.cleanup([dbs.name], done);
    });


    it("PouchDB emits creation event", (done) => {
        PouchDB.once("created", (name) => {
            assert.equal(name, dbs.name, "should be same thing");
            done();
        });
        new PouchDB(dbs.name);
    });

    it("PouchDB emits destruction event", (done) => {
        const db = new PouchDB(dbs.name);
        db.once("destroyed", done);
        db.destroy();
    });

    it("PouchDB emits destruction event on PouchDB object", (done) => {
        PouchDB.once("destroyed", (name) => {
            assert.equal(name, dbs.name, "should have the same name");
            done();
        });
        new PouchDB(dbs.name).destroy();
    });

    it("PouchDB emits destroyed when using {name: foo}", () => {
        const db = new PouchDB({ name: "testdb" });
        return new Promise((resolve) => {
            PouchDB.once("destroyed", (name) => {
                assert.equal(name, "testdb");
                resolve();
            });
            db.destroy();
        });
    });

    it("db emits destroyed on all DBs", () => {
        const db1 = new PouchDB("testdb");
        const db2 = new PouchDB("testdb");

        return new Promise((resolve) => {
            let called = 0;
            function checkDone() {
                if (++called === 2) {
                    resolve();
                }
            }
            db1.once("destroyed", checkDone);
            db2.once("destroyed", checkDone);
            db1.destroy();
        });
    });

    it("3900 db emits destroyed event", () => {
        const db = new PouchDB("testdb");
        return new Promise((resolve) => {
            db.once("destroyed", () => {
                resolve();
            });
            db.destroy();
        });
    });

    it("3900 db emits destroyed event 2", () => {
        const db = new PouchDB("testdb");
        return new Promise((resolve) => {
            db.once("destroyed", () => {
                resolve();
            });
            db.destroy();
        });
    });

    it("emit creation event", (done) => {
        var db = new PouchDB(dbs.name).on("created", (newDB) => {
            assert.equal(db, newDB, "should be same thing");
            done();
        });
    });

    it("#4168 multiple constructor calls don't leak listeners", () => {
        for (let i = 0; i < 50; i++) {
            new PouchDB(dbs.name);
        }
    });

    it("4922 Destroyed is not called twice", (done) => {
        let count = 0;
        function destroyed() {
            count++;
            if (count === 1) {
                setTimeout(() => {
                    assert.equal(count, 1);
                    PouchDB.removeListener("destroyed", destroyed);
                    done();
                }, 50);
            }
        }
        PouchDB.on("destroyed", destroyed);
        new PouchDB(dbs.name).destroy();
    });

});
