describe("glosses", "net", "http", "middlewares", "serve", () => {
    const { net: { http: { Server } }, std: { path: { basename } } } = adone;
    const { middleware: { serve } } = Server;

    let _cwd;

    before(() => {
        _cwd = process.cwd();
        process.chdir(__dirname);
    });

    after(() => {
        process.chdir(_cwd);
    });

    describe("when defer: false", () => {
        describe('when root = "."', () => {
            it("should serve from cwd", async () => {
                const server = new Server();

                server.use(serve("."));

                await request(server)
                    .get(`/${basename(__filename)}`)
                    .expectStatus(200);
            });
        });

        describe("when path is not a file", () => {
            it("should 404", async () => {
                const server = new Server();

                server.use(serve("fixtures"));

                await request(server)
                    .get("/something")
                    .expectStatus(404);
            });
        });

        describe("when upstream middleware responds", () => {
            it("should respond", async () => {
                const server = new Server();

                server.use(serve("fixtures"));

                server.use((ctx, next) => {
                    return next().then(() => {
                        ctx.body = "hey";
                    });
                });

                await request(server)
                    .get("/hello.txt")
                    .expectStatus(200)
                    .expectBody("world");
            });
        });

        describe("the path is valid", () => {
            it("should serve the file", async () => {
                const server = new Server();

                server.use(serve("fixtures"));

                await request(server)
                    .get("/hello.txt")
                    .expectStatus(200)
                    .expectBody("world");
            });
        });

        describe(".index", () => {
            describe("when present", () => {
                it("should alter the index file supported", async () => {
                    const server = new Server();

                    server.use(serve("fixtures", { index: "index.txt" }));

                    await request(server)
                        .get("/")
                        .expectStatus(200)
                        .expectHeader("Content-Type", "text/plain; charset=utf-8")
                        .expectBody("text index");
                });
            });

            describe("when omitted", () => {
                it("should use index.html", async () => {
                    const server = new Server();

                    server.use(serve("fixtures"));

                    await request(server)
                        .get("/world/")
                        .expectStatus(200)
                        .expectHeader("Content-Type", "text/html; charset=utf-8")
                        .expectBody("html index");
                });
            });

            describe("when disabled", () => {
                it("should not use index.html", async () => {
                    const server = new Server();

                    server.use(serve("fixtures", { index: false }));

                    await request(server)
                        .get("/world/")
                        .expectStatus(404);
                });
            });
        });

        describe("when method is not `GET` or `HEAD`", () => {
            it("should 404", async () => {
                const server = new Server();

                server.use(serve("fixtures"));

                await request(server)
                    .post("/hello.txt")
                    .expectStatus(404);
            });
        });
    });

    describe("when defer: true", () => {
        describe("when upstream middleware responds", () => {
            it("should do nothing", async () => {
                const server = new Server();

                server.use(serve("fixtures", {
                    defer: true
                }));

                server.use((ctx, next) => {
                    return next().then(() => {
                        ctx.body = "hey";
                    });
                });

                await request(server)
                    .get("/hello.txt")
                    .expectStatus(200)
                    .expectBody("hey");
            });
        });

        describe("the path is valid", () => {
            it("should serve the file", async () => {
                const server = new Server();

                server.use(serve("fixtures", {
                    defer: true
                }));

                await request(server)
                    .get("/hello.txt")
                    .expectStatus(200)
                    .expectBody("world");
            });
        });

        describe(".index", () => {
            describe("when present", () => {
                it("should alter the index file supported", async () => {
                    const server = new Server();

                    server.use(serve("fixtures", {
                        defer: true,
                        index: "index.txt"
                    }));

                    await request(server)
                        .get("/")
                        .expectStatus(200)
                        .expectHeader("Content-Type", "text/plain; charset=utf-8")
                        .expectBody("text index");
                });
            });

            describe("when omitted", () => {
                it("should use index.html", async () => {
                    const server = new Server();

                    server.use(serve("fixtures", {
                        defer: true
                    }));

                    await request(server)
                        .get("/world/")
                        .expectStatus(200)
                        .expectHeader("Content-Type", "text/html; charset=utf-8")
                        .expectBody("html index");
                });
            });
        });

        describe("when path is not a file", () => {
            it("should 404", async () => {
                const server = new Server();

                server.use(serve("fixtures", {
                    defer: true
                }));

                await request(server)
                    .get("/something")
                    .expectStatus(404);
            });
        });

        describe("it should not handle the request", () => {
            it("when status=204", async () => {
                const server = new Server();

                server.use(serve("fixtures", {
                    defer: true
                }));

                server.use((ctx) => {
                    ctx.status = 204;
                });

                await request(server)
                    .get("/something%%%/")
                    .expectStatus(204);
            });

            it('when body=""', async () => {
                const server = new Server();

                server.use(serve("fixtures", {
                    defer: true
                }));

                server.use((ctx) => {
                    ctx.body = "";
                });

                await request(server)
                    .get("/something%%%/")
                    .expectStatus(200);
            });
        });

        describe("when method is not `GET` or `HEAD`", () => {
            it("should 404", async () => {
                const server = new Server();

                server.use(serve("fixtures", {
                    defer: true
                }));

                await request(server)
                    .post("/hello.txt")
                    .expectStatus(404);
            });
        });
    });

    describe("option - format", () => {
        describe("when format: false", () => {
            it("should 404", async () => {
                const server = new Server();

                server.use(serve("fixtures", {
                    index: "index.html",
                    format: false
                }));

                await request(server)
                    .get("/world")
                    .expectStatus(404);
            });

            it("should 200", async () => {
                const server = new Server();

                server.use(serve("fixtures", {
                    index: "index.html",
                    format: false
                }));

                await request(server)
                    .get("/world/")
                    .expectStatus(200);
            });
        });

        describe("when format: true", () => {
            it("should 200", async () => {
                const server = new Server();

                server.use(serve("fixtures", {
                    index: "index.html",
                    format: true
                }));

                await request(server)
                    .get("/world")
                    .expectStatus(200);
            });

            it("should 200", async () => {
                const server = new Server();

                server.use(serve("fixtures", {
                    index: "index.html",
                    format: true
                }));

                await request(server)
                    .get("/world/")
                    .expectStatus(200);
            });
        });
    });

    describe("option - strip", () => {
        it("should stip paths", async () => {
            const server = new Server();
            server.use(serve("fixtures", {
                index: "index.html",
                format: true,
                strip: 1
            }));

            await request(server)
                .get("/123/world")
                .expectStatus(200);
        });

        it("should not strip if = 0", async () => {
            const server = new Server();
            server.use(serve("fixtures", {
                index: "index.html",
                format: true,
                strip: 0
            }));

            await request(server)
                .get("/world")
                .expectStatus(200);
        });

        it("should stop stripping if there is no more parts", async () => {
            const server = new Server();
            server.use(serve("fixtures", {
                index: "index.html",
                format: true,
                strip: 10
            }));

            await request(server)
                .get("/world")
                .expectStatus(200);
        });
    });
});
