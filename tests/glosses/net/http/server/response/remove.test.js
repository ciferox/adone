import * as helpers from "../helpers";

describe("glosses", "net", "http", "server", "response", "remove", () => {
    const { context } = helpers;

    it("should remove a field", () => {
        const ctx = context();
        ctx.set("x-foo", "bar");
        ctx.remove("x-foo");
        expect(ctx.response.header).to.be.deep.equal({});
    });
});
