import * as helpers from "../helpers";

describe("glosses", "net", "http", "server", "request", "query", () => {
    const { context } = helpers;

    describe("get", () => {
        describe("when missing", () => {
            it("should return an empty object", () => {
                const ctx = context({ url: "/" });
                expect(ctx.query).to.be.empty;
            });

            it("should return the same object each time it's accessed", (done) => {
                const ctx = context({ url: "/" });
                ctx.query.a = "2";
                expect(ctx.query.a).to.be.equal("2");

                done();
            });
        });

        it("should return a parsed query-string", () => {
            const ctx = context({ url: "/?page=2" });
            expect(ctx.query.page).to.be.equal("2");
        });
    });

    describe("set", () => {
        it("should stringify and replace the querystring and search", () => {
            const ctx = context({ url: "/store/shoes" });
            ctx.query = { page: 2, color: "blue" };
            expect(ctx.url).to.be.equal("/store/shoes?page=2&color=blue");
            expect(ctx.querystring).to.be.equal("page=2&color=blue");
            expect(ctx.search).to.be.equal("?page=2&color=blue");
        });

        it("should change .url but not .originalUrl", () => {
            const ctx = context({ url: "/store/shoes" });
            ctx.query = { page: 2 };
            expect(ctx.url).to.be.equal("/store/shoes?page=2");
            expect(ctx.originalUrl).to.be.equal("/store/shoes");
            expect(ctx.request.originalUrl).to.be.equal("/store/shoes");
        });
    });
});
