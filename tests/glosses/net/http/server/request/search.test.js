import * as helpers from "../helpers";

describe("net", "http", "server", "request", "search", () => {
    const { context } = helpers;

    it("should replace the search", () => {
        const ctx = context({ url: "/store/shoes" });
        ctx.search = "?page=2&color=blue";
        expect(ctx.url).to.be.equal("/store/shoes?page=2&color=blue");
        expect(ctx.search).to.be.equal("?page=2&color=blue");
    });

    it("should update ctx.querystring and ctx.query", () => {
        const ctx = context({ url: "/store/shoes" });
        ctx.search = "?page=2&color=blue";
        expect(ctx.url).to.be.equal("/store/shoes?page=2&color=blue");
        expect(ctx.querystring).to.be.equal("page=2&color=blue");

        expect(ctx.query).to.have.property("page", "2");
        expect(ctx.query).to.have.property("color", "blue");
    });

    it("should change .url but not .originalUrl", () => {
        const ctx = context({ url: "/store/shoes" });
        ctx.search = "?page=2&color=blue";
        expect(ctx.url).to.be.equal("/store/shoes?page=2&color=blue");
        expect(ctx.originalUrl).to.be.equal("/store/shoes");
        expect(ctx.request.originalUrl).to.be.equal("/store/shoes");
    });

    describe("when missing", () => {
        it('should return ""', () => {
            const ctx = context({ url: "/store/shoes" });
            expect(ctx.search).to.be.equal("");
        });
    });
});
