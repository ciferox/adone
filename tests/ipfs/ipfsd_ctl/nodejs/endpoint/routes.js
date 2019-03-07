const {
    multiformat: { multiaddr },
    std: { path }
} = adone;

const proxyquire = require("proxyquire");

const Hapi = require("hapi");

const routes = proxyquire(
    path.join(adone.ROOT_PATH, "lib/ipfs/ipfsd_ctl/endpoint/routes"),
    {
        "../factory_daemon": class {
            spawn(ops, cb) {
                const node = {};
                node.apiAddr = multiaddr("/ip4/127.0.0.1/tcp/5001");
                node.gatewayAddr = multiaddr("/ip4/127.0.0.1/tcp/8080");
                node.started = false;

                node.init = (opts, cb) => cb(null, node);
                node.cleanup = (cb) => cb();

                node.start = (_, cb) => {
                    node.started = true;

                    const api = {};
                    api.apiHost = node.apiAddr.nodeAddress().address;
                    api.apiPort = node.apiAddr.nodeAddress().port;

                    api.gatewayHost = node.gatewayAddr.nodeAddress().address;
                    api.gatewayPort = node.gatewayAddr.nodeAddress().port;

                    node.api = api;
                    cb(null, api);
                };

                node.stop = (timeout, cb) => node.killProcess(timeout, cb);

                node.killProcess = (timeout, cb) => {
                    node.started = false;
                    cb();
                };

                node.pid = (cb) => cb(null, 1);
                node.getConfig = (key, cb) => cb(null, { foo: "bar" });
                node.setConfig = (key, val, cb) => cb();

                node.start(null, () => cb(null, node));
            }
        }
    }
);

describe("routes", () => {
    let id;
    let server;

    before(() => {
        server = new Hapi.Server({ host: "localhost" });
        routes(server);
    });

    after(() => server.stop());

    describe("POST /spawn", () => {
        it("should return 200", async () => {
            const res = await server.inject({
                method: "POST",
                url: "/spawn",
                headers: { "content-type": "application/json" }
            });
            expect(res.statusCode).to.equal(200);
            expect(res.result.id).to.exist();
            expect(res.result.api.apiAddr).to.exist();
            expect(res.result.api.gatewayAddr).to.exist();

            id = res.result.id;
        });
    });

    describe("GET /api-addr", () => {
        it("should return 200", async () => {
            const res = await server.inject({
                method: "GET",
                url: `/api-addr?id=${id}`,
                headers: { "content-type": "application/json" },
                payload: { id }
            });
            expect(res.statusCode).to.equal(200);
            expect(res.result.apiAddr).to.exist();
        });

        it("should return 400", async () => {
            const res = await server.inject({
                method: "GET",
                url: "/api-addr",
                headers: { "content-type": "application/json" }
            });
            expect(res.statusCode).to.equal(400);
        });
    });

    describe("GET /getaway-addr", () => {
        it("should return 200", async () => {
            const res = await server.inject({
                method: "GET",
                url: `/getaway-addr?id=${id}`,
                headers: { "content-type": "application/json" },
                payload: { id }
            });
            expect(res.statusCode).to.equal(200);
            expect(res.result.getawayAddr).to.exist();
        });

        it("should return 400", async () => {
            const res = await server.inject({
                method: "GET",
                url: "/getaway-addr",
                headers: { "content-type": "application/json" }
            });
            expect(res.statusCode).to.equal(400);
        });
    });

    describe("POST /init", () => {
        it("should return 200", async () => {
            const res = await server.inject({
                method: "POST",
                url: `/init?id=${id}`,
                headers: { "content-type": "application/json" },
                payload: { id }
            });
            expect(res.statusCode).to.equal(200);
        });

        it("should return 400", async () => {
            const res = await server.inject({
                method: "POST",
                url: "/init",
                headers: { "content-type": "application/json" }
            });
            expect(res.statusCode).to.equal(400);
        });
    });

    describe("POST /cleanup", () => {
        it("should return 200", async () => {
            const res = await server.inject({
                method: "POST",
                url: `/cleanup?id=${id}`,
                headers: { "content-type": "application/json" },
                payload: { id }
            });
            expect(res.statusCode).to.equal(200);
        });

        it("should return 400", async () => {
            const res = await server.inject({
                method: "POST",
                url: "/cleanup",
                headers: { "content-type": "application/json" }
            });
            expect(res.statusCode).to.equal(400);
        });
    });

    describe("POST /start", () => {
        it("should return 200", async () => {
            const res = await server.inject({
                method: "POST",
                url: `/start?id=${id}`,
                headers: { "content-type": "application/json" },
                payload: { id }
            });
            expect(res.statusCode).to.equal(200);
        });

        it("should return 400", async () => {
            const res = await server.inject({
                method: "POST",
                url: "/start",
                headers: { "content-type": "application/json" }
            });
            expect(res.statusCode).to.equal(400);
        });
    });

    describe("POST /stop", () => {
        it("should return 200 without timeout", async () => {
            const res = await server.inject({
                method: "POST",
                url: `/stop?id=${id}`,
                headers: { "content-type": "application/json" },
                payload: { id }
            });
            expect(res.statusCode).to.equal(200);
        });

        it("should return 200 with timeout", async () => {
            const res = await server.inject({
                method: "POST",
                url: `/stop?id=${id}`,
                headers: { "content-type": "application/json" },
                payload: { id, timeout: 1000 }
            });
            expect(res.statusCode).to.equal(200);
        });

        it("should return 400", async () => {
            const res = await server.inject({
                method: "POST",
                url: "/stop",
                headers: { "content-type": "application/json" }
            });
            expect(res.statusCode).to.equal(400);
        });
    });

    describe("POST /kill", () => {
        it("should return 200", async () => {
            const res = await server.inject({
                method: "POST",
                url: `/kill?id=${id}`,
                headers: { "content-type": "application/json" },
                payload: { id }
            });
            expect(res.statusCode).to.equal(200);
        });

        it("should return 200 with timeout", async () => {
            const res = await server.inject({
                method: "POST",
                url: `/kill?id=${id}`,
                headers: { "content-type": "application/json" },
                payload: { id, timeout: 1000 }
            });
            expect(res.statusCode).to.equal(200);
        });

        it("should return 400", async () => {
            const res = await server.inject({
                method: "POST",
                url: "/kill",
                headers: { "content-type": "application/json" }
            });
            expect(res.statusCode).to.equal(400);
        });
    });

    describe("GET /pid", () => {
        it("should return 200", async () => {
            const res = await server.inject({
                method: "GET",
                url: `/pid?id=${id}`,
                headers: { "content-type": "application/json" },
                payload: { id }
            });
            expect(res.statusCode).to.equal(200);
        });

        it("should return 400", async () => {
            const res = await server.inject({
                method: "GET",
                url: "/pid",
                headers: { "content-type": "application/json" }
            });
            expect(res.statusCode).to.equal(400);
        });
    });

    describe("GET /config", () => {
        it("should return 200", async () => {
            const res = await server.inject({
                method: "GET",
                url: `/config?id=${id}`,
                headers: { "content-type": "application/json" },
                payload: { id }
            });
            expect(res.statusCode).to.equal(200);
        });

        it("should return 400", async () => {
            const res = await server.inject({
                method: "GET",
                url: "/config",
                headers: { "content-type": "application/json" }
            });
            expect(res.statusCode).to.equal(400);
        });
    });

    describe("PUT /config", () => {
        it("should return 200", async () => {
            const res = await server.inject({
                method: "PUT",
                url: `/config?id=${id}`,
                headers: { "content-type": "application/json" },
                payload: { key: "foo", value: "bar" }
            });
            expect(res.statusCode).to.equal(200);
        });

        it("should return 400", async () => {
            const res = await server.inject({
                method: "PUT",
                url: "/config",
                headers: { "content-type": "application/json" }
            });
            expect(res.statusCode).to.equal(400);
        });
    });
});
