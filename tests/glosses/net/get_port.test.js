const {
    net: { getPort },
    std: { net, util: { promisify } }
} = adone;

describe("net", "getPort", () => {
    it("port can be bound when promise resolves", async () => {
        const port = await getPort();
        assert.equal(typeof port, "number");
        assert.isTrue(port > 0);

        const server = net.createServer();
        await promisify(server.listen.bind(server))(port);

        assert.equal(server.address().port, port);
    });

    it("preferred port", async () => {
        const desiredPort = 8080;
        const port = await getPort({ port: desiredPort });

        assert.equal(port, desiredPort);
    });

    it("preferred port unavailable", async () => {
        const desiredPort = 8282;
        const server = net.createServer();
        await promisify(server.listen.bind(server))(desiredPort);

        const port = await getPort({ port: desiredPort });
        assert.equal(typeof port, "number");
        assert.isTrue(port > 0);
        assert.notEqual(port, desiredPort);
    });

    it("port can be bound to IPv4 host when promise resolves", async () => {
        const port = await getPort({ host: "0.0.0.0" });
        assert.equal(typeof port, "number");
        assert.isTrue(port > 0);

        const server = net.createServer();
        await promisify(server.listen.bind(server))(port, "0.0.0.0");

        assert.equal(server.address().port, port);
    });

    it("preferred port given IPv4 host", async () => {
        const desiredPort = 8080;
        const port = await getPort({
            port: desiredPort,
            host: "0.0.0.0"
        });

        assert.equal(port, desiredPort);
    });

    it("preferred ports", async () => {
        const desiredPorts = [9910, 9912, 9913];
        const port = await getPort({
            port: desiredPorts,
            host: "0.0.0.0"
        });

        assert.equal(port, desiredPorts[0]);
    });

    it("first port in preferred ports array is unavailable", async () => {
        const desiredPorts = [9090, 9091];

        const server = net.createServer();
        await promisify(server.listen.bind(server))(desiredPorts[0]);

        const port = await getPort({
            port: desiredPorts
        });

        assert.equal(port, desiredPorts[1]);
    });

    it("all preferred ports in array are unavailable", async () => {
        const desiredPorts = [9990, 9991];

        const server1 = net.createServer();
        await promisify(server1.listen.bind(server1))(desiredPorts[0]);
        const server2 = net.createServer();
        await promisify(server2.listen.bind(server2))(desiredPorts[1]);

        const port = await getPort({
            port: desiredPorts
        });

        assert.equal(typeof port, "number");
        assert.isTrue(port > 0 && port < 65536);
        assert.notEqual(port, desiredPorts[0]);
        assert.notEqual(port, desiredPorts[1]);
    });

    it("non-array iterables work", async () => {
        const desiredPorts = (function* () {
            yield 9920;
        })();
        const port = await getPort({
            port: desiredPorts,
            host: "0.0.0.0"
        });
        assert.equal(port, 9920);
    });

    it("throws on invalid ranges", async () => {
        await assert.throws(async () => getPort({ range: [1025, 1024] }));
        await assert.throws(async () => getPort({ range: [0, 512] }));
        await assert.throws(async () => getPort({ range: [1023, 1023] }));
        await assert.throws(async () => getPort({ range: [65536, 65536] }));
    });
});
