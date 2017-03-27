describe("glosses", "net", "http", "server", "middlewares", "favicon()", () => {
    const { fs, net: { http: { server: { Server, middleware: { favicon } } } }, std: { path: { join } } } = adone;

    const path = join(__dirname, "fixtures", "favicon.ico");

    it("should only respond on /favicon.ico", async () => {
        const server = new Server();

        server.use(favicon(path));

        server.use((ctx) => {
            assert(!ctx.body);
            assert(!ctx.get("Content-Type"));
            ctx.body = "hello";
        });

        await request(server)
            .get("/")
            .expectBody("hello");
    });

    it("should only respond on /favicon.ico if `path` is missing", async () => {
        const server = new Server();

        server.use(favicon());

        server.use((ctx) => {
            assert(!ctx.body);
            assert(!ctx.get("Content-Type"));

            ctx.body = "hello";
        });

        await request(server)
            .get("/")
            .expectBody("hello");
    });

    it("should 404 if `path` is missing", async () => {
        const server = new Server();
        server.use(favicon());

        await request(server)
            .post("/favicon.ico")
            .expectStatus(404);
    });

    it("should accept OPTIONS requests", async () => {
        const server = new Server();
        server.use(favicon(path));

        await request(server)
            .options("/favicon.ico")
            .expectHeader("Allow", "GET, HEAD, OPTIONS")
            .expectStatus(200);
    });

    it("should not accept POST requests", async () => {
        const server = new Server();
        server.use(favicon(path));

        await request(server)
            .post("/favicon.ico")
            .expectHeader("Allow", "GET, HEAD, OPTIONS")
            .expectStatus(405);
    });

    it("should send the favicon", async () => {
        const body = await fs.readFile(path);

        const server = new Server();
        server.use(favicon(path));

        await request(server)
            .get("/favicon.ico")
            .expectHeader("Content-Type", "image/x-icon")
            .expectStatus(200)
            .expectBody(body);
    });

    it("should set cache-control headers", async () => {
        const server = new Server();
        server.use(favicon(path));

        await request(server)
            .get("/favicon.ico")
            .expectHeader("Cache-Control", "public, max-age=86400")
            .expectStatus(200);
    });

    describe("options.maxAge", () => {
        it("should set max-age", async () => {
            const server = new Server();
            server.use(favicon(path, { maxAge: 5000 }));

            await request(server)
                .get("/favicon.ico")
                .expectHeader("Cache-Control", "public, max-age=5")
                .expectStatus(200);
        });

        it("should accept 0", async () => {
            const server = new Server();
            server.use(favicon(path, { maxAge: 0 }));

            await request(server)
                .get("/favicon.ico")
                .expectHeader("Cache-Control", "public, max-age=0")
                .expectStatus(200);
        });

        it("should be valid delta-seconds", async () => {
            const server = new Server();
            server.use(favicon(path, { maxAge: 1234 }));

            await request(server)
                .get("/favicon.ico")
                .expectHeader("Cache-Control", "public, max-age=1")
                .expectStatus(200);
        });

        it("should floor at 0", async () => {
            const server = new Server();
            server.use(favicon(path, { maxAge: -4000 }));

            await request(server)
                .get("/favicon.ico")
                .expectHeader("Cache-Control", "public, max-age=0")
                .expectStatus(200);
        });

        it("should ceil at 31556926", async () => {
            const server = new Server();
            server.use(favicon(path, { maxAge: 900000000000 }));

            await request(server)
                .get("/favicon.ico")
                .expectHeader("Cache-Control", "public, max-age=31556926")
                .expectStatus(200);
        });

        it("should accept Infinity", async () => {
            const server = new Server();
            server.use(favicon(path, { maxAge: Infinity }));

            await request(server)
                .get("/favicon.ico")
                .expectHeader("Cache-Control", "public, max-age=31556926")
                .expectStatus(200);
        });
    });
});
