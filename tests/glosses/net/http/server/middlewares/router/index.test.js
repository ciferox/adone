describe("net", "http", "server", "middleware", "router", "Router", () => {
    const { std, net: { http: { server: { Server, middleware: { router: { Router, Layer } } } } }, promise } = adone;
    const methods = std.http.METHODS.map((x) => x.toLowerCase());

    it("shares context between routers", async () => {
        const server = new Server();
        const router1 = new Router();
        const router2 = new Router();
        router1.get("/", (ctx, next) => {
            ctx.foo = "bar";
            return next();
        });
        router2.get("/", (ctx, next) => {
            ctx.baz = "qux";
            ctx.body = { foo: ctx.foo };
            return next();
        });
        server.use(router1.routes()).use(router2.routes());
        await request(server)
            .get("/")
            .expectStatus(200)
            .expectBody({ foo: "bar" });
    });

    it("does not register middleware more than once", async () => {
        const server = new Server();
        const parentRouter = new Router();
        const nestedRouter = new Router();

        nestedRouter
            .get("/first-nested-route", (ctx) => {
                ctx.body = { n: ctx.n };
            })
            .get("/second-nested-route", (ctx, next) => {
                return next();
            })
            .get("/third-nested-route", (ctx, next) => {
                return next();
            });

        parentRouter.use("/parent-route", (ctx, next) => {
            ctx.n = ctx.n ? (ctx.n + 1) : 1;
            return next();
        }, nestedRouter.routes());

        server.use(parentRouter.routes());

        await request(server)
            .get("/parent-route/first-nested-route")
            .expectStatus(200)
            .expectBody({ n: 1 });
    });

    it("router can be accecced with ctx", async () => {
        const server = new Server();
        const router = new Router();
        router.get("home", "/", (ctx) => {
            ctx.body = {
                url: ctx.router.url("home")
            };
        });
        server.use(router.routes());
        await request(server)
            .get("/")
            .expectStatus(200)
            .expectBody({ url: "/" });
    });

    it("registers multiple middleware for one route", async () => {
        const server = new Server();
        const router = new Router();

        router.get("/double", (ctx, next) => {
            return new Promise((resolve) => {
                setTimeout(() => {
                    ctx.body = { message: "Hello" };
                    resolve(next());
                }, 1);
            });
        }, (ctx, next) => {
            return new Promise((resolve) => {
                setTimeout(() => {
                    ctx.body.message += " World";
                    resolve(next());
                }, 1);
            });
        }, (ctx) => {
            ctx.body.message += "!";
        });

        server.use(router.routes());

        await request(server)
            .get("/double")
            .expectStatus(200)
            .expectBody({ message: "Hello World!" });
    });

    it("registers multiple middleware for one route using an array of middlewares", async () => {
        const server = new Server();
        const router = new Router();

        router.get("/double", [
            (ctx, next) => {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        ctx.body = { message: "Hello" };
                        resolve(next());
                    }, 1);
                });
            },
            (ctx, next) => {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        ctx.body.message += " World";
                        resolve(next());
                    }, 1);
                });
            },
            (ctx) => {
                ctx.body.message += "!";
            }
        ]);

        server.use(router.routes());

        await request(server)
            .get("/double")
            .expectStatus(200)
            .expectBody({ message: "Hello World!" });
    });

    it("does not break when nested-routes use regexp paths", () => {
        const server = new Server();
        const parentRouter = new Router();
        const nestedRouter = new Router();

        nestedRouter
            .get(/^\/\w$/i, (ctx, next) => {
                return next();
            })
            .get("/first-nested-route", (ctx, next) => {
                return next();
            })
            .get("/second-nested-route", (ctx, next) => {
                return next();
            });

        parentRouter.use("/parent-route", (ctx, next) => {
            return next();
        }, nestedRouter.routes());

        server.use(parentRouter.routes());
    });

    it("exposes middleware factory", () => {
        const router = new Router();
        expect(router).to.have.property("routes");
        expect(router.routes).to.be.a("function");
        const middleware = router.routes();
        expect(middleware).to.be.a("function");
    });

    it("matches middleware if there is no matched route", async () => {
        const server = new Server();
        const router = new Router();
        const otherRouter = new Router();

        router.use((ctx, next) => {
            ctx.body = { bar: "baz" };
            return next();
        });

        otherRouter.get("/bar", (ctx) => {
            ctx.body = ctx.body || { foo: "bar" };
        });

        server.use(router.routes()).use(otherRouter.routes());

        await request(server)
            .get("/bar")
            .expectStatus(200)
            .expectBody({ foo: "bar" });
    });

    it("matches first to last", async () => {
        const server = new Server();
        const router = new Router();

        router
            .get("user_page", "/user/(.*).jsx", (ctx) => {
                ctx.body = { order: 1 };
            })
            .all("app", "/app/(.*).jsx", (ctx) => {
                ctx.body = { order: 2 };
            })
            .all("view", "(.*).jsx", (ctx) => {
                ctx.body = { order: 3 };
            });

        server.use(router.routes());

        await request(server)
            .get("/user/account.jsx")
            .expectStatus(200)
            .expectBody({ order: 1 });
    });

    it("does not run subsequent middleware without calling next", async () => {
        const server = new Server();
        const router = new Router();

        router
            .get("user_page", "/user/(.*).jsx", () => {
                // no next()
            }, (ctx) => {
                ctx.body = { order: 1 };
            });

        server.use(router.routes());

        await request(server)
            .get("/user/account.jsx")
            .expectStatus(404);
    });

    it("nests routers with prefixes at root", async () => {
        const server = new Server();
        const forums = new Router({
            prefix: "/forums"
        });
        const posts = new Router({
            prefix: "/:fid/posts"
        });

        posts
            .get("/", (ctx, next) => {
                ctx.status = 204;
                return next();
            })
            .get("/:pid", (ctx, next) => {
                ctx.body = ctx.params;
                return next();
            });

        forums.use(posts.routes());
        server.use(forums.routes());

        await request(server)
            .get("/forums/1/posts")
            .expectStatus(204);
        await request(server)
            .get("/forums/1")
            .expectStatus(404);
        request(server)
            .get("/forums/1/posts/2")
            .expectStatus(200)
            .expectBody({ fid: "1", pid: "2" });
    });

    it("nests routers with prefixes at path", async () => {
        const server = new Server();
        const api = new Router({
            prefix: "/api"
        });
        const posts = new Router({
            prefix: "/posts"
        });

        posts
            .get("/", (ctx, next) => {
                ctx.status = 204;
                return next();
            })
            .get("/:pid", (ctx, next) => {
                ctx.body = ctx.params;
                return next();
            });

        api.use("/forums/:fid", posts.routes());
        server.use(api.routes());

        await request(server)
            .get("/api/forums/1/posts")
            .expectStatus(204);

        await request(server)
            .get("/api/forums/1")
            .expectStatus(404);

        await request(server)
            .get("/api/forums/1/posts/2")
            .expectStatus(200)
            .expectBody({ fid: "1", pid: "2" });
    });

    it("runs subrouter middleware after parent", async () => {
        const server = new Server();
        const subrouter = new Router()
            .use((ctx, next) => {
                ctx.msg = "subrouter";
                return next();
            })
            .get("/", (ctx) => {
                ctx.body = { msg: ctx.msg };
            });
        const router = new Router()
            .use((ctx, next) => {
                ctx.msg = "router";
                return next();
            })
            .use(subrouter.routes());

        server.use(router.routes());

        await request(server)
            .get("/")
            .expectStatus(200)
            .expectBody({ msg: "subrouter" });
    });

    it("runs parent middleware for subrouter routes", async () => {
        const server = new Server();
        const subrouter = new Router()
            .get("/sub", (ctx) => {
                ctx.body = { msg: ctx.msg };
            });
        const router = new Router()
            .use((ctx, next) => {
                ctx.msg = "router";
                return next();
            })
            .use("/parent", subrouter.routes());

        server.use(router.routes());

        await request(server)
            .get("/parent/sub")
            .expectStatus(200)
            .expectBody({ msg: "router" });
    });

    it("matches corresponding requests", async () => {
        const server = new Server();
        const router = new Router();
        server.use(router.routes());
        router.get("/:category/:title", (ctx) => {
            expect(ctx).to.have.property("params");
            expect(ctx.params).to.have.property("category", "programming");
            expect(ctx.params).to.have.property("title", "how-to-node");
            ctx.status = 204;
        });
        router.post("/:category", (ctx) => {
            expect(ctx).to.have.property("params");
            expect(ctx.params).to.have.property("category", "programming");
            ctx.status = 204;
        });
        router.put("/:category/not-a-title", (ctx) => {
            expect(ctx).to.have.property("params");
            expect(ctx.params).to.have.property("category", "programming");
            expect(ctx.params).not.to.have.property("title");
            ctx.status = 204;
        });

        await request(server)
            .get("/programming/how-to-node")
            .expectStatus(204);

        await request(server)
            .post("/programming")
            .expectStatus(204);

        await request(server)
            .put("/programming/not-a-title")
            .expectStatus(204);
    });

    it("executes route middleware using `app.context`", async () => {
        const server = new Server();
        const router = new Router();
        server.use(router.routes());
        router.use((ctx, next) => {
            ctx.bar = "baz";
            return next();
        });
        router.get("/:category/:title", (ctx, next) => {
            ctx.foo = "bar";
            return next();
        }, (ctx) => {
            expect(ctx).to.have.property("bar", "baz");
            expect(ctx).to.have.property("foo", "bar");
            expect(ctx).to.have.property("server");
            expect(ctx).to.have.property("req");
            expect(ctx).to.have.property("res");
            ctx.status = 204;
        });
        await request(server)
            .get("/match/this")
            .expectStatus(204);
    });

    it("does not match after ctx.throw()", async () => {
        const server = new Server();
        let counter = 0;
        const router = new Router();
        server.use(router.routes());
        router.get("/", (ctx) => {
            counter++;
            ctx.throw(403);
        });
        router.get("/", () => {
            counter++;
        });
        await request(server)
            .get("/")
            .expectStatus(403);
        expect(counter).to.be.equal(1);
    });

    it("supports promises for route middleware", async () => {
        const server = new Server();
        const router = new Router();
        server.use(router.routes());
        router
            .get("/", (ctx, next) => {
                return next();
            }, async (ctx) => {
                await promise.delay(100);
                ctx.status = 204;
            });
        await request(server)
            .get("/")
            .expectStatus(204);
    });

    describe("Router#allowedMethods()", () => {
        it("responds to OPTIONS requests", async () => {
            const server = new Server();
            const router = new Router();
            server.use(router.routes());
            server.use(router.allowedMethods());
            router.get("/users", adone.noop);
            router.put("/users", adone.noop);
            await request(server)
                .options("/users")
                .expectStatus(200)
                .expectHeader("Content-Length", 0)
                .expectHeader("allow", "HEAD, GET, PUT");
        });

        it("responds with 405 Method Not Allowed", async () => {
            const server = new Server();
            const router = new Router();
            router.get("/users", adone.noop);
            router.put("/users", adone.noop);
            router.post("/events", adone.noop);
            server.use(router.routes());
            server.use(router.allowedMethods());
            await request(server)
                .post("/users")
                .expectStatus(405)
                .expectHeader("allow", "HEAD, GET, PUT");
        });

        it('responds with 405 Method Not Allowed using the "throw" option', async () => {
            const server = new Server();
            const router = new Router();
            server.use(router.routes());
            server.use((ctx, next) => {
                return next().catch((err) => {
                    // assert that the correct HTTPError was thrown
                    expect(err.name).to.be.equal("MethodNotAllowed");
                    expect(err.status).to.be.equal(405);

                    // translate the HTTPError to a normal response
                    ctx.body = err.name;
                    ctx.status = err.status;
                });
            });
            server.use(router.allowedMethods({ throw: true }));
            router.get("/users", adone.noop);
            router.put("/users", adone.noop);
            router.post("/events", adone.noop);
            await request(server)
                .post("/users")
                .expectStatus(405)
                .expectNoHeader("allow");
        });

        it('responds with user-provided throwable using the "throw" and "methodNotAllowed" options', async () => {
            const server = new Server();
            const router = new Router();
            server.use(router.routes());
            server.use((ctx, next) => {
                return next().catch((err) => {
                    // assert that the correct HTTPError was thrown
                    expect(err.message).to.be.equal("Custom Not Allowed Error");
                    expect(err.status).to.be.equal(405);

                    // translate the HTTPError to a normal response
                    ctx.body = err.body;
                    ctx.status = err.status;
                });
            });
            server.use(router.allowedMethods({
                throw: true,
                methodNotAllowed() {
                    const notAllowedErr = new Error("Custom Not Allowed Error");
                    notAllowedErr.type = "custom";
                    notAllowedErr.status = 405;
                    notAllowedErr.body = {
                        error: "Custom Not Allowed Error",
                        status: 405,
                        otherStuff: true
                    };
                    return notAllowedErr;
                }
            }));
            router.get("/users", adone.noop);
            router.put("/users", adone.noop);
            router.post("/events", adone.noop);
            await request(server)
                .post("/users")
                .expectStatus(405)
                .expectNoHeader("allow")
                .expectBody({
                    error: "Custom Not Allowed Error",
                    status: 405,
                    otherStuff: true
                });
        });

        it("responds with 501 Not Implemented", async () => {
            const server = new Server();
            const router = new Router();
            server.use(router.routes());
            server.use(router.allowedMethods());
            router.get("/users", adone.noop);
            router.put("/users", adone.noop);
            await request(server)
                .search("/users")
                .expectStatus(501);
        });

        it('responds with 501 Not Implemented using the "throw" option', async () => {
            const server = new Server();
            const router = new Router();
            server.use(router.routes());
            server.use((ctx, next) => {
                return next().catch((err) => {
                    // assert that the correct HTTPError was thrown
                    expect(err.name).to.be.equal("NotImplemented");
                    expect(err.status).to.be.equal(501);

                    // translate the HTTPError to a normal response
                    ctx.body = err.name;
                    ctx.status = err.status;
                });
            });
            server.use(router.allowedMethods({ throw: true }));
            router.get("/users", adone.noop);
            router.put("/users", adone.noop);
            await request(server)
                .search("/users")
                .expectStatus(501)
                .expectNoHeader("allow");
        });

        it('responds with user-provided throwable using the "throw" and "notImplemented" options', async () => {
            const server = new Server();
            const router = new Router();
            server.use(router.routes());
            server.use((ctx, next) => {
                return next().catch((err) => {
                    // assert that our custom error was thrown
                    expect(err.message).to.be.equal("Custom Not Implemented Error");
                    expect(err.type).to.be.equal("custom");
                    expect(err.status).to.be.equal(501);

                    // translate the HTTPError to a normal response
                    ctx.body = err.body;
                    ctx.status = err.status;
                });
            });
            server.use(router.allowedMethods({
                throw: true,
                notImplemented() {
                    const notImplementedErr = new Error("Custom Not Implemented Error");
                    notImplementedErr.type = "custom";
                    notImplementedErr.status = 501;
                    notImplementedErr.body = {
                        error: "Custom Not Implemented Error",
                        status: 501,
                        otherStuff: true
                    };
                    return notImplementedErr;
                }
            }));
            router.get("/users", adone.noop);
            router.put("/users", adone.noop);
            await request(server)
                .search("/users")
                .expectStatus(501)
                .expectNoHeader("allow")
                .expectBody({
                    error: "Custom Not Implemented Error",
                    status: 501,
                    otherStuff: true
                });
        });

        it("does not send 405 if route matched but status is 404", async () => {
            const server = new Server();
            const router = new Router();
            server.use(router.routes());
            server.use(router.allowedMethods());
            router.get("/users", (ctx) => {
                ctx.status = 404;
            });
            await request(server)
                .get("/users")
                .expectStatus(404);
        });
    });

    it("sets the allowed methods to a single Allow header #273", async () => {
        // https://tools.ietf.org/html/rfc7231#section-7.4.1
        const server = new Server();
        const router = new Router();

        server.use(router.routes());
        server.use(router.allowedMethods());

        router.get("/", () => { });

        const res = await request(server)
            .options("/")
            .expectStatus(200)
            .expectHeader("allow", "HEAD, GET");
        expect(res.rawHeaders.filter((x) => x === "Allow")).to.have.length(1);
    });

    it("supports custom routing detect path: ctx.routerPath", async () => {
        const server = new Server();
        const router = new Router();
        server.use((ctx, next) => {
            // bind helloworld.example.com/users => example.com/helloworld/users
            const appname = ctx.request.hostname.split(".", 1)[0];
            ctx.routerPath = `/${appname}${ctx.path}`;
            return next();
        });
        server.use(router.routes());
        router.get("/helloworld/users", (ctx) => {
            ctx.body = `${ctx.method} ${ctx.url}`;
        });

        await request(server)
            .get("/users")
            .setHeader("Host", "helloworld.example.com")
            .expectStatus(200)
            .expectBody("GET /users");
    });

    describe("Router#[verb]()", () => {
        it("registers route specific to HTTP verb", () => {
            const server = new Server();
            const router = new Router();
            server.use(router.routes());
            for (const method of methods) {
                expect(router).to.have.property(method);
                expect(router[method]).to.be.a("function");
                router[method]("/", adone.noop);
            }
            expect(router.stack).to.have.lengthOf(methods.length);
        });

        it("registers route with a regexp path", () => {
            const router = new Router();
            for (const method of methods) {
                expect(router[method](/^\/\w$/i, adone.noop)).to.be.equal(router);
            }
        });

        it("registers route with a given name", () => {
            const router = new Router();
            for (const method of methods) {
                expect(router[method](method, "/", adone.noop)).to.be.equal(router);
            }
        });

        it("registers route with with a given name and regexp path", () => {
            const router = new Router();
            for (const method of methods) {
                expect(router[method](method, /^\/$/i, adone.noop)).to.be.equal(router);
            }
        });

        it("enables route chaining", () => {
            const router = new Router();
            for (const method of methods) {
                expect(router[method]("/", adone.noop)).to.be.equal(router);
            }
        });

        it("registers array of paths (gh-203)", () => {
            const router = new Router();
            router.get(["/one", "/two"], (ctx, next) => {
                return next();
            });
            expect(router.stack).to.have.lengthOf(2);
            expect(router.stack[0]).to.have.property("path", "/one");
            expect(router.stack[1]).to.have.property("path", "/two");
        });

        it("resolves non-parameterized routes without attached parameters", async () => {
            const server = new Server();
            const router = new Router();

            router.get("/notparameter", (ctx) => {
                ctx.body = {
                    param: ctx.params.parameter
                };
            });

            router.get("/:parameter", (ctx) => {
                ctx.body = {
                    param: ctx.params.parameter
                };
            });

            server.use(router.routes());
            await request(server)
                .get("/notparameter")
                .expectStatus(200)
                .expectBody({});
        });

    });

    describe("Router#use()", () => {
        it("uses router middleware without path", async () => {
            const server = new Server();
            const router = new Router();

            router.use((ctx, next) => {
                ctx.foo = "baz";
                return next();
            });

            router.use((ctx, next) => {
                ctx.foo = "foo";
                return next();
            });

            router.get("/foo/bar", (ctx) => {
                ctx.body = {
                    foobar: `${ctx.foo}bar`
                };
            });

            server.use(router.routes());
            await request(server)
                .get("/foo/bar")
                .expectStatus(200)
                .expectBody({ foobar: "foobar" });
        });

        it("uses router middleware at given path", async () => {
            const server = new Server();
            const router = new Router();

            router.use("/foo/bar", (ctx, next) => {
                ctx.foo = "foo";
                return next();
            });

            router.get("/foo/bar", (ctx) => {
                ctx.body = {
                    foobar: `${ctx.foo}bar`
                };
            });

            server.use(router.routes());
            await request(server)
                .get("/foo/bar")
                .expectStatus(200)
                .expectBody({ foobar: "foobar" });
        });

        it("runs router middleware before subrouter middleware", async () => {
            const server = new Server();
            const router = new Router();
            const subrouter = new Router();

            router.use((ctx, next) => {
                ctx.foo = "boo";
                return next();
            });

            subrouter
                .use((ctx, next) => {
                    ctx.foo = "foo";
                    return next();
                })
                .get("/bar", (ctx) => {
                    ctx.body = {
                        foobar: `${ctx.foo}bar`
                    };
                });

            router.use("/foo", subrouter.routes());
            server.use(router.routes());
            await request(server)
                .get("/foo/bar")
                .expectStatus(200)
                .expectBody({ foobar: "foobar" });
        });

        it("assigns middleware to array of paths", async () => {
            const server = new Server();
            const router = new Router();

            router.use(["/foo", "/bar"], (ctx, next) => {
                ctx.foo = "foo";
                ctx.bar = "bar";
                return next();
            });

            router.get("/foo", (ctx) => {
                ctx.body = {
                    foobar: `${ctx.foo}bar`
                };
            });

            router.get("/bar", (ctx) => {
                ctx.body = {
                    foobar: `foo${ctx.bar}`
                };
            });

            server.use(router.routes());
            await request(server)
                .get("/foo")
                .expectStatus(200)
                .expectBody({ foobar: "foobar" });
        });

        it("without path, does not set params.0 to the matched path", async () => {
            const server = new Server();
            const router = new Router();

            router.use((ctx, next) => {
                return next();
            });

            router.get("/foo/:id", (ctx) => {
                ctx.body = ctx.params;
            });

            server.use(router.routes());
            await request(server)
                .get("/foo/815")
                .expectStatus(200)
                .expectBody({ id: "815" });
        });
    });

    describe("Router#register()", () => {
        it("registers new routes", async () => {
            const server = new Server();
            const router = new Router();
            expect(router).to.have.property("register");
            expect(router.register).to.be.a("function");
            router.register("/", ["GET", "POST"], adone.noop);
            server.use(router.routes());
            expect(router.stack).to.be.an("array");
            expect(router.stack).to.have.property("length", 1);
            expect(router.stack[0]).to.have.property("path", "/");
        });
    });

    describe("Router#redirect()", () => {
        it("registers redirect routes", async () => {
            const server = new Server();
            const router = new Router();
            expect(router).to.have.property("redirect");
            expect(router.redirect).to.be.a("function");
            router.redirect("/source", "/destination", 302);
            server.use(router.routes());
            expect(router.stack).to.have.property("length", 1);
            expect(router.stack[0]).to.be.instanceOf(Layer);
            expect(router.stack[0]).to.have.property("path", "/source");
        });

        it("redirects using route names", async () => {
            const server = new Server();
            const router = new Router();
            server.use(router.routes());
            router.get("home", "/", adone.noop);
            router.get("sign-up-form", "/sign-up-form", adone.noop);
            router.redirect("home", "sign-up-form");
            await request(server)
                .post("/")
                .expectStatus(301)
                .expectHeader("location", "/sign-up-form");
        });
    });

    describe("Router#route()", () => {
        it("inherits routes from nested router", () => {
            const subrouter = new Router().get("child", "/hello", (ctx) => {
                ctx.body = { hello: "world" };
            });
            const router = new Router().use(subrouter.routes());
            expect(router.route("child")).to.have.property("name", "child");
        });
    });

    describe("Router#url()", () => {
        it("generates URL for given route name", async () => {
            const server = new Server();
            const router = new Router();
            server.use(router.routes());
            router.get("books", "/:category/:title", (ctx) => {
                ctx.status = 204;
            });
            let url = router.url("books", { category: "programming", title: "how to node" });
            expect(url).to.be.equal("/programming/how%20to%20node");
            url = router.url("books", "programming", "how to node");
            expect(url).to.be.equal("/programming/how%20to%20node");
        });

        it("generates URL for given route name within embedded routers", () => {
            const server = new Server();
            const router = new Router({
                prefix: "/books"
            });

            const embeddedRouter = new Router({
                prefix: "/chapters"
            });
            embeddedRouter.get("chapters", "/:chapterName/:pageNumber", (ctx) => {
                ctx.status = 204;
            });
            router.use(embeddedRouter.routes());
            server.use(router.routes());
            let url = router.url("chapters", { chapterName: "Learning ECMA6", pageNumber: 123 });
            expect(url).to.be.equal("/books/chapters/Learning%20ECMA6/123");
            url = router.url("chapters", "Learning ECMA6", 123);
            expect(url).to.be.equal("/books/chapters/Learning%20ECMA6/123");
        });

        it("generates URL for given route name with params and query params", () => {
            const router = new Router();
            router.get("books", "/books/:category/:id", (ctx) => {
                ctx.status = 204;
            });
            {
                const url = router.url("books", "programming", 4, {
                    query: { page: 3, limit: 10 }
                });
                expect(url).to.be.equal("/books/programming/4?page=3&limit=10");
            }
            {
                const url = router.url("books",
                    { category: "programming", id: 4 },
                    { query: { page: 3, limit: 10 } }
                );
                expect(url).to.be.equal("/books/programming/4?page=3&limit=10");
            }
            {
                const url = router.url("books",
                    { category: "programming", id: 4 },
                    { query: "page=3&limit=10" }
                );
                expect(url).to.be.equal("/books/programming/4?page=3&limit=10");
            }
        });


        it("generates URL for given route name without params and query params", () => {
            const router = new Router();
            router.get("category", "/category", (ctx) => {
                ctx.status = 204;
            });
            const url = router.url("category", {
                query: { page: 3, limit: 10 }
            });
            expect(url).to.be.equal("/category?page=3&limit=10");
        });
    });

    describe("Router#param()", () => {
        it("runs parameter middleware", async () => {
            const server = new Server();
            const router = new Router();
            server.use(router.routes());
            router
                .param("user", (id, ctx, next) => {
                    ctx.user = { name: "alex" };
                    if (!id) {
                        return ctx.status = 404;
                    }
                    return next();
                })
                .get("/users/:user", (ctx) => {
                    ctx.body = ctx.user;
                });
            await request(server)
                .get("/users/3")
                .expectStatus(200)
                .expectBody({ name: "alex" });
        });

        it("runs parameter middleware in order of URL appearance", async () => {
            const server = new Server();
            const router = new Router();
            router
                .param("user", (id, ctx, next) => {
                    ctx.user = { name: "alex" };
                    if (ctx.ranFirst) {
                        ctx.user.ordered = "parameters";
                    }
                    if (!id) {
                        return ctx.status = 404;
                    }
                    return next();
                })
                .param("first", (id, ctx, next) => {
                    ctx.ranFirst = true;
                    if (ctx.user) {
                        ctx.ranFirst = false;
                    }
                    if (!id) {
                        return ctx.status = 404;
                    }
                    return next();
                })
                .get("/:first/users/:user", (ctx) => {
                    ctx.body = ctx.user;
                });

            server.use(router.routes());

            await request(server)
                .get("/first/users/3")
                .expectStatus(200)
                .expectBody({ name: "alex", ordered: "parameters" });
        });

        it("runs parameter middleware in order of URL appearance even when added in random order", async () => {
            const server = new Server();
            const router = new Router();
            router
                // intentional random order
                .param("a", (id, ctx, next) => {
                    ctx.state.loaded = [id];
                    return next();
                })
                .param("d", (id, ctx, next) => {
                    ctx.state.loaded.push(id);
                    return next();
                })
                .param("c", (id, ctx, next) => {
                    ctx.state.loaded.push(id);
                    return next();
                })
                .param("b", (id, ctx, next) => {
                    ctx.state.loaded.push(id);
                    return next();
                })
                .get("/:a/:b/:c/:d", (ctx) => {
                    ctx.body = ctx.state.loaded;
                });

            server.use(router.routes());

            await request(server)
                .get("/1/2/3/4")
                .expectStatus(200)
                .expectBody(["1", "2", "3", "4"]);
        });

        it("runs parent parameter middleware for subrouter", async () => {
            const server = new Server();
            const router = new Router();
            const subrouter = new Router();
            subrouter.get("/:cid", (ctx) => {
                ctx.body = {
                    id: ctx.params.id,
                    cid: ctx.params.cid
                };
            });
            router
                .param("id", (id, ctx, next) => {
                    ctx.params.id = "ran";
                    if (!id) {
                        return ctx.status = 404;
                    }
                    return next();
                })
                .use("/:id/children", subrouter.routes());

            server.use(router.routes());

            await request(server)
                .get("/did-not-run/children/2")
                .expectStatus(200)
                .expectBody({ id: "ran", cid: "2" });
        });
    });

    describe("Router#opts", () => {
        it("responds with 200", async () => {
            const server = new Server();
            const router = new Router({
                strict: true
            });
            router.get("/info", (ctx) => {
                ctx.body = "hello";
            });
            server.use(router.routes());

            await request(server)
                .get("/info")
                .expectStatus(200)
                .expectBody("hello");
        });

        it("should allow setting a prefix", async () => {
            const server = new Server();
            const routes = new Router({ prefix: "/things/:thingID" });

            routes.get("/list", (ctx) => {
                ctx.body = ctx.params;
            });

            server.use(routes.routes());

            await request(server)
                .get("/things/1/list")
                .expectStatus(200)
                .expectBody({ thingID: "1" });
        });

        it("responds with 404 when has a trailing slash", async () => {
            const server = new Server();
            const router = new Router({
                strict: true
            });
            router.get("/info", (ctx) => {
                ctx.body = "hello";
            });
            server.use(router.routes());
            await request(server)
                .get("/info/")
                .expectStatus(404);
        });
    });

    describe("use middleware with opts", () => {
        it("responds with 200", async () => {
            const server = new Server();
            const router = new Router({
                strict: true
            });
            router.get("/info", (ctx) => {
                ctx.body = "hello";
            });
            server.use(router.routes());
            await request(server)
                .get("/info")
                .expectStatus(200)
                .expectBody("hello");
        });

        it("responds with 404 when has a trailing slash", async () => {
            const server = new Server();
            const router = new Router({
                strict: true
            });
            router.get("/info", (ctx) => {
                ctx.body = "hello";
            });
            server.use(router.routes());
            await request(server)
                .get("/info/")
                .expectStatus(404);
        });
    });

    describe("router.routes()", () => {
        it("should return composed middleware", async () => {
            const server = new Server();
            const router = new Router();
            let middlewareCount = 0;
            const middlewareA = function (ctx, next) {
                middlewareCount++;
                return next();
            };
            const middlewareB = function (ctx, next) {
                middlewareCount++;
                return next();
            };

            router.use(middlewareA, middlewareB);
            router.get("/users/:id", (ctx) => {
                expect(ctx.params).to.have.property("id");
                ctx.body = { hello: "world" };
            });

            const routerMiddleware = router.routes();

            expect(routerMiddleware).to.be.a("function");

            server.use(routerMiddleware);

            await request(server)
                .get("/users/1")
                .expectStatus(200)
                .expectBody({ hello: "world" });
            expect(middlewareCount).to.be.equal(2);
        });

        it("places a `_matchedRoute` value on context", async () => {
            const server = new Server();
            const router = new Router();
            const middleware = function (ctx, next) {
                expect(ctx._matchedRoute).to.be.equal("/users/:id");
                return next();
            };

            router.use(middleware);
            router.get("/users/:id", (ctx) => {
                expect(ctx._matchedRoute).to.be.equal("/users/:id");
                expect(ctx.params).to.have.property("id");
                ctx.body = { hello: "world" };
            });

            server.use(router.routes());


            await request(server)
                .get("/users/1")
                .expectStatus(200);
        });

        it("places a `_matchedRouteName` value on the context for a named route", async () => {
            const server = new Server();
            const router = new Router();

            router.get("users#show", "/users/:id", (ctx) => {
                expect(ctx._matchedRouteName).to.be.equal("users#show");
                ctx.status = 200;
            });

            server.use(router.routes());

            await request(server)
                .get("/users/1")
                .expectStatus(200);
        });

        it("does not place a `_matchedRouteName` value on the context for unnamed routes", async () => {
            const server = new Server();
            const router = new Router();

            router.get("/users/:id", (ctx) => {
                expect(ctx._matchedRouteName).to.be.undefined();
                ctx.status = 200;
            });

            server.use(router.routes());

            await request(server)
                .get("/users/1")
                .expectStatus(200);
        });
    });

    describe("If no HEAD method, default to GET", () => {
        it("should default to GET", async () => {
            const server = new Server();
            const router = new Router();
            router.get("/users/:id", (ctx) => {
                expect(ctx.params).to.have.property("id");
                ctx.body = "hello";
            });
            server.use(router.routes());
            request(server)
                .head("/users/1")
                .expectStatus(200)
                .expectEmptyBody();
        });

        it("should work with middleware", async () => {
            const server = new Server();
            const router = new Router();
            router.get("/users/:id", (ctx) => {
                expect(ctx.params).to.have.property("id");
                ctx.body = "hello";
            });
            server.use(router.routes());
            request(server)
                .head("/users/1")
                .expectStatus(200)
                .expectEmptyBody();
        });
    });

    describe("Router#prefix", () => {
        it("should set opts.prefix", () => {
            const router = new Router();
            expect(router.opts).not.to.have.property("prefix");
            router.prefix("/things/:thing_id");
            expect(router.opts.prefix).to.be.equal("/things/:thing_id");
        });

        it("should prefix existing routes", () => {
            const router = new Router();
            router.get("/users/:id", (ctx) => {
                ctx.body = "test";
            });
            router.prefix("/things/:thing_id");
            const route = router.stack[0];
            expect(route.path).to.equal("/things/:thing_id/users/:id");
            expect(route.paramNames).to.have.lengthOf(2);
            expect(route.paramNames[0]).to.have.property("name", "thing_id");
            expect(route.paramNames[1]).to.have.property("name", "id");
        });

        describe("when used with .use(fn) - gh-247", () => {
            it("does not set params.0 to the matched path", async () => {
                const server = new Server();
                const router = new Router();

                router.use((ctx, next) => {
                    return next();
                });

                router.get("/foo/:id", (ctx) => {
                    ctx.body = ctx.params;
                });

                router.prefix("/things");

                server.use(router.routes());
                await request(server)
                    .get("/things/foo/108")
                    .expectStatus(200)
                    .expectBody({ id: "108" });
            });
        });

        const testPrefix = (prefix) => () => {
            let server;
            let middlewareCount = 0;

            before(() => {
                server = new Server();
                const router = new Router();

                router.use((ctx, next) => {
                    middlewareCount++;
                    ctx.thing = "worked";
                    return next();
                });

                router.get("/", (ctx) => {
                    middlewareCount++;
                    ctx.body = { name: ctx.thing };
                });

                router.prefix(prefix);
                server.use(router.routes());
            });

            beforeEach(() => {
                middlewareCount = 0;
            });

            it("should support root level router middleware", async () => {
                await request(server)
                    .get(prefix)
                    .expectStatus(200)
                    .expectBody({ name: "worked" });
                expect(middlewareCount).to.be.equal(2);
            });

            it("should support requests with a trailing path slash", async () => {
                await request(server)
                    .get("/admin/")
                    .expectStatus(200)
                    .expectBody({ name: "worked" });
                expect(middlewareCount).to.be.equal(2);
            });

            it("should support requests without a trailing path slash", async () => {
                await request(server)
                    .get("/admin")
                    .expectStatus(200)
                    .expectBody({ name: "worked" });
                expect(middlewareCount).to.be.equal(2);
            });
        };

        describe("with trailing slash", testPrefix("/admin/"));
        describe("without trailing slash", testPrefix("/admin"));

    });

    describe("Static Router#url()", () => {
        it("generates route URL", () => {
            const url = Router.url("/:category/:title", { category: "programming", title: "how-to-node" });
            expect(url).to.be.equal("/programming/how-to-node");
        });

        it("escapes using encodeURIComponent()", () => {
            const url = Router.url("/:category/:title", { category: "programming", title: "how to node" });
            expect(url).to.be.equal("/programming/how%20to%20node");
        });
    });
});
