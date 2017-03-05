import * as helpers from "../helpers";

describe("glosses", "net", "http", "server", "request", "is", () => {
    const { context } = helpers;

    it("should ignore params", () => {
        const ctx = context();
        ctx.header["content-type"] = "text/html; charset=utf-8";
        ctx.header["transfer-encoding"] = "chunked";

        expect(ctx.is("text/*")).to.be.equal("text/html");
    });

    describe("when no body is given", () => {
        it("should return null", () => {
            const ctx = context();

            assert(ctx.is() === null);
            assert(ctx.is("image/*") === null);
            assert(ctx.is("image/*", "text/*") === null);
        });
    });

    describe("when no content type is given", () => {
        it("should return false", () => {
            const ctx = context();
            ctx.header["transfer-encoding"] = "chunked";

            expect(ctx.is()).to.be.false;
            expect(ctx.is("image/*")).to.be.false;
            expect(ctx.is("text/*", "image/*")).to.be.false;
        });
    });

    describe("give no types", () => {
        it("should return the mime type", () => {
            const ctx = context();
            ctx.header["content-type"] = "image/png";
            ctx.header["transfer-encoding"] = "chunked";

            expect(ctx.is()).to.be.equal("image/png");
        });
    });

    describe("given one type", () => {
        it("should return the type or false", () => {
            const ctx = context();
            ctx.header["content-type"] = "image/png";
            ctx.header["transfer-encoding"] = "chunked";

            expect(ctx.is("png")).to.be.equal("png");
            expect(ctx.is(".png")).to.be.equal(".png");
            expect(ctx.is("image/png")).to.be.equal("image/png");
            expect(ctx.is("image/*")).to.be.equal("image/png");
            expect(ctx.is("*/png")).to.be.equal("image/png");
            expect(ctx.is("jpeg")).to.be.false;
            expect(ctx.is(".jpeg")).to.be.false;
            expect(ctx.is("image/jpeg")).to.be.false;
            expect(ctx.is("text/*")).to.be.false;
            expect(ctx.is("*/jpeg")).to.be.false;
        });
    });

    describe("given multiple types", () => {
        it("should return the first match or false", () => {
            const ctx = context();
            ctx.header["content-type"] = "image/png";
            ctx.header["transfer-encoding"] = "chunked";

            expect(ctx.is("png")).to.be.equal("png");
            expect(ctx.is(".png")).to.be.equal(".png");
            expect(ctx.is("text/*", "image/*")).to.be.equal("image/png");
            expect(ctx.is("image/*", "text/*")).to.be.equal("image/png");
            expect(ctx.is("image/*", "image/png")).to.be.equal("image/png");
            expect(ctx.is("image/png", "image/*")).to.be.equal("image/png");
            expect(ctx.is(["text/*", "image/*"])).to.be.equal("image/png");
            expect(ctx.is(["image/*", "text/*"])).to.be.equal("image/png");
            expect(ctx.is(["image/*", "image/png"])).to.be.equal("image/png");
            expect(ctx.is(["image/png", "image/*"])).to.be.equal("image/png");
            expect(ctx.is("jpeg")).to.be.false;
            expect(ctx.is(".jpeg")).to.be.false;
            expect(ctx.is("text/*", "application/*")).to.be.false;
            expect(ctx.is("text/html", "text/plain", "application/json; charset=utf-8")).to.be.false;
        });
    });

    describe("when Content-Type: application/x-www-form-urlencoded", () => {
        it('should match "urlencoded"', () => {
            const ctx = context();
            ctx.header["content-type"] = "application/x-www-form-urlencoded";
            ctx.header["transfer-encoding"] = "chunked";

            expect(ctx.is("urlencoded")).to.be.equal("urlencoded");
            expect(ctx.is("json", "urlencoded")).to.be.equal("urlencoded");
            expect(ctx.is("urlencoded", "json")).to.be.equal("urlencoded");
        });
    });
});
