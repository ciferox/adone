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
                checkerSocket.connect(Object.assign({ port }, clientOptions)).catch(reject);
            });
        }

        it("bind()", async () => {
            await server.bind(Object.assign({ }, serverOptions));
            assert.equal(server.address().full, `tcp://127.0.0.1:${defaultPort}`);
            await checkBind(server, defaultPort);
        });

        it("bind({ port = string address })", async () => {
            await server.bind(Object.assign({ port: `tcp://127.0.0.1:${SERVER_PORT}` }, serverOptions));

            assert.equal(server.address().full, `tcp://127.0.0.1:${SERVER_PORT}`);
            await checkBind(server, SERVER_PORT);
        });

        it("bind({ host })", async () => {
            await server.bind(Object.assign({ host: "0.0.0.0" }, serverOptions));

            assert.equal(server.address().full, `tcp://0.0.0.0:${defaultPort}`);
            await checkBind(server, defaultPort);
        });

        it("bind({ port })", async () => {
            await server.bind(Object.assign({ port: SERVER_PORT }, serverOptions));

            assert.equal(server.address().full, `tcp://127.0.0.1:${SERVER_PORT}`);
            await checkBind(server, SERVER_PORT);
        });

        it("bind({ host, port })", async () => {
            await server.bind(Object.assign({ host: "0.0.0.0", port: SERVER_PORT }, serverOptions));

            assert.equal(server.address().full, `tcp://0.0.0.0:${SERVER_PORT}`);
            await checkBind(server, SERVER_PORT);
        });

        it("double bind error", async () => {
            await server.bind(Object.assign({ port: SERVER_PORT }, serverOptions));
            const err = await assert.throws(async () => server.bind(Object.assign({ port: SERVER_PORT }, serverOptions)));
            assert(err instanceof adone.x.Bind);
            await checkBind(server, SERVER_PORT);
        });

        if (!is.win32) {
            describe("Unix socket", () => {
                it("bind", async () => {
                    await server.bind(Object.assign({ port: UNIX_SOCKET }, serverOptions));
                    expect(server.address().full).to.be.equal(`tcp://${UNIX_SOCKET}`);
                    adone.std.fs.accessSync(UNIX_SOCKET);
                    await checkBind(server, UNIX_SOCKET);
                });

                it("local address", async () => {
                    await server.bind(Object.assign({ port: UNIX_SOCKET }, serverOptions));
                    await client.connect(Object.assign({ port: UNIX_SOCKET }, clientOptions));

                    // console.log(adone.meta.inspect({}, client.getLocalAddress()));
                    // assert.isOk(is.object(client.getLocalAddress()));
                    // assert.isOk(is.string(client.getLocalAddress().port));
                });

                it("remote address", async () => {
                    await server.bind(Object.assign({ port: UNIX_SOCKET }, serverOptions));
                    await client.connect(Object.assign({ port: UNIX_SOCKET }, clientOptions));

                    assert.isOk(is.object(client.getRemoteAddress()));
                    assert.isOk(is.string(client.getRemoteAddress().port));
                });

                it("double bind", async () => {
                    await server.bind({ port: UNIX_SOCKET }, Object.assign(serverOptions));
                    const anotherSock = new adone.net.Server();
                    const err = await assert.throws(async () => anotherSock.bind({ port: UNIX_SOCKET }, Object.assign(serverOptions)));
                    assert(err instanceof adone.x.Bind);
                    await checkBind(server, UNIX_SOCKET);
                });
            });
        }

        it("unbind", async () => {
            await server.bind({ port: SERVER_PORT }, Object.assign(serverOptions));
            await server.unbind(SERVER_PORT);
            await assert.throws(async () => checkBind(server, SERVER_PORT));
        });

        it("bind unbind bind", async () => {
            await server.bind({ port: SERVER_PORT }, Object.assign(serverOptions));
            await server.unbind(SERVER_PORT);
            await assert.throws(async () => checkBind(server, SERVER_PORT));
            await server.bind({ port: SERVER_PORT }, Object.assign(serverOptions));
            await checkBind(server, SERVER_PORT);
        });

    });

    describe("Connect", () => {
        it("connect with defaults", async () => {
            await server.bind(Object.assign({ }, serverOptions));
            await client.connect(Object.assign({ }, clientOptions));
        });

        it("connect with 'null' options", async () => {
            await server.bind(Object.assign({ }, serverOptions));
            client = new adone.net.Socket(null, null);
            await client.connect(Object.assign({ }, clientOptions));
        });

        it("reconnect attempts", async () => {
            let reconnects = 0;

            client.on("reconnect attempt", () => {
                ++reconnects;
            });

            const err = await assert.throws(async () => client.connect(Object.assign({ port: SERVER_PORT }, clientOptions)));
            assert(err instanceof adone.x.Connect);
            assert.equal(reconnects, 3);
        });

        it("double reconnect attempts", async () => {
            async function testReconnect() {
                let reconnects = 0;

                client.on("reconnect attempt", () => {
                    ++reconnects;
                });

                const err = await assert.throws(async () => client.connect(Object.assign({ port: SERVER_PORT }, clientOptions)));
                assert(err instanceof adone.x.Connect);
                assert.equal(reconnects, 3);
            }

            await testReconnect();
            await testReconnect();
        });

        it("reject connection", async (done) => {
            server.reject = true;
            await server.bind(Object.assign({ port: SERVER_PORT }, serverOptions));
            client.on("disconnect", () => {
                done();
            });
            await client.connect(Object.assign({ port: SERVER_PORT }, clientOptions));
        });

        it("server disconnect", async (done) => {
            await server.bind(Object.assign({ port: SERVER_PORT }, serverOptions));
            client.on("disconnect", () => {
                done();
            });
            await client.connect(Object.assign({ port: SERVER_PORT }, clientOptions));
            server.disconnect();
        });

        it("local & remote addresses after connect", async () => {
            await server.bind(Object.assign({ port: SERVER_PORT }, serverOptions));
            await client.connect(Object.assign({ port: SERVER_PORT }, clientOptions));
            assert.isOk(is.object(client.getRemoteAddress()));
            assert.isOk(is.string(client.getRemoteAddress().full));
            assert.isOk(is.object(client.getLocalAddress()));
            assert.isOk(is.string(client.getLocalAddress().full));
        });

        it("local & remote addresses after disconnect", async () => {
            await server.bind(Object.assign({ port: SERVER_PORT }, serverOptions));
            await client.connect(Object.assign({ port: SERVER_PORT }, clientOptions));
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

            await server.bind(Object.assign({ port: SERVER_PORT }, serverOptions));
            await socket.connect(Object.assign({ port: SERVER_PORT }, clientOptions));
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
            await server.bind(Object.assign({ }, serverOptions));

            await socket.connect(Object.assign({ }, clientOptions));
            assert.equal(socket.isConnected(), true);
            await socket.disconnect();
            assert.equal(socket.isConnected(), false);

            await server.unbind();
        });
    });

    describe("Data", () => {
        it("send 'true'", async (done) => {
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

        it("send number", async (done) => {
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

        it("send string", async (done) => {
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

        it("send array", async (done) => {
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

        it("send object", async (done) => {
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

        it("send data after destroy", async (done) => {
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

        it("echo response", async (done) => {
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

    describe("Stability", () => {
        it("10 MB", (done) => {
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

        it("client - write after self disconnect", async () => {
            const data = "a".repeat(Math.pow(2, 10));

            await server.bind(Object.assign({ port: SERVER_PORT }, serverOptions));
            await client.connect(Object.assign({ port: SERVER_PORT }, clientOptions));
            client.disconnect();
            const e = await assert.throws(async () => client.write(data));
            assert(e instanceof adone.x.IllegalState);
            assert.equal(e.message, "Socket is not writable");
        });

        it("client - write after server disconnect", async () => {
            const data = "a".repeat(Math.pow(2, 10));

            await server.bind(Object.assign({ port: SERVER_PORT }, serverOptions));
            server.setPacketHandler((socket, packet) => {
                socket.write(packet);
            });
            await client.connect(Object.assign({ port: SERVER_PORT }, clientOptions));
            server.disconnect();
            await adone.promise.delay(10);
            const e = await assert.throws(async () => client.write(data));
            assert.equal(e.message, "Socket is not writable");
        });
    });
});
