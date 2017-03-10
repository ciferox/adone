describe("glosses", "net", "http", "server", "middlewares", "session", function session() {
    this.timeout(10000);

    const { net: { http: { Server } }, promise, util } = adone;
    const { middleware: { session } } = Server;
    const { Store } = session;

    class CustomStore extends Store {
        constructor() {
            super();
            this.store = {};
        }

        async get(sid) {
            return this.store[sid];
        }

        async set(session, opts) {
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

        it("should work when session expired", async () => {
            await promise.delay(1000);
            await request(server)
                .get("/get")
                .setHeader("cookie", cookie)
                .expectStatus(200)
                .expectBody({});
        });

        it("should work when multiple clients access", async () => {
            const instance = server.listen();

            const res1 = await request(instance).get("/set");
            const cookie1 = res1.headers["set-cookie"];
            const res2 = await request(instance).get("/set");
            const cookie2 = res2.headers["set-cookie"];
            expect(cookie1).not.to.be.deep.equal(cookie2);

            instance.close();
        });

        it("set old sessionid should be work", async () => {
            await request(server)
                .get("/set")
                .setHeader("cookie", `session=${Store.prototype.getID(24)}`)
                .expectStatus(200)
                .expectBody({ user: "tom" });
        });
    });



    describe("when use custom store", () => {
        const server = new Server();

        server.use(session({ store: new CustomStore() }));

        server.use((ctx) => {
            ctx.session.user = {
                name: "tom"
            };
            ctx.body = ctx.session;
        });

        it("should work", async () => {
            await request(server)
                .get("/")
                .expectStatus(200);
        });
    });

    describe("when session changed", () => {
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
            }
        });

        it("should destroy old session", async () => {
            const res = await request(server).get("/set")
                .expectStatus(200);
            const cookie = res.headers["set-cookie"];
            const sid = cookie[0].split(";")[0].split("=")[1];

            await request(server).get("/change")
                .setHeader("Cookie", cookie)
                .expectStatus(200);
            expect(store.store[sid]).to.be.undefined;
        });
    });

    describe("when session cookie exists but is not in store", () => {
        const server = new Server();
        const store = new CustomStore();
        let cookie;

        server.use(session({ store }));

        server.use((ctx) => {
            if (ctx.path === "/setandforget") {
                ctx.session.user = { name: "tom" };
                ctx.body = "done";
            }
        });

        it("should work", async () => {
            const res = await request(server)
                .get("/setandforget")
                .expectStatus(200);
            cookie = res.headers["set-cookie"];
            for (const key in store.store) {
                delete store.store[key];
            }
        });

        it("should work even if store cleared", async () => {
            const res = await request(server)
                .get("/setandforget")
                .setHeader("Cookie", cookie)
                .expectStatus(200);
            expect(util.keys(store.store)).to.have.lengthOf(1);
            expect(cookie[0]).not.to.be.equal(res.headers["set-cookie"][0]);
        });
    });
});
