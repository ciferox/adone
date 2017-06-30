describe("database", "redis", "unit", "Connector", () => {
    const { std: { net, tls }, database: { redis: { __: { Connector } } } } = adone;

    describe("connect()", () => {
        it("first tries path", (done) => {
            stub(net, "createConnection");
            const connector = new Connector({ port: 6379, path: "/tmp" });
            connector.connect(() => {
                net.createConnection.calledWith({ path: "/tmp" });
                net.createConnection.restore();
                done();
            });
        });

        it("supports tls", (done) => {
            stub(tls, "connect");
            const connector = new Connector({ port: 6379, tls: "on" });
            connector.connect(() => {
                tls.connect.calledWith({ port: 6379, tls: "on" });
                tls.connect.restore();
                done();
            });
        });
    });
});

