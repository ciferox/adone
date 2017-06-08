import * as helpers from "../helpers";

describe("net", "http", "server", "request", "path", () => {
    const { context } = helpers;
    const { net: { http: { server: { helper: { parseURL } } } } } = adone;

    describe("get", () => {
        it("should return the pathname", () => {
            const ctx = context();
            ctx.url = "/login?next=/dashboard";
            expect(ctx.path).to.be.equal("/login");
        });
    });

    describe("set", () => {
        it("should set the pathname", () => {
            const ctx = context();
            ctx.url = "/login?next=/dashboard";

            ctx.path = "/logout";
            expect(ctx.path).to.be.equal("/logout");
            expect(ctx.url).to.be.equal("/logout?next=/dashboard");
        });

        it("should change .url but not .originalUrl", () => {
            const ctx = context({ url: "/login" });
            ctx.path = "/logout";
            expect(ctx.url).to.be.equal("/logout");
            expect(ctx.originalUrl).to.be.equal("/login");
            expect(ctx.request.originalUrl).to.be.equal("/login");
        });

        it("should not affect parseurl", () => {
            const ctx = context({ url: "/login?foo=bar" });
            ctx.path = "/login";
            const url = parseURL(ctx.req);
            expect(url.path).to.be.equal("/login?foo=bar");
        });
    });
});
