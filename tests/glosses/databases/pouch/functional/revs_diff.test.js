import * as util from "./utils";

describe("database", "pouch", "revs_diff", () => {
    const dbName = "testdb";
    let DB = null;

    beforeEach(async () => {
        DB = await util.setup();
        await util.cleanup(dbName);
    });

    after(async () => {
        await util.destroy();
    });

    it("Test revs diff", (done) => {
        const db = new DB(dbName, { auto_compaction: false });
        const revs = [];
        db.post({
            test: "somestuff",
            _id: "somestuff"
        }).then((info) => {
            revs.push(info.rev);
            db.put({
                _id: info.id,
                _rev: info.rev,
                another: "test"
            }).then((info2) => {
                revs.push(info2.rev);
                db.revsDiff({ somestuff: revs }).then((results) => {
                    assert.notInclude(Object.keys(results), "somestuff");
                    revs.push("2-randomid");
                    db.revsDiff({ somestuff: revs }).then((results) => {
                        assert.include(Object.keys(results), "somestuff");
                        assert.lengthOf(results.somestuff.missing, 1);
                        done();
                    });
                });
            });
        });
    });

    it("Test revs diff with opts object", (done) => {
        const db = new DB(dbName, { auto_compaction: false });
        const revs = [];
        db.post({
            test: "somestuff",
            _id: "somestuff"
        }).then((info) => {
            revs.push(info.rev);
            db.put({
                _id: info.id,
                _rev: info.rev,
                another: "test"
            }).then((info2) => {
                revs.push(info2.rev);
                db.revsDiff({ somestuff: revs }, {}).then((results) => {
                    assert.notInclude(Object.keys(results), "somestuff");
                    revs.push("2-randomid");
                    db.revsDiff({ somestuff: revs }).then((results) => {
                        assert.include(Object.keys(results), "somestuff");
                        assert.lengthOf(results.somestuff.missing, 1);
                        done();
                    });
                });
            });
        });
    });

    it("Missing docs should be returned with all revisions", (done) => {
        const db = new DB(dbName);
        const revs = ["1-a", "2-a", "2-b"];
        db.revsDiff({ foo: revs }).then((results) => {
            assert.include(Object.keys(results), "foo");
            assert.deepEqual(results.foo.missing, revs, "listed all revs");
            done();
        });
    });

    it("Conflicting revisions that are available", async () => {
        const doc = { _id: "939", _rev: "1-a" };
        const createConflicts = async (db) => {
            await db.put(doc, { new_edits: false });
            await util.putAfter(db, {
                _id: "939",
                _rev: "2-a"
            }, "1-a");
            await util.putAfter(db, {
                _id: "939",
                _rev: "2-b"
            }, "1-a");
        };
        const db = new DB(dbName, { auto_compaction: false });
        await createConflicts(db);
        const results = await db.revsDiff({ 939: ["1-a", "2-a", "2-b"] });
        assert.notInclude(Object.keys(results), "939");
    });

    it("Deleted revisions that are available", async () => {
        const createDeletedRevision = async (db) => {
            await db.put({
                _id: "935",
                _rev: "1-a"
            }, { new_edits: false });
            await util.putAfter(db, {
                _id: "935",
                _rev: "2-a",
                _deleted: true
            }, "1-a");
        };
        const db = new DB(dbName);
        await createDeletedRevision(db);
        const results = await db.revsDiff({ 935: ["1-a", "2-a"] });
        assert.notInclude(Object.keys(results), "939");
    });

    it("Revs diff with empty revs", () => {
        const db = new DB(dbName);
        return db.revsDiff({}).then((res) => {
            assert.exists(res);
        });
    });

    it("Test revs diff with reserved ID", (done) => {
        const db = new DB(dbName, { auto_compaction: false });
        const revs = [];
        db.post({
            test: "constructor",
            _id: "constructor"
        }).then((info) => {
            revs.push(info.rev);
            db.put({
                _id: info.id,
                _rev: info.rev,
                another: "test"
            }).then((info2) => {
                revs.push(info2.rev);
                db.revsDiff({ constructor: revs }).then((results) => {
                    assert.notInclude(Object.keys(results), "constructor");
                    revs.push("2-randomid");
                    db.revsDiff({ constructor: revs }).then((results) => {
                        assert.include(Object.keys(results), "constructor");
                        assert.lengthOf(results.constructor.missing, 1);
                        done();
                    });
                });
            });
        });
    });
});
