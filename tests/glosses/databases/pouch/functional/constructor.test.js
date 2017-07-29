require("./node.setup");

describe("db", "pouch", "constructor errors", () => {
    it("should error on an undefined name", (done) => {
        try {
            new PouchDB();
            done("Should have thrown");
        } catch (err) {
            assert.equal(err instanceof Error, true, "should be an error");
            done();
        }
    });

    it("should error on an undefined adapter", (done) => {
        try {
            new PouchDB("foo", { adapter: "myFakeAdapter" });
            done("Should have thrown");
        } catch (err) {
            assert.equal(err instanceof Error, true, "should be an error");
            assert.equal(err.message, "Invalid Adapter: myFakeAdapter", "should give the correct error message");
            done();
        }
    });

    it("should error on a null name", (done) => {
        try {
            new PouchDB(null);
            done("Should have thrown");
        } catch (err) {
            assert.equal(err instanceof Error, true, "should be an error");
            done();
        }
    });
});
