import * as helpers from "../helpers";

describe("net", "http", "server", "request", "accepts", () => {
    const { context } = helpers;

    describe("ctx.accepts(types)", () => {
        describe("with no arguments", () => {
            describe("when Accept is populated", () => {
                it("should return all accepted types", () => {
                    const ctx = context();
                    ctx.req.headers.accept = "application/*;q=0.2, image/jpeg;q=0.8, text/html, text/plain";
                    expect(ctx.accepts()).to.be.deep.equal(["text/html", "text/plain", "image/jpeg", "application/*"]);
                });
            });
        });

        describe("with no valid types", () => {
            describe("when Accept is populated", () => {
                it("should return false", () => {
                    const ctx = context();
                    ctx.req.headers.accept = "application/*;q=0.2, image/jpeg;q=0.8, text/html, text/plain";
                    expect(ctx.accepts("image/png", "image/tiff")).to.be.false;
                });
            });

            describe("when Accept is not populated", () => {
                it("should return the first type", () => {
                    const ctx = context();
                    expect(ctx.accepts("text/html", "text/plain", "image/jpeg", "application/*")).to.be.equal("text/html");
                });
            });
        });

        describe("when extensions are given", () => {
            it("should convert to mime types", () => {
                const ctx = context();
                ctx.req.headers.accept = "text/plain, text/html";
                expect(ctx.accepts("html")).to.be.equal("html");
                expect(ctx.accepts(".html")).to.be.equal(".html");
                expect(ctx.accepts("txt")).to.be.equal("txt");
                expect(ctx.accepts(".txt")).to.be.equal(".txt");
                expect(ctx.accepts("png")).to.be.false;
            });
        });

        describe("when an array is given", () => {
            it("should return the first match", () => {
                const ctx = context();
                ctx.req.headers.accept = "text/plain, text/html";
                expect(ctx.accepts(["png", "text", "html"])).to.be.equal("text");
                expect(ctx.accepts(["png", "html"])).to.be.equal("html");
            });
        });

        describe("when multiple arguments are given", () => {
            it("should return the first match", () => {
                const ctx = context();
                ctx.req.headers.accept = "text/plain, text/html";
                expect(ctx.accepts("png", "text", "html")).to.be.equal("text");
                expect(ctx.accepts("png", "html")).to.be.equal("html");
            });
        });

        describe("when present in Accept as an exact match", () => {
            it("should return the type", () => {
                const ctx = context();
                ctx.req.headers.accept = "text/plain, text/html";
                expect(ctx.accepts("text/html")).to.be.equal("text/html");
                expect(ctx.accepts("text/plain")).to.be.equal("text/plain");
            });
        });

        describe("when present in Accept as a type match", () => {
            it("should return the type", () => {
                const ctx = context();
                ctx.req.headers.accept = "application/json, */*";
                expect(ctx.accepts("text/html")).to.be.equal("text/html");
                expect(ctx.accepts("text/plain")).to.be.equal("text/plain");
                expect(ctx.accepts("image/png")).to.be.equal("image/png");
            });
        });

        describe("when present in Accept as a subtype match", () => {
            it("should return the type", () => {
                const ctx = context();
                ctx.req.headers.accept = "application/json, text/*";
                expect(ctx.accepts("text/html")).to.be.equal("text/html");
                expect(ctx.accepts("text/plain")).to.be.equal("text/plain");
                expect(ctx.accepts("image/png")).to.be.false;
                expect(ctx.accepts("png")).to.be.false;
            });
        });
    });
});
