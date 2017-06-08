describe("net", "http", "server", "context", "cookies", () => {
    const { net: { http: { server: { Server } } } } = adone;

    describe("ctx.cookies.set()", () => {
        it("should set an unsigned cookie", async () => {
            const server = new Server();

            server.use((ctx) => {
                ctx.cookies.set("name", "jon");
                ctx.status = 204;
            });

            await request(server)
                .get("/")
                .expectStatus(204)
                .expect((res) => {
                    expect(res.headers["set-cookie"].some((cookie) => /^name=/.test(cookie))).to.be.true;
                });
        });

        describe("with .signed", () => {
            describe("when no .keys are set", () => {
                it("should error", async() => {
                    const server = new Server();

                    server.use((ctx) => {
                        try {
                            ctx.cookies.set("foo", "bar", { signed: true });
                        } catch (err) {
                            ctx.body = err.message;
                        }
                    });

                    await request(server)
                        .get("/")
                        .expectBody(".keys required for signed cookies");
                });
            });

            it("should send a signed cookie", async () => {
                const server = new Server();

                server.keys = ["a", "b"];

                server.use((ctx) => {
                    ctx.cookies.set("name", "jon", { signed: true });
                    ctx.status = 204;
                });

                await request(server)
                    .get("/")
                    .expectStatus(204)
                    .expect((res) => {
                        const cookies = res.headers["set-cookie"];

                        expect(cookies.some((cookie) => /^name=/.test(cookie))).to.be.true;
                        expect(cookies.some((cookie) => /^name\.sig=/.test(cookie))).to.be.true;
                    });
            });
        });

        describe("with secure", () => {
            it("should get secure from request", async () => {
                const server = new Server();

                server.proxy = true;
                server.keys = ["a", "b"];

                server.use((ctx) => {
                    ctx.cookies.set("name", "jon", { signed: true });
                    ctx.status = 204;
                });

                await request(server)
                    .get("/")
                    .setHeader("x-forwarded-proto", "https") // mock secure
                    .expectStatus(204)
                    .expect((res) => {
                        const cookies = res.headers["set-cookie"];
                        expect(cookies.some((cookie) => /^name=/.test(cookie))).to.be.true;

                        expect(cookies.some((cookie) => /^name\.sig=/.test(cookie))).to.be.true;

                        expect(cookies.every((cookie) => /secure/.test(cookie))).to.be.true;
                    });
            });
        });
    });
});
