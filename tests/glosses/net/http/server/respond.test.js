describe("net", "http", "server", "respond", () => {
    const { fs, net: { http: { server: { Server, helper: { status } } } } } = adone;

    describe("when ctx.respond === false", () => {
        it("should function (ctx)", async () => {
            const server = new Server();

            server.use((ctx) => {
                ctx.body = "Hello";
                ctx.respond = false;

                const res = ctx.res;
                res.statusCode = 200;
                setImmediate(() => {
                    res.setHeader("Content-Type", "text/plain");
                    res.end("lol");
                });
            });

            await request(server)
                .get("/")
                .expectStatus(200)
                .expectBody("lol");
        });
    });

    describe("when this.type === null", () => {
        it("should not send Content-Type header", async () => {
            const server = new Server();

            server.use((ctx) => {
                ctx.body = "";
                ctx.type = null;
            });

            await request(server)
                .get("/")
                .expectStatus(200)
                .expect((res) => {
                    expect(res.headers).not.to.have.property("content-type");
                });
        });
    });

    describe("when HEAD is used", () => {
        it("should not respond with the body", async () => {
            const server = new Server();

            server.use((ctx) => {
                ctx.body = "Hello";
            });

            await request(server)
                .head("/")
                .expectStatus(200)
                .expectHeader("Content-Type", "text/plain; charset=utf-8")
                .expectHeader("Content-Length", "5")
                .expectEmptyBody();
        });

        it("should keep json headers", async () => {
            const server = new Server();

            server.use((ctx) => {
                ctx.body = { hello: "world" };
            });

            await request(server)
                .head("/")
                .expectStatus(200)
                .expectHeader("Content-Type", "application/json; charset=utf-8")
                .expectHeader("Content-Length", "17")
                .expectEmptyBody();
        });

        it("should keep string headers", async () => {
            const server = new Server();

            server.use((ctx) => {
                ctx.body = "hello world";
            });

            await request(server)
                .head("/")
                .expectStatus(200)
                .expectHeader("Content-Type", "text/plain; charset=utf-8")
                .expectHeader("Content-Length", "11")
                .expectEmptyBody();
        });

        it("should keep buffer headers", async () => {
            const server = new Server();

            server.use((ctx) => {
                ctx.body = Buffer.from("hello world");
            });

            await request(server)
                .head("/")
                .expectStatus(200)
                .expectHeader("Content-Type", "application/octet-stream")
                .expectHeader("Content-Length", "11")
                .expectEmptyBody();
        });

        it("should respond with a 404 if no body was set", async () => {
            const server = new Server();

            server.use(adone.noop);

            await request(server)
                .head("/")
                .expectStatus(404);
        });

        it('should respond with a 200 if body = ""', async () => {
            const server = new Server();

            server.use((ctx) => {
                ctx.body = "";
            });

            await request(server)
                .head("/")
                .expectStatus(200);
        });

        it("should not overwrite the content-type", async () => {
            const server = new Server();

            server.use((ctx) => {
                ctx.status = 200;
                ctx.type = "application/javascript";
            });

            await request(server)
                .head("/")
                .expectStatus(200)
                .expectHeader("Content-Type", /application\/javascript/);
        });
    });

    describe("when no middleware are present", () => {
        it("should 404", async () => {
            const server = new Server();

            await request(server)
                .get("/")
                .expectStatus(404);
        });
    });

    describe("when res has already been written to", () => {
        it("should not cause an app error", async () => {
            const server = new Server();

            server.use((ctx) => {
                const res = ctx.res;
                ctx.status = 200;
                res.setHeader("Content-Type", "text/html");
                res.write("Hello");
                setTimeout(() => res.end("Goodbye"), 0);
            });

            let errorCaught = false;

            server.on("error", (err) => errorCaught = err);

            await request(server)
                .get("/")
                .expectStatus(200);
            if (errorCaught) {
                throw errorCaught;
            }
        });

        it("should send the right body", async () => {
            const server = new Server();

            server.use((ctx) => {
                const res = ctx.res;
                ctx.status = 200;
                res.setHeader("Content-Type", "text/html");
                res.write("Hello");
                return new Promise((resolve) => {
                    setTimeout(() => {
                        res.end("Goodbye");
                        resolve();
                    }, 0);
                });
            });

            await request(server)
                .get("/")
                .expectStatus(200)
                .expectBody("HelloGoodbye");
        });
    });

    describe("when .body is missing", () => {
        describe("with status=400", () => {
            it("should respond with the associated status message", async () => {
                const server = new Server();

                server.use((ctx) => {
                    ctx.status = 400;
                });

                await request(server)
                    .get("/")
                    .expectStatus(400)
                    .expectHeader("Content-Length", 11)
                    .expectBody("Bad Request");
            });
        });

        describe("with status=204", () => {
            it("should respond without a body", async () => {
                const server = new Server();

                server.use((ctx) => {
                    ctx.status = 204;
                });

                await request(server)
                    .get("/")
                    .expectStatus(204)
                    .expectEmptyBody()
                    .expectNoHeader("Content-Type");
            });
        });

        describe("with status=205", () => {
            it("should respond without a body", async () => {
                const server = new Server();

                server.use((ctx) => {
                    ctx.status = 205;
                });

                await request(server)
                    .get("/")
                    .expectStatus(205)
                    .expectEmptyBody()
                    .expectNoHeader("Content-Type");
            });
        });

        describe("with status=304", () => {
            it("should respond without a body", async () => {
                const server = new Server();

                server.use((ctx) => {
                    ctx.status = 304;
                });

                await request(server)
                    .get("/")
                    .expectStatus(304)
                    .expectEmptyBody()
                    .expectNoHeader("Content-Type");
            });
        });

        describe("with custom status=700", () => {
            before(() => {
                status.codes.set(700, "custom status");
            });

            after(() => {
                status.codes.delete(700);
            });

            it("should respond with the associated status message", async () => {
                const server = new Server();

                server.use((ctx) => {
                    ctx.status = 700;
                });

                await request(server)
                    .get("/")
                    .expectStatus(700, "custom status")
                    .expectBody("custom status");
            });
        });

        describe("with custom statusMessage=ok", () => {
            it("should respond with the custom status message", async () => {
                const server = new Server();

                server.use((ctx) => {
                    ctx.status = 200;
                    ctx.message = "ok";
                });

                await request(server)
                    .get("/")
                    .expectStatus(200, "ok")
                    .expectBody("ok");
            });
        });

        describe("with custom status without message", () => {
            it("should respond with the status code number", async () => {
                const server = new Server();

                server.use((ctx) => {
                    ctx.res.statusCode = 701;
                });

                await request(server)
                    .get("/")
                    .expectStatus(701)
                    .expectBody("701");
            });
        });
    });

    describe("when .body is a null", () => {
        it("should respond 204 by default", async () => {
            const server = new Server();

            server.use((ctx) => {
                ctx.body = null;
            });

            await request(server)
                .get("/")
                .expectStatus(204)
                .expectEmptyBody()
                .expectNoHeader("Content-Type");
        });

        it("should respond 204 with status=200", async () => {
            const server = new Server();

            server.use((ctx) => {
                ctx.status = 200;
                ctx.body = null;
            });

            await request(server)
                .get("/")
                .expectStatus(204)
                .expectEmptyBody()
                .expectNoHeader("Content-Type");
        });

        it("should respond 205 with status=205", async () => {
            const server = new Server();

            server.use((ctx) => {
                ctx.status = 205;
                ctx.body = null;
            });

            await request(server)
                .get("/")
                .expectStatus(205)
                .expectEmptyBody()
                .expectNoHeader("Content-Type");
        });

        it("should respond 304 with status=304", async () => {
            const server = new Server();

            server.use((ctx) => {
                ctx.status = 304;
                ctx.body = null;
            });

            await request(server)
                .get("/")
                .expectStatus(304)
                .expectEmptyBody()
                .expectNoHeader("Content-Type");
        });
    });

    describe("when .body is a string", () => {
        it("should respond", async () => {
            const server = new Server();

            server.use((ctx) => {
                ctx.body = "Hello";
            });

            await request(server)
                .get("/")
                .expectBody("Hello");
        });
    });

    describe("when .body is a Buffer", () => {
        it("should respond", async () => {
            const server = new Server();

            server.use((ctx) => {
                ctx.body = Buffer.from("Hello");
            });

            await request(server)
                .get("/")
                .expectBody("Hello");
        });
    });

    describe("when .body is a Stream", () => {
        it("should respond", async () => {
            const server = new Server();
            let stream = null;

            server.use((ctx) => {
                ctx.body = stream = fs.createReadStream(__filename);
                ctx.set("Content-Type", "application/json; charset=utf-8");
            });

            try {
                await request(server)
                    .get("/")
                    .expectHeader("Content-Type", "application/json; charset=utf-8")
                    .expectBody(await fs.readFile(__filename));
            } finally {
                if (stream) {
                    stream.destroy();
                }
            }
        });

        it("should strip content-length when overwriting", async () => {
            const server = new Server();
            let stream = null;

            server.use((ctx) => {
                ctx.body = "hello";
                ctx.body = stream = fs.createReadStream(__filename);
                ctx.set("Content-Type", "application/json; charset=utf-8");
            });

            try {
                await request(server)
                    .get("/")
                    .expectHeader("Content-Type", "application/json; charset=utf-8")
                    .expectNoHeader("Content-Length")
                    .expectBody(await fs.readFile(__filename));
            } finally {
                if (stream) {
                    stream.destroy();
                }
            }
        });

        it("should keep content-length if not overwritten", async () => {
            const server = new Server();
            let stream = null;

            server.use((ctx) => {
                ctx.length = fs.readFileSync(__filename).length;
                ctx.body = stream = fs.createReadStream(__filename);
                ctx.set("Content-Type", "application/json; charset=utf-8");
            });

            try {
                await request(server)
                    .get("/")
                    .expectHeader("Content-Type", "application/json; charset=utf-8")
                    .expectHeaderExists("Content-Length")
                    .expectBody(await fs.readFile(__filename));
            } finally {
                if (stream) {
                    stream.destroy();
                }
            }
        });

        it("should keep content-length if overwritten with the same stream", async () => {
            const server = new Server();
            let stream = null;

            server.use((ctx) => {
                ctx.length = fs.readFileSync(__filename).length;
                stream = fs.createReadStream(__filename);
                ctx.body = stream;
                ctx.body = stream;
                ctx.set("Content-Type", "application/json; charset=utf-8");
            });

            try {
                await request(server)
                    .get("/")
                    .expectHeader("Content-Type", "application/json; charset=utf-8")
                    .expectHeaderExists("Content-Length")
                    .expectBody(await fs.readFile(__filename));
            } finally {
                if (stream) {
                    stream.destroy();
                }
            }
        });

        it("should handle errors", async () => {
            const server = new Server();

            server.use((ctx) => {
                ctx.set("Content-Type", "application/json; charset=utf-8");
                ctx.body = fs.createReadStream("does not exist");
            });

            await request(server)
                .get("/")
                .expectHeader("Content-Type", "text/plain; charset=utf-8")
                .expectStatus(404);
        });

        it("should handle errors when no content status", async () => {
            const server = new Server();

            server.use((ctx) => {
                ctx.status = 204;
                ctx.body = fs.createReadStream("does not exist");
            });

            await request(server)
                .get("/")
                .expectStatus(204);
        });

        it("should handle all intermediate stream body errors", async () => {
            const server = new Server();

            server.use((ctx) => {
                ctx.body = fs.createReadStream("does not exist");
                ctx.body = fs.createReadStream("does not exist");
                ctx.body = fs.createReadStream("does not exist");
            });

            await request(server)
                .get("/")
                .expectStatus(404);
        });
    });

    describe("when .body is an Object", () => {
        it("should respond with json", async () => {
            const server = new Server();

            server.use((ctx) => {
                ctx.body = { hello: "world" };
            });

            await request(server)
                .get("/")
                .expectHeader("Content-Type", "application/json; charset=utf-8")
                .expectBody({ hello: "world" });
        });
    });

    describe("when an error occurs", () => {
        it('should emit "error" on the app', async () => {
            const server = new Server();

            server.use(() => {
                throw new Error("boom");
            });

            let err = new Promise((resolve) => server.once("error", resolve));

            await request(server).get("/");
            err = await err;
            expect(err.message).to.be.equal("boom");
        });

        describe("with an .expose property", () => {
            it("should expose the message", async () => {
                const server = new Server();

                server.use(() => {
                    const err = new Error("sorry!");
                    err.status = 403;
                    err.expose = true;
                    throw err;
                });

                await request(server)
                    .get("/")
                    .expectStatus(403)
                    .expectBody("sorry!");
            });
        });

        describe("with a .status property", () => {
            it("should respond with .status", async () => {
                const server = new Server();

                server.use(() => {
                    const err = new Error("s3 explodes");
                    err.status = 403;
                    throw err;
                });

                await request(server)
                    .get("/")
                    .expectStatus(403)
                    .expectBody("Forbidden");
            });
        });

        it("should respond with 500", async () => {
            const server = new Server();

            server.use(() => {
                throw new Error("boom!");
            });

            await request(server)
                .get("/")
                .expectStatus(500)
                .expectBody("Internal Server Error");
        });

        it("should be catchable", async () => {
            const server = new Server();

            server.use((ctx, next) => {
                return next().then(() => {
                    ctx.body = "Hello";
                }).catch(() => {
                    ctx.body = "Got error";
                });
            });

            server.use(() => {
                throw new Error("boom!");
            });

            await request(server)
                .get("/")
                .expectStatus(200)
                .expectBody("Got error");

        });
    });

    describe("when status and body property", () => {
        it("should 200", async () => {
            const server = new Server();

            server.use((ctx) => {
                ctx.status = 304;
                ctx.body = "hello";
                ctx.status = 200;
            });

            await request(server)
                .get("/")
                .expectStatus(200)
                .expectBody("hello");
        });

        it("should 204", async () => {
            const server = new Server();

            server.use((ctx) => {
                ctx.status = 200;
                ctx.body = "hello";
                ctx.set("content-type", "text/plain; charset=utf8");
                ctx.status = 204;
            });

            await request(server)
                .get("/")
                .expectStatus(204)
                .expectNoHeader("Content-Type");
        });
    });
});
