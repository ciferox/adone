import * as helpers from "../helpers";

describe("glosses", "net", "http", "server", "response", "flush headers", () => {
    const { net: { http: { server: { Server } } }, std: { stream: { PassThrough }, http } } = adone;
    const { response } = helpers;

    describe("get", () => {
        it("should return etag", () => {
            const res = response();
            res.etag = '"asdf"';
            expect(res.etag).to.be.equal('"asdf"');
        });
    });

    it("should set headersSent", async () => {
        const server = new Server();

        server.use((ctx) => {
            ctx.body = "Body";
            ctx.status = 200;
            ctx.flushHeaders();
            assert(ctx.res.headersSent);
        });

        await request(server)
            .get("/")
            .expectStatus(200)
            .expectBody("Body");
    });

    it("should allow a response afterwards", async () => {
        const server = new Server();

        server.use((ctx) => {
            ctx.status = 200;
            ctx.res.setHeader("Content-Type", "text/plain");
            ctx.flushHeaders();
            ctx.body = "Body";
        });

        await request(server)
            .get("/")
            .expectStatus(200)
            .expectHeader("Content-Type", "text/plain")
            .expectBody("Body");
    });

    it("should send the correct status code", async () => {
        const server = new Server();

        server.use((ctx) => {
            ctx.status = 401;
            ctx.res.setHeader("Content-Type", "text/plain");
            ctx.flushHeaders();
            ctx.body = "Body";
        });

        await request(server)
            .get("/")
            .expectStatus(401)
            .expectHeader("Content-Type", "text/plain")
            .expectBody("Body");
    });

    it("should fail to set the headers after flushHeaders", async () => {
        const server = new Server();

        server.use((ctx) => {
            ctx.status = 401;
            ctx.res.setHeader("Content-Type", "text/plain");
            ctx.flushHeaders();
            ctx.body = "";
            try {
                ctx.set("X-Shouldnt-Work", "Value");
            } catch (err) {
                ctx.body += "ctx.set fail ";
            }
            try {
                ctx.status = 200;
            } catch (err) {
                ctx.body += "ctx.status fail ";
            }
            try {
                ctx.length = 10;
            } catch (err) {
                ctx.body += "ctx.length fail";
            }
        });

        await request(server)
            .get("/")
            .expectStatus(401)
            .expectHeader("Content-Type", "text/plain")
            .expect((response) => {
                assert(response.headers["x-shouldnt-work"] === undefined, "header set after flushHeaders");
            });
    });

    it("should flush headers first and delay to send data", (done) => {
        const server = new Server();

        server.use((ctx) => {
            ctx.type = "json";
            ctx.status = 200;
            ctx.headers.Link = "</css/mycss.css>; as=style; rel=preload, <https://img.craftflair.com>; rel=preconnect; crossorigin";
            const stream = ctx.body = new PassThrough();
            ctx.flushHeaders();

            setTimeout(() => {
                stream.end(JSON.stringify({ message: "hello!" }));
            }, 3500);
        });

        const httpServer = server.bind(function onListen(err) {
            if (err) {
                return done(err);
            }

            const port = this.address().port;

            http.request({
                port
            }).on("response", (res) => {
                const onData = () => {
                    httpServer.close();
                    done(new Error("boom"));
                };
                res.on("data", onData);

                // shouldn't receive any data for a while
                setTimeout(() => {
                    res.removeListener("data", onData);
                    httpServer.close();
                    done();
                }, 1000);
            }).on("error", (err) => {
                httpServer.close();
                done(err);
            }).end();
        });
    });
});
