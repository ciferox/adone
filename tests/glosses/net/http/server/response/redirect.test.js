import * as helpers from "../helpers";

describe("net", "http", "server", "response", "redirect", () => {
    const { net: { http: { server: { helper: { escapeHTML } } } } } = adone;
    const { context } = helpers;

    it("should redirect to the given url", () => {
        const ctx = context();
        ctx.redirect("http://google.com");
        expect(ctx.response.header.location).to.be.equal("http://google.com");
        expect(ctx.status).to.be.equal(302);
    });

    describe('with "back"', () => {
        it("should redirect to Referrer", () => {
            const ctx = context();
            ctx.req.headers.referrer = "/login";
            ctx.redirect("back");
            expect(ctx.response.header.location).to.be.equal("/login");
        });

        it("should redirect to Referer", () => {
            const ctx = context();
            ctx.req.headers.referer = "/login";
            ctx.redirect("back");
            expect(ctx.response.header.location).to.be.equal("/login");
        });

        it("should default to alt", () => {
            const ctx = context();
            ctx.redirect("back", "/index.html");
            expect(ctx.response.header.location).to.be.equal("/index.html");
        });

        it("should default redirect to /", () => {
            const ctx = context();
            ctx.redirect("back");
            expect(ctx.response.header.location).to.be.equal("/");
        });
    });

    describe("when html is accepted", () => {
        it("should respond with html", () => {
            const ctx = context();
            const url = "http://google.com";
            ctx.header.accept = "text/html";
            ctx.redirect(url);
            expect(ctx.response.header["content-type"]).to.be.equal("text/html; charset=utf-8");
            expect(ctx.body).to.be.equal(`Redirecting to <a href="${url}">${url}</a>.`);
        });

        it("should escape the url", () => {
            const ctx = context();
            let url = "<script>";
            ctx.header.accept = "text/html";
            ctx.redirect(url);
            url = escapeHTML(url);
            expect(ctx.response.header["content-type"]).to.be.equal("text/html; charset=utf-8");
            expect(ctx.body).to.be.equal(`Redirecting to <a href="${url}">${url}</a>.`);
        });
    });

    describe("when text is accepted", () => {
        it("should respond with text", () => {
            const ctx = context();
            const url = "http://google.com";
            ctx.header.accept = "text/plain";
            ctx.redirect(url);
            expect(ctx.body).to.be.equal(`Redirecting to ${url}.`);
        });
    });

    describe("when status is 301", () => {
        it("should not change the status code", () => {
            const ctx = context();
            const url = "http://google.com";
            ctx.status = 301;
            ctx.header.accept = "text/plain";
            ctx.redirect("http://google.com");
            expect(ctx.status).to.be.equal(301);
            expect(ctx.body).to.be.equal(`Redirecting to ${url}.`);
        });
    });

    describe("when status is 304", () => {
        it("should change the status code", () => {
            const ctx = context();
            const url = "http://google.com";
            ctx.status = 304;
            ctx.header.accept = "text/plain";
            ctx.redirect("http://google.com");
            expect(ctx.status).to.be.equal(302);
            expect(ctx.body).to.be.equal(`Redirecting to ${url}.`);
        });
    });

    describe("when content-type was present", () => {
        it("should overwrite content-type", () => {
            const ctx = context();
            ctx.body = {};
            const url = "http://google.com";
            ctx.header.accept = "text/plain";
            ctx.redirect("http://google.com");
            expect(ctx.status).to.be.equal(302);
            expect(ctx.body).to.be.equal(`Redirecting to ${url}.`);
            expect(ctx.type).to.be.equal("text/plain");
        });
    });
});
