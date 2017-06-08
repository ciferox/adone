import * as helpers from "../helpers";

describe("net", "http", "server", "context", "onerror(err)", () => {
    const { net: { http: { server: { Server } } } } = adone;
    const { context } = helpers;

    it("should respond", async () => {
        const server = new Server();

        server.use((ctx) => {
            ctx.body = "something else";

            ctx.throw(418, "boom");
        });

        await request(server)
            .get("/")
            .expectStatus(418)
            .expectHeader("Content-Type", "text/plain; charset=utf-8")
            .expectHeader("Content-Length", "4");
    });

    it("should unset all headers", async () => {
        const server = new Server();

        server.use((ctx) => {
            ctx.set("Vary", "Accept-Encoding");
            ctx.set("X-CSRF-Token", "asdf");
            ctx.body = "response";

            ctx.throw(418, "boom");
        });

        await request(server)
            .get("/")
            .expectStatus(418)
            .expectHeader("Content-Type", "text/plain; charset=utf-8")
            .expectHeader("Content-Length", "4")
            .expect((response) => {
                expect(response.headers).not.to.have.property("vary");
                expect(response.headers).not.to.have.property("x-csrf-token");
            });
    });

    it("should set headers specified in the error", async () => {
        const server = new Server();

        server.use((ctx) => {
            ctx.set("Vary", "Accept-Encoding");
            ctx.set("X-CSRF-Token", "asdf");
            ctx.body = "response";

            throw Object.assign(new Error("boom"), {
                status: 418,
                expose: true,
                headers: {
                    "X-New-Header": "Value"
                }
            });
        });

        await request(server)
            .get("/")
            .expectStatus(418)
            .expectHeader("Content-Type", "text/plain; charset=utf-8")
            .expectHeader("X-New-Header", "Value")
            .expect((response) => {
                expect(response.headers).not.to.have.property("vary");
                expect(response.headers).not.to.have.property("x-csrf-token");
            });
    });

    it("should ignore error after headerSent", async () => {
        const server = new Server();

        let err = new Promise((resolve) => server.once("error", (err, ctx) => {
            ctx.res.end();
            resolve(err);
        }));

        server.use(async (ctx) => {
            ctx.status = 200;
            ctx.set("X-Foo", "Bar");
            ctx.flushHeaders();
            await Promise.reject(new Error("mock error"));
            ctx.body = "response";
        });

        await request(server)
            .get("/")
            .expectHeader("X-Foo", "Bar")
            .expectStatus(200);

        err = await err;
        expect(err.message).to.be.equal("mock error");
        expect(err.headerSent).to.be.true;
    });

    describe("when invalid err.status", () => {
        describe("not number", () => {
            it("should respond 500", async () => {
                const server = new Server();

                server.use((ctx) => {
                    ctx.body = "something else";
                    const err = new Error("some error");
                    err.status = "notnumber";
                    throw err;
                });

                await request(server)
                    .get("/")
                    .expectStatus(500)
                    .expectHeader("Content-Type", "text/plain; charset=utf-8")
                    .expectBody("Internal Server Error");
            });
        });

        describe("not http status code", () => {
            it("should respond 500", async () => {
                const server = new Server();

                server.use((ctx) => {
                    ctx.body = "something else";
                    const err = new Error("some error");
                    err.status = 9999;
                    throw err;
                });

                await request(server)
                    .get("/")
                    .expectStatus(500)
                    .expectHeader("Content-Type", "text/plain; charset=utf-8")
                    .expectBody("Internal Server Error");
            });
        });
    });

    describe("when non-error thrown", () => {
        it("should response non-error thrown message", async () => {
            const server = new Server();

            server.use(() => {
                throw "string error";  // eslint-disable-line no-throw-literal
            });

            await request(server)
                .get("/")
                .expectStatus(500)
                .expectHeader("Content-Type", "text/plain; charset=utf-8")
                .expectBody("Internal Server Error");
        });

        it("should use res.getHeaderNames() accessor", () => {
            let removed = 0;
            const ctx = context();

            ctx.server.emit = adone.noop;
            ctx.res = {
                getHeaderNames: () => ["content-type", "content-length"],
                removeHeader: () => removed++,
                end: adone.noop,
                emit: adone.noop
            };

            ctx.onerror(new Error("error"));

            assert.equal(removed, 2);
        });
    });
});
