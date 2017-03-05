describe("glosses", "net", "http", "helpers", "send", () => {
    const { net: { http: { Server, helper: { send } } }, std: { path } } = adone;

    const root = new FS.Directory(__dirname);
    const fixtures = root.getVirtualDirectory("fixtures");
    let _cwd = null;

    before(() => {
        _cwd = process.cwd();
        process.chdir(root.path());
    });

    after(() => {
        process.chdir(_cwd);
    });

    describe("with no .root", () => {
        describe("when the path is absolute", () => {
            it("should 404", async () => {
                const server = new Server();

                server.use(async (ctx) => {
                    await send(ctx, fixtures.getVirtualFile("hello.txt").path());
                });

                await request(server)
                    .get("/")
                    .expectStatus(404);
            });
        });

        describe("when the path is relative", () => {
            it("should 200", async () => {
                const server = new Server();

                server.use(async (ctx) => {
                    await send(ctx, "fixtures/hello.txt");
                });

                await request(server)
                    .get("/")
                    .expectStatus(200)
                    .expectBody("world");
            });
        });

        describe("when the path contains ..", () => {
            it("should 403", async () => {
                const server = new Server();

                server.use(async (ctx) => {
                    await send(ctx, "/../fixtures/hello.txt");
                });

                await request(server)
                    .get("/")
                    .expectStatus(403);
            });
        });
    });

    describe("with .root", () => {
        describe("when the path is absolute", () => {
            it("should 404", async () => {
                const server = new Server();

                server.use(async (ctx) => {
                    const opts = { root: fixtures.relativePath(root) };
                    await send(ctx, fixtures.getVirtualFile("hello.txt").path(), opts);
                });

                await request(server)
                    .get("/")
                    .expectStatus(404);
            });
        });

        describe("when the path is relative and exists", () => {
            it("should serve the file", async () => {
                const server = new Server();

                server.use(async (ctx) => {
                    const opts = { root: fixtures.relativePath(root) };
                    await send(ctx, "hello.txt", opts);
                });

                await request(server)
                    .get("/")
                    .expectStatus(200)
                    .expectBody("world");
            });
        });

        describe("when the path is relative and does not exist", () => {
            it("should 404", async () => {
                const server = new Server();

                server.use(async (ctx) => {
                    const opts = { root: fixtures.relativePath(root) };
                    await send(ctx, "something", opts);
                });

                await request(server)
                    .get("/")
                    .expectStatus(404);
            });
        });

        describe("when the path resolves above the root", () => {
            it("should 403", async () => {
                const server = new Server();

                server.use(async (ctx) => {
                    const opts = { root: "test/fixtures" };
                    await send(ctx, "../../../../../../../../etc/passwd", opts);
                });

                await request(server)
                    .get("/")
                    .expectStatus(403);
            });
        });

        describe("when the path resolves within root", () => {
            it("should 403", async () => {
                const server = new Server();

                server.use(async (ctx) => {
                    const opts = { root: fixtures.relativePath(root) };
                    await send(ctx, "../../fixtures/world/index.html", opts);
                });

                await request(server)
                    .get("/")
                    .expectStatus(403);
            });
        });
    });

    describe("with .index", () => {
        describe("when the index file is present", () => {
            it("should serve it", async () => {
                const server = new Server();

                server.use(async (ctx) => {
                    const opts = { root: __dirname, index: "index.html" };
                    await send(ctx, "fixtures/world/", opts);
                });

                await request(server)
                    .get("/")
                    .expectStatus(200)
                    .expectBody("html index");
            });

            it("should serve it", async () => {
                const server = new Server();

                server.use(async (ctx) => {
                    const opts = { root: "fixtures/world", index: "index.html" };
                    await send(ctx, ctx.path, opts);
                });

                await request(server)
                    .get("/")
                    .expectStatus(200)
                    .expectBody("html index");
            });
        });
    });

    describe("when path is not a file", () => {
        it("should 404", async () => {
            const server = new Server();

            server.use(async (ctx) => {
                await send(ctx, "/fixtures");
            });

            await request(server)
                .get("/")
                .expectStatus(404);
        });

        it("should return undefined if format is set to false", async () => {
            const server = new Server();

            server.use(async (ctx) => {
                const sent = await send(ctx, "/fixtures", { format: false });
                assert.equal(sent, undefined);
            });

            await request(server)
                .get("/")
                .expectStatus(404);
        });
    });

    describe("when path is a directory", () => {
        it("should 404", async () => {
            const server = new Server();

            server.use(async (ctx) => {
                await send(ctx, "/test/fixtures");
            });

            await request(server)
                .get("/")
                .expectStatus(404);
        });
    });

    describe("when path does not finish with slash and format is disabled", () => {
        it("should 404", async () => {
            const server = new Server();

            server.use(async (ctx) => {
                const opts = { root: "fixtures", index: "index.html", format: false };
                await send(ctx, "world", opts);
            });

            await request(server)
                .get("/world")
                .expectStatus(404);
        });
    });

    describe("when path does not finish with slash and format is enabled", () => {
        it("should 200", async () => {
            const server = new Server();

            server.use(async (ctx) => {
                const opts = { root: __dirname, index: "index.html" };
                await send(ctx, "fixtures/world", opts);
            });

            await request(server)
                .get("/")
                .expectHeader("Content-Type", "text/html; charset=utf-8")
                .expectHeader("Content-Length", 10)
                .expectStatus(200);
        });

        it("should 404 if no index", async () => {
            const server = new Server();

            server.use(async (ctx) => {
                const opts = { root: __dirname };
                await send(ctx, "fixtures/world", opts);
            });

            await request(server)
                .get("/")
                .expectStatus(404);
        });
    });

    describe("when path is malformed", () => {
        it("should 400", async () => {
            const server = new Server();

            server.use(async (ctx) => {
                await send(ctx, "/%");
            });

            await request(server)
                .get("/")
                .expectStatus(400);
        });
    });

    describe("when path is a file", () => {
        it("should return the path", async () => {
            const server = new Server();

            server.use(async (ctx) => {
                const p = "/fixtures/user.json";
                const sent = await send(ctx, p);
                assert.equal(sent, path.resolve(`${__dirname}/fixtures/user.json`));
            });

            await request(server)
                .get("/")
                .expectStatus(200);
        });

        describe("or .gz version when requested and if possible", () => {
            it("should return path", async () => {
                const server = new Server();

                server.use(async (ctx) => {
                    await send(ctx, "/fixtures/gzip.json");
                });

                await request(server)
                    .get("/")
                    .setHeader("Accept-Encoding", "deflate, identity")
                    .expectStatus(200)
                    .expectHeader("Content-Length", 16)
                    .expectBody({ foo: "bar" });
            });

            it("should return .gz path (gzip option defaults to true)", async () => {
                const server = new Server();

                server.use(async (ctx) => {
                    await send(ctx, "/fixtures/gzip.json");
                });

                await request(server)
                    .get("/")
                    .setHeader("Accept-Encoding", "gzip, deflate, identity")
                    .expectStatus(200)
                    .expectHeader("Content-Length", 46)
                    .expectBody({ foo: "bar" }, { decompress: true });
            });

            it("should return .gz path when gzip option is turned on", async () => {
                const server = new Server();

                server.use(async (ctx) => {
                    await send(ctx, "/fixtures/gzip.json", { gzip: true });
                });

                await request(server)
                    .get("/")
                    .setHeader("Accept-Encoding", "gzip, deflate, identity")
                    .expectHeader("Content-Length", 46)
                    .expectBody({ foo: "bar" }, { decompress: true })
                    .expectStatus(200);
            });

            it("should not return .gz path when gzip option is false", async () => {
                const server = new Server();

                server.use(async (ctx) => {
                    await send(ctx, "/fixtures/gzip.json", { gzip: false });
                });

                await request(server)
                    .get("/")
                    .setHeader("Accept-Encoding", "gzip, deflate, identity")
                    .expectHeader("Content-Length", 16)
                    .expectBody({ foo: "bar" })
                    .expectStatus(200);
            });
        });

        describe("and max age is specified", () => {
            it("should set max-age in seconds", async () => {
                const server = new Server();

                server.use(async (ctx) => {
                    const p = "/fixtures/user.json";
                    const sent = await send(ctx, p, { maxage: 5000 });
                    assert.equal(sent, path.resolve(`${__dirname}/fixtures/user.json`));
                });

                await request(server)
                    .get("/")
                    .expectHeader("Cache-Control", "max-age=5")
                    .expectStatus(200);
            });

            it("should truncate fractional values for max-age", async () => {
                const server = new Server();

                server.use(async (ctx) => {
                    const p = "/fixtures/user.json";
                    const sent = await send(ctx, p, { maxage: 1234 });
                    assert.equal(sent, path.resolve(`${__dirname}/fixtures/user.json`));
                });

                await request(server)
                    .get("/")
                    .expectHeader("Cache-Control", "max-age=1")
                    .expectStatus(200);
            });
        });
    });
    describe(".hidden option", () => {
        describe("when trying to get a hidden file", () => {
            it("should 404", async () => {
                const server = new Server();

                server.use(async (ctx) => {
                    await send(ctx, "fixtures/.hidden");
                });

                await request(server)
                    .get("/")
                    .expectStatus(404);
            });
        });

        describe("when trying to get a file from a hidden directory", () => {
            it("should 404", async () => {
                const server = new Server();

                server.use(async (ctx) => {
                    await send(ctx, "fixtures/.private/id_rsa.txt");
                });

                await request(server)
                    .get("/")
                    .expectStatus(404);
            });
        });

        describe("when trying to get a hidden file and .hidden check is turned off", () => {
            it("should 200", async () => {
                const server = new Server();

                server.use(async (ctx) => {
                    await send(ctx, "fixtures/.hidden", { hidden: true });
                });

                await request(server)
                    .get("/")
                    .expectStatus(200);
            });
        });
    });

    describe(".extensions option", () => {
        describe("when trying to get a file without extension with no .extensions sufficed", () => {
            it("should 404", async () => {
                const server = new Server();

                server.use(async (ctx) => {
                    await send(ctx, "fixtures/hello");
                });

                await request(server)
                    .get("/")
                    .expectStatus(404);
            });
        });

        describe("when trying to get a file without extension with no matching .extensions", () => {
            it("should 404", async () => {
                const server = new Server();

                server.use(async (ctx) => {
                    await send(ctx, "fixtures/hello", { extensions: ["json", "htm", "html"] });
                });

                await request(server)
                    .get("/")
                    .expectStatus(404);
            });
        });

        describe("when trying to get a file without extension with non array .extensions", () => {
            it("should 404", async () => {
                const server = new Server();

                server.use(async (ctx) => {
                    await send(ctx, "fixtures/hello", { extensions: {} });
                });

                await request(server)
                    .get("/")
                    .expectStatus(404);
            });
        });

        describe("when trying to get a file without extension with non string array .extensions", () => {
            it("throws if extensions is not array of strings", async () => {
                const server = new Server();

                server.use(async (ctx) => {
                    await send(ctx, "fixtures/hello", { extensions: [2, {}, []] });
                });

                await request(server)
                    .get("/")
                    .expectStatus(500);
            });
        });

        describe("when trying to get a file without extension with matching .extensions sufficed first matched should be sent", () => {
            it("should 200 and application/json", async () => {
                const server = new Server();

                server.use(async (ctx) => {
                    await send(ctx, "fixtures/user", { extensions: ["html", "json", "txt"] });
                });

                await request(server)
                    .get("/")
                    .expectStatus(200)
                    .expectHeader("Content-Type", /application\/json/);
            });
        });

        describe("when trying to get a file without extension with matching .extensions sufficed", () => {
            it("should 200", async () => {
                const server = new Server();

                server.use(async (ctx) => {
                    await send(ctx, "fixtures/hello", { extensions: ["txt"] });
                });

                await request(server)
                    .get("/")
                    .expectStatus(200);
            });
        });

        describe("when trying to get a file without extension with matching doted .extensions sufficed", () => {
            it("should 200", async () => {
                const server = new Server();

                server.use(async (ctx) => {
                    await send(ctx, "fixtures/hello", { extensions: [".txt"] });
                });

                await request(server)
                    .get("/")
                    .expectStatus(200);
            });
        });
    });

    it("should set the Content-Type", async () => {
        const server = new Server();

        server.use(async (ctx) => {
            await send(ctx, "/fixtures/user.json");
        });

        await request(server)
            .get("/")
            .expectHeader("Content-Type", /application\/json/);
    });

    it("should set the Content-Length", async () => {
        const server = new Server();

        server.use(async (ctx) => {
            await send(ctx, "/fixtures/user.json");
        });

        await request(server)
            .get("/")
            .expectHeader("Content-Length", 16);
    });

    it("should set Last-Modified", async () => {
        const server = new Server();

        server.use(async (ctx) => {
            await send(ctx, "/fixtures/user.json");
        });

        await request(server)
            .get("/")
            .expectHeader("Last-Modified", /GMT/);
    });

    describe("with setHeaders", () => {
        it("throws if setHeaders is not a function", async () => {
            const server = new Server();

            server.use(async (ctx) => {
                await send(ctx, "/test/fixtures/user.json", {
                    setHeaders: "foo"
                });
            });

            await request(server)
                .get("/")
                .expectStatus(500);
        });

        it("should not edit already set headers", async () => {
            const server = new Server();

            const testFilePath = "/fixtures/user.json";
            const normalizedTestFilePath = path.normalize(testFilePath);

            server.use(async (ctx) => {
                await send(ctx, testFilePath, {
                    setHeaders(res, path, stats) {
                        assert.equal(path.substr(-normalizedTestFilePath.length), normalizedTestFilePath);
                        assert.equal(stats.size, 16);
                        assert(res);

                        // these can be set
                        res.setHeader("Cache-Control", "max-age=0,must-revalidate");
                        res.setHeader("Last-Modified", "foo");
                        // this one can not
                        res.setHeader("Content-Length", 9000);
                    }
                });
            });

            await request(server)
                .get("/")
                .expectStatus(200)
                .expectHeader("Cache-Control", "max-age=0,must-revalidate")
                .expectHeader("Last-Modified", "foo")
                .expectHeader("Content-Length", 16);
        });

        it("should correctly pass through regarding usual headers", async () => {
            const server = new Server();

            server.use(async (ctx) => {
                await send(ctx, "/fixtures/user.json", {
                    setHeaders() {

                    }
                });
            });

            await request(server)
                .get("/")
                .expectStatus(200)
                .expectHeader("Cache-Control", "max-age=0")
                .expectHeader("Content-Length", 16)
                .expectHeader("Last-Modified", /GMT/);
        });
    });

    it.skip("should cleanup on socket error", async () => {  // blocks the event loop
        const server = new Server();
        let stream;

        server.use(async (ctx) => {
            await send(ctx, "/fixtures/user.json");
            stream = ctx.body;
            ctx.socket.emit("error", new Error("boom"));
        });

        const instance = server.listen(0, "127.0.0.1");
        await new Promise((resolve) => instance.once("listening", resolve));
        const err = await request(server).get("/").expectStatus(500).then(() => null, (x) => x);
        expect(err).to.be.ok;
        expect(stream.destroyed).to.be.true;
    });
});
