import * as util from "./utils";

describe("database", "pouch", "taskqueue", () => {
    const dbName = "testdb";
    let DB = null;

    beforeEach(async () => {
        DB = await util.setup();
        await util.cleanup(dbName);
    });

    after(async () => {
        await util.destroy();
    });

    it("Add a doc", async () => {
        const db = new DB(dbName);
        await db.post({ test: "somestuff" });
    });

    it("Query", (done) => {
        const db = new DB(dbName);
        // Test invalid if adapter doesnt support mapreduce
        if (!db.query) {
            return done();
        }

        const queryFun = {
            map() { }
        };
        db.query(queryFun, { reduce: false }).then((res) => {
            assert.lengthOf(res.rows, 0);
            done();
        });
    });

    it("Bulk docs", (done) => {
        const db = new DB(dbName);
        db.bulkDocs({
            docs: [
                { test: "somestuff" },
                { test: "another" }
            ]
        }).then((infos) => {
            assert.isUndefined(infos[0].error);
            assert.isUndefined(infos[1].error);
            done();
        });
    });

    it("Get", (done) => {
        const db = new DB(dbName);
        db.get("0").catch(() => {
            done();
        });
    });

    it("Info", (done) => {
        const db = new DB(dbName);
        db.info().then((info) => {
            assert.equal(info.doc_count, 0);
            done();
        });
    });
});
