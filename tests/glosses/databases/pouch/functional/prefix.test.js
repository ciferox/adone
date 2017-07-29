require("./node.setup");

describe("db", "pouch", "prefix", () => {
    it("Test plain prefix", () => {

        const CustomPouch = PouchDB.defaults({ prefix: "testing" });
        const db = new CustomPouch("testdb");

        return db.info().then((info) => {
            assert.equal(info.db_name, "testdb");
        }).then(() => {
            return db.destroy();
        });

    });

});

// This is also tested in test.defaults.js, however I wanted to cover
// the different use cases of prefix in here
if (require("os").platform() !== "win32") {
    const mkdirp = require("mkdirp");
    const rimraf = require("rimraf");
    const fs = require("fs");

    describe("db", "pouch", "node prefix.test.js", () => {

        it("Test path prefix", () => {

            const prefix = "./tmp/testfolder/";
            mkdirp.sync(prefix);
            const CustomPouch = PouchDB.defaults({ prefix });

            const db = new CustomPouch("testdb");

            return db.info().then(() => {
                // This will throw if the folder does not exist
                fs.lstatSync(`${prefix}testdb`);
                rimraf.sync("./tmp/testfolder");
            });
        });
    });
}
