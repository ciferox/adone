import * as helpers from "../helpers";

describe("net", "http", "server", "request", "accepts encodings", () => {
    const { context } = helpers;

    describe("with no arguments", () => {
        describe("when Accept-Encoding is populated", () => {
            it("should return accepted types", () => {
                const ctx = context();
                ctx.req.headers["accept-encoding"] = "gzip, compress;q=0.2";
                expect(ctx.acceptsEncodings()).to.be.deep.equal(["gzip", "compress", "identity"]);
                expect(ctx.acceptsEncodings("gzip", "compress")).to.be.equal("gzip");
            });
        });

        describe("when Accept-Encoding is not populated", () => {
            it("should return identity", () => {
                const ctx = context();
                expect(ctx.acceptsEncodings()).to.be.deep.equal(["identity"]);
                expect(ctx.acceptsEncodings("gzip", "deflate", "identity")).to.be.equal("identity");
            });
        });
    });

    describe("with multiple arguments", () => {
        it("should return the best fit", () => {
            const ctx = context();
            ctx.req.headers["accept-encoding"] = "gzip, compress;q=0.2";
            expect(ctx.acceptsEncodings("compress", "gzip")).to.be.deep.equal("gzip");
            expect(ctx.acceptsEncodings("gzip", "compress")).to.be.deep.equal("gzip");
        });
    });

    describe("with an array", () => {
        it("should return the best fit", () => {
            const ctx = context();
            ctx.req.headers["accept-encoding"] = "gzip, compress;q=0.2";
            expect(ctx.acceptsEncodings(["compress", "gzip"])).to.be.deep.equal("gzip");
        });
    });
});
