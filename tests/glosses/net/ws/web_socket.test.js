const {
    std: { crypto, http, https, fs, os },
    net: { ws: { WebSocket, WebSocketServer, Sender, Receiver } }
} = adone;

/**
 * Server object, which will do the actual emitting
 */
class Server extends adone.std.events {
    constructor(webServer) {
        super();
        this.webServer = webServer;
    }

    close(cb) {
        this.webServer.close(cb);
        if (this._socket) {
            this._socket.end();
        }
    }
}

const server = {
    handlers: {
        closeAfterConnect: closeAfterConnectHandler,
        invalidKey: invalidRequestHandler,
        return401,
        valid: validServer
    },
    createServer: (port, handler, cb) => {
        if (handler && !cb) {
            cb = handler;
            handler = null;
        }

        const webServer = adone.std.http.createServer();
        const srv = new Server(webServer);

        webServer.on("upgrade", (req, socket) => {
            webServer._socket = socket;
            (handler || validServer)(srv, req, socket);
        });

        webServer.listen(port, "127.0.0.1", () => cb(srv));
    }
};

function validServer(server, req, socket) {
    if (!req.headers.upgrade || req.headers.upgrade !== "websocket") {
        throw new Error("invalid headers");
    }

    if (!req.headers["sec-websocket-key"]) {
        throw new Error("websocket key is missing");
    }

    // calc key
    const key = adone.std.crypto.createHash("sha1")
        .update(`${req.headers["sec-websocket-key"]}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`, "binary")
        .digest("base64");

    socket.setTimeout(0);
    socket.setNoDelay(true);

    socket.write(
        "HTTP/1.1 101 Switching Protocols\r\n" +
        "Upgrade: websocket\r\n" +
        "Connection: Upgrade\r\n" +
        `Sec-WebSocket-Accept:${key}\r\n` +
        "\r\n"
    );

    const sender = new Sender(socket);
    const receiver = new Receiver();

    receiver.ontext = (message, flags) => {
        server.emit("message", message, flags);
        sender.send(message);
    };
    receiver.onbinary = (message, flags) => {
        flags = flags || {};
        flags.binary = true;
        server.emit("message", message, flags);
        sender.send(message, { binary: true });
    };
    receiver.onping = (message, flags) => {
        flags = flags || {};
        server.emit("ping", message, flags);
    };
    receiver.onpong = (message, flags) => {
        flags = flags || {};
        server.emit("pong", message, flags);
    };
    receiver.onclose = (code, message, flags) => {
        flags = flags || {};
        sender.close(code, message, false, () => {
            server.emit("close", code, message, flags);
            socket.end();
        });
    };
    socket.on("data", (data) => receiver.add(data));
    socket.on("end", () => socket.end());
}

function invalidRequestHandler(server, req, socket) {
    if (!req.headers.upgrade || req.headers.upgrade !== "websocket") {
        throw new Error("invalid headers");
    }

    if (!req.headers["sec-websocket-key"]) {
        throw new Error("websocket key is missing");
    }

    // calc key
    const key = adone.std.crypto.createHash("sha1")
        .update(`${req.headers["sec-websocket-key"]}bogus`, "latin1")
        .digest("base64");

    socket.write(
        "HTTP/1.1 101 Switching Protocols\r\n" +
        "Upgrade: websocket\r\n" +
        "Connection: Upgrade\r\n" +
        `Sec-WebSocket-Accept:${key}\r\n` +
        "\r\n"
    );
    socket.end();
}

function closeAfterConnectHandler(server, req, socket) {
    if (!req.headers.upgrade || req.headers.upgrade !== "websocket") {
        throw new Error("invalid headers");
    }

    if (!req.headers["sec-websocket-key"]) {
        throw new Error("websocket key is missing");
    }

    // calc key
    const key = adone.std.crypto.createHash("sha1")
        .update(`${req.headers["sec-websocket-key"]}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`, "latin1")
        .digest("base64");

    socket.write(
        "HTTP/1.1 101 Switching Protocols\r\n" +
        "Upgrade: websocket\r\n" +
        "Connection: Upgrade\r\n" +
        `Sec-WebSocket-Accept:${key}\r\n` +
        "\r\n"
    );
    socket.end();
}

function return401(server, req, socket) {
    socket.write(
        `HTTP/1.1 401 ${adone.std.http.STATUS_CODES[401]}\r\n` +
        "Connection: close\r\n" +
        "Content-type: text/html\r\n" +
        "Content-Length: 12\r\n" +
        "\r\n" +
        "Not allowed!"
    );
    socket.end();
}

function getFixturesPath(name) {
    return adone.std.path.join(__dirname, "..", "fixtures", name);
}
let port = 20000;

process.on("uncaughtException", () => { });

describe("WebSocket", () => {
    describe("#ctor", () => {
        it("should return a new instance if called without new", (done) => {
            const ws = new WebSocket("ws://localhost");

            assert.ok(ws instanceof WebSocket);
            ws.on("error", () => done());
        });

        it("throws exception for invalid url", () => {
            assert.throws(() => new WebSocket("echo.websocket.org"));
        });
    });

    describe("options", () => {
        it("should accept an `agent` option", (done) => {
            const agent = { addRequest: () => done() };
            new WebSocket("ws://localhost", { agent });
        });

        // GH-227
        it("should accept the `options` object as the 3rd argument", (done) => {
            const agent = { addRequest: () => done() };
            new WebSocket("ws://localhost", [], { agent });
        });

        it.only("should accept the localAddress option", (done) => {
            // explore existing interfaces
            const devs = os.networkInterfaces();
            const localAddresses = [];

            Object.keys(devs).forEach((name) => {
                devs[name].forEach((ifc) => {
                    if (!ifc.internal && ifc.family === "IPv4") {
                        localAddresses.push(ifc.address);
                    }
                });
            });

            const wss = new WebSocketServer({ port: ++port }, () => {
                const ws = new WebSocket(`ws://localhost:${port}`, {
                    localAddress: localAddresses[0]
                });

                ws.on("open", () => wss.close(done));
            });
        });

        it("should accept the localAddress option whether it was wrong interface", () => {
            assert.throws(
                () => new WebSocket(`ws://localhost:${port}`, { localAddress: "123.456.789.428" }),
                /must be a valid IP: 123.456.789.428/
            );
        });
    });

    describe("properties", () => {
        it("#bytesReceived exposes number of bytes received", (done) => {
            const wss = new WebSocketServer({ port: ++port }, () => {
                const ws = new WebSocket(`ws://localhost:${port}`, { perMessageDeflate: false });
                ws.on("message", () => {
                    assert.strictEqual(ws.bytesReceived, 8);
                    wss.close();
                    done();
                });
            });
            wss.on("connection", (ws) => ws.send("foobar"));
        });

        it("#url exposes the server url", (done) => {
            server.createServer(++port, (srv) => {
                const url = `ws://localhost:${port}`;
                const ws = new WebSocket(url);

                assert.strictEqual(ws.url, url);

                ws.on("close", () => srv.close(done));
                ws.close();
            });
        });

        it("#protocolVersion exposes the protocol version", (done) => {
            server.createServer(++port, (srv) => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                assert.strictEqual(ws.protocolVersion, 13);

                ws.on("close", () => srv.close(done));
                ws.close();
            });
        });

        describe("#bufferedAmount", () => {
            it("defaults to zero", (done) => {
                server.createServer(++port, (srv) => {
                    const ws = new WebSocket(`ws://localhost:${port}`);

                    assert.strictEqual(ws.bufferedAmount, 0);

                    ws.on("close", () => srv.close(done));
                    ws.close();
                });
            });

            it("defaults to zero upon 'open'", (done) => {
                server.createServer(++port, (srv) => {
                    const ws = new WebSocket(`ws://localhost:${port}`);

                    ws.onopen = () => {
                        assert.strictEqual(ws.bufferedAmount, 0);

                        ws.on("close", () => srv.close(done));
                        ws.close();
                    };
                });
            });

            it("stress kernel write buffer", (done) => {
                const wss = new WebSocketServer({ port: ++port }, () => {
                    new WebSocket(`ws://localhost:${port}`, {
                        perMessageDeflate: false
                    });
                });

                wss.on("connection", (ws) => {
                    for (; ;) {
                        if (ws.bufferedAmount > 0) {
                            break;
                        }
                        ws.send("hello".repeat(1e4));
                    }
                    wss.close(done);
                });
            });
        });

        describe("Custom headers", () => {
            it("request has an authorization header", (done) => {
                const server = http.createServer();
                const wss = new WebSocketServer({ server });
                const auth = "test:testpass";

                server.listen(++port, () => {
                    new WebSocket(`ws://${auth}@localhost:${port}`);
                });

                server.on("upgrade", (req) => {
                    assert.ok(req.headers.authorization);
                    assert.strictEqual(
                        req.headers.authorization,
                        `Basic ${new Buffer(auth).toString("base64")}`
                    );

                    wss.close();
                    server.close(done);
                });
            });

            it("accepts custom headers", (done) => {
                const server = http.createServer();
                const wss = new WebSocketServer({ server });

                server.on("upgrade", (req) => {
                    assert.ok(req.headers.cookie);
                    assert.strictEqual(req.headers.cookie, "foo=bar");

                    wss.close();
                    server.close(done);
                });

                server.listen(++port, () => {
                    new WebSocket(`ws://localhost:${port}`, {
                        headers: { Cookie: "foo=bar" }
                    });
                });
            });
        });

        describe("#readyState", () => {
            it("defaults to connecting", (done) => {
                server.createServer(++port, (srv) => {
                    const ws = new WebSocket(`ws://localhost:${port}`);

                    assert.strictEqual(ws.readyState, WebSocket.CONNECTING);

                    ws.on("close", () => srv.close(done));
                    ws.close();
                });
            });

            it("set to open once connection is established", (done) => {
                server.createServer(++port, (srv) => {
                    const ws = new WebSocket(`ws://localhost:${port}`);

                    ws.on("open", () => {
                        assert.strictEqual(ws.readyState, WebSocket.OPEN);
                        ws.close();
                    });

                    ws.on("close", () => srv.close(done));
                });
            });

            it("set to closed once connection is closed", (done) => {
                server.createServer(++port, (srv) => {
                    const ws = new WebSocket(`ws://localhost:${port}`);

                    ws.on("close", () => {
                        assert.strictEqual(ws.readyState, WebSocket.CLOSED);
                        srv.close(done);
                    });

                    ws.close(1001);
                });
            });

            it("set to closed once connection is terminated", (done) => {
                server.createServer(++port, (srv) => {
                    const ws = new WebSocket(`ws://localhost:${port}`);

                    ws.on("close", () => {
                        assert.strictEqual(ws.readyState, WebSocket.CLOSED);
                        srv.close(done);
                    });

                    ws.terminate();
                });
            });
        });

        /*
         * Ready state constants
         */

        const readyStates = {
            CONNECTING: 0,
            OPEN: 1,
            CLOSING: 2,
            CLOSED: 3
        };

        /*
         * Ready state constant tests
         */

        Object.keys(readyStates).forEach((state) => {
            describe(`.${state}`, () => {
                it("is enumerable property of class", () => {
                    const propertyDescripter = Object.getOwnPropertyDescriptor(WebSocket, state);

                    assert.strictEqual(propertyDescripter.value, readyStates[state]);
                    assert.strictEqual(propertyDescripter.enumerable, true);
                });

                it("is property of instance", () => {
                    const ws = new WebSocket("ws://localhost");
                    ws.on("error", () => { });

                    assert.strictEqual(ws[state], readyStates[state]);
                });
            });
        });
    });

    describe("events", () => {
        it("emits a ping event", (done) => {
            const wss = new WebSocketServer({ port: ++port }, () => {
                const ws = new WebSocket(`ws://localhost:${port}`);
                ws.on("ping", () => {
                    wss.close();
                    done();
                });
            });

            wss.on("connection", (client) => client.ping());
        });

        it("emits a pong event", (done) => {
            const wss = new WebSocketServer({ port: ++port }, () => {
                const ws = new WebSocket(`ws://localhost:${port}`);
                ws.on("pong", () => {
                    wss.close();
                    done();
                });
            });

            wss.on("connection", (client) => client.pong());
        });
    });

    describe("connection establishing", () => {
        it("can disconnect before connection is established", (done) => {
            server.createServer(++port, (srv) => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => assert.fail(null, null, "connect shouldnt be raised here"));
                ws.on("close", () => srv.close(done));
                ws.terminate();
            });
        });

        it("can close before connection is established", (done) => {
            server.createServer(++port, (srv) => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => assert.fail(null, null, "connect shouldnt be raised here"));
                ws.on("close", () => srv.close(done));
                ws.close(1001);
            });
        });

        it("can handle error before request is upgraded", (done) => {
            // Here, we don"t create a server, to guarantee that the connection will
            // fail before the request is upgraded
            const ws = new WebSocket(`ws://localhost:${++port}`);

            ws.on("open", () => assert.fail(null, null, "connect shouldnt be raised here"));
            ws.on("error", () => done());
        });

        it("invalid server key is denied", (done) => {
            server.createServer(++port, server.handlers.invalidKey, (srv) => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("error", () => srv.close(done));
            });
        });

        it("close event is raised when server closes connection", (done) => {
            server.createServer(++port, server.handlers.closeAfterConnect, (srv) => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("close", () => srv.close(done));
            });
        });

        it("error is emitted if server aborts connection", (done) => {
            server.createServer(++port, server.handlers.return401, (srv) => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => assert.fail(null, null, "connect shouldnt be raised here"));
                ws.on("error", () => srv.close(done));
            });
        });

        it("unexpected response can be read when sent by server", (done) => {
            server.createServer(++port, server.handlers.return401, (srv) => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => assert.fail(null, null, "connect shouldnt be raised here"));
                ws.on("error", () => assert.fail(null, null, "error shouldnt be raised here"));
                ws.on("unexpected-response", (req, res) => {
                    assert.strictEqual(res.statusCode, 401);

                    let data = "";

                    res.on("data", (v) => {
                        data += v;
                    });

                    res.on("end", () => {
                        assert.strictEqual(data, "Not allowed!");
                        srv.close(done);
                    });
                });
            });
        });

        it("request can be aborted when unexpected response is sent by server", (done) => {
            server.createServer(++port, server.handlers.return401, (srv) => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => assert.fail(null, null, "connect shouldnt be raised here"));
                ws.on("error", () => assert.fail(null, null, "error shouldnt be raised here"));
                ws.on("unexpected-response", (req, res) => {
                    assert.strictEqual(res.statusCode, 401);

                    res.on("end", () => srv.close(done));
                    req.abort();
                });
            });
        });
    });

    describe("connection with query string", () => {
        it("connects when pathname is not null", (done) => {
            const wss = new WebSocketServer({ port: ++port }, () => {
                const ws = new WebSocket(`ws://localhost:${port}/?token=qwerty`);

                ws.on("open", () => wss.close(done));
            });
        });

        it("connects when pathname is null", (done) => {
            const wss = new WebSocketServer({ port: ++port }, () => {
                const ws = new WebSocket(`ws://localhost:${port}?token=qwerty`);

                ws.on("open", () => wss.close(done));
            });
        });
    });

    describe("#pause and #resume", () => {
        it("pauses the underlying stream", (done) => {
            // this test is sort-of racecondition"y, since an unlikely slow connection
            // to localhost can cause the test to succeed even when the stream pausing
            // isn"t working as intended. that is an extremely unlikely scenario, though
            // and an acceptable risk for the test.
            let openCount = 0;
            let serverClient;
            let client;
            let wss = null;

            const onOpen = () => {
                if (++openCount !== 2) {
                    return;
                }

                let paused = true;
                serverClient.on("message", () => {
                    assert.ok(!paused);
                    wss.close();
                    done();
                });
                serverClient.pause();

                setTimeout(() => {
                    paused = false;
                    serverClient.resume();
                }, 200);

                client.send("foo");
            };

            wss = new WebSocketServer({ port: ++port }, () => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                serverClient = ws;
                serverClient.on("open", onOpen);
            });

            wss.on("connection", (ws) => {
                client = ws;
                onOpen();
            });
        });
    });

    describe("#ping", () => {
        it("before connect should fail", (done) => {
            server.createServer(++port, (srv) => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("error", () => { });

                try {
                    ws.ping();
                } catch (e) {
                    srv.close(done);
                    ws.terminate();
                }
            });
        });

        it("before connect can silently fail", (done) => {
            server.createServer(++port, (srv) => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("error", () => { });
                ws.ping("", {}, true);

                srv.close(done);
                ws.terminate();
            });
        });

        it("without message is successfully transmitted to the server", (done) => {
            server.createServer(++port, (srv) => {
                let ws = null;
                srv.on("ping", () => {
                    srv.close(done);
                    ws.terminate();
                });

                ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => ws.ping());
            });
        });

        it("with message is successfully transmitted to the server", (done) => {
            server.createServer(++port, (srv) => {
                let ws = null;
                srv.on("ping", (message) => {
                    assert.strictEqual(message.toString(), "hi");
                    srv.close(done);
                    ws.terminate();
                });

                ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => ws.ping("hi"));
            });
        });

        it("can send safely receive numbers as ping payload", (done) => {
            server.createServer(++port, (srv) => {
                let ws = null;
                srv.on("ping", (message) => {
                    assert.strictEqual(message.toString(), "200");
                    srv.close(done);
                    ws.terminate();
                });

                ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => ws.ping(200));
            });
        });

        it("with encoded message is successfully transmitted to the server", (done) => {
            server.createServer(++port, (srv) => {
                let ws = null;
                srv.on("ping", (message, flags) => {
                    assert.ok(flags.masked);
                    assert.strictEqual(message.toString(), "hi");
                    srv.close(done);
                    ws.terminate();
                });

                ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => ws.ping("hi", { mask: true }));
            });
        });
    });

    describe("#pong", () => {
        it("before connect should fail", (done) => {
            server.createServer(++port, (srv) => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("error", () => { });

                try {
                    ws.pong();
                } catch (e) {
                    srv.close(done);
                    ws.terminate();
                }
            });
        });

        it("before connect can silently fail", (done) => {
            server.createServer(++port, (srv) => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("error", () => { });
                ws.pong("", {}, true);

                srv.close(done);
                ws.terminate();
            });
        });

        it("without message is successfully transmitted to the server", (done) => {
            server.createServer(++port, (srv) => {
                let ws = null;
                srv.on("pong", () => {
                    srv.close(done);
                    ws.terminate();
                });

                ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => ws.pong());
            });
        });

        it("with message is successfully transmitted to the server", (done) => {
            server.createServer(++port, (srv) => {
                let ws = null;
                srv.on("pong", (message) => {
                    assert.strictEqual(message.toString(), "hi");
                    srv.close(done);
                    ws.terminate();
                });

                ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => ws.pong("hi"));
            });
        });

        it("with encoded message is successfully transmitted to the server", (done) => {
            server.createServer(++port, (srv) => {
                let ws = null;
                srv.on("pong", (message, flags) => {
                    assert.ok(flags.masked);
                    assert.strictEqual(message.toString(), "hi");
                    srv.close(done);
                    ws.terminate();
                });

                ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => ws.pong("hi", { mask: true }));
            });
        });
    });

    describe("#send", () => {
        it("very long binary data can be sent and received (with echoing server)", (done) => {
            server.createServer(++port, (srv) => {
                const array = new Float32Array(5 * 1024 * 1024);

                for (let i = 0; i < array.length; ++i) {
                    array[i] = i / 5;
                }

                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => ws.send(array, { binary: true }));
                ws.on("message", (message, flags) => {
                    assert.ok(flags.binary);
                    assert.ok(message.equals(Buffer.from(array.buffer)));
                    srv.close(done);
                    ws.terminate();
                });
            });
        });

        it("can send and receive text data", (done) => {
            server.createServer(++port, (srv) => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => ws.send("hi"));
                ws.on("message", (message) => {
                    assert.strictEqual(message, "hi");
                    srv.close(done);
                    ws.terminate();
                });
            });
        });

        it("does not override the `fin` option", (done) => {
            const wss = new WebSocketServer({ port: ++port }, () => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => {
                    ws.send("fragment", { fin: false });
                    ws.send("fragment", { fin: true });
                });
            });

            wss.on("connection", (ws) => {
                ws.on("message", (msg) => {
                    assert.strictEqual(msg, "fragmentfragment");
                    wss.close(done);
                });
            });
        });

        it("send and receive binary data as an array", (done) => {
            server.createServer(++port, (srv) => {
                const array = new Float32Array(6);

                for (let i = 0; i < array.length; ++i) {
                    array[i] = i / 2;
                }

                const partial = array.subarray(2, 5);
                const buf = Buffer.from(partial.buffer)
                    .slice(partial.byteOffset, partial.byteOffset + partial.byteLength);

                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => ws.send(partial, { binary: true }));
                ws.on("message", (message, flags) => {
                    assert.ok(flags.binary);
                    assert.ok(message.equals(buf));
                    ws.terminate();
                    srv.close();
                    done();
                });
            });
        });

        it("binary data can be sent and received as buffer", (done) => {
            server.createServer(++port, (srv) => {
                const buf = Buffer.from("foobar");
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => ws.send(buf, { binary: true }));
                ws.on("message", (message, flags) => {
                    assert.ok(flags.binary);
                    assert.ok(message.equals(buf));
                    srv.close(done);
                    ws.terminate();
                });
            });
        });

        it("ArrayBuffer is auto-detected without binary flag", (done) => {
            server.createServer(++port, (srv) => {
                const array = new Float32Array(5);

                for (let i = 0; i < array.length; ++i) {
                    array[i] = i / 2;
                }

                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => ws.send(array.buffer));
                ws.onmessage = (event) => {
                    assert.ok(event.binary);
                    assert.ok(event.data.equals(Buffer.from(array.buffer)));
                    srv.close(done);
                    ws.terminate();
                };
            });
        });

        it("Buffer is auto-detected without binary flag", (done) => {
            server.createServer(++port, (srv) => {
                const buf = Buffer.from("foobar");
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => ws.send(buf));

                ws.onmessage = (event) => {
                    assert.ok(event.binary);
                    assert.ok(event.data.equals(buf));
                    srv.close(done);
                    ws.terminate();
                };
            });
        });

        it("before connect should fail", (done) => {
            server.createServer(++port, (srv) => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("error", () => { });

                try {
                    ws.send("hi");
                } catch (e) {
                    srv.close(done);
                    ws.terminate();
                }
            });
        });

        it("before connect should pass error through callback, if present", (done) => {
            server.createServer(++port, (srv) => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.send("hi", (error) => {
                    assert.ok(error instanceof Error);
                    srv.close(done);
                    ws.terminate();
                });
            });
        });

        it("without data should be successful", (done) => {
            server.createServer(++port, (srv) => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => ws.send());

                srv.on("message", (message) => {
                    assert.strictEqual(message, "");
                    srv.close(done);
                    ws.terminate();
                });
            });
        });

        it("calls optional callback when flushed", (done) => {
            server.createServer(++port, (srv) => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => {
                    ws.send("hi", () => {
                        srv.close(done);
                        ws.terminate();
                    });
                });
            });
        });

        it("with unencoded message is successfully transmitted to the server", (done) => {
            server.createServer(++port, (srv) => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => ws.send("hi"));

                srv.on("message", (message) => {
                    assert.strictEqual(message, "hi");
                    srv.close(done);
                    ws.terminate();
                });
            });
        });

        it("with encoded message is successfully transmitted to the server", (done) => {
            server.createServer(++port, (srv) => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => ws.send("hi", { mask: true }));

                srv.on("message", (message, flags) => {
                    assert.ok(flags.masked);
                    assert.strictEqual(message, "hi");
                    srv.close(done);
                    ws.terminate();
                });
            });
        });

        it("with unencoded binary message is successfully transmitted to the server", (done) => {
            server.createServer(++port, (srv) => {
                const array = new Float32Array(5);

                for (let i = 0; i < array.length; ++i) {
                    array[i] = i / 2;
                }

                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => ws.send(array, { binary: true }));

                srv.on("message", (message, flags) => {
                    assert.ok(flags.binary);
                    assert.ok(message.equals(Buffer.from(array.buffer)));
                    srv.close(done);
                    ws.terminate();
                });
            });
        });

        it("with encoded binary message is successfully transmitted to the server", (done) => {
            server.createServer(++port, (srv) => {
                const array = new Float32Array(5);

                for (let i = 0; i < array.length; ++i) {
                    array[i] = i / 2;
                }

                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => ws.send(array, { mask: true, binary: true }));

                srv.on("message", (message, flags) => {
                    assert.ok(flags.binary);
                    assert.ok(flags.masked);
                    assert.ok(message.equals(Buffer.from(array.buffer)));
                    srv.close(done);
                    ws.terminate();
                });
            });
        });

        it("with binary stream will send fragmented data", (done) => {
            server.createServer(++port, (srv) => {
                const ws = new WebSocket(`ws://localhost:${port}`);
                let callbackFired = false;

                ws.on("open", () => {
                    const fileStream = fs.createReadStream(getFixturesPath("textfile"), {
                        highWaterMark: 100
                    });

                    ws.send(fileStream, { binary: true }, (error) => {
                        assert.ifError(error);
                        callbackFired = true;
                    });
                });

                ws.on("close", () => {
                    assert.ok(callbackFired);
                    srv.close(done);
                });

                srv.on("message", (data, flags) => {
                    assert.ok(flags.binary);
                    assert.ok(data.equals(fs.readFileSync(getFixturesPath("textfile"))));

                    ws.close();
                });
            });
        });

        it("with text stream will send fragmented data", (done) => {
            server.createServer(++port, (srv) => {
                const ws = new WebSocket(`ws://localhost:${port}`);
                let callbackFired = false;

                ws.on("open", () => {
                    const fileStream = fs.createReadStream(getFixturesPath("textfile"), {
                        highWaterMark: 100,
                        encoding: "utf8"
                    });

                    ws.send(fileStream, { binary: false }, (error) => {
                        assert.ifError(error);
                        callbackFired = true;
                    });
                });

                ws.on("close", () => {
                    assert.ok(callbackFired);
                    srv.close(done);
                });

                srv.on("message", (data, flags) => {
                    assert.ok(!flags.binary);
                    assert.strictEqual(
                        data,
                        fs.readFileSync(getFixturesPath("textfile"), { encoding: "utf8" })
                    );

                    ws.close();
                });
            });
        });

        it("will cause intermittent send to be delayed in order", (done) => {
            server.createServer(++port, (srv) => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => {
                    const fileStream = fs.createReadStream(getFixturesPath("textfile"), {
                        highWaterMark: 100,
                        encoding: "utf8"
                    });

                    ws.send(fileStream);
                    ws.send("foobar");
                    ws.send("baz");
                });

                let receivedIndex = 0;

                srv.on("message", (data, flags) => {
                    if (++receivedIndex === 1) {
                        assert.ok(!flags.binary);
                        assert.strictEqual(
                            data,
                            fs.readFileSync(getFixturesPath("textfile"), { encoding: "utf8" })
                        );
                    } else if (receivedIndex === 2) {
                        assert.ok(!flags.binary);
                        assert.strictEqual(data, "foobar");
                    } else {
                        assert.ok(!flags.binary);
                        assert.strictEqual(data, "baz");
                        srv.close(done);
                        ws.terminate();
                    }
                });
            });
        });

        it("will cause intermittent stream to be delayed in order", (done) => {
            server.createServer(++port, (srv) => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => {
                    const fileStream = fs.createReadStream(getFixturesPath("textfile"), {
                        highWaterMark: 100,
                        encoding: "utf8"
                    });

                    ws.send(fileStream);

                    let i = 0;
                    ws.stream((error, send) => {
                        assert.ifError(error);

                        if (++i === 1) {
                            send("foo");
                        } else {
                            send("bar", true);
                        }
                    });
                });

                let receivedIndex = 0;

                srv.on("message", (data, flags) => {
                    if (++receivedIndex === 1) {
                        assert.ok(!flags.binary);
                        assert.strictEqual(
                            data,
                            fs.readFileSync(getFixturesPath("textfile"), { encoding: "utf8" })
                        );
                    } else if (receivedIndex === 2) {
                        assert.ok(!flags.binary);
                        assert.strictEqual(data, "foobar");
                        srv.close(done);
                        ws.terminate();
                    }
                });
            });
        });

        it("will cause intermittent ping to be delivered", (done) => {
            server.createServer(++port, (srv) => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => {
                    const fileStream = fs.createReadStream(getFixturesPath("textfile"), {
                        highWaterMark: 100,
                        encoding: "utf8"
                    });

                    ws.send(fileStream);
                    ws.ping("foobar");
                });

                let receivedIndex = 0;

                srv.on("message", (data, flags) => {
                    assert.ok(!flags.binary);
                    assert.strictEqual(
                        data,
                        fs.readFileSync(getFixturesPath("textfile"), { encoding: "utf8" })
                    );
                    if (++receivedIndex === 2) {
                        srv.close(done);
                        ws.terminate();
                    }
                });

                srv.on("ping", (data) => {
                    assert.strictEqual(data.toString(), "foobar");
                    if (++receivedIndex === 2) {
                        srv.close(done);
                        ws.terminate();
                    }
                });
            });
        });

        it("will cause intermittent pong to be delivered", (done) => {
            server.createServer(++port, (srv) => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => {
                    const fileStream = fs.createReadStream(getFixturesPath("textfile"), {
                        highWaterMark: 100,
                        encoding: "utf8"
                    });

                    ws.send(fileStream);
                    ws.pong("foobar");
                });

                let receivedIndex = 0;

                srv.on("message", (data, flags) => {
                    assert.ok(!flags.binary);
                    assert.strictEqual(
                        data,
                        fs.readFileSync(getFixturesPath("textfile"), { encoding: "utf8" })
                    );
                    if (++receivedIndex === 2) {
                        srv.close(done);
                        ws.close();
                    }
                });

                srv.on("pong", (data) => {
                    assert.strictEqual(data.toString(), "foobar");
                    if (++receivedIndex === 2) {
                        srv.close(done);
                        ws.terminate();
                    }
                });
            });
        });

        it("will cause intermittent close to be delivered", (done) => {
            server.createServer(++port, (srv) => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => {
                    const fileStream = fs.createReadStream(getFixturesPath("textfile"), {
                        highWaterMark: 100,
                        encoding: "utf8"
                    });
                    ws.send(fileStream);
                    ws.close(1000, "foobar");
                });

                ws.on("close", () => srv.close(done));
                ws.on("error", () => {
                    // That"s quite alright -- a send was attempted after close
                });

                srv.on("message", (data, flags) => {
                    assert.ok(!flags.binary);
                    assert.strictEqual(
                        data,
                        fs.readFileSync(getFixturesPath("textfile"), { encoding: "utf8" })
                    );
                });

                srv.on("close", (code, data) => {
                    assert.strictEqual(code, 1000);
                    assert.strictEqual(data, "foobar");
                });
            });
        });
    });

    describe("#stream", () => {
        it("very long binary data can be streamed", (done) => {
            server.createServer(++port, (srv) => {
                const buffer = new Buffer(10 * 1024);

                for (let i = 0; i < buffer.length; ++i) {
                    buffer[i] = i % 0xff;
                }

                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => {
                    const bufLen = buffer.length;
                    const blockSize = 800;
                    let i = 0;

                    ws.stream({ binary: true }, (error, send) => {
                        assert.ifError(error);

                        const start = i * blockSize;
                        const toSend = Math.min(blockSize, bufLen - (i * blockSize));
                        const end = start + toSend;
                        const isFinal = toSend < blockSize;

                        send(buffer.slice(start, end), isFinal);
                        i += 1;
                    });
                });

                srv.on("message", (data, flags) => {
                    assert.ok(flags.binary);
                    assert.ok(data.equals(buffer));
                    srv.close(done);
                    ws.terminate();
                });
            });
        });

        it("before connect should pass error through callback", (done) => {
            server.createServer(++port, (srv) => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.stream((error) => {
                    assert.ok(error instanceof Error);
                    srv.close(done);
                    ws.terminate();
                });
            });
        });

        it("without callback should fail", (done) => {
            server.createServer(++port, (srv) => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => {
                    try {
                        ws.stream();
                    } catch (e) {
                        srv.close(done);
                        ws.terminate();
                    }
                });
            });
        });

        it("will cause intermittent send to be delayed in order", (done) => {
            server.createServer(++port, (srv) => {
                const payload = "HelloWorld";
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => {
                    let i = 0;

                    ws.stream((error, send) => {
                        assert.ifError(error);
                        if (++i === 1) {
                            send(payload.substr(0, 5));
                            ws.send("foobar");
                            ws.send("baz");
                        } else {
                            send(payload.substr(5, 5), true);
                        }
                    });
                });

                let receivedIndex = 0;

                srv.on("message", (data, flags) => {
                    if (++receivedIndex === 1) {
                        assert.ok(!flags.binary);
                        assert.strictEqual(data, payload);
                    } else if (receivedIndex === 2) {
                        assert.ok(!flags.binary);
                        assert.strictEqual(data, "foobar");
                    } else {
                        assert.ok(!flags.binary);
                        assert.strictEqual(data, "baz");
                        srv.close(done);
                        ws.terminate();
                    }
                });
            });
        });

        it("will cause intermittent stream to be delayed in order", (done) => {
            server.createServer(++port, (srv) => {
                const payload = "HelloWorld";
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => {
                    let i = 0;

                    ws.stream((error, send) => {
                        assert.ifError(error);
                        if (++i === 1) {
                            send(payload.substr(0, 5));

                            let i2 = 0;

                            ws.stream((error, send) => {
                                assert.ifError(error);
                                if (++i2 === 1) {
                                    send("foo");
                                } else {
                                    send("bar", true);
                                }
                            });

                            ws.send("baz");
                        } else {
                            send(payload.substr(5, 5), true);
                        }
                    });
                });

                let receivedIndex = 0;

                srv.on("message", (data, flags) => {
                    if (++receivedIndex === 1) {
                        assert.ok(!flags.binary);
                        assert.strictEqual(data, payload);
                    } else if (receivedIndex === 2) {
                        assert.ok(!flags.binary);
                        assert.strictEqual(data, "foobar");
                    } else if (receivedIndex === 3) {
                        assert.ok(!flags.binary);
                        assert.strictEqual(data, "baz");
                        setTimeout(() => {
                            srv.close(done);
                            ws.terminate();
                        }, 1000);
                    } else {
                        throw new Error("more messages than we actually sent just arrived");
                    }
                });
            });
        });

        it("will cause intermittent ping to be delivered", (done) => {
            server.createServer(++port, (srv) => {
                const payload = "HelloWorld";
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => {
                    let i = 0;

                    ws.stream((error, send) => {
                        assert.ifError(error);
                        if (++i === 1) {
                            send(payload.substr(0, 5));
                            ws.ping("foobar");
                        } else {
                            send(payload.substr(5, 5), true);
                        }
                    });
                });

                let receivedIndex = 0;

                srv.on("message", (data, flags) => {
                    assert.ok(!flags.binary);
                    assert.strictEqual(data, payload);
                    if (++receivedIndex === 2) {
                        srv.close(done);
                        ws.terminate();
                    }
                });

                srv.on("ping", (data) => {
                    assert.strictEqual(data.toString(), "foobar");
                    if (++receivedIndex === 2) {
                        srv.close(done);
                        ws.terminate();
                    }
                });
            });
        });

        it("will cause intermittent pong to be delivered", (done) => {
            server.createServer(++port, (srv) => {
                const payload = "HelloWorld";
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => {
                    let i = 0;

                    ws.stream((error, send) => {
                        assert.ifError(error);
                        if (++i === 1) {
                            send(payload.substr(0, 5));
                            ws.pong("foobar");
                        } else {
                            send(payload.substr(5, 5), true);
                        }
                    });
                });

                let receivedIndex = 0;

                srv.on("message", (data, flags) => {
                    assert.ok(!flags.binary);
                    assert.strictEqual(data, payload);
                    if (++receivedIndex === 2) {
                        srv.close(done);
                        ws.terminate();
                    }
                });

                srv.on("pong", (data) => {
                    assert.strictEqual(data.toString(), "foobar");
                    if (++receivedIndex === 2) {
                        srv.close(done);
                        ws.terminate();
                    }
                });
            });
        });

        it("will cause intermittent close to be delivered", (done) => {
            server.createServer(++port, (srv) => {
                const payload = "HelloWorld";
                const ws = new WebSocket(`ws://localhost:${port}`);
                let errorGiven = false;

                ws.on("open", () => {
                    let i = 0;

                    ws.stream((error, send) => {
                        if (++i === 1) {
                            send(payload.substr(0, 5));
                            ws.close(1000, "foobar");
                        } else if (i === 2) {
                            send(payload.substr(5, 5), true);
                        } else if (i === 3) {
                            assert.ok(error);
                            errorGiven = true;
                        }
                    });
                });

                ws.on("close", () => {
                    assert.ok(errorGiven);
                    srv.close(done);
                    ws.terminate();
                });

                srv.on("message", (data, flags) => {
                    assert.ok(!flags.binary);
                    assert.strictEqual(data, payload);
                });

                srv.on("close", (code, data) => {
                    assert.strictEqual(code, 1000);
                    assert.strictEqual(data.toString(), "foobar");
                });
            });
        });
    });

    describe("#close", () => {
        it("will raise error callback, if any, if called during send stream", (done) => {
            server.createServer(++port, (srv) => {
                const ws = new WebSocket(`ws://localhost:${port}`);
                let errorGiven = false;

                ws.on("open", () => {
                    const fileStream = fs.createReadStream(getFixturesPath("textfile"), {
                        highWaterMark: 100,
                        encoding: "utf8"
                    });

                    ws.send(fileStream, (error) => {
                        errorGiven = Boolean(error);
                    });
                    ws.close(1000, "foobar");
                });

                ws.on("close", () => {
                    setTimeout(() => {
                        assert.ok(errorGiven);
                        srv.close(done);
                    }, 1000);
                });
            });
        });

        it("without invalid first argument throws exception", (done) => {
            server.createServer(++port, (srv) => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => {
                    try {
                        ws.close("error");
                    } catch (e) {
                        srv.close(done);
                        ws.terminate();
                    }
                });
            });
        });

        it("without reserved error code 1004 throws exception", (done) => {
            server.createServer(++port, (srv) => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => {
                    try {
                        ws.close(1004);
                    } catch (e) {
                        srv.close(done);
                        ws.terminate();
                    }
                });
            });
        });

        it("without message is successfully transmitted to the server", (done) => {
            server.createServer(++port, (srv) => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => ws.close(1000));

                srv.on("close", (code, message) => {
                    assert.strictEqual(message, "");
                    srv.close(done);
                    ws.terminate();
                });
            });
        });

        it("with message is successfully transmitted to the server", (done) => {
            server.createServer(++port, (srv) => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => ws.close(1000, "some reason"));

                srv.on("close", (code, message, flags) => {
                    assert.ok(flags.masked);
                    assert.strictEqual(message, "some reason");
                    srv.close(done);
                    ws.terminate();
                });
            });
        });

        it("with encoded message is successfully transmitted to the server", (done) => {
            server.createServer(++port, (srv) => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => ws.close(1000, "some reason", { mask: true }));

                srv.on("close", (code, message, flags) => {
                    assert.ok(flags.masked);
                    assert.strictEqual(message, "some reason");
                    srv.close(done);
                    ws.terminate();
                });
            });
        });

        it("ends connection to the server", (done) => {
            server.createServer(++port, (srv) => {
                const ws = new WebSocket(`ws://localhost:${port}`);
                let connectedOnce = false;

                ws.on("open", () => {
                    connectedOnce = true;
                    ws.close(1000, "some reason", { mask: true });
                });

                ws.on("close", () => {
                    assert.ok(connectedOnce);
                    srv.close(done);
                    ws.terminate();
                });
            });
        });

        it("consumes all data when the server socket closed", (done) => {
            const wss = new WebSocketServer({ port: ++port }, () => {
                wss.on("connection", (conn) => {
                    conn.send("foo");
                    conn.send("bar");
                    conn.send("baz");
                    conn.close();
                });

                const ws = new WebSocket(`ws://localhost:${port}`);
                const messages = [];

                ws.on("message", (message) => {
                    messages.push(message);
                    if (messages.length === 3) {
                        assert.deepEqual(messages, ["foo", "bar", "baz"]);

                        wss.close(done);
                        ws.terminate();
                    }
                });
            });
        });

        it("allows close code 1013", (done) => {
            const wss = new WebSocketServer({ port: ++port }, () => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("close", (code) => {
                    assert.strictEqual(code, 1013);
                    wss.close(done);
                });
            });

            wss.on("connection", (ws) => ws.close(1013));
        });
    });

    describe("W3C API emulation", () => {
        it("should not throw errors when getting and setting", (done) => {
            server.createServer(++port, (srv) => {
                const ws = new WebSocket(`ws://localhost:${port}`);
                const listener = () => { };

                ws.onmessage = listener;
                ws.onerror = listener;
                ws.onclose = listener;
                ws.onopen = listener;

                assert.strictEqual(ws.binaryType, "nodebuffer");
                ws.binaryType = "arraybuffer";
                assert.strictEqual(ws.binaryType, "arraybuffer");

                assert.strictEqual(ws.onopen, listener);
                assert.strictEqual(ws.onmessage, listener);
                assert.strictEqual(ws.onclose, listener);
                assert.strictEqual(ws.onerror, listener);

                srv.close(done);
                ws.terminate();
            });
        });

        it("should work the same as the EventEmitter api", (done) => {
            server.createServer(++port, (srv) => {
                const ws = new WebSocket(`ws://localhost:${port}`);
                let message = 0;
                let close = 0;
                let open = 0;

                ws.onmessage = (messageEvent) => {
                    assert.strictEqual(messageEvent.data, "foo");
                    ++message;
                    ws.close();
                };

                ws.onopen = () => ++open;
                ws.onclose = () => ++close;

                ws.on("open", () => ws.send("foo"));

                ws.on("close", () => {
                    assert.strictEqual(message, 1);
                    assert.strictEqual(open, 1);
                    assert.strictEqual(close, 1);
                    srv.close(done);
                    ws.terminate();
                });
            });
        });

        it("should receive text data wrapped in a MessageEvent when using addEventListener", (done) => {
            server.createServer(++port, (srv) => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.addEventListener("open", () => ws.send("hi"));
                ws.addEventListener("message", (messageEvent) => {
                    assert.strictEqual(messageEvent.data, "hi");
                    srv.close(done);
                    ws.terminate();
                });
            });
        });

        it("should receive valid CloseEvent when server closes with code 1000", (done) => {
            const wss = new WebSocketServer({ port: ++port }, () => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.addEventListener("close", (closeEvent) => {
                    assert.ok(closeEvent.wasClean);
                    assert.strictEqual(closeEvent.code, 1000);

                    wss.close();
                    done();
                });
            });

            wss.on("connection", (client) => client.close(1000));
        });

        it("should receive valid CloseEvent when server closes with code 1001", (done) => {
            const wss = new WebSocketServer({ port: ++port }, () => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.addEventListener("close", (closeEvent) => {
                    assert.ok(!closeEvent.wasClean);
                    assert.strictEqual(closeEvent.code, 1001);
                    assert.strictEqual(closeEvent.reason, "some daft reason");

                    wss.close();
                    done();
                });
            });

            wss.on("connection", (client) => client.close(1001, "some daft reason"));
        });

        it("should have target set on Events", (done) => {
            const wss = new WebSocketServer({ port: ++port }, () => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.addEventListener("open", (openEvent) => {
                    assert.strictEqual(openEvent.target, ws);
                });
                ws.addEventListener("message", (messageEvent) => {
                    assert.strictEqual(messageEvent.target, ws);
                    wss.close();
                });
                ws.addEventListener("close", (closeEvent) => {
                    assert.strictEqual(closeEvent.target, ws);
                    ws.emit("error", new Error("forced"));
                });
                ws.addEventListener("error", (errorEvent) => {
                    assert.strictEqual(errorEvent.message, "forced");
                    assert.strictEqual(errorEvent.target, ws);

                    done();
                });
            });

            wss.on("connection", (client) => client.send("hi"));
        });

        it("should have type set on Events", (done) => {
            const wss = new WebSocketServer({ port: ++port }, () => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.addEventListener("open", (openEvent) => {
                    assert.strictEqual(openEvent.type, "open");
                });
                ws.addEventListener("message", (messageEvent) => {
                    assert.strictEqual(messageEvent.type, "message");
                    wss.close();
                });
                ws.addEventListener("close", (closeEvent) => {
                    assert.strictEqual(closeEvent.type, "close");
                    ws.emit("error", new Error("forced"));
                });
                ws.addEventListener("error", (errorEvent) => {
                    assert.strictEqual(errorEvent.message, "forced");
                    assert.strictEqual(errorEvent.type, "error");

                    done();
                });
            });

            wss.on("connection", (client) => client.send("hi"));
        });

        it("should pass binary data as a node.js Buffer by default", (done) => {
            server.createServer(++port, (srv) => {
                const array = new Uint8Array(4096);
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.onopen = () => ws.send(array, { binary: true });
                ws.onmessage = (messageEvent) => {
                    assert.ok(messageEvent.binary);
                    assert.strictEqual(ws.binaryType, "nodebuffer");
                    assert.ok(messageEvent.data instanceof Buffer);
                    srv.close(done);
                    ws.terminate();
                };
            });
        });

        it("should pass an ArrayBuffer for event.data if binaryType = arraybuffer", (done) => {
            server.createServer(++port, (srv) => {
                const array = new Uint8Array(4096);
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.binaryType = "arraybuffer";

                ws.onopen = () => ws.send(array, { binary: true });
                ws.onmessage = (messageEvent) => {
                    assert.ok(messageEvent.binary);
                    assert.ok(messageEvent.data instanceof ArrayBuffer);
                    srv.close(done);
                    ws.terminate();
                };
            });
        });

        it("should ignore binaryType for text messages", (done) => {
            server.createServer(++port, (srv) => {
                const ws = new WebSocket(`ws://localhost:${port}`);
                ws.binaryType = "arraybuffer";

                ws.onopen = () => ws.send("foobar");
                ws.onmessage = (messageEvent) => {
                    assert.ok(!messageEvent.binary);
                    assert.strictEqual(typeof messageEvent.data, "string");
                    srv.close(done);
                    ws.terminate();
                };
            });
        });
    });

    describe("ssl", () => {
        it("can connect to secure websocket server", (done) => {
            const server = https.createServer({
                cert: fs.readFileSync(getFixturesPath("certificate.pem")),
                key: fs.readFileSync(getFixturesPath("key.pem"))
            });
            const wss = new WebSocketServer({ server });

            wss.on("connection", () => {
                wss.close();
                server.close(done);
            });

            server.listen(++port, () => new WebSocket(`wss://localhost:${port}`, {
                rejectUnauthorized: false
            }));
        });

        it("can connect to secure websocket server with client side certificate", (done) => {
            const server = https.createServer({
                cert: fs.readFileSync(getFixturesPath("certificate.pem")),
                ca: [fs.readFileSync(getFixturesPath("ca1-cert.pem"))],
                key: fs.readFileSync(getFixturesPath("key.pem")),
                requestCert: true
            });

            let success = false;
            const wss = new WebSocketServer({
                verifyClient: (info) => {
                    success = Boolean(info.req.client.authorized);
                    return true;
                },
                server
            });

            wss.on("connection", () => {
                assert.ok(success);
                server.close(done);
                wss.close();
            });

            server.listen(++port, () => {
                new WebSocket(`wss://localhost:${port}`, {
                    cert: fs.readFileSync(getFixturesPath("agent1-cert.pem")),
                    key: fs.readFileSync(getFixturesPath("agent1-key.pem")),
                    rejectUnauthorized: false
                });
            });
        });

        it("cannot connect to secure websocket server via ws://", (done) => {
            const server = https.createServer({
                cert: fs.readFileSync(getFixturesPath("certificate.pem")),
                key: fs.readFileSync(getFixturesPath("key.pem"))
            });
            const wss = new WebSocketServer({ server });

            server.listen(++port, () => {
                const ws = new WebSocket(`ws://localhost:${port}`, {
                    rejectUnauthorized: false
                });

                ws.on("error", () => {
                    server.close(done);
                    wss.close();
                });
            });
        });

        it("can send and receive text data", (done) => {
            const server = https.createServer({
                cert: fs.readFileSync(getFixturesPath("certificate.pem")),
                key: fs.readFileSync(getFixturesPath("key.pem"))
            });
            const wss = new WebSocketServer({ server });

            wss.on("connection", (ws) => {
                ws.on("message", (message) => {
                    assert.strictEqual(message, "foobar");
                    server.close(done);
                    wss.close();
                });
            });

            server.listen(++port, () => {
                const ws = new WebSocket(`wss://localhost:${port}`, {
                    rejectUnauthorized: false
                });

                ws.on("open", () => ws.send("foobar"));
            });
        });

        it("can send and receive very long binary data", (done) => {
            const buf = crypto.randomBytes(5 * 1024 * 1024);
            const server = https.createServer({
                cert: fs.readFileSync(getFixturesPath("certificate.pem")),
                key: fs.readFileSync(getFixturesPath("key.pem"))
            });
            const wss = new WebSocketServer({ server });

            wss.on("connection", (ws) => {
                ws.on("message", (message) => ws.send(message));
            });

            server.listen(++port, () => {
                const ws = new WebSocket(`wss://localhost:${port}`, {
                    rejectUnauthorized: false
                });

                ws.on("open", () => ws.send(buf));
                ws.on("message", (message, flags) => {
                    assert.strictEqual(flags.binary, true);
                    assert.ok(buf.equals(message));

                    server.close(done);
                    wss.close();
                });
            });
        });
    });

    describe("protocol support discovery", () => {
        describe("#supports", () => {
            describe("#binary", () => {
                it("returns true", (done) => {
                    const wss = new WebSocketServer({ port: ++port }, () => {
                        new WebSocket(`ws://localhost:${port}`);
                    });

                    wss.on("connection", (client) => {
                        assert.strictEqual(client.supports.binary, true);
                        wss.close();
                        done();
                    });
                });
            });
        });
    });

    describe("host and origin headers", () => {
        it("includes the host header with port number", (done) => {
            const server = http.createServer();

            server.listen(++port, () => {
                let ws = null;
                server.on("upgrade", (req, socket) => {
                    assert.strictEqual(req.headers.host, `localhost:${port}`);
                    ws.terminate();
                    socket.destroy();
                    server.close(done);
                });

                ws = new WebSocket(`ws://localhost:${port}`);
            });
        });

        it("lacks default origin header", (done) => {
            const server = http.createServer();

            server.listen(++port, () => {
                let ws = null;
                server.on("upgrade", (req, socket) => {
                    assert.strictEqual(req.headers.origin, undefined);
                    ws.terminate();
                    server.close(done);
                    socket.destroy();
                });

                ws = new WebSocket(`ws://localhost:${port}`);
            });
        });

        it("honors origin set in options", (done) => {
            const server = http.createServer();

            server.listen(++port, () => {
                const options = { origin: "https://example.com:8000" };
                let ws = null;
                server.on("upgrade", (req, socket) => {
                    assert.strictEqual(req.headers.origin, options.origin);
                    ws.terminate();
                    server.close(done);
                    socket.destroy();
                });

                ws = new WebSocket(`ws://localhost:${port}`, options);
            });
        });

        it("excludes default ports from host header", () => {
            // can"t create a server listening on ports 80 or 443
            // so we need to expose the method that does this
            const buildHostHeader = adone.net.ws.buildHostHeader;
            let host = buildHostHeader(false, "localhost", 80);
            assert.strictEqual(host, "localhost");
            host = buildHostHeader(false, "localhost", 88);
            assert.strictEqual(host, "localhost:88");
            host = buildHostHeader(true, "localhost", 443);
            assert.strictEqual(host, "localhost");
            host = buildHostHeader(true, "localhost", 8443);
            assert.strictEqual(host, "localhost:8443");
        });
    });

    describe("permessage-deflate", () => {
        it("is enabled by default", (done) => {
            const server = http.createServer();
            const wss = new WebSocketServer({ server, perMessageDeflate: true });

            server.on("upgrade", (req) => {
                assert.ok(req.headers["sec-websocket-extensions"].includes("permessage-deflate"));
            });

            server.listen(++port, () => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => {
                    assert.ok(ws.extensions["permessage-deflate"]);
                    server.close(done);
                    wss.close();
                });
            });
        });

        it("can be disabled", (done) => {
            const server = http.createServer();
            const wss = new WebSocketServer({ server, perMessageDeflate: true });

            server.on("upgrade", (req) => {
                assert.strictEqual(req.headers["sec-websocket-extensions"], undefined);
            });

            server.listen(++port, () => {
                const ws = new WebSocket(`ws://localhost:${port}`, {
                    perMessageDeflate: false
                });

                ws.on("open", () => {
                    server.close(done);
                    wss.close();
                });
            });
        });

        it("can send extension parameters", (done) => {
            const server = http.createServer();
            const wss = new WebSocketServer({ server, perMessageDeflate: true });

            server.on("upgrade", (req) => {
                const extensions = req.headers["sec-websocket-extensions"];

                assert.notStrictEqual(extensions.indexOf("permessage-deflate"), -1);
                assert.notStrictEqual(extensions.indexOf("server_no_context_takeover"), -1);
                assert.notStrictEqual(extensions.indexOf("client_no_context_takeover"), -1);
                assert.notStrictEqual(extensions.indexOf("server_max_window_bits=10"), -1);
                assert.notStrictEqual(extensions.indexOf("client_max_window_bits"), -1);
            });

            server.listen(++port, () => {
                const ws = new WebSocket(`ws://localhost:${port}`, {
                    perMessageDeflate: {
                        serverNoContextTakeover: true,
                        clientNoContextTakeover: true,
                        serverMaxWindowBits: 10,
                        clientMaxWindowBits: true
                    }
                });

                ws.on("open", () => {
                    server.close(done);
                    wss.close();
                });
            });
        });

        it("can send and receive text data", (done) => {
            const wss = new WebSocketServer({
                perMessageDeflate: true,
                port: ++port
            }, () => {
                const ws = new WebSocket(`ws://localhost:${port}`, {
                    perMessageDeflate: true
                });

                ws.on("open", () => ws.send("hi", { compress: true }));
                ws.on("message", (message) => {
                    assert.strictEqual(message, "hi");
                    wss.close();
                    done();
                });
            });

            wss.on("connection", (ws) => {
                ws.on("message", (message) => ws.send(message, {
                    compress: true
                }));
            });
        });

        it("can send and receive a typed array", (done) => {
            const array = new Float32Array(5);

            for (let i = 0; i < array.length; i++) {
                array[i] = i / 2;
            }

            const wss = new WebSocketServer({
                perMessageDeflate: true,
                port: ++port
            }, () => {
                const ws = new WebSocket(`ws://localhost:${port}`, {
                    perMessageDeflate: true
                });

                ws.on("open", () => ws.send(array, { compress: true }));
                ws.on("message", (message) => {
                    assert.ok(message.equals(Buffer.from(array.buffer)));
                    wss.close();
                    done();
                });
            });

            wss.on("connection", (ws) => {
                ws.on("message", (message) => ws.send(message, {
                    compress: true
                }));
            });
        });

        it("can send and receive ArrayBuffer", (done) => {
            const array = new Float32Array(5);

            for (let i = 0; i < array.length; i++) {
                array[i] = i / 2;
            }

            const wss = new WebSocketServer({
                perMessageDeflate: true,
                port: ++port
            }, () => {
                const ws = new WebSocket(`ws://localhost:${port}`, {
                    perMessageDeflate: true
                });

                ws.on("open", () => ws.send(array.buffer, { compress: true }));
                ws.on("message", (message) => {
                    assert.ok(message.equals(Buffer.from(array.buffer)));
                    wss.close();
                    done();
                });
            });

            wss.on("connection", (ws) => {
                ws.on("message", (message) => ws.send(message, {
                    compress: true
                }));
            });
        });

        it("with binary stream will send fragmented data", (done) => {
            const wss = new WebSocketServer({
                perMessageDeflate: true,
                port: ++port
            }, () => {
                const ws = new WebSocket(`ws://localhost:${port}`, {
                    perMessageDeflate: true
                });

                let callbackFired = false;

                ws.on("open", () => {
                    const fileStream = fs.createReadStream(getFixturesPath("textfile"), {
                        highWaterMark: 100
                    });

                    ws.send(fileStream, { binary: true, compress: true }, (error) => {
                        assert.ifError(error);
                        callbackFired = true;
                    });
                });

                ws.on("close", () => {
                    assert.ok(callbackFired);
                    wss.close();
                    done();
                });
            });

            wss.on("connection", (ws) => {
                ws.on("message", (data, flags) => {
                    assert.ok(flags.binary);
                    assert.ok(data.equals(fs.readFileSync(getFixturesPath("textfile"))));
                    ws.close();
                });
            });
        });

        describe("#send", () => {
            it("can set the compress option true when perMessageDeflate is disabled", (done) => {
                const wss = new WebSocketServer({ port: ++port }, () => {
                    const ws = new WebSocket(`ws://localhost:${port}`, {
                        perMessageDeflate: false
                    });

                    ws.on("open", () => ws.send("hi", { compress: true }));
                    ws.on("message", (message) => {
                        assert.strictEqual(message, "hi");
                        wss.close();
                        done();
                    });
                });

                wss.on("connection", (ws) => {
                    ws.on("message", (message) => ws.send(message, {
                        compress: true
                    }));
                });
            });
        });

        describe("#close", () => {
            it("should not raise error callback, if any, if called during send data", (done) => {
                const wss = new WebSocketServer({
                    perMessageDeflate: true,
                    port: ++port
                }, () => {
                    const ws = new WebSocket(`ws://localhost:${port}`, {
                        perMessageDeflate: true
                    });
                    let errorGiven = false;

                    ws.on("open", () => {
                        ws.send("hi", (error) => {
                            errorGiven = Boolean(error);
                        });
                        ws.close();
                    });

                    ws.on("close", () => {
                        setTimeout(() => {
                            assert.ok(!errorGiven);
                            wss.close();
                            done();
                        }, 1000);
                    });
                });
            });
        });

        describe("#terminate", () => {
            it("will raise error callback, if any, if called during send data", (done) => {
                const wss = new WebSocketServer({
                    perMessageDeflate: true,
                    port: ++port
                }, () => {
                    const ws = new WebSocket(`ws://localhost:${port}`, {
                        perMessageDeflate: { threshold: 0 }
                    });
                    let errorGiven = false;

                    ws.on("open", () => {
                        ws.send("hi", (error) => {
                            errorGiven = Boolean(error);
                        });
                        ws.terminate();
                    });

                    ws.on("close", () => {
                        setTimeout(() => {
                            assert.ok(errorGiven);
                            wss.close();
                            done();
                        }, 1000);
                    });
                });
            });

            it("can call during receiving data", (done) => {
                const wss = new WebSocketServer({
                    perMessageDeflate: true,
                    port: ++port
                }, () => {
                    const ws = new WebSocket(`ws://localhost:${port}`, {
                        perMessageDeflate: true
                    });

                    wss.on("connection", (client) => {
                        for (let i = 0; i < 10; i++) {
                            client.send("hi");
                        }
                        client.send("hi", () => ws.terminate());
                    });

                    ws.on("close", () => {
                        setTimeout(() => {
                            wss.close();
                            done();
                        }, 1000);
                    });
                });
            });
        });
    });
});
