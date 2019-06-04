const {
    rollup: { pluginutils: { addExtension } }
} = adone;

describe("addExtension", () => {
    it("adds .js to an ID without an extension", () => {
        expect(addExtension("foo")).to.be.equal("foo.js");
    });

    it("ignores file with existing extension", () => {
        expect(addExtension("foo.js")).to.be.equal("foo.js");
        expect(addExtension("foo.json")).to.be.equal("foo.json");
    });

    it("ignores file with trailing dot", () => {
        expect(addExtension("foo.")).to.be.equal("foo.");
    });

    it("ignores leading .", () => {
        expect(addExtension("./foo")).to.be.equal("./foo.js");
        expect(addExtension("./foo.js")).to.be.equal("./foo.js");
    });

    it("adds a custom extension", () => {
        expect(addExtension("foo", ".wut")).to.be.equal("foo.wut");
        expect(addExtension("foo.lol", ".wut")).to.be.equal("foo.lol");
    });
});
