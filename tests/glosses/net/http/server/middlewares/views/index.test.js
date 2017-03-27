describe("glosses", "net", "http", "server", "middlewares", "views", () => {
    const { net: { http: { server: { Server, middleware: { views } } } }, templating: { nunjucks } } = adone;

    const oldCwd = process.cwd();

    before(() => {
        process.chdir(__dirname);
    });

    after(() => {
        process.chdir(oldCwd);
    });

    it("should create a nunjucks environment", () => {
        const middleware = views();
        expect(middleware.env).to.be.instanceOf(nunjucks.Environment);
    });

    it("should expose render and renderString method", async () => {
        const server = new Server();

        server.use(views());
        server.use((ctx) => {
            expect(ctx.render).to.be.a("function");
            expect(ctx.renderString).to.be.a("function");
            ctx.status = 200;
        });

        await request(server)
            .get("/")
            .expectStatus(200);
    });

    it("should render a template", async () => {
        const server = new Server();

        server.use(views("custom_views"));
        server.use((ctx) => {
            return ctx.render("index.html", { user: "John" });
        });

        await request(server)
            .get("/")
            .expectStatus(200)
            .expectBody("Hi, John!");
    });

    it("should set the default templates path to 'views'", async () => {
        const server = new Server();

        server.use(views());
        server.use(async (ctx) => {
            await ctx.render("index.html", { user: "John" });
        });

        await request(server)
            .get("/")
            .expectStatus(200)
            .expectBody("Hello, John!");
    });

    it("should render a string", async () => {
        const server = new Server();

        server.use(views());
        server.use(async (ctx) => {
            await ctx.renderString("Are you {{ user }}?", { user: "John" });
        });

        await request(server)
            .get("/")
            .expectStatus(200)
            .expectBody("Are you John?");
    });

    it("should support a custom environment", async () => {
        const server = new Server();
        const env = nunjucks.configure("custom_views");

        server.use(views(env));
        server.use(async (ctx) => {
            await ctx.render("index.html", { user: "John" });
        });

        await request(server)
            .get("/")
            .expectStatus(200)
            .expectBody("Hi, John!");
    });
});
