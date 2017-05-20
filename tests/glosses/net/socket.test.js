const { is } = adone;

let SERVER_PORT = null;
const UNIX_SOCKET = adone.std.path.resolve("tmp.sock");

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

describe("Socket", function () {
    let client;
    let server;
    let defaultPort;

    this.timeout(10000);

    beforeEach(async () => {
        client = new ClientSocket();
        server = new ServerSocket();
        server.defaults();
        client.defaults();
        defaultPort = server.option.defaultPort;
        SERVER_PORT === null && (SERVER_PORT = await adone.net.util.getFreePort());
    });

    afterEach(async () => {
        client.disconnect();
        await server.unbind();
    });

    describe("Bind", () => {
        function checkBind(srv, port) {
            return new Promise(async(resolve, reject) => {
                const checkerSocket = new adone.net.Socket();
                srv.on("connection", () => {
                    checkerSocket.disconnect();
                    resolve();
                });
                checkerSocket.on("error", reject);
                checkerSocket.connect({ port }).catch(reject);
            });
        }

        it("bind()", async () => {
            await server.bind();
            assert.equal(server.address().full, `tcp://127.0.0.1:${defaultPort}`);
            await checkBind(server, defaultPort);
        });

        it("bind({ port = string address })", async () => {
            await server.bind({ port: `tcp://127.0.0.1:${SERVER_PORT}` });

            assert.equal(server.address().full, `tcp://127.0.0.1:${SERVER_PORT}`);
            await checkBind(server, SERVER_PORT);
        });

        it("bind({ host })", async () => {
            await server.bind({ host: "0.0.0.0" });

            assert.equal(server.address().full, `tcp://0.0.0.0:${defaultPort}`);
            await checkBind(server, defaultPort);
        });

        it("bind({ port })", async () => {
            await server.bind({ port: SERVER_PORT });

            assert.equal(server.address().full, `tcp://127.0.0.1:${SERVER_PORT}`);
            await checkBind(server, SERVER_PORT);
        });

        it("bind({ host, port })", async () => {
            await server.bind({ host: "0.0.0.0", port: SERVER_PORT });

            assert.equal(server.address().full, `tcp://0.0.0.0:${SERVER_PORT}`);
            await checkBind(server, SERVER_PORT);
        });

        it("double bind error", async () => {
            try {
                await server.bind({ port: SERVER_PORT });
                await server.bind({ port: SERVER_PORT });
            } catch (err) {
                assert(err instanceof adone.x.Bind);
                await checkBind(server, SERVER_PORT);
                return;
            }
            assert.fail("Did not thrown any error");
        });

        if (!is.win32) {
            describe("Unix socket", () => {
                it("bind", async () => {
                    await server.bind({ port: UNIX_SOCKET });
                    expect(server.address().full).to.be.equal(`tcp://${UNIX_SOCKET}`);
                    adone.std.fs.accessSync(UNIX_SOCKET);
                    await checkBind(server, UNIX_SOCKET);
                });

                it("local address", async () => {
                    await server.bind({ port: UNIX_SOCKET });
                    await client.connect({ port: UNIX_SOCKET });

                    assert.isOk(is.object(client.getLocalAddress()));
                    assert.isOk(is.string(client.getLocalAddress().port));
                });

                it("remote address", async () => {
                    await server.bind({ port: UNIX_SOCKET });
                    await client.connect({ port: UNIX_SOCKET });

                    assert.isOk(is.object(client.getRemoteAddress()));
                    assert.isOk(is.string(client.getRemoteAddress().port));
                });

                it("double bind", async () => {
                    try {
                        await server.bind({ port: UNIX_SOCKET });
                        const anotherSock = new adone.net.Server();
                        await anotherSock.bind({ port: UNIX_SOCKET });
                    } catch (err) {
                        assert(err instanceof adone.x.Bind);
                        await checkBind(server, UNIX_SOCKET);
                        return;
                    }
                    assert.fail("Did not thrown any error");
                });
            });
        }

        it("unbind", async () => {
            await server.bind({ port: SERVER_PORT });
            await server.unbind(SERVER_PORT);
            try {
                await checkBind(server, SERVER_PORT);
            } catch (e) {
                return;
            }
            assert.fail("Did not unbind port");
        });

        it("bind unbind bind", async () => {
            await server.bind({ port: SERVER_PORT });
            await server.unbind(SERVER_PORT);
            try {
                await checkBind(server, SERVER_PORT);
            } catch (e) {
                await server.bind({ port: SERVER_PORT });
                await checkBind(server, SERVER_PORT);
                return;
            }
            assert.fail("Did not unbind port");
        });

    });

    describe("Connect", () => {
        it("connect with defaults", async () => {
            await server.bind();
            await client.connect();
        });

        it("connect with 'null' options", async () => {
            await server.bind();
            client = new adone.net.Socket(null, null);
            await client.connect();
        });

        it("reconnect attempts", async () => {
            let reconnects = 0;

            client.on("reconnect attempt", () => {
                ++reconnects;
            });

            try {
                await client.connect({ port: SERVER_PORT });
            } catch (err) {
                assert(err instanceof adone.x.Connect);
                assert.equal(reconnects, 3);
                return;
            }
            assert.fail("Did not thrown any error");
        });

        it("double reconnect attempts", async () => {
            async function testReconnect() {
                let reconnects = 0;

                client.on("reconnect attempt", () => {
                    ++reconnects;
                });

                try {
                    await client.connect({ port: SERVER_PORT });
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

        it("reject connection", async (done) => {
            server.reject = true;
            await server.bind({ port: SERVER_PORT });
            client.on("disconnect", () => {
                done();
            });
            await client.connect({ port: SERVER_PORT });
        });

        it("server disconnect", async (done) => {
            await server.bind({ port: SERVER_PORT });
            client.on("disconnect", () => {
                done();
            });
            await client.connect({ port: SERVER_PORT });
            server.disconnect();
        });

        it("local & remote addresses after connect", async () => {
            await server.bind({ port: SERVER_PORT });
            await client.connect({ port: SERVER_PORT });
            assert.isOk(is.object(client.getRemoteAddress()));
            assert.isOk(is.string(client.getRemoteAddress().full));
            assert.isOk(is.object(client.getLocalAddress()));
            assert.isOk(is.string(client.getLocalAddress().full));
        });

        it("local & remote addresses after disconnect", async () => {
            await server.bind({ port: SERVER_PORT });
            await client.connect({ port: SERVER_PORT });
            client.disconnect();
            assert.isOk(is.object(client.getRemoteAddress()));
            assert.isOk(is.string(client.getRemoteAddress().full));
            assert.isOk(is.object(client.getLocalAddress()));
            assert.isOk(is.string(client.getLocalAddress().full));
        });
    });

    describe("Options", () => {
        it("get()", () => {
            const s = new adone.net.Server();
            const c = new adone.net.Socket();

            assert.equal(s.option.protocol, "tcp:");
            assert.equal(c.option.protocol, "tcp:");
            assert.isNotOk(s.option.does_not_exit);
            assert.isNotOk(c.option.does_not_exit);
        });

        it("set()", () => {
            const s = new adone.net.Server();
            const c = new adone.net.Socket();

            s.option.hello = "world";
            c.option.hello = "world";

            assert.equal(s.option.hello, "world");
            assert.equal(c.option.hello, "world");
        });

        it("assign()", () => {
            const s = new adone.net.Server();
            const c = new adone.net.Socket();

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

        it("has()", () => {
            const s = new adone.net.Server();
            const c = new adone.net.Socket();

            s.option.a = "aa";
            c.option.a = "aa";

            assert.isOk(s.option.has("a"));
            assert.isOk(c.option.has("a"));
            assert.isNotOk(s.option.has("b"));
            assert.isNotOk(c.option.has("b"));
        });
    });

    describe("Addresses", () => {
        let server;
        let socket;

        before(async () => {
            server = new adone.net.Server();
            socket = new adone.net.Socket();

            SERVER_PORT === null && (SERVER_PORT = await adone.net.util.getFreePort());

            await server.bind({ port: SERVER_PORT });
            await socket.connect({ port: SERVER_PORT });
        });

        after(async () => {
            await socket.disconnect();
            await server.unbind();
        });

        it("server.address()", () => {
            assert.deepEqual(server.address(), {
                port: SERVER_PORT,
                address: "127.0.0.1",
                family: "IPv4",
                full: `tcp://127.0.0.1:${SERVER_PORT}`,
                protocol: "tcp:"
            });
        });

        it("socket.getLocalAddress()", () => {
            const address = socket.getLocalAddress();
            assert.equal(address.address, "127.0.0.1");
            assert.equal(address.protocol, "tcp:");
            assert.equal(address.full, `tcp://127.0.0.1:${address.port}`);
        });

        it("socket.getRemoteAddress()", () => {
            assert.deepEqual(socket.getRemoteAddress(), {
                port: SERVER_PORT,
                address: "127.0.0.1",
                family: "IPv4",
                full: `tcp://127.0.0.1:${SERVER_PORT}`,
                protocol: "tcp:"
            });
        });
    });

    describe("socket.isConnected()", () => {
        it("socket.isConnected()", async () => {
            const server = new adone.net.Server();
            const socket = new adone.net.Socket();
            await server.bind();

            await socket.connect();
            assert.equal(socket.isConnected(), true);
            await socket.disconnect();
            assert.equal(socket.isConnected(), false);

            await server.unbind();
        });
    });

    describe("Data", () => {
        it("send 'true'", async (done) => {
            await server.bind({ port: SERVER_PORT });
            server.setPacketHandler((socket, packet) => {
                try {
                    assert.equal(packet, true);
                    done();
                } catch (e) {
                    done(e);
                }
            });
            await client.connect({ port: SERVER_PORT });
            client.write(true);
        });

        it("send number", async (done) => {
            const n = 48763;

            await server.bind({ port: SERVER_PORT });
            server.setPacketHandler((socket, packet) => {
                try {
                    assert.equal(packet, n);
                    done();
                } catch (e) {
                    done(e);
                }
            });
            await client.connect({ port: SERVER_PORT });
            client.write(n);
        });

        it("send string", async (done) => {
            const str = "interogatorplasmonferometer";

            await server.bind({ port: SERVER_PORT });
            server.setPacketHandler((socket, packet) => {
                try {
                    assert.equal(packet, str);
                    done();
                } catch (e) {
                    done(e);
                }
            });
            await client.connect({ port: SERVER_PORT });
            client.write(str);
        });

        it("send array", async (done) => {
            const arr = [123, "testword", false];

            await server.bind({ port: SERVER_PORT });
            server.setPacketHandler((socket, packet) => {
                try {
                    assert.deepEqual(packet, arr);
                    done();
                } catch (e) {
                    done(e);
                }
            });
            await client.connect({ port: SERVER_PORT });
            client.write(arr);
        });

        it("send object", async (done) => {
            const obj = { a: 1000000, b: { c: "good", d: [1, 2, 3] }, e: true };

            await server.bind({ port: SERVER_PORT });
            server.setPacketHandler((socket, packet) => {
                try {
                    assert.deepEqual(packet, obj);
                    done();
                } catch (e) {
                    done(e);
                }
            });
            await client.connect({ port: SERVER_PORT });
            client.write(obj);
        });

        it("send data after destroy", async (done) => {
            try {
                const obj = { a: 1000000, b: { c: "good", d: [1, 2, 3] }, e: true };

                await server.bind({ port: SERVER_PORT });
                server.setPacketHandler(() => {
                    done(new Error("Data received"));
                });
                await client.connect({ port: SERVER_PORT });
                client.disconnect();
                await client.write(obj);
            } catch (err) {
                done();
                return;
            }
            done(new Error("No error thrown"));
        });

        it("echo response", async (done) => {
            const obj = { a: 1000000, b: { c: "good", d: [1, 2, 3] }, e: true };

            await server.bind({ port: SERVER_PORT });
            server.setPacketHandler((socket, packet) => {
                socket.write(packet);
            });
            await client.connect({ port: SERVER_PORT });
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

    describe("Stability", () => {
        it("10 MB", (done) => {
            const tenMB = "a".repeat(Math.pow(2, 20) * 10);

            server.bind({ port: SERVER_PORT });
            server.setPacketHandler((socket, packet) => {
                socket.write(packet);
            });
            client.connect({ port: SERVER_PORT });
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

        it("client - write after self disconnect", async () => {
            const data = "a".repeat(Math.pow(2, 10));

            await server.bind({ port: SERVER_PORT });
            await client.connect({ port: SERVER_PORT });
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

        it("client - write after server disconnect", async () => {
            const data = "a".repeat(Math.pow(2, 10));

            await server.bind({ port: SERVER_PORT });
            server.setPacketHandler((socket, packet) => {
                socket.write(packet);
            });
            await client.connect({ port: SERVER_PORT });
            await server.disconnect();
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
