const PouchDB = adone.database.pouch.coverage.DB;
const normalizeDdocFunctionName = PouchDB.utils.normalizeDdocFunctionName;
const parseDdocFunctionName = PouchDB.utils.parseDdocFunctionName;
const createError = PouchDB.utils.createError;
const errors = PouchDB.Errors;

describe("test.utils.js", () => {
    describe("the design doc function name normalizer", () => {
        it("normalizes foo to foo/foo", () => {
            assert.equal(normalizeDdocFunctionName("foo"), "foo/foo");
        });
        it("normalizes foo/bar to foo/bar", () => {
            assert.equal(normalizeDdocFunctionName("foo/bar"), "foo/bar");
        });
        it("normalizes null to a non existing value", () => {
            assert.isNull(normalizeDdocFunctionName(null));
        });
    });
    describe("ddoc function name parser", () => {
        it("parses foo/bar as [foo,bar]", () => {
            assert.deepEqual(parseDdocFunctionName("foo/bar"), ["foo", "bar"]);
        });
        it("parses foo as [foo,foo]", () => {
            assert.deepEqual(parseDdocFunctionName("foo"), ["foo", "foo"]);
        });
        it("throws if it can't parse the function name", () => {
            assert.isNull(parseDdocFunctionName(null));
            assert.isNull(parseDdocFunctionName("foo/bar/baz"));
        });
    });
    describe("create error", () => {
        it("Error works", () => {
            const newError = createError(
                errors.BAD_REQUEST, "love needs no message");
            assert.equal(newError.status, errors.BAD_REQUEST.status);
            assert.equal(newError.name, errors.BAD_REQUEST.name);
            assert.equal(newError.message, errors.BAD_REQUEST.message, "correct error message returned");
            assert.equal(newError.reason, "love needs no message");
        });
    });
});
