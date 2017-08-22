import * as util from "./utils";

describe("database", "pouch", "issue915", () => {
    const dbName = "testdb";
    let DB = null;

    const file1 = `${util.prefix}veryimportantfiles`;
    const file2 = adone.std.path.join(file1, "something");

    beforeEach(async () => {
        DB = await util.setup();
        await util.cleanup(dbName);
    });

    after(async () => {
        await adone.fs.rm(file1);
        await util.destroy();
    });

    it("Put a file in the db, then destroy it", async () => {
        const db = new DB("veryimportantfiles");
        await db.put({ _id: "1" });
        await adone.fs.writeFile(file2, "lalala");
        await db.destroy();
        const data = await adone.fs.readFile(file2, { encoding: "utf8" });
        expect(data).to.be.equal("lalala");
    });
});
