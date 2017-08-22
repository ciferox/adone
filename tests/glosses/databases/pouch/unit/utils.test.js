describe("database", "pouch", "utils", () => {
    const {
        x,
        __: {
            util: { normalizeDesignDocFunctionName, parseDesignDocFunctionName }
        }
    } = adone.database.pouch;
    const { createError } = x;

    describe("the design doc function name normalizer", () => {
        it("normalizes foo to foo/foo", () => {
            assert.equal(normalizeDesignDocFunctionName("foo"), "foo/foo");
        });
        it("normalizes foo/bar to foo/bar", () => {
            assert.equal(normalizeDesignDocFunctionName("foo/bar"), "foo/bar");
        });
        it("normalizes null to a non existing value", () => {
            assert.isNull(normalizeDesignDocFunctionName(null));
        });
    });
    describe("ddoc function name parser", () => {
        it("parses foo/bar as [foo,bar]", () => {
            assert.deepEqual(parseDesignDocFunctionName("foo/bar"), ["foo", "bar"]);
        });
        it("parses foo as [foo,foo]", () => {
            assert.deepEqual(parseDesignDocFunctionName("foo"), ["foo", "foo"]);
        });
        it("throws if it can't parse the function name", () => {
            assert.isNull(parseDesignDocFunctionName(null));
            assert.isNull(parseDesignDocFunctionName("foo/bar/baz"));
        });
    });
    describe("create error", () => {
        it("Error works", () => {
            const newError = createError(x.BAD_REQUEST, "love needs no message");
            assert.equal(newError.status, x.BAD_REQUEST.status);
            assert.equal(newError.name, x.BAD_REQUEST.name);
            assert.equal(newError.message, x.BAD_REQUEST.message, "correct error message returned");
            assert.equal(newError.reason, "love needs no message");
        });
    });
});
