import * as util from "./utils";

describe("database", "pouch", "constructor errors", () => {
    let DB = null;

    before(async () => {
        DB = await util.setup();
    });

    after(async () => {
        await util.destroy();
    });

    it("should error on an undefined name", (done) => {
        try {
            new DB();
            done("Should have thrown");
        } catch (err) {
            assert.equal(err instanceof Error, true, "should be an error");
            done();
        }
    });

    it("should error on an undefined adapter", (done) => {
        try {
            new DB("foo", { adapter: "myFakeAdapter" });
            done("Should have thrown");
        } catch (err) {
            assert.equal(err instanceof Error, true, "should be an error");
            assert.equal(err.message, "Invalid Adapter: myFakeAdapter", "should give the correct error message");
            done();
        }
    });

    it("should error on a null name", (done) => {
        try {
            new DB(null);
            done("Should have thrown");
        } catch (err) {
            assert.equal(err instanceof Error, true, "should be an error");
            done();
        }
    });
});
