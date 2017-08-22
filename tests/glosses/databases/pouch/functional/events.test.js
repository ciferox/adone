import * as util from "./utils";

describe("database", "pouch", "events", () => {
    const dbName = "testdb";
    let DB = null;

    beforeEach(async () => {
        DB = await util.setup();
        await util.cleanup(dbName);
    });

    after(async () => {
        await util.destroy();
    });

    it("DB emits creation event", (done) => {
        DB.once("created", (name) => {
            assert.equal(name, dbName, "should be same thing");
            done();
        });
        new DB(dbName);
    });

    it("DB emits destruction event", (done) => {
        const db = new DB(dbName);
        db.once("destroyed", done);
        db.destroy();
    });

    it("DB emits destruction event on DB object", (done) => {
        DB.once("destroyed", (name) => {
            assert.equal(name, dbName, "should have the same name");
            done();
        });
        new DB(dbName).destroy();
    });

    it("DB emits destroyed when using {name: foo}", () => {
        const db = new DB({ name: "testdb" });
        return new Promise((resolve) => {
            DB.once("destroyed", (name) => {
                assert.equal(name, "testdb");
                resolve();
            });
            db.destroy();
        });
    });

    it("db emits destroyed on all DBs", () => {
        const db1 = new DB("testdb");
        const db2 = new DB("testdb");

        return new Promise((resolve) => {
            let called = 0;
            const checkDone = () => {
                if (++called === 2) {
                    resolve();
                }
            };
            db1.once("destroyed", checkDone);
            db2.once("destroyed", checkDone);
            db1.destroy();
        });
    });

    it("3900 db emits destroyed event", () => {
        const db = new DB("testdb");
        return new Promise((resolve) => {
            db.once("destroyed", () => {
                resolve();
            });
            db.destroy();
        });
    });

    it("3900 db emits destroyed event 2", () => {
        const db = new DB("testdb");
        return new Promise((resolve) => {
            db.once("destroyed", () => {
                resolve();
            });
            db.destroy();
        });
    });

    it("emit creation event", (done) => {
        const db = new DB(dbName).on("created", (newDB) => {
            assert.equal(db, newDB, "should be same thing");
            done();
        });
    });

    it("#4168 multiple constructor calls don't leak listeners", () => {
        for (let i = 0; i < 50; i++) {
            new DB(dbName);
        }
    });

    it("4922 Destroyed is not called twice", (done) => {
        let count = 0;
        const destroyed = () => {
            count++;
            if (count === 1) {
                setTimeout(() => {
                    assert.equal(count, 1);
                    DB.removeListener("destroyed", destroyed);
                    done();
                }, 50);
            }
        };
        DB.on("destroyed", destroyed);
        new DB(dbName).destroy();
    });

});
