const { net: { util } } = adone;

describe("net", "util", () => {
    describe("Availbale ports", () => {
        it("getFreePort() should return available port", async () => {
            const port = await util.getFreePort();
            assert.typeOf(port, "number");
            assert.isTrue(port > 0);

            const server = adone.std.net.createServer();

            await new Promise((resolve) => server.listen(port, resolve));

            assert.equal(server.address().port, port);
        });

        it("getFreePort() with port boundaries", async () => {
            for (let i = 0; i < 1000; i++) {
                const lbound = adone.math.random(1025, 25000);
                const rbound = adone.math.random(25000, 65536);
                const port = await util.getFreePort({ lbound, rbound });
                assert.typeOf(port, "number");
                assert.isTrue(port >= lbound && port <= rbound);
            }
        });

        it("check busy port", async () => {
            const port = await util.getFreePort();
            const server = adone.std.net.createServer();

            await new Promise((resolve) => server.listen(port, resolve));

            assert.isFalse(await util.isFreePort(port));
        });
    });
});
