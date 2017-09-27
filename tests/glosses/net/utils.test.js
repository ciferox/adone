const { net: { util } } = adone;

describe("net", "util", "getPort()", () => {
    it("call with no agguments", async () => {
        const port = await util.getPort();
        assert.typeOf(port, "number");
        assert.isTrue(port > 0);

        const server = adone.std.net.createServer();

        await new Promise((resolve) => server.listen(port, resolve));

        assert.equal(server.address().port, port);
    });

    it("call with port boundaries", async () => {
        for (let i = 0; i < 1000; i++) {
            const lbound = adone.math.random(1025, 25000);
            const rbound = adone.math.random(25000, 65536);
            const port = await util.getPort({ lbound, rbound }); // eslint-disable-line
            assert.typeOf(port, "number");
            assert.isTrue(port >= lbound && port <= rbound);
        }
    });

    it("call with preffered 'port'", async () => {
        let randomPort;

        for ( ;; ) {
            try {
                randomPort = adone.math.random(12000, 45000);
                // eslint-disable-next-line
                const port = await util.getPort({
                    port: randomPort
                });
                assert.equal(randomPort, port);
                break;
            } catch (err) {
                //
            }
        }
    });

    it("call with busy 'port' should have throw exception", async () => {
        const somePort = await util.getPort();

        const server = adone.std.net.createServer();
        await new Promise((resolve) => server.listen(somePort, resolve));

        const err = await assert.throws(async () => util.getPort({
            port: somePort
        }));
        assert.instanceOf(err, adone.x.Network);

        await new Promise((resolve) => server.close(resolve));
    });

    it("check busy port", async () => {
        const port = await util.getPort();
        const server = adone.std.net.createServer();
        await new Promise((resolve) => server.listen(port, resolve));

        assert.isFalse(await util.isFreePort(port));
        await new Promise((resolve) => server.close(resolve));
    });
});
