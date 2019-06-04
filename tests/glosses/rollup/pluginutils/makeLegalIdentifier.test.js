const {
    rollup: { pluginutils: { makeLegalIdentifier } }
} = adone;

describe("makeLegalIdentifier", () => {
    it("camel-cases names", () => {
        expect(makeLegalIdentifier("foo-bar")).to.be.equal("fooBar");
    });

    it("replaces keywords", () => {
        expect(makeLegalIdentifier("typeof")).to.be.equal("_typeof");
    });

    it("blacklists arguments (https://github.com/rollup/rollup/issues/871)", () => {
        expect(makeLegalIdentifier("arguments")).to.be.equal("_arguments");
    });
});
