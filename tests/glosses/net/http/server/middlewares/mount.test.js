describe("glosses", "net", "http", "server", "middlewares", "mount", () => {
    const { net: { http: { Server } } } = adone;
    const { middleware: { mount } } = Server;

    it("should mount middleware", async () => {
        const server = new Server();

        server.use(mount("/hello", (ctx) => {
            ctx.body = "hello";
        }));

        await request(server).get("/hello").expectBody("hello");
    });

    it("should mount multiple middlewares", async () => {
        const server = new Server();

        server.use(mount("/hello", [(ctx, next) => {
            ctx.body = "hello";
            return next();
        }, (ctx, next) => {
            ctx.body += " world";
            return next();
        }, (ctx) => {
            ctx.body += "!";
        }, (ctx) => {
            ctx.body = "unreachable";
        }]));

        await request(server).get("/hello").expectBody("hello world!");
    });

    it("should continue chain", async () => {
        const server = new Server();

        server.use(mount("/hello", (ctx, next) => {
            expect(ctx.path).to.be.equal("/world");
            ctx.body = "hello";
            return next();
        })).use((ctx) => {
            ctx.body += " world!";
        });

        await request(server).get("/hello/world").expectBody("hello world!");
    });

    it("should return the control back", async () => {
        const server = new Server();

        server.use(async (ctx, next) => {
            ctx.body = "<b>";
            await next();
            ctx.body += "</b>";
        }).use(mount("/hello", (ctx, next) => {
            expect(ctx.path).to.be.equal("/world");
            ctx.body += "hello";
            return next();
        })).use((ctx) => {
            ctx.body += " world!";
        });

        await request(server).get("/hello/world").expectBody("<b>hello world!</b>");
    });

    it("should change ctx.path to the relative one", async () => {
        const server = new Server();

        server.use(mount("/hello", (ctx) => {
            expect(ctx.path).to.be.equal("/world");
            ctx.body = "hello";
        }));

        await request(server).get("/hello/world").expectBody("hello");
    });

    it("should change ctx.path for the entire chain", async () => {
        const server = new Server();

        server.use(mount("/hello", [(ctx, next) => {
            expect(ctx.path).to.be.equal("/world");
            ctx.body = "hello";
            return next();
        }, (ctx) => {
            expect(ctx.path).to.be.equal("/world");
            ctx.body += " world!";
        }]));

        await request(server).get("/hello/world").expectBody("hello world!");
    });

    it("should change it back when the chain ends", async () => {
        const server = new Server();

        server.use(mount("/hello", (ctx, next) => {
            expect(ctx.path).to.be.equal("/world");
            ctx.body = "hello";
            return next();
        })).use((ctx) => {
            expect(ctx.path).to.be.equal("/hello/world");
            ctx.body += " world!";
        });

        await request(server).get("/hello/world").expectBody("hello world!");
    });

    it("should change it back when it returns the control", async () => {
        const server = new Server();

        server.use(async (ctx, next) => {
            ctx.body = "<b>";
            await next();
            expect(ctx.path).to.be.equal("/hello/world");
            ctx.body += "</b>";
        }).use(mount("/hello", (ctx, next) => {
            expect(ctx.path).to.be.equal("/world");
            ctx.body += "hello";
            return next();
        })).use((ctx) => {
            expect(ctx.path).to.be.equal("/hello/world");
            ctx.body += " world!";
        });

        await request(server).get("/hello/world").expectBody("<b>hello world!</b>");
    });

    it("should call next if doesnt match", async () => {
        const server = new Server();

        server.use(mount("/hello", (ctx, next) => {
            expect(ctx.path).to.be.equal("/world");
            ctx.body = "hello";
            return next();
        })).use((ctx) => {
            ctx.body = ctx.body || "i am alive!";
        });

        await request(server).get("/").expectBody("i am alive!");
    });

    it("should set ctx.path = / in case of exact matching", async () => {
        const server = new Server();

        server.use(mount("/hello", (ctx, next) => {
            expect(ctx.path).to.be.equal("/");
            ctx.body = "hello";
            return next();
        }));

        await request(server).get("/hello").expectBody("hello");
    });

    it("should not match prefixes", async () => {
        const server = new Server();

        server.use(mount("/hello", (ctx, next) => {
            expect(ctx.path).to.be.equal("/world");
            ctx.body = "hello";
            return next();
        })).use((ctx) => {
            ctx.body = ctx.body || "i am alive!";
        });

        await request(server).get("/helloworld").expectBody("i am alive!");
    });

    context("trailing slash", () => {
        it("should support", async () => {
            const server = new Server();

            server.use(mount("/hello/", (ctx, next) => {
                expect(ctx.path).to.be.equal("/123");
                ctx.body = "hello";
                return next();
            }));

            await request(server).get("/hello/123").expectBody("hello");
        });

        it("should not match paths without it", async () => {
            const server = new Server();

            server.use(mount("/hello/", (ctx, next) => {
                expect(ctx.path).to.be.equal("/123");
                ctx.body = "hello";
                return next();
            })).use((ctx) => {
                ctx.body = "i am alive!";
            });

            await request(server).get("/hello").expectBody("i am alive!");
        });
    });
});
