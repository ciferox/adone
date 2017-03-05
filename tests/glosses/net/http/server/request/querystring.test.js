import * as helpers from "../helpers";

describe("glosses", "net", "http", "server", "request", "querystring", () => {
    const { context } = helpers;
    const { net: { http: { helper: { parseURL } } } } = adone;

    describe("get", () => {
        it("should return the querystring", () => {
            const ctx = context({ url: "/store/shoes?page=2&color=blue" });
            expect(ctx.querystring).to.be.equal("page=2&color=blue");
        });

        describe("when ctx.req not present", () => {
            it("should return an empty string", () => {
                const ctx = context();
                ctx.request.req = null;
                expect(ctx.querystring).to.be.equal("");
            });
        });
    });

    describe("set", () => {
        it("should replace the querystring", () => {
            const ctx = context({ url: "/store/shoes" });
            ctx.querystring = "page=2&color=blue";
            expect(ctx.url).to.be.equal("/store/shoes?page=2&color=blue");
            expect(ctx.querystring).to.be.equal("page=2&color=blue");
        });

        it("should update ctx.search and ctx.query", () => {
            const ctx = context({ url: "/store/shoes" });
            ctx.querystring = "page=2&color=blue";
            expect(ctx.url).to.be.equal("/store/shoes?page=2&color=blue");
            expect(ctx.search).to.be.equal("?page=2&color=blue");

            expect(ctx.query).to.have.property("page", "2");
            expect(ctx.query).to.have.property("color", "blue");
        });

        it("should change .url but not .originalUrl", () => {
            const ctx = context({ url: "/store/shoes" });
            ctx.querystring = "page=2&color=blue";
            expect(ctx.url).to.be.equal("/store/shoes?page=2&color=blue");
            expect(ctx.originalUrl).to.be.equal("/store/shoes");
            expect(ctx.request.originalUrl).to.be.equal("/store/shoes");
        });

        it("should not affect parseurl", () => {
            const ctx = context({ url: "/login?foo=bar" });
            ctx.querystring = "foo=bar";
            const url = parseURL(ctx.req);
            expect(url.path).to.be.equal("/login?foo=bar");
        });
    });
});
