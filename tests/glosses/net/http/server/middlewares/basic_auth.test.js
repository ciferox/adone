describe("net", "http", "server", "middlewares", "basic auth", () => {
    const { net: { http: { server: { Server, middleware: { basicAuth } } } } } = adone;

    it("should throw if no verifier function and creds", () => {
        expect(basicAuth).to.throw("verify function or creds are required");
    });

    it("should throw if creds without name or pass", () => {
        expect(() => {
            basicAuth({});
        }).to.throw("name and pass are required");

        expect(() => {
            basicAuth({ name: "hello" });
        }).to.throw("name and pass are required");

        expect(() => {
            basicAuth({ pass: "hello" });
        }).to.throw("name and pass are required");
    });

    it("should send 401 if no creds", async () => {
        const server = new Server();
        server
            .use(basicAuth({ name: "admin", pass: "admin" }))
            .use((ctx) => ctx.body = "hello");

        await request(server)
            .get("/")
            .expectStatus(401);
    });

    it("should send 401 if wrong creds", async () => {
        const server = new Server();
        server
            .use(basicAuth({ name: "admin", pass: "admin" }))
            .use((ctx) => ctx.body = "hello");

        await request(server)
            .get("/")
            .auth("admin", "sorry")
            .expectStatus(401);
    });

    it('should send "Unauthorized" message by default', async () => {
        const server = new Server();
        server
            .use(basicAuth({ name: "admin", pass: "admin" }))
            .use((ctx) => ctx.body = "hello");

        await request(server)
            .get("/")
            .auth("admin", "sorry")
            .expectStatus(401, "Unauthorized");
    });

    it("should send a custom message for 401", async () => {
        const server = new Server();
        server
            .use(basicAuth({ name: "admin", pass: "admin", message: "That is where you are wrong" }))
            .use((ctx) => ctx.body = "hello");

        await request(server)
            .get("/")
            .auth("admin", "sorry")
            .expectStatus(401, "That is where you are wrong");
    });

    it("should send www-authenticate header", async () => {
        const server = new Server();
        server
            .use(basicAuth({ name: "admin", pass: "admin" }))
            .use((ctx) => ctx.body = "hello");

        await request(server)
            .get("/")
            .auth("admin", "sorry")
            .expectStatus(401)
            .expectHeader("WWW-Authenticate", "Basic");
    });

    it("should send www-authenticate header with a realm", async () => {
        const server = new Server();
        server
            .use(basicAuth({ name: "admin", pass: "admin", realm: "wtf" }))
            .use((ctx) => ctx.body = "hello");

        await request(server)
            .get("/")
            .auth("admin", "sorry")
            .expectStatus(401)
            .expectHeader("WWW-Authenticate", 'Basic realm="wtf"');
    });

    it("should not send www-authenticate header if sendAuthenticate = false", async () => {
        const server = new Server();
        server
            .use(basicAuth({ name: "admin", pass: "admin", sendAuthenticate: false }))
            .use((ctx) => ctx.body = "hello");

        await request(server)
            .get("/")
            .auth("admin", "sorry")
            .expectStatus(401)
            .expectNoHeader("WWW-Authenticate");
    });

    it("should be ok if creds are ok", async () => {
        const server = new Server();
        server
            .use(basicAuth({ name: "admin", pass: "admin" }))
            .use((ctx) => ctx.body = "hello");

        await request(server)
            .get("/")
            .auth("admin", "admin")
            .expectStatus(200)
            .expectBody("hello");
    });
});
