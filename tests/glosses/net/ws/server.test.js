const {
    net: { ws: { Client, Server } },
    std: { crypto, http, https, net, fs }
} = adone;


describe("net", "ws", "Server", () => {
    const fixture = (name) => adone.std.path.join(__dirname, "fixtures", name);

    describe("#ctor", () => {
        it("throws an error if no option object is passed", () => {
            assert.throws(() => new Server());
        });

        it("throws an error if no port or server is specified", () => {
            assert.throws(() => new Server({}));
        });

        describe("options", () => {
            it("exposes options passed to constructor", (done) => {
                const wss = new Server({ port: 0 }, () => {
                    assert.strictEqual(wss.options.port, 0);
                    wss.close(done);
                });
            });

            it("accepts the `maxPayload` option", (done) => {
                const maxPayload = 20480;
                const wss = new Server({
                    perMessageDeflate: true,
                    maxPayload,
                    port: 0
                }, () => {
                    const port = wss._server.address().port;
                    const ws = new Client(`ws://localhost:${port}`);
                });

                wss.on("connection", (ws) => {
                    assert.strictEqual(ws._receiver._maxPayload, maxPayload);
                    assert.strictEqual(
                        ws._receiver._extensions["permessage-deflate"]._maxPayload,
                        maxPayload
                    );
                    wss.close(done);
                });
            });
        });

        it("emits an error if http server bind fails", (done) => {
            const wss1 = new Server({ port: 0 }, () => {
                const wss2 = new Server({
                    port: wss1._server.address().port
                });

                wss2.on("error", () => wss1.close(done));
            });
        });

        it("starts a server on a given port", (done) => {
            const port = 1337;
            const wss = new Server({ port }, () => {
                const ws = new Client(`ws://localhost:${port}`);
            });

            wss.on("connection", (client) => wss.close(done));
        });

        it("binds the server on any IPv6 address when available", (done) => {
            const wss = new Server({ port: 0 }, () => {
                assert.strictEqual(wss._server.address().address, "::");
                wss.close(done);
            });
        });

        it("uses a precreated http server", (done) => {
            const server = http.createServer();

            server.listen(0, () => {
                const wss = new Server({ server });
                const ws = new Client(`ws://localhost:${server.address().port}`);

                wss.on("connection", (client) => {
                    wss.close();
                    server.close(done);
                });
            });
        });

        it("426s for non-Upgrade requests", (done) => {
            const wss = new Server({ port: 0 }, () => {
                http.get(`http://localhost:${wss._server.address().port}`, (res) => {
                    let body = "";

                    assert.strictEqual(res.statusCode, 426);
                    res.on("data", (chunk) => {
                        body += chunk;
                    });
                    res.on("end", () => {
                        assert.strictEqual(body, http.STATUS_CODES[426]);
                        wss.close(done);
                    });
                });
            });
        });

        it("uses a precreated http server listening on unix socket", function (done) {
            //
            // Skip this test on Windows as it throws errors for obvious reasons.
            //
            if (process.platform === "win32") {
                return this.skip();
            }

            const server = http.createServer();
            const sockPath = `/tmp/ws.${crypto.randomBytes(16).toString("hex")}.socket`;

            server.listen(sockPath, () => {
                const wss = new Server({ server });

                wss.on("connection", (ws, req) => {
                    if (wss.clients.size === 1) {
                        assert.strictEqual(req.url, "/foo?bar=bar");
                    } else {
                        assert.strictEqual(req.url, "/");
                        wss.close();
                        server.close(done);
                    }
                });

                const ws = new Client(`ws+unix://${sockPath}:/foo?bar=bar`);
                ws.on("open", () => new Client(`ws+unix://${sockPath}`));
            });
        });
    });

    describe("#close", () => {
        it("does not thrown when called twice", (done) => {
            const wss = new Server({ port: 0 }, () => {
                wss.close();
                wss.close();
                wss.close();

                done();
            });
        });

        it("closes all clients", (done) => {
            let closes = 0;
            const wss = new Server({ port: 0 }, () => {
                const port = wss._server.address().port;
                const ws = new Client(`ws://localhost:${port}`);
                ws.on("close", () => {
                    if (++closes === 2) {
                        done();
                    }
                });
            });

            wss.on("connection", (ws) => {
                ws.on("close", () => {
                    if (++closes === 2) {
                        done();
                    }
                });
                wss.close();
            });
        });

        it("doesn't close a precreated server", (done) => {
            const server = http.createServer();
            const realClose = server.close;

            server.close = () => {
                done(new Error("Must not close pre-created server"));
            };

            const wss = new Server({ server });

            wss.on("connection", (ws) => {
                wss.close();
                server.close = realClose;
                server.close(done);
            });

            server.listen(0, () => {
                const ws = new Client(`ws://localhost:${server.address().port}`);
            });
        });

        it("invokes the callback in noServer mode", (done) => {
            const wss = new Server({ noServer: true });

            wss.close(done);
        });

        it("cleans event handlers on precreated server", (done) => {
            const server = http.createServer();
            const wss = new Server({ server });

            server.listen(0, () => {
                wss.close(() => {
                    assert.strictEqual(server.listenerCount("listening"), 0);
                    assert.strictEqual(server.listenerCount("upgrade"), 0);
                    assert.strictEqual(server.listenerCount("error"), 0);

                    server.close(done);
                });
            });
        });
    });

    describe("#clients", () => {
        it("returns a list of connected clients", (done) => {
            const wss = new Server({ port: 0 }, () => {
                assert.strictEqual(wss.clients.size, 0);
                const port = wss._server.address().port;
                const ws = new Client(`ws://localhost:${port}`);
            });

            wss.on("connection", (ws) => {
                assert.strictEqual(wss.clients.size, 1);
                wss.close(done);
            });
        });

        it("can be disabled", (done) => {
            const wss = new Server({ port: 0, clientTracking: false }, () => {
                assert.strictEqual(wss.clients, undefined);
                const port = wss._server.address().port;
                const ws = new Client(`ws://localhost:${port}`);

                ws.on("open", () => ws.close());
            });

            wss.on("connection", (ws) => {
                assert.strictEqual(wss.clients, undefined);
                ws.on("close", () => wss.close(done));
            });
        });

        it("is updated when client terminates the connection", (done) => {
            const wss = new Server({ port: 0 }, () => {
                const port = wss._server.address().port;
                const ws = new Client(`ws://localhost:${port}`);

                ws.on("open", () => ws.terminate());
            });

            wss.on("connection", (ws) => {
                ws.on("close", () => {
                    assert.strictEqual(wss.clients.size, 0);
                    wss.close(done);
                });
            });
        });

        it("is updated when client closes the connection", (done) => {
            const wss = new Server({ port: 0 }, () => {
                const port = wss._server.address().port;
                const ws = new Client(`ws://localhost:${port}`);

                ws.on("open", () => ws.close());
            });

            wss.on("connection", (ws) => {
                ws.on("close", () => {
                    assert.strictEqual(wss.clients.size, 0);
                    wss.close(done);
                });
            });
        });
    });

    describe("#shouldHandle", () => {
        it("returns true when the path matches", () => {
            const wss = new Server({ noServer: true, path: "/foo" });

            assert.strictEqual(wss.shouldHandle({ url: "/foo" }), true);
        });

        it("returns false when the path doesn't match", () => {
            const wss = new Server({ noServer: true, path: "/foo" });

            assert.strictEqual(wss.shouldHandle({ url: "/bar" }), false);
        });
    });

    describe("#handleUpgrade", () => {
        it("can be used for a pre-existing server", (done) => {
            const server = http.createServer();

            server.listen(0, () => {
                const wss = new Server({ noServer: true });

                server.on("upgrade", (req, socket, head) => {
                    wss.handleUpgrade(req, socket, head, (client) => client.send("hello"));
                });

                const ws = new Client(`ws://localhost:${server.address().port}`);

                ws.on("message", (message) => {
                    assert.strictEqual(message, "hello");
                    wss.close();
                    server.close(done);
                });
            });
        });

        it("closes the connection when path doesn't match", (done) => {
            const wss = new Server({ port: 0, path: "/ws" }, () => {
                const req = http.get({
                    port: wss._server.address().port,
                    headers: {
                        Connection: "Upgrade",
                        Upgrade: "websocket"
                    }
                });

                req.on("response", (res) => {
                    assert.strictEqual(res.statusCode, 400);
                    wss.close(done);
                });
            });
        });

        it("closes the connection when protocol version is Hixie-76", (done) => {
            const wss = new Server({ port: 0 }, () => {
                const req = http.get({
                    port: wss._server.address().port,
                    headers: {
                        Connection: "Upgrade",
                        Upgrade: "WebSocket",
                        "Sec-WebSocket-Key1": "4 @1  46546xW%0l 1 5",
                        "Sec-WebSocket-Key2": "12998 5 Y3 1  .P00",
                        "Sec-WebSocket-Protocol": "sample"
                    }
                });

                req.on("response", (res) => {
                    assert.strictEqual(res.statusCode, 400);
                    wss.close(done);
                });
            });
        });
    });

    describe("Connection establishing", () => {
        it("fails if the Sec-WebSocket-Key header is invalid", (done) => {
            const wss = new Server({ port: 0 }, () => {
                const req = http.get({
                    port: wss._server.address().port,
                    headers: {
                        Connection: "Upgrade",
                        Upgrade: "websocket"
                    }
                });

                req.on("response", (res) => {
                    assert.strictEqual(res.statusCode, 400);
                    wss.close(done);
                });
            });

            wss.on("connection", (ws) => {
                done(new Error("Unexpected 'connection' event"));
            });
        });

        it("fails is the Sec-WebSocket-Version header is invalid (1/2)", (done) => {
            const wss = new Server({ port: 0 }, () => {
                const req = http.get({
                    port: wss._server.address().port,
                    headers: {
                        Connection: "Upgrade",
                        Upgrade: "websocket",
                        "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ=="
                    }
                });

                req.on("response", (res) => {
                    assert.strictEqual(res.statusCode, 400);
                    wss.close(done);
                });
            });

            wss.on("connection", (ws) => {
                done(new Error("Unexpected 'connection' event"));
            });
        });

        it("fails is the Sec-WebSocket-Version header is invalid (2/2)", (done) => {
            const wss = new Server({ port: 0 }, () => {
                const req = http.get({
                    port: wss._server.address().port,
                    headers: {
                        Connection: "Upgrade",
                        Upgrade: "websocket",
                        "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
                        "Sec-WebSocket-Version": 12
                    }
                });

                req.on("response", (res) => {
                    assert.strictEqual(res.statusCode, 400);
                    wss.close(done);
                });
            });

            wss.on("connection", (ws) => {
                done(new Error("Unexpected 'connection' event"));
            });
        });

        it("fails is the Sec-WebSocket-Extensions header is invalid", (done) => {
            const wss = new Server({
                perMessageDeflate: true,
                port: 0
            }, () => {
                const req = http.get({
                    port: wss._server.address().port,
                    headers: {
                        Connection: "Upgrade",
                        Upgrade: "websocket",
                        "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
                        "Sec-WebSocket-Version": 13,
                        "Sec-WebSocket-Extensions":
                            "permessage-deflate; server_max_window_bits=foo"
                    }
                });

                req.on("response", (res) => {
                    assert.strictEqual(res.statusCode, 400);
                    wss.close(done);
                });
            });

            wss.on("connection", (ws) => {
                done(new Error("Unexpected 'connection' event"));
            });
        });

        describe("`verifyClient`", () => {
            it("can reject client synchronously", (done) => {
                const wss = new Server({
                    verifyClient: (info) => false,
                    port: 0
                }, () => {
                    const req = http.get({
                        port: wss._server.address().port,
                        headers: {
                            Connection: "Upgrade",
                            Upgrade: "websocket",
                            "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
                            "Sec-WebSocket-Version": 8
                        }
                    });

                    req.on("response", (res) => {
                        assert.strictEqual(res.statusCode, 401);
                        wss.close(done);
                    });
                });

                wss.on("connection", (ws) => {
                    done(new Error("Unexpected 'connection' event"));
                });
            });

            it("can accept client synchronously", (done) => {
                const server = https.createServer({
                    cert: fs.readFileSync(fixture("certificate.pem")),
                    key: fs.readFileSync(fixture("key.pem"))
                });

                const wss = new Server({
                    verifyClient: (info) => {
                        assert.strictEqual(info.origin, "https://example.com");
                        assert.strictEqual(
                            info.req.headers["sec-websocket-key"],
                            "dGhlIHNhbXBsZSBub25jZQ=="
                        );
                        assert.ok(info.secure, true);
                        return true;
                    },
                    server
                });

                wss.on("connection", (ws) => {
                    wss.close();
                    server.close(done);
                });

                server.listen(0, () => {
                    const ws = new Client(`wss://localhost:${server.address().port}`, {
                        headers: {
                            "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
                            Origin: "https://example.com"
                        },
                        rejectUnauthorized: false
                    });
                });
            });

            it("can accept client asynchronously", (done) => {
                const wss = new Server({
                    verifyClient: (o, cb) => process.nextTick(cb, true),
                    port: 0
                }, () => {
                    const port = wss._server.address().port;
                    const ws = new Client(`ws://localhost:${port}`);
                });

                wss.on("connection", (ws) => wss.close(done));
            });

            it("can reject client asynchronously", (done) => {
                const wss = new Server({
                    verifyClient: (info, cb) => process.nextTick(cb, false),
                    port: 0
                }, () => {
                    const req = http.get({
                        port: wss._server.address().port,
                        headers: {
                            Connection: "Upgrade",
                            Upgrade: "websocket",
                            "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
                            "Sec-WebSocket-Version": 8
                        }
                    });

                    req.on("response", (res) => {
                        assert.strictEqual(res.statusCode, 401);
                        wss.close(done);
                    });
                });

                wss.on("connection", (ws) => {
                    done(new Error("Unexpected 'connection' event"));
                });
            });

            it("can reject client asynchronously with status code", (done) => {
                const wss = new Server({
                    verifyClient: (info, cb) => process.nextTick(cb, false, 404),
                    port: 0
                }, () => {
                    const req = http.get({
                        port: wss._server.address().port,
                        headers: {
                            Connection: "Upgrade",
                            Upgrade: "websocket",
                            "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
                            "Sec-WebSocket-Version": 8
                        }
                    });

                    req.on("response", (res) => {
                        assert.strictEqual(res.statusCode, 404);
                        wss.close(done);
                    });
                });

                wss.on("connection", (ws) => {
                    done(new Error("Unexpected 'connection' event"));
                });
            });
        });

        it("doesn't emit the 'connection' event if socket is closed prematurely", (done) => {
            const server = http.createServer();

            server.listen(0, () => {
                const wss = new Server({
                    verifyClient: (o, cb) => setTimeout(cb, 100, true),
                    server
                });

                wss.on("connection", () => {
                    done(new Error("Unexpected 'connection' event"));
                });

                const socket = net.connect({
                    port: server.address().port,
                    allowHalfOpen: true
                }, () => {
                    socket.write([
                        "GET / HTTP/1.1",
                        "Host: localhost",
                        "Upgrade: websocket",
                        "Connection: Upgrade",
                        "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==",
                        "Sec-WebSocket-Version: 13",
                        "\r\n"
                    ].join("\r\n"));
                });

                socket.on("end", () => {
                    wss.close();
                    server.close(done);
                });

                socket.setTimeout(50, () => socket.end());
            });
        });

        it("handles data passed along with the upgrade request", (done) => {
            const wss = new Server({ port: 0 }, () => {
                const req = http.request({
                    port: wss._server.address().port,
                    headers: {
                        Connection: "Upgrade",
                        Upgrade: "websocket",
                        "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
                        "Sec-WebSocket-Version": 13
                    }
                });

                req.write(Buffer.from([0x81, 0x05, 0x48, 0x65, 0x6c, 0x6c, 0x6f]));
                req.end();
            });

            wss.on("connection", (ws) => {
                ws.on("message", (data) => {
                    assert.strictEqual(data, "Hello");
                    wss.close(done);
                });
            });
        });

        describe("`handleProtocols`", () => {
            it("can select the last protocol", (done) => {
                const handleProtocols = (protocols, request) => {
                    assert.ok(request instanceof http.IncomingMessage);
                    assert.strictEqual(request.url, "/");
                    return protocols.pop();
                };
                const wss = new Server({ handleProtocols, port: 0 }, () => {
                    const port = wss._server.address().port;
                    const ws = new Client(`ws://localhost:${port}`, ["foo", "bar"]);

                    ws.on("open", () => {
                        assert.strictEqual(ws.protocol, "bar");
                        wss.close(done);
                    });
                });
            });

            it("closes the connection if return value is `false`", (done) => {
                const wss = new Server({
                    handleProtocols: (protocols) => false,
                    port: 0
                }, () => {
                    const req = http.get({
                        port: wss._server.address().port,
                        headers: {
                            Connection: "Upgrade",
                            Upgrade: "websocket",
                            "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
                            "Sec-WebSocket-Version": 13
                        }
                    });

                    req.on("response", (res) => {
                        assert.strictEqual(res.statusCode, 401);
                        wss.close(done);
                    });
                });
            });
        });

        it("emits the `headers` event", (done) => {
            const wss = new Server({ port: 0 }, () => {
                const port = wss._server.address().port;
                const ws = new Client(`ws://localhost:${port}`);

                wss.on("headers", (headers, request) => {
                    assert.deepStrictEqual(headers.slice(0, 3), [
                        "HTTP/1.1 101 Switching Protocols",
                        "Upgrade: websocket",
                        "Connection: Upgrade"
                    ]);
                    assert.ok(request instanceof http.IncomingMessage);
                    assert.strictEqual(request.url, "/");

                    wss.on("connection", () => wss.close(done));
                });
            });
        });
    });

    describe("permessage-deflate", () => {
        it("is disabled by default", (done) => {
            const wss = new Server({ port: 0 }, () => {
                const port = wss._server.address().port;
                const ws = new Client(`ws://localhost:${port}`);
            });

            wss.on("connection", (ws, req) => {
                assert.strictEqual(
                    req.headers["sec-websocket-extensions"],
                    "permessage-deflate; client_max_window_bits"
                );
                assert.strictEqual(ws.extensions, "");
                wss.close(done);
            });
        });

        it("uses configuration options", (done) => {
            const wss = new Server({
                perMessageDeflate: { clientMaxWindowBits: 8 },
                port: 0
            }, () => {
                const port = wss._server.address().port;
                const ws = new Client(`ws://localhost:${port}`);

                ws.on("upgrade", (res) => {
                    assert.strictEqual(
                        res.headers["sec-websocket-extensions"],
                        "permessage-deflate; client_max_window_bits=8"
                    );

                    wss.close(done);
                });
            });
        });
    });
});
