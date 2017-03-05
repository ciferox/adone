const { is, std: { fs } } = adone;

let SERVER_PORT = null;
const UNIX_SOCKET = adone.std.path.resolve("tmp.sock");

function getFixturesPath(name) {
    return adone.std.path.join(__dirname, "fixtures", name);
}

const serverOptions = {
    useTls: true,
    cert: fs.readFileSync(getFixturesPath("certificate.pem")),
    key: fs.readFileSync(getFixturesPath("key.pem"))
    // ca: [fs.readFileSync(getFixturesPath("ca1-cert.pem"))]
};

const clientOptions = {
    useTls: true,
    cert: fs.readFileSync(getFixturesPath("agent1-cert.pem")),
    key: fs.readFileSync(getFixturesPath("agent1-key.pem")),
    rejectUnauthorized: false
};

class ServerSocket extends adone.net.Server {
    defaults() {
        this.reject = false;
        this.setPacketHandler(null);
    }

    setPacketHandler(handler) {
        if (is.null(handler)) {
            this.handler = (socket, packet) => {};
        } else {
            this.handler = handler;
        }
    }

    async onNewConnection(socket) {
        if (this.reject) {
            return socket.disconnect();
        }
        socket.setPacketHandler(this.handler);
        return;
    }
}

class ClientSocket extends adone.net.Socket {
    constructor() {
        super();
        this.handler = (socket, packet) => {
            this.customHandler(socket, packet);
        };
    }
    defaults() {
        this.setCustomHandler(null);
    }

    setCustomHandler(handler) {
        if (is.null(handler)) {
            this.customHandler = (socket, packet) => {};
        } else {
            this.customHandler = handler;
        }
    }

    onPacketHandler() {
        return this.handler;
    }
}

describe("TLS Socket", function () {
    let client;
    let server;
    let defaultPort;

    this.timeout(10000);

    beforeEach(async function () {
        client = new ClientSocket();
        server = new ServerSocket();
        server.defaults();
        client.defaults();
        defaultPort = server.option.defaultPort;
        SERVER_PORT === null && (SERVER_PORT = await adone.net.util.getFreePort());
    });

    afterEach(async function () {
        client.disconnect();
        await server.unbind();
    });

    describe("Bind", function () {
        function checkBind(srv, port) {
            return new Promise(async(resolve, reject) => {
                const checkerSocket = new adone.net.Socket();
                srv.on("connection", () => {
                    checkerSocket.disconnect();
                    resolve();
                });
                checkerSocket.on("error", reject);
                checkerSocket.connect(Object.assign({ port }, clientOptions)).catch(reject);
            });
        }

        it("bind()", async function () {
            await server.bind(Object.assign({ }, serverOptions));
            assert.equal(server.address().full, `tcp://127.0.0.1:${defaultPort}`);
            await checkBind(server, defaultPort);
        });

        it("bind({ port = string address })", async function () {
            await server.bind(Object.assign({ port: `tcp://127.0.0.1:${SERVER_PORT}` }, serverOptions));

            assert.equal(server.address().full, `tcp://127.0.0.1:${SERVER_PORT}`);
            await checkBind(server, SERVER_PORT);
        });

        it("bind({ host })", async function () {
            await server.bind(Object.assign({ host: "0.0.0.0" }, serverOptions));

            assert.equal(server.address().full, `tcp://0.0.0.0:${defaultPort}`);
            await checkBind(server, defaultPort);
        });

        it("bind({ port })", async function () {
            await server.bind(Object.assign({ port: SERVER_PORT }, serverOptions));

            assert.equal(server.address().full, `tcp://127.0.0.1:${SERVER_PORT}`);
            await checkBind(server, SERVER_PORT);
        });

        it("bind({ host, port })", async function () {
            await server.bind(Object.assign({ host: "0.0.0.0", port: SERVER_PORT }, serverOptions));

            assert.equal(server.address().full, `tcp://0.0.0.0:${SERVER_PORT}`);
            await checkBind(server, SERVER_PORT);
        });

        it("double bind error", async function () {
            try {
                await server.bind(Object.assign({ port: SERVER_PORT }, serverOptions));
                await server.bind(Object.assign({ port: SERVER_PORT }, serverOptions));
            } catch (err) {
                assert(err instanceof adone.x.Bind);
                await checkBind(server, SERVER_PORT);
                return;
            }
            assert.fail("Did not thrown any error");
        });

        if (!is.win32) {
            describe("Unix socket", () => {
                it("bind", async function () {
                    await server.bind(Object.assign({ port: UNIX_SOCKET }, serverOptions));
                    expect(server.address().full).to.be.equal(`tcp://${UNIX_SOCKET}`);
                    adone.std.fs.accessSync(UNIX_SOCKET);
                    await checkBind(server, UNIX_SOCKET);
                });

                it("local address", async function () {
                    await server.bind(Object.assign({ port: UNIX_SOCKET }, serverOptions));
                    await client.connect(Object.assign({ port: UNIX_SOCKET }, clientOptions));

                    // console.log(adone.inspect({}, client.getLocalAddress()));
                    // assert.isOk(is.object(client.getLocalAddress()));
                    // assert.isOk(is.string(client.getLocalAddress().port));
                });

                it("remote address", async function () {
                    await server.bind(Object.assign({ port: UNIX_SOCKET }, serverOptions));
                    await client.connect(Object.assign({ port: UNIX_SOCKET }, clientOptions));

                    assert.isOk(is.object(client.getRemoteAddress()));
                    assert.isOk(is.string(client.getRemoteAddress().port));
                });

                it("double bind", async function () {
                    try {
                        await server.bind({ port: UNIX_SOCKET }, Object.assign(serverOptions));
                        const anotherSock = new adone.net.Server();
                        await anotherSock.bind({ port: UNIX_SOCKET }, Object.assign(serverOptions));
                    } catch (err) {
                        assert(err instanceof adone.x.Bind);
                        await checkBind(server, UNIX_SOCKET);
                        return;
                    }
                    assert.fail("Did not thrown any error");
                });
            });
        }

        it("unbind", async function () {
            await server.bind({ port: SERVER_PORT }, Object.assign(serverOptions));
            await server.unbind(SERVER_PORT);
            try {
                await checkBind(server, SERVER_PORT);
            } catch (e) {
                return;
            }
            assert.fail("Did not unbind port");
        });

        it("bind unbind bind", async function () {
            await server.bind({ port: SERVER_PORT }, Object.assign(serverOptions));
            await server.unbind(SERVER_PORT);
            try {
                await checkBind(server, SERVER_PORT);
            } catch (e) {
                await server.bind({ port: SERVER_PORT }, Object.assign(serverOptions));
                await checkBind(server, SERVER_PORT);
                return;
            }
            assert.fail("Did not unbind port");
        });

    });

    describe("Connect", function () {
        it("connect with defaults", async function () {
            await server.bind(Object.assign({ }, serverOptions));
            await client.connect(Object.assign({ }, clientOptions));
        });

        it("connect with 'null' options", async function () {
            await server.bind(Object.assign({ }, serverOptions));
            client = new adone.net.Socket(null, null);
            await client.connect(Object.assign({ }, clientOptions));
        });

        it("reconnect attempts", async function () {
            let reconnects = 0;

            client.on("reconnect attempt", () => {
                ++reconnects;
            });

            try {
                await client.connect(Object.assign({ port: SERVER_PORT }, clientOptions));
            } catch (err) {
                assert(err instanceof adone.x.Connect);
                assert.equal(reconnects, 3);
                return;
            }
            assert.fail("Did not thrown any error");
        });

        it("double reconnect attempts", async function () {
            async function testReconnect() {
                let reconnects = 0;

                client.on("reconnect attempt", () => {
                    ++reconnects;
                });

                try {
                    await client.connect(Object.assign({ port: SERVER_PORT }, clientOptions));
                } catch (err) {
                    assert(err instanceof adone.x.Connect);
                    assert.equal(reconnects, 3);
                    return;
                }
                assert.fail("Did not thrown any error");
            }

            await testReconnect();
            await testReconnect();
        });

        it("reject connection", async function (done) {
            server.reject = true;
            await server.bind(Object.assign({ port: SERVER_PORT }, serverOptions));
            client.on("disconnect", () => {
                done();
            });
            await client.connect(Object.assign({ port: SERVER_PORT }, clientOptions));
        });

        it("server disconnect", async function (done) {
            await server.bind(Object.assign({ port: SERVER_PORT }, serverOptions));
            client.on("disconnect", () => {
                done();
            });
            await client.connect(Object.assign({ port: SERVER_PORT }, clientOptions));
            server.disconnect();
        });

        it("local & remote addresses after connect", async function () {
            await server.bind(Object.assign({ port: SERVER_PORT }, serverOptions));
            await client.connect(Object.assign({ port: SERVER_PORT }, clientOptions));
            assert.isOk(is.object(client.getRemoteAddress()));
            assert.isOk(is.string(client.getRemoteAddress().full));
            assert.isOk(is.object(client.getLocalAddress()));
            assert.isOk(is.string(client.getLocalAddress().full));
        });

        it("local & remote addresses after disconnect", async function () {
            await server.bind(Object.assign({ port: SERVER_PORT }, serverOptions));
            await client.connect(Object.assign({ port: SERVER_PORT }, clientOptions));
            client.disconnect();
            assert.isOk(is.object(client.getRemoteAddress()));
            assert.isOk(is.string(client.getRemoteAddress().full));
            assert.isOk(is.object(client.getLocalAddress()));
            assert.isOk(is.string(client.getLocalAddress().full));
        });
    });

    describe("Options", function () {
        it("get()", function () {
            const s = new adone.net.Server;
            const c = new adone.net.Socket;

            assert.equal(s.option.protocol, "tcp:");
            assert.equal(c.option.protocol, "tcp:");
            assert.isNotOk(s.option.does_not_exit);
            assert.isNotOk(c.option.does_not_exit);
        });

        it("set()", function () {
            const s = new adone.net.Server;
            const c = new adone.net.Socket;

            s.option.hello = "world";
            c.option.hello = "world";

            assert.equal(s.option.hello, "world");
            assert.equal(c.option.hello, "world");
        });

        it("assign()", function () {
            const s = new adone.net.Server;
            const c = new adone.net.Socket;

            const options = {
                a: "aa",
                b: "bb"
            };

            s.option.assign(options);
            c.option.assign(options);

            assert.equal(s.option.a, "aa");
            assert.equal(s.option.b, "bb");
            assert.equal(c.option.a, "aa");
            assert.equal(c.option.b, "bb");
        });

        it("has()", function () {
            const s = new adone.net.Server;
            const c = new adone.net.Socket;

            s.option.a = "aa";
            c.option.a = "aa";

            assert.isOk(s.option.has("a"));
            assert.isOk(c.option.has("a"));
            assert.isNotOk(s.option.has("b"));
            assert.isNotOk(c.option.has("b"));
        });
    });

    describe("Addresses", function () {
        let server;
        let socket;

        before(async function () {
            server = new adone.net.Server;
            socket = new adone.net.Socket;

            SERVER_PORT === null && (SERVER_PORT = await adone.net.util.getFreePort());

            await server.bind(Object.assign({ port: SERVER_PORT }, serverOptions));
            await socket.connect(Object.assign({ port: SERVER_PORT }, clientOptions));
        });

        after(async function () {
            await socket.disconnect();
            await server.unbind();
        });

        it("server.address()", function () {
            assert.deepEqual(server.address(), {
                port: SERVER_PORT,
                address: "127.0.0.1",
                family: "IPv4",
                full: `tcp://127.0.0.1:${SERVER_PORT}`,
                protocol: "tcp:"
            });
        });

        it("socket.getLocalAddress()", function () {
            const address = socket.getLocalAddress();
            assert.equal(address.address,  "127.0.0.1");
            assert.equal(address.protocol, "tcp:");
            assert.equal(address.full,     `tcp://127.0.0.1:${address.port}`);
        });

        it("socket.getRemoteAddress()", function () {
            assert.deepEqual(socket.getRemoteAddress(), {
                port: SERVER_PORT,
                address: "127.0.0.1",
                family: "IPv4",
                full: `tcp://127.0.0.1:${SERVER_PORT}`,
                protocol: "tcp:"
            });
        });
    });

    describe("socket.isConnected()", function () {
        it("socket.isConnected()", async function () {
            const server = new adone.net.Server;
            const socket = new adone.net.Socket;
            await server.bind(Object.assign({ }, serverOptions));

            await socket.connect(Object.assign({ }, clientOptions));
            assert.equal(socket.isConnected(), true);
            await socket.disconnect();
            assert.equal(socket.isConnected(), false);

            await server.unbind();
        });
    });

    describe("Data", function () {
        it("send 'true'", async function (done) {
            await server.bind(Object.assign({ port: SERVER_PORT }, serverOptions));
            server.setPacketHandler((socket, packet) => {
                try {
                    assert.equal(packet, true);
                    done();
                } catch (e) {
                    done(e);
                }
            });
            await client.connect(Object.assign({ port: SERVER_PORT }, clientOptions));
            client.write(true);
        });

        it("send number", async function (done) {
            const n = 48763;

            await server.bind(Object.assign({ port: SERVER_PORT }, serverOptions));
            server.setPacketHandler((socket, packet) => {
                try {
                    assert.equal(packet, n);
                    done();
                } catch (e) {
                    done(e);
                }
            });
            await client.connect(Object.assign({ port: SERVER_PORT }, clientOptions));
            client.write(n);
        });

        it("send string", async function (done) {
            const str = "interogatorplasmonferometer";

            await server.bind(Object.assign({ port: SERVER_PORT }, serverOptions));
            server.setPacketHandler((socket, packet) => {
                try {
                    assert.equal(packet, str);
                    done();
                } catch (e) {
                    done(e);
                }
            });
            await client.connect(Object.assign({ port: SERVER_PORT }, clientOptions));
            client.write(str);
        });

        it("send array", async function (done) {
            const arr = [123, "testword", false];

            await server.bind(Object.assign({ port: SERVER_PORT }, serverOptions));
            server.setPacketHandler((socket, packet) => {
                try {
                    assert.deepEqual(packet, arr);
                    done();
                } catch (e) {
                    done(e);
                }
            });
            await client.connect(Object.assign({ port: SERVER_PORT }, clientOptions));
            client.write(arr);
        });

        it("send object", async function (done) {
            const obj = { a: 1000000, b: { c: "good", d: [1, 2, 3] }, e: true };

            await server.bind(Object.assign({ port: SERVER_PORT }, serverOptions));
            server.setPacketHandler((socket, packet) => {
                try {
                    assert.deepEqual(packet, obj);
                    done();
                } catch (e) {
                    done(e);
                }
            });
            await client.connect(Object.assign({ port: SERVER_PORT }, clientOptions));
            client.write(obj);
        });

        it("send data after destroy", async function (done) {
            try {
                const obj = { a: 1000000, b: { c: "good", d: [1, 2, 3] }, e: true };

                await server.bind(Object.assign({ port: SERVER_PORT }, serverOptions));
                server.setPacketHandler(() => {
                    done(new Error("Data received"));
                });
                await client.connect(Object.assign({ port: SERVER_PORT }, clientOptions));
                client.disconnect();
                await client.write(obj);
            } catch (err) {
                done();
                return;
            }
            done(new Error("No error thrown"));
        });

        it("echo response", async function (done) {
            const obj = { a: 1000000, b: { c: "good", d: [1, 2, 3] }, e: true };

            await server.bind(Object.assign({ port: SERVER_PORT }, serverOptions));
            server.setPacketHandler((socket, packet) => {
                socket.write(packet);
            });
            await client.connect(Object.assign({ port: SERVER_PORT }, clientOptions));
            client.setCustomHandler((socket, packet) => {
                try {
                    assert.deepEqual(packet, obj);
                    done();
                } catch (e) {
                    done(e);
                }
            });
            await client.write(obj);
        });
    });

    describe("Stability", function () {
        it("10 MB", function (done) {
            const tenMB = "a".repeat(Math.pow(2, 20) * 10);

            server.bind(Object.assign({ port: SERVER_PORT }, serverOptions));
            server.setPacketHandler((socket, packet) => {
                socket.write(packet);
            });
            client.connect(Object.assign({ port: SERVER_PORT }, clientOptions));
            client.setCustomHandler((socket, packet) => {
                try {
                    assert.deepEqual(packet, tenMB);
                    done();
                } catch (e) {
                    done(e);
                }
            });
            client.write(tenMB);
        });

        it("client - write after self disconnect", async function () {
            const data = "a".repeat(Math.pow(2, 10));

            await server.bind(Object.assign({ port: SERVER_PORT }, serverOptions));
            await client.connect(Object.assign({ port: SERVER_PORT }, clientOptions));
            client.disconnect();
            try {
                await client.write(data);
            } catch (e) {
                assert(e instanceof adone.x.IllegalState);
                assert.equal(e.message, "socket is not writable");
                return;
            }
            assert.fail("client.write(data) did not thrown any error");
        });

        it("client - write after server disconnect", async function () {
            const data = "a".repeat(Math.pow(2, 10));

            await server.bind(Object.assign({ port: SERVER_PORT }, serverOptions));
            server.setPacketHandler((socket, packet) => {
                socket.write(packet);
            });
            await client.connect(Object.assign({ port: SERVER_PORT }, clientOptions));
            server.disconnect();
            await adone.promise.delay(10);
            try {
                await client.write(data);
            } catch (e) {
                assert.equal(e.message, "socket is not writable");
                return;
            }

            assert.fail("client.write(data) did not thrown any error");
        });
    });
});
