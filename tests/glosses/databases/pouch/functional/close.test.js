require("./node.setup");

describe.skip("db", "pouch", "close", () => {
    const dbs = {};
    beforeEach(function (done) {
        this.timeout(60000);
        dbs.name = testUtils.adapterUrl("local", "testdb");
        testUtils.cleanup([dbs.name], done);
    });

    after((done) => {
        testUtils.cleanup([dbs.name], done);
    });

    it("should emit destroyed even when closed (sync)", () => {
        const db1 = new PouchDB("testdb");
        const db2 = new PouchDB("testdb");

        return new Promise((resolve) => {
            db2.once("destroyed", resolve);
            db1.once("closed", () => {
                db2.destroy();
            });
            db1.close();
        });
    });

    it("should emit destroyed even when closed (async)", () => {
        const db1 = new PouchDB("testdb");
        const db2 = new PouchDB("testdb");

        return new Promise((resolve) => {
            // FIXME This should be 2 if close-then-destroy worked.
            let need = 1;
            function checkDone() {
                if (--need === 0) {
                    resolve();
                }
            }
            db1.once("closed", checkDone);
            db2.once("destroyed", checkDone);
            db1.info().then(() => {
                return db1.close();
            }).catch((err) => {
                console.log(err.stack || err.toString());
            });
            db2.destroy().catch((err) => {
                console.log(err.stack || err.toString());
            });
        });
    });

    it("should emit closed even when destroyed (async #2)", () => {
        const db1 = new PouchDB("testdb");
        const db2 = new PouchDB("testdb");

        return new Promise((resolve) => {
            // FIXME This should be 2 if destroy-then-close worked.
            let need = 1;
            function checkDone() {
                if (--need === 0) {
                    resolve();
                }
            }
            db1.once("closed", checkDone);
            db2.once("destroyed", checkDone);
            db2.destroy().catch((err) => {
                console.log(err.stack || err.toString());
            });

            db1.info().then(() => {
                return db1.close();
            }).catch((err) => {
                console.log(err.stack || err.toString());
            });
        });
    });

    it("test unref for coverage", () => {
        const db1 = new PouchDB("testdb");
        return new Promise((resolve) => {
            PouchDB.once("unref", resolve);
            db1.close();
        });
    });

    it("test double unref for coverage", function () {
        this.timeout(1000);
        const db1 = new PouchDB("testdb");
        const db2 = new PouchDB("testdb");

        return new Promise((resolve) => {
            let need = 2;
            function checkDone() {
                if (--need === 0) {
                    resolve();
                }
            }
            PouchDB.on("unref", checkDone);
            db1.info()
                .then(() => {
                    return db2.info();
                }).then(() => {
                    return db2.close();
                }).then(() => {
                    return db1.close();
                }).catch((err) => {
                    console.log(err.stack || err.toString());
                });
        });
    });

    it("test close-then-destroyed for coverage", function () {
        this.timeout(1000);
        const db1 = new PouchDB("testdb");
        const db2 = new PouchDB("testdb");
        return new Promise((resolve) => {
            // FIXME This should be 2 if close-then-destroy worked.
            let need = 1;
            function checkDone() {
                if (--need === 0) {
                    resolve();
                }
            }
            PouchDB.once("unref", checkDone);
            PouchDB.once("destroyed", checkDone);
            db1.info()
                .then(() => {
                    return db1.close();
                }).then(() => {
                    return db2.destroy();
                }).catch((err) => {
                    console.log(err.stack || err.toString());
                });
        });
    });

    it("test destroy-then-close for coverage", function () {
        this.timeout(1000);
        const db1 = new PouchDB("testdb");
        const db2 = new PouchDB("testdb");
        return new Promise((resolve) => {
            // FIXME This should be 2 if close-then-destroy worked.
            let need = 1;
            function checkDone() {
                if (--need === 0) {
                    resolve();
                }
            }
            PouchDB.once("destroyed", checkDone);
            PouchDB.once("unref", checkDone);
            db2.info()
                .then(() => {
                    return db1.destroy();
                }).then(() => {
                    return db2.close();
                }).catch((err) => {
                    console.log(err.stack || err.toString());
                });
        });
    });

    it("test destroy-then-close-and-close for coverage", function () {
        this.timeout(1000);
        const db1 = new PouchDB("testdb");
        const db2 = new PouchDB("testdb");
        const db3 = new PouchDB("testdb");
        return new Promise((resolve) => {
            // FIXME This should be 3 if close-then-destroy worked.
            let need = 1;
            function checkDone() {
                if (--need === 0) {
                    resolve();
                }
            }
            PouchDB.once("destroyed", checkDone);
            PouchDB.on("unref", checkDone);
            db2.info()
                .then(() => {
                    return db3.info();
                }).then(() => {
                    return db1.destroy();
                }).then(() => {
                    return db2.close();
                }).then(() => {
                    return db3.close();
                }).catch((err) => {
                    console.log(err.stack || err.toString());
                });
        });
    });
});

