describe("net", "http", "server", "Server.use", () => {
    const { net: { http: { server: { Server } } } } = adone;

    it("should compose middleware", async () => {
        const server = new Server();
        const calls = [];

        server.use((ctx, next) => {
            calls.push(1);
            return next().then(() => {
                calls.push(6);
            });
        });

        server.use((ctx, next) => {
            calls.push(2);
            return next().then(() => {
                calls.push(5);
            });
        });

        server.use((ctx, next) => {
            calls.push(3);
            return next().then(() => {
                calls.push(4);
            });
        });

        await request(server)
            .get("/")
            .expectStatus(404);
        expect(calls).to.be.deep.equal([1, 2, 3, 4, 5, 6]);
    });

    it("should compose mixed middleware", async () => {
        const server = new Server();
        const calls = [];

        server.use((ctx, next) => {
            calls.push(1);
            return next().then(() => {
                calls.push(6);
            });
        });

        server.use(async (ctx, next) => {
            calls.push(2);
            await next();
            calls.push(5);
        });

        server.use((ctx, next) => {
            calls.push(3);
            return next().then(() => {
                calls.push(4);
            });
        });

        await request(server)
            .get("/")
            .expectStatus(404);
        expect(calls).to.be.deep.equal([1, 2, 3, 4, 5, 6]);
    });

    it("should catch thrown errors in non-async functions", async () => {
        const server = new Server();

        server.use((ctx) => ctx.throw(404, "Not Found"));

        await request(server)
            .get("/")
            .expectStatus(404);
    });

    it("should throw error for non function", () => {
        const server = new Server();

        for (const v of [null, undefined, 0, false, "not a function"]) {
            expect(() => server.use(v)).to.throw();
        }
    });
});
