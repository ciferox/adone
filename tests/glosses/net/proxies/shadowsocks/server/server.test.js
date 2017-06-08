describe("net", "proxy", "shadowsocks", "server", () => {
    const { net: { proxy: { shadowsocks } } } = adone;
    let echoServer = null;
    let echoPort = null;

    beforeEach(async () => {
        echoServer = adone.std.net.createServer((socket) => {
            socket.on("data", (chunk) => {
                socket.end(chunk);
            });
        });
        await new Promise((resolve) => echoServer.listen(0, resolve));
        echoPort = echoServer.address().port;
    });

    afterEach(async () => {
        await new Promise((resolve) => echoServer.close(resolve));
        echoServer = null;
        echoPort = null;
    });

    const listen = (server) => new Promise((resolve) => server.listen(0, "localhost", () => resolve(server.address().port)));
    const close = (server) => new Promise((resolve) => server.close(resolve));

    it("should receive requests", async () => {
        const server = new shadowsocks.Server({ password: "test" });
        const port = await listen(server);
        const connect = new Promise((resolve) => {
            shadowsocks.createConnection({
                proxyPort: port,
                host: "localhost",
                port: echoPort,
                password: "test"
            })
                .once("connect", (socket) => {
                    socket.end();
                    resolve();
                });
        });
        const request = await new Promise((resolve) => {
            server.once("connection", (request, accept, deny) => {
                resolve(request);
                deny();
            });
        });
        await connect;
        expect(request.dstAddr).to.be.equal("127.0.0.1");
        expect(request.dstPort).to.be.equal(echoPort);
        expect(request.srcAddr).to.be.equal("127.0.0.1");
        expect(request.srcPort).to.be.a("number");
        await close(server);
    });

    it("should connect", async () => {
        const server = new shadowsocks.Server({ password: "test" });
        const port = await listen(server);
        const connect = new Promise((resolve) => {
            shadowsocks.createConnection({
                proxyPort: port,
                host: "localhost",
                port: echoPort,
                password: "test"
            })
                .once("connect", (socket) => {
                    resolve(socket);
                });
        });
        await new Promise((resolve) => {
            server.once("connection", (request, accept) => {
                accept();
                resolve();
            });
        });
        const socket = await connect;
        socket.write("hello world");
        const data = await new Promise((resolve) => {
            socket.once("data", resolve);
        });
        expect(data.toString()).to.be.equal("hello world");
        await close(server);
    });
});
