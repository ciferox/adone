import * as helpers from "../helpers";

describe("glosses", "net", "http", "server", "response", "vary", () => {
    const { context } = helpers;

    describe("when Vary is not set", () => {
        it("should set it", () => {
            const ctx = context();
            ctx.vary("Accept");
            expect(ctx.response.header.vary).to.be.equal("Accept");
        });
    });

    describe("when Vary is set", () => {
        it("should append", () => {
            const ctx = context();
            ctx.vary("Accept");
            ctx.vary("Accept-Encoding");
            expect(ctx.response.header.vary).to.be.equal("Accept, Accept-Encoding");
        });
    });

    describe("when Vary already contains the value", () => {
        it("should not append", () => {
            const ctx = context();
            ctx.vary("Accept");
            ctx.vary("Accept-Encoding");
            ctx.vary("Accept");
            ctx.vary("Accept-Encoding");
            expect(ctx.response.header.vary).to.be.equal("Accept, Accept-Encoding");
        });
    });
});
