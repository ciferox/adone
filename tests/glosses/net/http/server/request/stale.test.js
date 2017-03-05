import * as helpers from "../helpers";

describe("glosses", "net", "http", "server", "request", "stale", () => {
    const { context } = helpers;

    it("should be the inverse of req.fresh", () => {
        const ctx = context();
        ctx.status = 200;
        ctx.method = "GET";
        ctx.req.headers["if-none-match"] = '"123"';
        ctx.set("ETag", '"123"');
        expect(ctx.fresh).to.be.true;
        expect(ctx.stale).to.be.false;
    });
});
