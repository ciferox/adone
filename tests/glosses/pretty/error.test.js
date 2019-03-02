const {
    is,
    pretty
} = adone;

const { ParsedError } = pretty.error;

const error = function (what) {
    if (is.string(what)) {
        return error(() => {
            throw Error(what);
        });

    } else if (what instanceof Function) {
        try {
            what();
        } catch (e) {
            return e;
        }
    }

    throw Error("bad argument for error");
};

describe("pretty", "error", () => {
    describe("ParsedError", () => {
        describe("constructor()", () => {
            it("should accept Error() instances", () => {
                expect(() => new ParsedError(error(() => {
                    throw Error("some message");
                }))).to.not.throw();
            });

            it("should accept ReferenceError() and other derivatives of Error()", () => {
                expect(() => new ParsedError(error(() => {
                    throw ReferenceError("some message");
                })).to.not.throw());
            });

            it("should accept non errors", () => {
                expect(() => {
                    new ParsedError("some string");
                }).to.not.throw();
            });
        });

        describe("message", () => {
            it("should return the original error message", () => {
                const e = new ParsedError(error("a"));
                expect(e.message).to.equal("a");
            });
        });

        describe("multiline message", () => {
            it("should return the original error message", () => {
                const e = new ParsedError(error("a \n b \n c"));
                expect(e.message).to.equal("a \n b \n c");
            });
        });

        describe("kind", () => {
            it("should return 'Error' for normal error", () => {
                const e = new ParsedError(error("a"));
                expect(e.kind).to.equal("Error");
            });

            it("should recognize 'ReferenceError'", () => {
                const e = new ParsedError(error(() => a.b = c));
                expect(e.kind).to.equal("ReferenceError");
            });
        });

        describe("stack", () =>
            it("should return original error stack", () => {
                const e = new ParsedError(error(() => a.b = c));
                expect(e.stack).to.be.equal(e.error.stack);
            })
        );

        describe("trace", () =>
            it("should include correct information about each trace item", () => {
                const e = new ParsedError(error(() => a.b = c));
                expect(e.trace).to.have.length.above(2);

                const item = e.trace[0];
                expect(item).to.include.keys("original",
                    "what", "path", "addr",
                    "file", "dir", "col",
                    "line", "jsCol", "jsLine",
                    "packageName", "shortenedPath", "shortenedAddr");

                expect(item.path).to.equal(module.filename.replace(/[\\]+/g, "/"));

                expect(item.line).to.be.a("number");
                expect(item.col).to.be.a("number");
            })
        );

        describe("_rectifyPath()", () => {
            it("should work", () => {
                expect(ParsedError.prototype._rectifyPath("F:/a/node_modules/b/node_modules/d/node_modules/e/f.js").path).to.equal("[a]/[b]/[d]/[e]/f.js");
            });

            it("should return path when `node_modules` is not present", () => {
                expect(ParsedError.prototype._rectifyPath("a/b/c").path).to.equal("a/b/c");
            });
        });
    });
});
