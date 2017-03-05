import * as helpers from "../helpers";

describe("glosses", "net", "http", "server", "request", "ip", () => {
    const { net: { http: { Server } }, std: { stream: { Duplex } } } = adone;
    const { request } = helpers;

    describe("with req.ips present", () => {
        it("should return req.ips[0]", () => {
            const server = new Server();
            const req = { headers: {}, socket: new Duplex() };
            server.proxy = true;
            req.headers["x-forwarded-for"] = "127.0.0.1";
            req.socket.remoteAddress = "127.0.0.2";
            const _request = request(req, undefined, server);
            expect(_request.ip).to.be.equal("127.0.0.1");
        });
    });

    describe("with no req.ips present", () => {
        it("should return req.socket.remoteAddress", () => {
            const req = { socket: new Duplex() };
            req.socket.remoteAddress = "127.0.0.2";
            const _request = request(req);
            expect(_request.ip).to.be.equal("127.0.0.2");
        });

        describe("with req.socket.remoteAddress not present", () => {
            it("should return an empty string", () => {
                const socket = new Duplex();
                Object.defineProperty(socket, "remoteAddress", {
                    get: () => undefined, // So that the helper doesn't override it with a reasonable value
                    set: () => {}
                });
                assert.equal(request({ socket }).ip, "");
            });
        });
    });

    it("should be cached", () => {
        const req = { socket: new Duplex() };
        req.socket.remoteAddress = "127.0.0.2";
        const _request = request(req);
        req.socket.remoteAddress = "127.0.0.1";
        expect(_request.ip).to.be.equal("127.0.0.2");
    });
});
