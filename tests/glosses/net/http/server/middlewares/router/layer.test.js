describe("net", "http", "server", "middleware", "router", "Layer", () => {
    const { net: { http: { server: { Server, middleware: { router: { Router, Layer } } } } } } = adone;

    it("composes multiple callbacks/middlware", async () => {
        const server = new Server();
        const router = new Router();
        server.use(router.routes());
        router.get(
            "/:category/:title",
            (ctx, next) => {
                ctx.status = 500;
                return next();
            },
            (ctx, next) => {
                ctx.status = 204;
                return next();
            }
        );
        await request(server)
            .get("/programming/how-to-node")
            .expectStatus(204);
    });

    describe("Layer#match()", () => {
        it("captures URL path parameters", async () => {
            const server = new Server();
            const router = new Router();
            server.use(router.routes());
            router.get("/:category/:title", (ctx) => {
                expect(ctx).to.have.property("params");
                expect(ctx.params).to.be.an("object");
                expect(ctx.params).to.have.property("category", "match");
                expect(ctx.params).to.have.property("title", "this");
                ctx.status = 204;
            });
            await request(server)
                .get("/match/this")
                .expectStatus(204);
        });

        it("return orginal path parameters when decodeURIComponent throw error", async () => {
            const server = new Server();
            const router = new Router();
            server.use(router.routes());
            router.get("/:category/:title", (ctx) => {
                expect(ctx).to.have.property("params");
                expect(ctx.params).to.be.an("object");
                expect(ctx.params).to.have.property("category", "100%");
                expect(ctx.params).to.have.property("title", "101%");
                ctx.status = 204;
            });
            await request(server)
                .get("/100%/101%")
                .expectStatus(204);
        });

        it("populates ctx.captures with regexp captures", async () => {
            const server = new Server();
            const router = new Router();
            server.use(router.routes());
            router.get(/^\/api\/([^\/]+)\/?/i, (ctx, next) => {
                expect(ctx).to.have.property("captures");
                expect(ctx.captures).to.be.an("array");
                expect(ctx.captures).to.have.property(0, "1");
                return next();
            }, (ctx) => {
                expect(ctx).to.have.property("captures");
                expect(ctx.captures).to.be.an("array");
                expect(ctx.captures).to.have.property(0, "1");
                ctx.status = 204;
            });
            await request(server)
                .get("/api/1")
                .expectStatus(204);
        });

        it("return orginal ctx.captures when decodeURIComponent throw error", async () => {
            const server = new Server();
            const router = new Router();
            server.use(router.routes());
            router.get(/^\/api\/([^\/]+)\/?/i, (ctx, next) => {
                expect(ctx).to.have.property("captures");
                expect(ctx.captures).to.be.an("array");
                expect(ctx.captures).to.have.property(0, "101%");
                return next();
            }, (ctx) => {
                expect(ctx).to.have.property("captures");
                expect(ctx.captures).to.be.an("array");
                expect(ctx.captures).to.have.property(0, "101%");
                ctx.status = 204;
            });
            await request(server)
                .get("/api/101%")
                .expectStatus(204);
        });

        it("populates ctx.captures with regexp captures include undefined", async () => {
            const server = new Server();
            const router = new Router();
            server.use(router.routes());
            router.get(/^\/api(\/.+)?/i, (ctx, next) => {
                expect(ctx).to.have.property("captures");
                expect(ctx.captures).to.be.an("array");
                expect(ctx.captures).to.have.property(0, undefined);
                return next();
            }, (ctx) => {
                expect(ctx).to.have.property("captures");
                expect(ctx.captures).to.be.an("array");
                expect(ctx.captures).to.have.property(0, undefined);
                ctx.status = 204;
            });
            await request(server)
                .get("/api")
                .expectStatus(204);
        });

        it("should throw friendly error message when handle not exists", () => {
            const server = new Server();
            const router = new Router();
            server.use(router.routes());
            const notexistHandle = undefined;
            expect(() => {
                router.get("/foo", notexistHandle);
            }).to.throw("get `/foo`: `middleware` must be a function, not `undefined`");

            expect(() => {
                router.get("foo router", "/foo", notexistHandle);
            }).to.throw("get `foo router`: `middleware` must be a function, not `undefined`");

            expect(() => {
                router.post("/foo", adone.noop, notexistHandle);
            }).to.throw("post `/foo`: `middleware` must be a function, not `undefined`");
        });
    });

    describe("Layer#param()", () => {
        it("composes middleware for param fn", async () => {
            const server = new Server();
            const router = new Router();
            const route = new Layer("/users/:user", ["GET"], [(ctx) => {
                ctx.body = ctx.user;
            }]);
            route.param("user", (id, ctx, next) => {
                ctx.user = { name: "alex" };
                if (!id) {
                    return ctx.status = 404;
                }
                return next();
            });
            router.stack.push(route);
            server.use(router.routes());
            await request(server)
                .get("/users/3")
                .expectStatus(200)
                .expectBody({ name: "alex" });
        });

        it("ignores params which are not matched", async () => {
            const server = new Server();
            const router = new Router();
            const route = new Layer("/users/:user", ["GET"], [(ctx) => {
                ctx.body = ctx.user;
            }]);
            route.param("user", (id, ctx, next) => {
                ctx.user = { name: "alex" };
                if (!id) {
                    return ctx.status = 404;
                }
                return next();
            });
            route.param("title", (id, ctx, next) => {
                ctx.user = { name: "mark" };
                if (!id) {
                    return ctx.status = 404;
                }
                return next();
            });
            router.stack.push(route);
            server.use(router.routes());
            await request(server)
                .get("/users/3")
                .expectStatus(200)
                .expectBody({ name: "alex" });
        });
    });

    describe("Layer#url()", () => {
        it("generates route URL", () => {
            const route = new Layer("/:category/:title", ["get"], [function () { }], "books");
            let url = route.url({ category: "programming", title: "how-to-node" });
            expect(url).to.be.equal("/programming/how-to-node");
            url = route.url("programming", "how-to-node");
            expect(url).to.be.equal("/programming/how-to-node");
        });

        it("escapes using encodeURIComponent()", () => {
            const route = new Layer("/:category/:title", ["get"], [function () { }], "books");
            const url = route.url({ category: "programming", title: "how to node" });
            expect(url).to.be.equal("/programming/how%20to%20node");
        });
    });
});
