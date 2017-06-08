const { net: { http: { server: { Server, middleware: { rewrite } } } } } = adone;

const differentPathHelper = (ctx, next) => {
    const orig = ctx.path;
    return next().then(() => {
        if (orig !== ctx.path) {
            ctx.throw(`${ctx.path} not equal to original path ${orig}`);
        }
    });
};

describe("net", "http", "server", "middlewares", "rewrite", () => {
    it("rewrite /^\/i(\w+)/ -> /items/$1", async () => {
        const server = new Server();
        server.use(differentPathHelper);
        server.use(rewrite(/^\/i(\w+)/, "/items/$1"));
        server.use((ctx) => {
            ctx.body = ctx.path;
        });

        await request(server).get("/i124").expectBody("/items/124");
    });

    it("rewrite /:src..:dst -> /commits/$1/to/$2", async () => {
        const server = new Server();
        server.use(differentPathHelper);
        server.use(rewrite("/:src..:dst", "/commits/$1/to/$2"));
        server.use((ctx) => {
            ctx.body = ctx.path;
        });

        await request(server).get("/foo..bar").expectBody("/commits/foo/to/bar");
    });

    it("rewrite /:src..:dst -> /commits/:src/to/:dst", async () => {
        const server = new Server();
        server.use(differentPathHelper);
        server.use(rewrite("/:src..:dst", "/commits/:src/to/:dst"));
        server.use((ctx) => {
            ctx.body = ctx.path;
        });

        await request(server).get("/foo..bar").expectBody("/commits/foo/to/bar");
    });

    it("rewrite /js/* -> /public/assets/js/$1", async () => {
        const server = new Server();
        server.use(differentPathHelper);
        server.use(rewrite("/js/*", "/public/assets/js/$1"));
        server.use((ctx) => {
            ctx.body = ctx.path;
        });

        await request(server).get("/js/jquery.js").expectBody("/public/assets/js/jquery.js");
    });

    it("rewrite /one/:arg -> /two?arg=:arg", async () => {
        const server = new Server();
        server.use(differentPathHelper);
        server.use(rewrite("/one/:arg", "/two?arg=:arg"));
        server.use((ctx) => {
            ctx.body = ctx.url;
        });

        await request(server).get("/one/test").expectBody("/two?arg=test");
    });

    it("rewrite /one/:arg1/two:arg2 -> /one/two?arg1=:arg1&arg2=:arg2", async () => {
        const server = new Server();
        server.use(differentPathHelper);
        server.use(rewrite("/one/:arg1/two/:arg2", "/one/two?arg1=:arg1&arg2=:arg2"));
        server.use((ctx) => {
            ctx.body = ctx.url;
        });

        await request(server).get("/one/test1/two/test2").expectBody("/one/two?arg1=test1&arg2=test2");
    });
});
