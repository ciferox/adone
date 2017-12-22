import * as helpers from "../helpers";

describe("net", "http", "server", "response", "is", () => {
    const { context } = helpers;

    it("should ignore params", () => {
        const res = context().response;
        res.type = "text/html; charset=utf-8";

        expect(res.is("text/*")).to.be.equal("text/html");
    });

    describe("when no type is set", () => {
        it("should return false", () => {
            const res = context().response;

            assert(res.is() === false);
            assert(res.is("html") === false);
        });
    });

    describe("when given no types", () => {
        it("should return the type", () => {
            const res = context().response;
            res.type = "text/html; charset=utf-8";

            expect(res.is()).to.be.equal("text/html");
        });
    });

    describe("given one type", () => {
        it("should return the type or false", () => {
            const res = context().response;
            res.type = "image/png";

            expect(res.is("png")).to.be.equal("png");
            expect(res.is(".png")).to.be.equal(".png");
            expect(res.is("image/png")).to.be.equal("image/png");
            expect(res.is("image/*")).to.be.equal("image/png");
            expect(res.is("*/png")).to.be.equal("image/png");
            expect(res.is("jpeg")).to.be.false();
            expect(res.is(".jpeg")).to.be.false();
            expect(res.is("image/jpeg")).to.be.false();
            expect(res.is("text/*")).to.be.false();
            expect(res.is("*/jpeg")).to.be.false();
        });
    });

    describe("given multiple types", () => {
        it("should return the first match or false", () => {
            const res = context().response;
            res.type = "image/png";

            expect(res.is("png")).to.be.equal("png");
            expect(res.is(".png")).to.be.equal(".png");
            expect(res.is("text/*", "image/*")).to.be.equal("image/png");
            expect(res.is("image/*", "text/*")).to.be.equal("image/png");
            expect(res.is("image/*", "image/png")).to.be.equal("image/png");
            expect(res.is("image/png", "image/*")).to.be.equal("image/png");
            expect(res.is(["text/*", "image/*"])).to.be.equal("image/png");
            expect(res.is(["image/*", "text/*"])).to.be.equal("image/png");
            expect(res.is(["image/*", "image/png"])).to.be.equal("image/png");
            expect(res.is(["image/png", "image/*"])).to.be.equal("image/png");
            expect(res.is("jpeg")).to.be.false();
            expect(res.is(".jpeg")).to.be.false();
            expect(res.is("text/*", "application/*")).to.be.false();
            expect(res.is("text/html", "text/plain", "application/json; charset=utf-8")).to.be.false();
        });
    });

    describe("when Content-Type: application/x-www-form-urlencoded", () => {
        it('should match "urlencoded"', () => {
            const res = context().response;
            res.type = "application/x-www-form-urlencoded";

            expect(res.is("urlencoded")).to.be.equal("urlencoded");
            expect(res.is("json", "urlencoded")).to.be.equal("urlencoded");
            expect(res.is("urlencoded", "json")).to.be.equal("urlencoded");
        });
    });
});
