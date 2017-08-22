import * as util from "./utils";

describe("database", "pouch", "local_docs", () => {
    const dbName = "testdb";
    let DB = null;

    beforeEach(async () => {
        DB = await util.setup();
        await util.cleanup(dbName);
    });

    after(async () => {
        await util.destroy();
    });

    it("local docs - put then get", () => {
        const db = new DB(dbName);
        return db.put({ _id: "_local/foo" }).then((res) => {
            assert.equal(res.id, "_local/foo");
            assert.isString(res.rev);
            assert.equal(res.ok, true);
            return db.get("_local/foo");
        });
    });

    it("local docs - put then get w/ revisions", () => {
        const db = new DB(dbName);
        const doc = {
            _id: "_local/foo"
        };
        return db.put(doc).then((res) => {
            assert.equal(res.id, "_local/foo");
            assert.isString(res.rev);
            assert.equal(res.ok, true);
            return db.get("_local/foo");
        }).then((doc) => {
            assert.isUndefined(doc._revisions);
            doc._revisions = { start: 0, ids: ["1"] };
            return db.put(doc);
        }).then(() => {
            return db.get("_local/foo");
        }).then((doc) => {
            assert.isUndefined(doc._revisions);
        });
    });

    it("local docs - put then remove then get", () => {
        const db = new DB(dbName);
        const doc = { _id: "_local/foo" };
        return db.put(doc).then((res) => {
            doc._rev = res.rev;
            return db.remove(doc);
        }).then((res) => {
            assert.equal(res.id, "_local/foo");
            assert.equal(res.rev, "0-0");
            assert.equal(res.ok, true);
            return db.get("_local/foo").then((doc) => {
                assert.isUndefined(doc);
            }).catch((err) => {
                assert.equal(err.name, "not_found");
            });
        });
    });

    it("local docs - put after remove", () => {
        const db = new DB(dbName);
        const doc = { _id: "_local/foo" };
        return db.put(doc).then((res) => {
            doc._rev = res.rev;
            return db.remove(doc);
        }).then((res) => {
            assert.equal(res.id, "_local/foo");
            assert.equal(res.rev, "0-0");
            assert.equal(res.ok, true);
            delete doc._rev;
            return db.put(doc);
        });
    });

    it("local docs - put after remove, check return vals", () => {
        // as long as it starts with 0-, couch
        // treats it as a new local doc
        const db = new DB(dbName);
        const doc = { _id: "_local/quux" };
        return db.put(doc).then((res) => {
            assert.equal(res.ok, true);
            doc._rev = res.rev;
            return db.put(doc);
        }).then((res) => {
            assert.equal(res.ok, true);
            doc._rev = res.rev;
            return db.put(doc);
        }).then((res) => {
            assert.equal(res.ok, true);
        });
    });

    it("local docs - remove missing", () => {
        const db = new DB(dbName);
        return db.remove({
            _id: "_local/foo",
            _rev: "1-fake"
        }).then(() => {
            throw new Error("should not be here");
        }, (err) => {
            assert.isString(err.name);
        });
    });

    it("local docs - put after put w/ deleted:true", () => {
        const db = new DB(dbName);
        const doc = { _id: "_local/foo" };
        return db.put(doc).then((res) => {
            doc._rev = res.rev;
            doc._deleted = true;
            return db.put(doc);
        }).then((res) => {
            assert.equal(res.id, "_local/foo");
            assert.equal(res.rev, "0-0");
            assert.equal(res.ok, true);
            delete doc._deleted;
            delete doc._rev;
            return db.put(doc);
        });
    });

    it("local docs - put after remove with a rev", () => {
        const db = new DB(dbName);
        const doc = { _id: "_local/foo" };
        return db.put(doc).then((res) => {
            doc._rev = res.rev;
            return db.remove(doc);
        }).then((res) => {
            assert.equal(res.id, "_local/foo");
            assert.equal(res.ok, true);
            assert.equal(res.rev, "0-0");
            delete doc._rev;
            return db.put(doc);
        });
    });

    it("local docs - multiple removes", () => {
        const db = new DB(dbName);
        const doc = { _id: "_local/foo" };
        return db.put(doc).then((res) => {
            doc._rev = res.rev;
            return db.put(doc);
        }).then((res) => {
            doc._rev = res.rev;
            return db.remove(doc);
        }).then((res) => {
            assert.equal(res.rev, "0-0");
            delete doc._rev;
            return db.put(doc);
        }).then((res) => {
            doc._rev = res.rev;
            return db.remove(doc);
        }).then((res) => {
            assert.equal(res.rev, "0-0");
        });
    });

    it("local docs - get unknown", () => {
        const db = new DB(dbName);
        return db.get("_local/foo").then((doc) => {
            assert.isUndefined(doc);
        }).catch((err) => {
            assert.equal(err.name, "not_found");
        });
    });

    it("local docs - put unknown", () => {
        const db = new DB(dbName);
        const doc = { _id: "_local/foo", _rev: "1-fake" };
        return db.put(doc).then((res) => {
            assert.isUndefined(res);
        }).catch((err) => {
            assert.isString(err.name);
        });
    });

    it("local docs - put new and conflicting", () => {
        const db = new DB(dbName);
        const doc = { _id: "_local/foo" };
        return db.put(doc).then(() => {
            return db.put(doc);
        }).then((res) => {
            assert.isUndefined(res);
        }).catch((err) => {
            assert.isString(err.name);
        });
    });

    it("local docs - put modified and conflicting", () => {
        const db = new DB(dbName);
        const doc = { _id: "_local/foo" };
        return db.put(doc).then((res) => {
            doc._rev = res.rev;
            return db.put(doc);
        }).then(() => {
            return db.put(doc);
        }).then((res) => {
            assert.isUndefined(res);
        }).catch((err) => {
            assert.isString(err.name);
        });
    });
});
