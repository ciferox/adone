const { Compiler } = adone.private(adone.util.Snapdragon);
let compiler;

describe("util", "Snapdragon", "compiler", () => {
    beforeEach(() => {
        compiler = new Compiler();
    });

    describe("constructor:", () => {
        it("should return an instance of Compiler:", () => {
            assert(compiler instanceof Compiler);
        });
    });

    // ensures that we catch and document API changes
    describe("prototype methods:", () => {
        const methods = [
            "error",
            "set",
            "emit",
            "visit",
            "mapVisit",
            "compile"
        ];

        methods.forEach((method) => {
            it(`should expose the \`${method}\` method`, () => {
                assert.equal(typeof compiler[method], "function", method);
            });
        });
    });
});
