import * as helpers from "../helpers";

describe("net", "http", "server", "request", "href", () => {
    const { net: { http: { server: { Server } } }, std: { stream: { Duplex, Readable } } } = adone;
    const { context } = helpers;

    it("should return the full request url", () => {
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
        expect(ctx.href).to.be.equal("http://localhost/users/1?next=/dashboard");
        // change it also work

        ctx.url = "/foo/users/1?next=/dashboard";
        expect(ctx.href).to.be.equal("http://localhost/users/1?next=/dashboard");
    });

    it("should work with `GET http://example.com/foo`", async () => {
        const server = new Server();
        server.use((ctx) => {
            ctx.body = ctx.href;
        });
        await request(server).get("http://example.com/foo").expectStatus(200).expectBody("http://example.com/foo");
    });
});
