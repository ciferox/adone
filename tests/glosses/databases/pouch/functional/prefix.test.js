import * as util from "./utils";

describe("database", "pouch", "prefix", () => {
    const dbName = "testdb";
    let DB = null;

    beforeEach(async () => {
        DB = await util.setup();
        await util.cleanup(dbName);
    });

    after(async () => {
        await util.destroy();
    });

    it("Test plain prefix", () => {
        const CustomPouch = DB.defaults({ prefix: "testing" });
        const db = new CustomPouch("testdb");

        return db.info().then((info) => {
            assert.equal(info.db_name, "testdb");
        }).then(() => {
            return db.destroy();
        });
    });

    // This is also tested in test.defaults.js, however I wanted to cover
    // the different use cases of prefix in here
    if (!adone.is.windows) {
        describe("node prefix.test.js", () => {
            it("Test path prefix", async () => {

                const prefix = adone.std.path.join(util.tmppath, "testfolder");

                await adone.fs.mkdir(prefix);

                const CustomPouch = DB.defaults({ prefix });

                const db = new CustomPouch("testdb");

                await db.info();
                // This will throw if the folder does not exist
                await adone.fs.lstat(`${prefix}testdb`);
                await adone.fs.rm(prefix);
            });
        });
    }
});
