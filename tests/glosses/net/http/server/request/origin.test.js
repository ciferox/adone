import * as helpers from "../helpers";

describe("glosses", "net", "http", "server", "request", "origin", () => {
    const { context } = helpers;
    const { std: { stream: { Duplex, Readable } } } = adone;

    it("should return the origin of url", () => {
        const socket = new Duplex();
        const req = {
            url: "/users/1?next=/dashboard",
            headers: {
                host: "localhost"
            },
            socket,
            __proto__: Readable.prototype
        };
        const ctx = context(req);
        expect(ctx.origin).to.be.equal("http://localhost");
        // change it also work

        ctx.url = "/foo/users/1?next=/dashboard";
        expect(ctx.origin).to.be.equal("http://localhost");
    });
});
