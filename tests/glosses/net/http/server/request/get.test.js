import * as helpers from "../helpers";

describe("net", "http", "server", "request", "get", () => {
    const { context } = helpers;

    it("should return the field value", () => {
        const ctx = context();
        ctx.req.headers.host = "http://google.com";
        ctx.req.headers.referer = "http://google.com";
        expect(ctx.get("HOST")).to.be.equal("http://google.com");
        expect(ctx.get("Host")).to.be.equal("http://google.com");
        expect(ctx.get("host")).to.be.equal("http://google.com");
        expect(ctx.get("referer")).to.be.equal("http://google.com");
        expect(ctx.get("referrer")).to.be.equal("http://google.com");
    });
});
