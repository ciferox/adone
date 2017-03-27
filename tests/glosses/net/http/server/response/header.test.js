import * as helpers from "../helpers";

describe("glosses", "net", "http", "server", "response", "header", () => {
    const { net: { http: { server: { Server } } } } = adone;
    const { response } = helpers;

    it("should return the response header object", () => {
        const res = response();
        res.set("X-Foo", "bar");
        expect(res.header).to.be.deep.equal({ "x-foo": "bar" });
    });

    it("should use res.getHeaders() accessor when available", () => {
        const res = response();
        res.res._headers = null;
        res.res.getHeaders = () => ({ "x-foo": "baz" });
        expect(res.header).to.be.deep.equal({ "x-foo": "baz" });
    });

    it("should return the response header object when no mocks are in use", async () => {
        const server = new Server();
        let header;

        server.use((ctx) => {
            ctx.set("x-foo", "42");
            header = Object.assign({}, ctx.response.header);
        });

        await request(server).get("/");

        expect(header).to.be.deep.equal({ "x-foo": "42" });
    });

    describe("when res._headers not present", () => {
        it("should return empty object", () => {
            const res = response();
            res.res._headers = null;
            expect(res.header).to.be.deep.equal({});
        });
    });
});
