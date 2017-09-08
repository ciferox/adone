describe("database", "redis", "unit", "Connector", () => {
    const { std: { net, tls }, database: { redis } } = adone;
    const { Connector } = adone.private(redis);

    describe("connect()", () => {
        it("first tries path", async () => {
            stub(net, "createConnection");
            const connector = new Connector({ port: 6379, path: "/tmp" });
            await connector.connect();
            net.createConnection.calledWith({ path: "/tmp" });
            net.createConnection.restore();
        });

        it("supports tls", async () => {
            stub(tls, "connect");
            const connector = new Connector({ port: 6379, tls: "on" });
            await connector.connect();
            tls.connect.calledWith({ port: 6379, tls: "on" });
            tls.connect.restore();
        });
    });
});

