import * as helpers from "../helpers";

describe("net", "http", "server", "response", "type", () => {
    const { context } = helpers;

    describe("get", () => {
        describe("with no Content-Type", () => {
            it('should return ""', () => {
                const ctx = context();
                assert(!ctx.type);
            });
        });

        describe("with a Content-Type", () => {
            it("should return the mime", () => {
                const ctx = context();
                ctx.type = "json";
                expect(ctx.type).to.be.equal("application/json");
            });
        });
    });

    describe("set", () => {
        describe("with a mime", () => {
            it("should set the Content-Type", () => {
                const ctx = context();
                ctx.type = "text/plain";
                expect(ctx.type).to.be.equal("text/plain");
                expect(ctx.response.header["content-type"]).to.be.equal("text/plain; charset=utf-8");
            });
        });

        describe("with an extension", () => {
            it("should lookup the mime", () => {
                const ctx = context();
                ctx.type = "json";
                expect(ctx.type).to.be.equal("application/json");
                expect(ctx.response.header["content-type"]).to.be.equal("application/json; charset=utf-8");
            });
        });

        describe("without a charset", () => {
            it("should default the charset", () => {
                const ctx = context();
                ctx.type = "text/html";
                expect(ctx.type).to.be.equal("text/html");
                expect(ctx.response.header["content-type"]).to.be.equal("text/html; charset=utf-8");
            });
        });

        describe("with a charset", () => {
            it("should not default the charset", () => {
                const ctx = context();
                ctx.type = "text/html; charset=foo";
                expect(ctx.type).to.be.equal("text/html");
                expect(ctx.response.header["content-type"]).to.be.equal("text/html; charset=foo");
            });
        });

        describe("with an unknown extension", () => {
            it("should not set a content-type", () => {
                const ctx = context();
                ctx.type = "asdf";
                assert(!ctx.type);
                assert(!ctx.response.header["content-type"]);
            });
        });
    });
});
