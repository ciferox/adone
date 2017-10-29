describe("net", "http", "server", "middlewares", "session", function session() {
    this.timeout(10000);

    const { net: { http: { server: { Server, middleware: { session } } } }, promise, util } = adone;
    const { Store } = session;

    class CustomStore extends Store {
        constructor() {
            super();
            this.store = {};
        }

        async get(sid) {
            return this.store[sid];
        }

        async set(session, opts, ctx = {}) {
            // for test the ctx param
            if (ctx.testId) {
                return ctx.testId;
            }
            if (!opts.sid) {
                opts.sid = this.getID(24);
            }
            this.store[opts.sid] = session;
            return opts.sid;
        }

        async destroy(sid) {
            delete this.store[sid];
        }
    }

    describe("when use default store", () => {
        const server = new Server();

        server.use(session({ maxAge: 1000 }));

        server.use((ctx) => {
            if (ctx.path === "/set") {
                ctx.session.user = "tom";
            } else if (ctx.path === "/update") {
                ctx.session.user = "john";
            } else if (ctx.path === "/clear") {
                ctx.session = null;
                ctx.body = "ok";
                return;
            }
            ctx.body = ctx.session;
        });

        let cookie = "";

        it("should work", async () => {
            const res = await request(server).get("/set").expectStatus(200);
            cookie = res.headers["set-cookie"][0];
        });

        it("should set cookies", () => {
            expect(cookie).to.match(/session=/);
        });

        it("should get the correct session", async () => {
            await request(server)
                .get("/get")
                .setHeader("cookie", cookie)
                .expectStatus(200)
                .expectBody({ user: "tom" });
        });

        it("should work when update session", async () => {
            await request(server)
                .get("/update")
                .setHeader("cookie", cookie)
                .expectStatus(200)
                .expectBody({ user: "john" });
        });


        it("should work when session expired", async () => {
            await promise.delay(1000);
            await request(server)
                .get("/get")
                .setHeader("cookie", cookie)
                .expectStatus(200)
                .expectBody({});
        });

        it("should work when multiple clients access", async () => {
            await server.bind({ host: "127.0.0.1" });
            try {
                const res1 = await request(server).get("/set");
                const cookie1 = res1.headers["set-cookie"];
                const res2 = await request(server).get("/set");
                const cookie2 = res2.headers["set-cookie"];
                expect(cookie1).not.to.be.deep.equal(cookie2);
            } finally {
                await server.unbind();
            }
        });

        cookie = `session=${Store.prototype.getID(24)}`;

        it("set old sessionid should be work", async () => {
            await request(server)
                .get("/set")
                .setHeader("cookie", cookie)
                .expectStatus(200)
                .expectBody({ user: "tom" });
        });

        it("should work when clear session by setting null value", async () => {
            await request(server)
                .get("/clear")
                .setHeader("cookie", cookie)
                .expectStatus(200);
        });
    });



    describe("when use custom store", () => {
        const server = new Server();
        const store = new CustomStore();

        server.use(session({ store }));

        server.use((ctx) => {
            if (ctx.path === "/set") {
                ctx.session.user = { name: "tom" };
                ctx.body = "done";
            } else if (ctx.path === "/change") {
                ctx.session.user = { name: "jim" };
                ctx.body = "changed";
            } else if (ctx.path === "/clear") {
                ctx.session = {};
                ctx.body = "cleared";
            }
        });

        let cookie;

        it("should work", async () => {
            const res = await request(server)
                .get("/set")
                .expectStatus(200);
            cookie = res.headers["set-cookie"][0];
        });

        it("should work when set an empty object", async () => {
            await request(server)
                .get("/clear")
                .setHeader("cookie", cookie)
                .expectStatus(200);
            const sid = cookie[0].split(";")[0].split("=")[1];
            expect(store.store[sid]).to.be.undefined;
        });

        it("should work when update old session", async () => {
            const res = await request(server)
                .get("/set")
                .expectStatus(200);
            const cookie = res.headers["set-cookie"];
            const sid = cookie[0].split(";")[0].split("=")[1];

            await request(server)
                .get("/change")
                .setHeader("Cookie", cookie)
                .expectStatus(200);

            expect(store.store[sid].user.name).to.be.equal("jim");
        });
    });

    describe("when session cookie exists but is not in store", () => {
        const server = new Server();
        const store = new CustomStore();
        let cookie;

        server.use(session({ store }));

        server.use((ctx) => {
            if (ctx.path === "/set") {
                ctx.session.user = { name: "tom" };
                ctx.body = "done";
            }
        });

        it("should work", async () => {
            const res = await request(server)
                .get("/set")
                .expectStatus(200);
            cookie = res.headers["set-cookie"];
            for (const key in store.store) {
                delete store.store[key];
            }
        });

        it("should work even if store cleared", async () => {
            await request(server)
                .get("/set")
                .setHeader("Cookie", cookie)
                .expectStatus(200);
            // cookie should reset when session is not found in store
            const sid = cookie[0].split(";")[0].split("=")[1];
            expect(util.keys(store.store)).to.have.lengthOf(1);
            expect(store.store[sid].user.name).to.be.equal("tom");
        });
    });

    describe("when pass the context to the session store", () => {
        it("should work", async () => {
            const server = new Server();
            const store = new CustomStore();

            server.use(session({
                store
            })).use((ctx) => {
                ctx.testId = "the_id_in_ctx";
                ctx.session.user = { name: "tom" };
                ctx.body = "done";
            });

            await request(server)
                .get("/")
                .expectStatus(200)
                .expect((response) => {
                    expect(response.headers["set-cookie"][0]).to.include("the_id_in_ctx");
                });
        });
    });
});
