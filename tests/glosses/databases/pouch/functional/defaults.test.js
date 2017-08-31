import * as util from "./utils";

describe("database", "pouch", "defaults", () => {
    let DB = null;

    before(async () => {
        DB = await util.setup();
    });

    beforeEach(async () => {
        await new DB("mydb").destroy();
        await new DB("mydb", { db: adone.database.level.backend.Memory }).destroy();
    });

    afterEach(async () => {
        await util.tmpdir.getDirectory("_pouch_.").unlink();
        await util.tmpdir.getDirectory("path").unlink();
    });

    after(async () => {
        await util.destroy();
    });

    it("should allow prefixes", async () => {
        const prefix = util.tmpdir.getDirectory("path", "to", "db", "1").path();
        await adone.fs.mkdir(prefix);

        const db = new DB("mydb", { prefix });
        const info = await db.info();
        expect(info.db_name).to.be.equal("mydb");
        await db.destroy();
    });

    it("Defaults leaks eventEmitters", () => {
        DB.defaults({ db: adone.database.level.backend.Memory });
        DB.defaults({ db: adone.database.level.backend.Memory });
        DB.defaults({ db: adone.database.level.backend.Memory });
        DB.defaults({ db: adone.database.level.backend.Memory });
    });

    it("should allow us to set a prefix by default", async () => {
        const prefix = util.tmpdir.getDirectory("path", "to", "db", "2").path();
        await adone.fs.mkdir(prefix);

        const CustomPouch = DB.defaults({
            prefix
        });
        /* jshint newcap:false */
        const db = new CustomPouch({ name: "mydb" });
        const info = await db.info();
        assert.equal(info.db_name, "mydb");
        await db.destroy();
    });

    it("should allow us to use memdown", () => {
        const opts = { name: "mydb", db: adone.database.level.backend.Memory };
        const db = new DB(opts);
        return db.put({ _id: "foo" }).then(() => {
            const otherDB = new DB("mydb");
            return db.info().then((info1) => {
                return otherDB.info().then((info2) => {
                    assert.notEqual(info1.doc_count, info2.doc_count);
                    return otherDB.destroy();
                }).then(() => {
                    return db.destroy();
                });
            });
        });
    });

    it("should allow us to destroy memdown", () => {
        const opts = { db: adone.database.level.backend.Memory };
        const db = new DB("mydb", opts);
        return db.put({ _id: "foo" }).then(() => {
            const otherDB = new DB("mydb", opts);
            return db.info().then((info1) => {
                return otherDB.info().then((info2) => {
                    assert.equal(info1.doc_count, info2.doc_count);
                    return otherDB.destroy();
                }).then(() => {
                    const db3 = new DB("mydb", opts);
                    return db3.info().then((info) => {
                        assert.equal(info.doc_count, 0);
                        return db3.destroy();
                    });
                });
            });
        });
    });

    it("should allow us to use memdown by default", () => {
        const CustomPouch = DB.defaults({ db: adone.database.level.backend.Memory });
        const db = new CustomPouch("mydb");
        return db.put({ _id: "foo" }).then(() => {
            const otherDB = new DB("mydb");
            return db.info().then((info1) => {
                return otherDB.info().then((info2) => {
                    assert.notEqual(info1.doc_count, info2.doc_count);
                    return otherDB.destroy();
                }).then(() => {
                    return db.destroy();
                });
            });
        });
    });


    it("should inform us when using memdown", () => {
        const opts = { name: "mydb", db: adone.database.level.backend.Memory };
        const db = new DB(opts);
        return db.info().then((info) => {
            assert.equal(info.backend_adapter, "Memory");
        });
    });

    it("constructor emits destroyed when using defaults", () => {
        const CustomPouch = DB.defaults({ db: adone.database.level.backend.Memory });

        const db = new CustomPouch("mydb");
        return new Promise((resolve) => {
            CustomPouch.once("destroyed", (name) => {
                assert.equal(name, "mydb");
                resolve();
            });
            db.destroy();
        });
    });

    it("db emits destroyed when using defaults", () => {
        const CustomPouch = DB.defaults({ db: adone.database.level.backend.Memory });

        const db = new CustomPouch("mydb");
        return new Promise((resolve) => {
            db.once("destroyed", resolve);
            db.destroy();
        });
    });

    it("constructor emits creation event", (done) => {
        const CustomPouch = DB.defaults({ db: adone.database.level.backend.Memory });

        CustomPouch.once("created", (name) => {
            assert.equal(name, "mydb", "should be same thing");
            done();
        });
        new DB("mydb");
    });

    // somewhat odd behavior (CustomPouch constructor always mirrors PouchDB),
    // but better to test it explicitly
    it("PouchDB emits destroyed when using defaults", () => {
        const CustomPouch = DB.defaults({ db: adone.database.level.backend.Memory });

        const db = new CustomPouch("mydb");
        return new Promise((resolve) => {
            DB.once("destroyed", (name) => {
                assert.equal(name, "mydb");
                resolve();
            });
            db.destroy();
        });
    });

    // somewhat odd behavior (CustomPouch constructor always mirrors PouchDB),
    // but better to test it explicitly
    it("PouchDB emits created when using defaults", (done) => {
        const CustomPouch = DB.defaults({ db: adone.database.level.backend.Memory });

        DB.once("created", (name) => {
            assert.equal(name, "mydb", "should be same thing");
            done();
        });
        new CustomPouch("mydb");
    });

    it("should be transitive (#5922)", () => {
        const CustomPouch = DB
            .defaults({ db: adone.database.level.backend.Memory })
            .defaults({});

        const db = new CustomPouch("mydb");
        return db.info().then((info) => {
            assert.equal(info.backend_adapter, "Memory");
        });
    });
});
