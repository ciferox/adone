const { net: { ws: { WebSocket, WebSocketServer } }, std: { fs, http, https, crypto, net } } = adone;
let port = 8000;

describe("net", "ws", "WebSocketServer", () => {
    describe("#ctor", () => {
        it("throws an error if no option object is passed", () => {
            assert.throws(() => new WebSocketServer());
        });

        it("throws an error if no port or server is specified", () => {
            assert.throws(() => new WebSocketServer({}));
        });

        it("emits an error if http server bind fails", (done) => {
            const wss1 = new WebSocketServer({ port: 50003 }, () => {
                const wss2 = new WebSocketServer({ port: 50003 });

                wss2.on("error", () => wss1.close(done));
            });
        });

        it("starts a server on a given port", (done) => {
            const wss = new WebSocketServer({ port: ++port }, () => {
                new WebSocket(`ws://localhost:${port}`);
            });

            wss.on("connection", (client) => wss.close(done));
        });

        it("binds the server on any IPv6 address when available", (done) => {
            const wss = new WebSocketServer({ port: ++port }, () => {
                assert.strictEqual(wss._server.address().address, "::");
                wss.close(done);
            });
        });

        it("uses a precreated http server", (done) => {
            const server = http.createServer();

            server.listen(++port, () => {
                const wss = new WebSocketServer({ server });
                new WebSocket(`ws://localhost:${port}`);

                wss.on("connection", (client) => {
                    wss.close();
                    server.close(done);
                });
            });
        });

        it("426s for non-Upgrade requests", (done) => {
            const wss = new WebSocketServer({ port: ++port }, () => {
                http.get(`http://localhost:${port}`, (res) => {
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

        it("uses a precreated http server listening on unix socket", (done) => {
            //
            // Skip this test on Windows as it throws errors for obvious reasons.
            //
            if (process.platform === "win32") {
                return done();
            }

            const server = http.createServer();
            const sockPath = `/tmp/ws.${crypto.randomBytes(16).toString("hex")}.socket`;

            server.listen(sockPath, () => {
                const wss = new WebSocketServer({ server });

                wss.on("connection", (ws, req) => {
                    if (wss.clients.size === 1) {
                        assert.strictEqual(req.url, "/foo?bar=bar");
                    } else {
                        assert.strictEqual(req.url, "/");
                        wss.close();
                        server.close(done);
                    }
                });

                const ws = new WebSocket(`ws+unix://${sockPath}:/foo?bar=bar`);
                ws.on("open", () => new WebSocket(`ws+unix://${sockPath}`));
            });
        });

        it("will not crash when it receives an unhandled opcode", (done) => {
            const wss = new WebSocketServer({ port: ++port });

            wss.on("connection", (ws) => {
                ws.onerror = () => wss.close(done);
            });

            const ws = new WebSocket(`ws://localhost:${port}/`);

            ws.onopen = () => ws._socket.write(Buffer.from([0x85, 0x00]));
        });
    });

    describe("#close", () => {
        it("does not thrown when called twice", (done) => {
            const wss = new WebSocketServer({ port: ++port }, () => {
                wss.close();
                wss.close();
                wss.close();

                done();
            });
        });

        it("closes all clients", (done) => {
            let closes = 0;
            const wss = new WebSocketServer({ port: ++port }, () => {
                const ws = new WebSocket(`ws://localhost:${port}`);
                ws.on("close", () => {
                    if (++closes === 2) {
                        done();
                    }
                });
            });
            
            wss.on("connection", (client) => {
                client.on("close", () => {
                    if (++closes === 2) {
                        done();
                    }
                });
                wss.close();
            });
        });

        it("does not close a precreated server", (done) => {
            const server = http.createServer();
            const realClose = server.close;

            server.close = () => {
                throw new Error("must not close pre-created server");
            };

            const wss = new WebSocketServer({ server });

            wss.on("connection", (ws) => {
                wss.close();
                server.close = realClose;
                server.close(done);
            });

            server.listen(++port, () => {
                new WebSocket(`ws://localhost:${port}`);
            });
        });

        it("invokes the callback in noServer mode", (done) => {
            const wss = new WebSocketServer({ noServer: true });

            wss.close(done);
        });

        it("cleans event handlers on precreated server", (done) => {
            const server = http.createServer();
            const wss = new WebSocketServer({ server });

            server.listen(++port, () => {
                wss.close(() => {
                    assert.strictEqual(server.listeners("listening").length, 0);
                    assert.strictEqual(server.listeners("upgrade").length, 0);
                    assert.strictEqual(server.listeners("error").length, 0);

                    server.close(done);
                });
            });
        });
    });

    describe("#clients", () => {
        it("returns a list of connected clients", (done) => {
            const wss = new WebSocketServer({ port: ++port }, () => {
                assert.strictEqual(wss.clients.size, 0);
                new WebSocket(`ws://localhost:${port}`);
            });

            wss.on("connection", (ws) => {
                assert.strictEqual(wss.clients.size, 1);
                wss.close(done);
            });
        });

        it("can be disabled", (done) => {
            const wss = new WebSocketServer({ port: ++port, clientTracking: false }, () => {
                assert.strictEqual(wss.clients, undefined);
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("open", () => ws.close());
            });

            wss.on("connection", (ws) => {
                assert.strictEqual(wss.clients, undefined);
                ws.on("close", () => wss.close(done));
            });
        });

        it("is updated when client terminates the connection", (done) => {
            const wss = new WebSocketServer({ port: ++port }, () => {
                const ws = new WebSocket(`ws://localhost:${port}`);

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
            const wss = new WebSocketServer({ port: ++port }, () => {
                const ws = new WebSocket(`ws://localhost:${port}`);

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

    describe("#options", () => {
        it("exposes options passed to constructor", (done) => {
            const wss = new WebSocketServer({ port: ++port }, () => {
                assert.strictEqual(wss.options.port, port);
                wss.close();
                done();
            });
        });
    });

    describe("#maxpayload", () => {
        it("maxpayload is passed on to clients", (done) => {
            const maxPayload = 20480;
            const wss = new WebSocketServer({ port: ++port, maxPayload }, () => {
                new WebSocket(`ws://localhost:${port}`);
            });

            wss.on("connection", (client) => {
                assert.strictEqual(client._maxPayload, maxPayload);
                wss.close();
                done();
            });
        });

        it("maxpayload is passed on to hybi receivers", (done) => {
            const maxPayload = 20480;
            const wss = new WebSocketServer({ port: ++port, maxPayload }, () => {
                new WebSocket(`ws://localhost:${port}`);
            });

            wss.on("connection", (client) => {
                assert.strictEqual(client._receiver._maxPayload, maxPayload);
                wss.close();
                done();
            });
        });

        it("maxpayload is passed on to permessage-deflate", (done) => {
            const maxPayload = 20480;
            const wss = new WebSocketServer({
                perMessageDeflate: true,
                port: ++port,
                maxPayload
            }, () => {
                new WebSocket(`ws://localhost:${port}`);
            });

            wss.on("connection", (client) => {
                assert.strictEqual(
                    client._receiver._extensions[adone.net.ws.PerMessageDeflate.extensionName]._maxPayload,
                    maxPayload
                );
                wss.close();
                done();
            });
        });
    });

    describe("#shouldHandle", () => {
        it("returns true when the path matches", () => {
            const wss = new WebSocketServer({ noServer: true, path: "/foo" });

            assert.strictEqual(wss.shouldHandle({ url: "/foo" }), true);
        });

        it("returns false when the path does not match", () => {
            const wss = new WebSocketServer({ noServer: true, path: "/foo" });

            assert.strictEqual(wss.shouldHandle({ url: "/bar" }), false);
        });
    });

    describe("#handleUpgrade", () => {
        it("can be used for a pre-existing server", (done) => {
            const server = http.createServer();

            server.listen(++port, () => {
                const wss = new WebSocketServer({ noServer: true });

                server.on("upgrade", (req, socket, head) => {
                    wss.handleUpgrade(req, socket, head, (client) => client.send("hello"));
                });

                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("message", (message) => {
                    assert.strictEqual(message, "hello");
                    wss.close();
                    server.close(done);
                });
            });
        });

        it("closes the connection when path does not match", (done) => {
            const wss = new WebSocketServer({ port: ++port, path: "/ws" }, () => {
                const req = http.request({
                    headers: {
                        Connection: "Upgrade",
                        Upgrade: "websocket"
                    },
                    host: "127.0.0.1",
                    port
                });

                req.on("response", (res) => {
                    assert.strictEqual(res.statusCode, 400);
                    wss.close();
                    done();
                });

                req.end();
            });
        });

        it("closes the connection when protocol version is Hixie-76", (done) => {
            const wss = new WebSocketServer({ port: ++port }, () => {
                const req = http.request({
                    headers: {
                        Connection: "Upgrade",
                        Upgrade: "WebSocket",
                        "Sec-WebSocket-Key1": "4 @1  46546xW%0l 1 5",
                        "Sec-WebSocket-Key2": "12998 5 Y3 1  .P00",
                        "Sec-WebSocket-Protocol": "sample"
                    },
                    port
                });

                req.on("response", (res) => {
                    assert.strictEqual(res.statusCode, 400);
                    wss.close();
                    done();
                });

                req.end();
            });
        });
    });

    describe("connection establishing", () => {
        it("does not accept connections with no sec-websocket-key", (done) => {
            const wss = new WebSocketServer({ port: ++port }, () => {
                const req = http.request({
                    headers: {
                        Connection: "Upgrade",
                        Upgrade: "websocket"
                    },
                    host: "127.0.0.1",
                    port
                });

                req.on("response", (res) => {
                    assert.strictEqual(res.statusCode, 400);
                    wss.close();
                    done();
                });

                req.end();
            });

            wss.on("connection", (ws) => {
                done(new Error("connection must not be established"));
            });
        });

        it("does not accept connections with no sec-websocket-version", (done) => {
            const wss = new WebSocketServer({ port: ++port }, () => {
                const req = http.request({
                    headers: {
                        Connection: "Upgrade",
                        Upgrade: "websocket",
                        "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ=="
                    },
                    host: "127.0.0.1",
                    port
                });

                req.on("response", (res) => {
                    assert.strictEqual(res.statusCode, 400);
                    wss.close();
                    done();
                });

                req.end();
            });

            wss.on("connection", (ws) => {
                done(new Error("connection must not be established"));
            });
        });

        it("does not accept connections with invalid sec-websocket-version", (done) => {
            const wss = new WebSocketServer({ port: ++port }, () => {
                const req = http.request({
                    headers: {
                        Connection: "Upgrade",
                        Upgrade: "websocket",
                        "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
                        "Sec-WebSocket-Version": 12
                    },
                    host: "127.0.0.1",
                    port
                });

                req.on("response", (res) => {
                    assert.strictEqual(res.statusCode, 400);
                    wss.close();
                    done();
                });

                req.end();
            });

            wss.on("connection", (ws) => {
                done(new Error("connection must not be established"));
            });
        });

        it("client can be denied", (done) => {
            const wss = new WebSocketServer({
                verifyClient: (o) => false,
                port: ++port
            }, () => {
                const req = http.request({
                    headers: {
                        Connection: "Upgrade",
                        Upgrade: "websocket",
                        "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
                        "Sec-WebSocket-Version": 8,
                        "Sec-WebSocket-Origin": "http://foobar.com"
                    },
                    host: "127.0.0.1",
                    port
                });

                req.on("response", (res) => {
                    assert.strictEqual(res.statusCode, 401);
                    wss.close();
                    done();
                });

                req.end();
            });

            wss.on("connection", (ws) => {
                done(new Error("connection must not be established"));
            });
        });

        it("client can be accepted", (done) => {
            const wss = new WebSocketServer({
                port: ++port,
                verifyClient: (o) => true
            }, () => {
                const req = http.request({
                    headers: {
                        Connection: "Upgrade",
                        Upgrade: "websocket",
                        "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
                        "Sec-WebSocket-Version": 13,
                        Origin: "http://foobar.com"
                    },
                    host: "127.0.0.1",
                    port
                });

                req.end();
            });

            wss.on("connection", (ws) => {
                wss.close();
                done();
            });
        });

        it("verifyClient gets client origin", (done) => {
            let verifyClientCalled = false;
            const wss = new WebSocketServer({
                verifyClient: (info) => {
                    assert.strictEqual(info.origin, "http://foobarbaz.com");
                    verifyClientCalled = true;
                    return false;
                },
                port: ++port
            }, () => {
                const req = http.request({
                    headers: {
                        Connection: "Upgrade",
                        Upgrade: "websocket",
                        "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
                        "Sec-WebSocket-Version": 13,
                        Origin: "http://foobarbaz.com"
                    },
                    host: "127.0.0.1",
                    port
                });

                req.on("response", (res) => {
                    assert.ok(verifyClientCalled);
                    wss.close();
                    done();
                });

                req.end();
            });
        });

        it("verifyClient gets original request", (done) => {
            let verifyClientCalled = false;
            const wss = new WebSocketServer({
                verifyClient: (info) => {
                    assert.strictEqual(
                        info.req.headers["sec-websocket-key"],
                        "dGhlIHNhbXBsZSBub25jZQ=="
                    );
                    verifyClientCalled = true;
                    return false;
                },
                port: ++port
            }, () => {
                const req = http.request({
                    headers: {
                        Connection: "Upgrade",
                        Upgrade: "websocket",
                        "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
                        "Sec-WebSocket-Version": 13,
                        Origin: "http://foobarbaz.com"
                    },
                    host: "127.0.0.1",
                    port
                });

                req.on("response", (res) => {
                    assert.ok(verifyClientCalled);
                    wss.close();
                    done();
                });

                req.end();
            });
        });

        it("verifyClient has secure:true for ssl connections", (done) => {
            const server = https.createServer({
                cert: fs.readFileSync(adone.std.path.join(__dirname, "fixtures/certificate.pem")),
                key: fs.readFileSync(adone.std.path.join(__dirname, "fixtures/key.pem"))
            });

            let success = false;
            const wss = new WebSocketServer({
                verifyClient: (info) => {
                    success = info.secure === true;
                    return true;
                },
                server
            });

            wss.on("connection", (ws) => {
                assert.ok(success);
                wss.close();
                server.close(done);
            });

            server.listen(++port, () => new WebSocket(`wss://localhost:${port}`, {
                rejectUnauthorized: false
            }));
        });

        it("verifyClient has secure:false for non-ssl connections", (done) => {
            const server = http.createServer();

            let success = false;
            const wss = new WebSocketServer({
                server,
                verifyClient: (info) => {
                    success = info.secure === false;
                    return true;
                }
            });

            wss.on("connection", (ws) => {
                assert.ok(success);
                wss.close();
                server.close(done);
            });

            server.listen(++port, () => {
                new WebSocket(`ws://localhost:${port}`);
            });
        });

        it("client can be denied asynchronously", (done) => {
            const wss = new WebSocketServer({
                verifyClient: (o, cb) => process.nextTick(cb, false),
                port: ++port
            }, () => {
                const req = http.request({
                    headers: {
                        Connection: "Upgrade",
                        Upgrade: "websocket",
                        "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
                        "Sec-WebSocket-Version": 8,
                        "Sec-WebSocket-Origin": "http://foobar.com"
                    },
                    host: "127.0.0.1",
                    port
                });

                req.on("response", (res) => {
                    assert.strictEqual(res.statusCode, 401);
                    wss.close();
                    done();
                });

                req.end();
            });

            wss.on("connection", (ws) => {
                done(new Error("connection must not be established"));
            });
        });

        it("client can be denied asynchronously with custom response code", (done) => {
            const wss = new WebSocketServer({
                verifyClient: (o, cb) => process.nextTick(cb, false, 404),
                port: ++port
            }, () => {
                const req = http.request({
                    headers: {
                        Connection: "Upgrade",
                        Upgrade: "websocket",
                        "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
                        "Sec-WebSocket-Version": 8,
                        "Sec-WebSocket-Origin": "http://foobar.com"
                    },
                    host: "127.0.0.1",
                    port
                });

                req.on("response", (res) => {
                    assert.strictEqual(res.statusCode, 404);
                    wss.close();
                    done();
                });

                req.end();
            });

            wss.on("connection", (ws) => {
                done(new Error("connection must not be established"));
            });
        });

        it("client can be accepted asynchronously", (done) => {
            const wss = new WebSocketServer({
                verifyClient: (o, cb) => process.nextTick(cb, true),
                port: ++port
            }, () => {
                const req = http.request({
                    headers: {
                        Connection: "Upgrade",
                        Upgrade: "websocket",
                        "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
                        "Sec-WebSocket-Version": 13,
                        Origin: "http://foobar.com"
                    },
                    host: "127.0.0.1",
                    port
                });

                req.end();
            });

            wss.on("connection", (ws) => {
                wss.close();
                done();
            });
        });

        it("doesn't emit the `connection` event if socket is closed prematurely", (done) => {
            const server = http.createServer();

            server.listen(++port, () => {
                const wss = new WebSocketServer({
                    verifyClient: (o, cb) => setTimeout(cb, 100, true),
                    server
                });

                wss.on("connection", () => {
                    throw new Error("connection event emitted");
                });

                const socket = net.connect({ host: "localhost", port }, () => {
                    socket.write([
                        "GET / HTTP/1.1",
                        "Host: localhost",
                        "Upgrade: websocket",
                        "Connection: Upgrade",
                        "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==",
                        "Sec-WebSocket-Version: 13",
                        "",
                        ""
                    ].join("\r\n"));
                });

                socket.on("end", () => {
                    wss.close();
                    server.close(done);
                });

                socket.setTimeout(50, () => socket.end());
            });
        });

        it("handles messages passed along with the upgrade request (upgrade head)", (done) => {
            const wss = new WebSocketServer({ port: ++port }, () => {
                const req = http.request({
                    headers: {
                        Connection: "Upgrade",
                        Upgrade: "websocket",
                        "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
                        "Sec-WebSocket-Version": 13,
                        Origin: "http://foobar.com"
                    },
                    host: "127.0.0.1",
                    port
                });

                req.write(Buffer.from([0x81, 0x05, 0x48, 0x65, 0x6c, 0x6c, 0x6f]));
                req.end();
            });

            wss.on("connection", (ws) => {
                ws.on("message", (data) => {
                    assert.strictEqual(data, "Hello");
                    wss.close();
                    done();
                });
            });
        });

        it("selects the first protocol by default", (done) => {
            const wss = new WebSocketServer({ port: ++port }, () => {
                const ws = new WebSocket(`ws://localhost:${port}`, ["prot1", "prot2"]);

                ws.on("open", () => {
                    assert.strictEqual(ws.protocol, "prot1");
                    wss.close();
                    done();
                });
            });
        });

        it("selects the last protocol via protocol handler", (done) => {
            const handleProtocols = (protocols, request) => {
                assert.ok(request instanceof http.IncomingMessage);
                assert.strictEqual(request.url, "/");
                return protocols.pop();
            };
            const wss = new WebSocketServer({ handleProtocols, port: ++port }, () => {
                const ws = new WebSocket(`ws://localhost:${port}`, ["prot1", "prot2"]);

                ws.on("open", () => {
                    assert.strictEqual(ws.protocol, "prot2");
                    wss.close(done);
                });
            });
        });

        it("client detects invalid server protocol", (done) => {
            const wss = new WebSocketServer({
                handleProtocols: (ps) => "prot3",
                port: ++port
            }, () => {
                const ws = new WebSocket(`ws://localhost:${port}`, ["prot1", "prot2"]);

                ws.on("open", () => done(new Error("connection must not be established")));
                ws.on("error", () => {
                    wss.close();
                    done();
                });
            });
        });

        it("client detects no server protocol", (done) => {
            const wss = new WebSocketServer({
                handleProtocols: (ps) => { },
                port: ++port
            }, () => {
                const ws = new WebSocket(`ws://localhost:${port}`, ["prot1", "prot2"]);

                ws.on("open", () => done(new Error("connection must not be established")));
                ws.on("error", () => {
                    wss.close();
                    done();
                });
            });
        });

        it("server detects unauthorized protocol handler", (done) => {
            const wss = new WebSocketServer({
                handleProtocols: (ps) => false,
                port: ++port
            }, () => {
                const req = http.request({
                    headers: {
                        Connection: "Upgrade",
                        Upgrade: "websocket",
                        "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
                        "Sec-WebSocket-Version": 13,
                        Origin: "http://foobar.com"
                    },
                    host: "127.0.0.1",
                    port
                });

                req.on("response", (res) => {
                    assert.strictEqual(res.statusCode, 401);
                    wss.close();
                    done();
                });

                req.end();
            });
        });

        it("accept connections with sec-websocket-extensions", (done) => {
            const wss = new WebSocketServer({ port: ++port }, () => {
                const req = http.request({
                    headers: {
                        Connection: "Upgrade",
                        Upgrade: "websocket",
                        "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
                        "Sec-WebSocket-Version": 13,
                        "Sec-WebSocket-Extensions": "permessage-foo; x=10"
                    },
                    host: "127.0.0.1",
                    port
                });

                req.end();
            });

            wss.on("connection", (ws) => {
                wss.close();
                done();
            });
        });

        it("emits the `headers` event", (done) => {
            const wss = new WebSocketServer({ port: ++port }, () => {
                new WebSocket(`ws://localhost:${port}`);

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

    describe("messaging", () => {
        it("can send and receive data", (done) => {
            let data = new Array(65 * 1024);

            for (let i = 0; i < data.length; ++i) {
                data[i] = String.fromCharCode(65 + ~~(25 * Math.random()));
            }
            data = data.join("");

            const wss = new WebSocketServer({ port: ++port }, () => {
                const ws = new WebSocket(`ws://localhost:${port}`);

                ws.on("message", (message) => ws.send(message));
            });

            wss.on("connection", (client) => {
                client.on("message", (message) => {
                    assert.strictEqual(message, data);
                    wss.close();
                    done();
                });

                client.send(data);
            });
        });
    });

    describe("client properties", () => {
        it("protocol is exposed", (done) => {
            const wss = new WebSocketServer({ port: ++port }, () => {
                new WebSocket(`ws://localhost:${port}`, "hi");
            });

            wss.on("connection", (client) => {
                assert.strictEqual(client.protocol, "hi");
                wss.close();
                done();
            });
        });

        it("protocolVersion is exposed", (done) => {
            const wss = new WebSocketServer({ port: ++port }, () => {
                new WebSocket(`ws://localhost:${port}`, { protocolVersion: 8 });
            });

            wss.on("connection", (client) => {
                assert.strictEqual(client.protocolVersion, 8);
                wss.close();
                done();
            });
        });
    });

    describe("permessage-deflate", () => {
        it("accept connections with permessage-deflate extension", (done) => {
            const wss = new WebSocketServer({
                perMessageDeflate: true,
                port: ++port
            }, () => {
                const req = http.request({
                    headers: {
                        Connection: "Upgrade",
                        Upgrade: "websocket",
                        "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
                        "Sec-WebSocket-Version": 13,
                        "Sec-WebSocket-Extensions": "permessage-deflate; client_max_window_bits=8; server_max_window_bits=8; client_no_context_takeover; server_no_context_takeover"
                    },
                    host: "127.0.0.1",
                    port
                });

                req.end();
            });

            wss.on("connection", (ws) => {
                wss.close();
                done();
            });
        });

        it("does not accept connections with not defined extension parameter", (done) => {
            const wss = new WebSocketServer({
                perMessageDeflate: true,
                port: ++port
            }, () => {
                const req = http.request({
                    headers: {
                        Connection: "Upgrade",
                        Upgrade: "websocket",
                        "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
                        "Sec-WebSocket-Version": 13,
                        "Sec-WebSocket-Extensions": "permessage-deflate; foo=15"
                    },
                    host: "127.0.0.1",
                    port
                });

                req.on("response", (res) => {
                    assert.strictEqual(res.statusCode, 400);
                    wss.close();
                    done();
                });

                req.end();
            });

            wss.on("connection", (ws) => {
                done(new Error("connection must not be established"));
            });
        });

        it("does not accept connections with invalid extension parameter", (done) => {
            const wss = new WebSocketServer({
                perMessageDeflate: true,
                port: ++port
            }, () => {
                const req = http.request({
                    headers: {
                        Connection: "Upgrade",
                        Upgrade: "websocket",
                        "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
                        "Sec-WebSocket-Version": 13,
                        "Sec-WebSocket-Extensions": "permessage-deflate; server_max_window_bits=foo"
                    },
                    host: "127.0.0.1",
                    port
                });

                req.on("response", (res) => {
                    assert.strictEqual(res.statusCode, 400);
                    wss.close();
                    done();
                });

                req.end();
            });

            wss.on("connection", (ws) => {
                done(new Error("connection must not be established"));
            });
        });
    });
});
