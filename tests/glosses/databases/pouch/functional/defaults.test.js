require("./node.setup");

if (!process.env.LEVEL_ADAPTER &&
    !process.env.LEVEL_PREFIX &&
    !process.env.AUTO_COMPACTION &&
    !process.env.ADAPTER) {
    // these tests don't make sense for anything other than default leveldown
    const path = require("path");
    const mkdirp = require("mkdirp");
    const rimraf = require("rimraf");

    describe("defaults", () => {

        beforeEach(() => {
            return new PouchDB("mydb").destroy().then(() => {
                return new PouchDB("mydb", { db: require("memdown") }).destroy();
            });
        });

        afterEach((done) => {
            rimraf.sync("./tmp/_pouch_.");
            rimraf.sync("./tmp/path");
            done();
        });

        it("should allow prefixes", () => {
            const prefix = "./tmp/path/to/db/1/";
            const dir = path.join(prefix, "/tmp/");
            const dir2 = path.join("./tmp/_pouch_./", prefix);
            const dir3 = path.join(dir2, "./tmp/_pouch_mydb");
            mkdirp.sync(dir);
            mkdirp.sync(dir2);
            mkdirp.sync(dir3);

            const db = new PouchDB("mydb", { prefix });
            return db.info().then((info1) => {
                assert.equal(info1.db_name, "mydb");
                return db.destroy();
            });
        });

        it("Defaults leaks eventEmitters", () => {
            PouchDB.defaults({ db: require("memdown") });
            PouchDB.defaults({ db: require("memdown") });
            PouchDB.defaults({ db: require("memdown") });
            PouchDB.defaults({ db: require("memdown") });
        });

        it("should allow us to set a prefix by default", () => {
            const prefix = "./tmp/path/to/db/2/";
            const dir = path.join(prefix, "/tmp/");
            const dir2 = path.join("./tmp/_pouch_./", prefix);
            const dir3 = path.join(dir2, "./tmp/_pouch_mydb");
            mkdirp.sync(dir);
            mkdirp.sync(dir2);
            mkdirp.sync(dir3);

            const CustomPouch = PouchDB.defaults({
                prefix
            });
            /* jshint newcap:false */
            const db = CustomPouch({ name: "mydb" });
            return db.info().then((info1) => {
                assert.equal(info1.db_name, "mydb");
                return db.destroy();
            });
        });

        it("should allow us to use memdown", () => {
            const opts = { name: "mydb", db: require("memdown") };
            const db = new PouchDB(opts);
            return db.put({ _id: "foo" }).then(() => {
                const otherDB = new PouchDB("mydb");
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
            const opts = { db: require("memdown") };
            const db = new PouchDB("mydb", opts);
            return db.put({ _id: "foo" }).then(() => {
                const otherDB = new PouchDB("mydb", opts);
                return db.info().then((info1) => {
                    return otherDB.info().then((info2) => {
                        assert.equal(info1.doc_count, info2.doc_count);
                        return otherDB.destroy();
                    }).then(() => {
                        const db3 = new PouchDB("mydb", opts);
                        return db3.info().then((info) => {
                            assert.equal(info.doc_count, 0);
                            return db3.destroy();
                        });
                    });
                });
            });
        });

        it("should allow us to use memdown by default", () => {
            const CustomPouch = PouchDB.defaults({ db: require("memdown") });
            const db = new CustomPouch("mydb");
            return db.put({ _id: "foo" }).then(() => {
                const otherDB = new PouchDB("mydb");
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
            const opts = { name: "mydb", db: require("memdown") };
            const db = new PouchDB(opts);
            return db.info().then((info) => {
                assert.equal(info.backend_adapter, "MemDOWN");
            });
        });

        it("constructor emits destroyed when using defaults", () => {
            const CustomPouch = PouchDB.defaults({ db: require("memdown") });

            const db = new CustomPouch("mydb");
            return new testUtils.Promise((resolve) => {
                CustomPouch.once("destroyed", (name) => {
                    assert.equal(name, "mydb");
                    resolve();
                });
                db.destroy();
            });
        });

        it("db emits destroyed when using defaults", () => {
            const CustomPouch = PouchDB.defaults({ db: require("memdown") });

            const db = new CustomPouch("mydb");
            return new testUtils.Promise((resolve) => {
                db.once("destroyed", resolve);
                db.destroy();
            });
        });

        it("constructor emits creation event", (done) => {
            const CustomPouch = PouchDB.defaults({ db: require("memdown") });

            CustomPouch.once("created", (name) => {
                assert.equal(name, "mydb", "should be same thing");
                done();
            });
            new PouchDB("mydb");
        });

        // somewhat odd behavior (CustomPouch constructor always mirrors PouchDB),
        // but better to test it explicitly
        it("PouchDB emits destroyed when using defaults", () => {
            const CustomPouch = PouchDB.defaults({ db: require("memdown") });

            const db = new CustomPouch("mydb");
            return new testUtils.Promise((resolve) => {
                PouchDB.once("destroyed", (name) => {
                    assert.equal(name, "mydb");
                    resolve();
                });
                db.destroy();
            });
        });

        // somewhat odd behavior (CustomPouch constructor always mirrors PouchDB),
        // but better to test it explicitly
        it("PouchDB emits created when using defaults", (done) => {
            const CustomPouch = PouchDB.defaults({ db: require("memdown") });

            PouchDB.once("created", (name) => {
                assert.equal(name, "mydb", "should be same thing");
                done();
            });
            new CustomPouch("mydb");
        });

        it("should be transitive (#5922)", () => {
            const CustomPouch = PouchDB
                .defaults({ db: require("memdown") })
                .defaults({});

            const db = new CustomPouch("mydb");
            return db.info().then((info) => {
                assert.equal(info.backend_adapter, "MemDOWN");
            });
        });
    });
}
