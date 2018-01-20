const { std: { net: { Socket }, child_process: { execFileSync, execFile } }, net: { proxy: { socks: { createServer, auth, ServerParser: Parser } } } } = adone;

class FakeStream extends adone.event.Emitter {
    pause() {

    }

    resume() {

    }
}

describe("net", "proxy", "socks", "Server", () => {
    describe("parser", () => {
        it("Phase 1 - Valid (whole)", (done) => {
            const stream = new FakeStream();
            const parser = new Parser(stream);
            let methods;
            parser.on("methods", (m) => {
                methods = m;
            }).on("request", () => {
                assert(false, "Unexpected request event");
            }).on("error", (err) => {
                assert(false, `Unexpected error: ${err}`);
            });
            stream.emit("data", Buffer.from([0x05, 0x01, 0x00]));
            assert.deepEqual(methods, Buffer.from([0x00]), `Unexpected methods: ${adone.std.util.inspect(methods)}`);
            done();
        });
        it("Phase 1 - Valid (split)", (done) => {
            const stream = new FakeStream();
            const parser = new Parser(stream);
            let methods;
            parser.on("methods", (m) => {
                methods = m;
            }).on("request", () => {
                assert(false, "Unexpected request event");
            }).on("error", (err) => {
                assert(false, `Unexpected error: ${err}`);
            });
            stream.emit("data", Buffer.from([0x05]));
            stream.emit("data", Buffer.from([0x01]));
            stream.emit("data", Buffer.from([0x00]));
            assert.deepEqual(methods, Buffer.from([0x00]), `Unexpected methods: ${adone.std.util.inspect(methods)}`);
            done();
        });

        it("Phase 1 - Bad version", (done) => {
            const stream = new FakeStream();
            const parser = new Parser(stream);
            const errors = [];
            parser.on("methods", () => {
                assert(false, "Unexpected methods event");
            }).on("request", () => {
                assert(false, "Unexpected request event");
            }).on("error", (err) => {
                errors.push(err);
            });
            stream.emit("data", Buffer.from([0x04, 0x01, 0x00]));
            assert(errors.length === 1 && /Incompatible SOCKS protocol version: 4/i.test(errors[0].message), "Error(s) mismatch");
            done();
        });
        it("Phase 1 - Bad method count", (done) => {
            const stream = new FakeStream();
            const parser = new Parser(stream);
            const errors = [];
            parser.on("methods", () => {
                assert(false, "Unexpected methods event");
            }).on("request", () => {
                assert(false, "Unexpected request event");
            }).on("error", (err) => {
                errors.push(err);
            });
            stream.emit("data", Buffer.from([0x05, 0x00]));
            assert(errors.length === 1 && /empty methods list/i.test(errors[0].message), "Error(s) mismatch");
            done();
        });
        it("Phase 2 - Valid (whole) - CONNECT (IPv4)", (done) => {
            const stream = new FakeStream();
            const parser = new Parser(stream);
            let request;
            parser.authed = true;
            parser.on("methods", () => {
                assert(false, "Unexpected methods event");
            }).on("request", (r) => {
                request = r;
            }).on("error", (err) => {
                assert(false, `Unexpected error: ${err}`);
            });
            stream.emit("data", Buffer.from([0x05,
                0x01,
                0x00,
                0x01,
                0xC0, 0xA8, 0x64, 0x01,
                0x00, 0x50]));
            assert.deepEqual(request,
                {
                    cmd: "connect",
                    srcAddr: undefined,
                    srcPort: undefined,
                    dstAddr: "192.168.100.1",
                    dstPort: 80
                }, "Request mismatch");
            done();
        });
        it("Phase 2 - Valid (whole) - BIND (IPv4)", (done) => {
            const stream = new FakeStream();
            const parser = new Parser(stream);
            let request;
            parser.authed = true;
            parser.on("methods", () => {
                assert(false, "Unexpected methods event");
            }).on("request", (r) => {
                request = r;
            }).on("error", (err) => {
                assert(false, `Unexpected error: ${err}`);
            });
            stream.emit("data", Buffer.from([0x05,
                0x02,
                0x00,
                0x01,
                0xC0, 0xA8, 0x64, 0x01,
                0x00, 0x50]));
            assert.deepEqual(request,
                {
                    cmd: "bind",
                    srcAddr: undefined,
                    srcPort: undefined,
                    dstAddr: "192.168.100.1",
                    dstPort: 80
                }, "Request mismatch");
            done();
        });
        it("Phase 2 - Valid (whole) - UDP ASSOCIATE (IPv4)", (done) => {
            const stream = new FakeStream();
            const parser = new Parser(stream);
            let request;
            parser.authed = true;
            parser.on("methods", () => {
                assert(false, "Unexpected methods event");
            }).on("request", (r) => {
                request = r;
            }).on("error", (err) => {
                assert(false, `Unexpected error: ${err}`);
            });
            stream.emit("data", Buffer.from([0x05,
                0x03,
                0x00,
                0x01,
                0xC0, 0xA8, 0x64, 0x01,
                0x00, 0x50]));
            assert.deepEqual(request,
                {
                    cmd: "udp",
                    srcAddr: undefined,
                    srcPort: undefined,
                    dstAddr: "192.168.100.1",
                    dstPort: 80
                }, "Request mismatch");
            done();
        });

        it("Phase 2 - Valid (whole) - CONNECT (IPv6)", (done) => {
            const stream = new FakeStream();
            const parser = new Parser(stream);
            let request;
            parser.authed = true;
            parser.on("methods", () => {
                assert(false, "Unexpected methods event");
            }).on("request", (r) => {
                request = r;
            }).on("error", (err) => {
                assert(false, `Unexpected error: ${err}`);
            });
            stream.emit("data", Buffer.from([0x05,
                0x01,
                0x00,
                0x04,
                0xFF, 0xFE, 0xE0, 0xD0,
                0x00, 0x0C, 0x00, 0xA0,
                0x00, 0x00, 0x03, 0x00,
                0x00, 0x02, 0xB0, 0x01,
                0x08, 0x40]));
            assert.deepEqual(request,
                {
                    cmd: "connect",
                    srcAddr: undefined,
                    srcPort: undefined,
                    dstAddr: "fffe:e0d0:000c:00a0:0000:0300:0002:b001",
                    dstPort: 2112
                }, "Request mismatch");
            done();
        });

        it("Phase 2 - Valid (whole) - CONNECT (Hostname)", (done) => {
            const stream = new FakeStream();
            const parser = new Parser(stream);
            let request;
            parser.authed = true;
            parser.on("methods", () => {
                assert(false, "Unexpected methods event");
            }).on("request", (r) => {
                request = r;
            }).on("error", (err) => {
                assert(false, `Unexpected error: ${err}`);
            });
            stream.emit("data", Buffer.from([0x05,
                0x01,
                0x00,
                0x03,
                0x0A, 0x6E, 0x6F, 0x64, 0x65, 0x6A, 0x73,
                0x2E, 0x6F, 0x72, 0x67,
                0x05, 0x39]));
            assert.deepEqual(request,
                {
                    cmd: "connect",
                    srcAddr: undefined,
                    srcPort: undefined,
                    dstAddr: "nodejs.org",
                    dstPort: 1337
                }, "Request mismatch");
            done();
        });

        it("Phase 2 - Valid (split) - CONNECT (Hostname)", (done) => {
            const stream = new FakeStream();
            const parser = new Parser(stream);
            let request;
            parser.authed = true;
            parser.on("methods", () => {
                assert(false, "Unexpected methods event");
            }).on("request", (r) => {
                request = r;
            }).on("error", (err) => {
                assert(false, `Unexpected error: ${err}`);
            });
            stream.emit("data", Buffer.from([0x05]));
            stream.emit("data", Buffer.from([0x01, 0x00, 0x03]));
            stream.emit("data", Buffer.from([0x0A]));
            stream.emit("data", Buffer.from([0x6E, 0x6F, 0x64, 0x65, 0x6A, 0x73]));
            stream.emit("data", Buffer.from([0x2E, 0x6F, 0x72]));
            stream.emit("data", Buffer.from([0x67]));
            stream.emit("data", Buffer.from([0x05]));
            stream.emit("data", Buffer.from([0x39]));
            assert.deepEqual(request, {
                cmd: "connect",
                srcAddr: undefined,
                srcPort: undefined,
                dstAddr: "nodejs.org",
                dstPort: 1337
            }, "Request mismatch");
            done();
        });

        it("Phase 2 - Bad version", (done) => {
            const stream = new FakeStream();
            const parser = new Parser(stream);
            const errors = [];
            parser.authed = true;
            parser.on("methods", () => {
                assert(false, "Unexpected methods event");
            }).on("request", () => {
                assert(false, "Unexpected request event");
            }).on("error", (err) => {
                errors.push(err);
            });
            stream.emit("data", Buffer.from([0x04,
                0x01,
                0x00,
                0x01,
                0xC0, 0xA8, 0x64, 0x01,
                0x00, 0x50]));
            assert(errors.length === 1 && /Incompatible SOCKS protocol version: 4/i.test(errors[0].message), "Error(s) mismatch");
            done();
        });

        it("Phase 2 - Bad command", (done) => {
            const stream = new FakeStream();
            const parser = new Parser(stream);
            const errors = [];
            parser.authed = true;
            parser.on("methods", () => {
                assert(false, "Unexpected methods event");
            }).on("request", () => {
                assert(false, "Unexpected request event");
            }).on("error", (err) => {
                errors.push(err);
            });
            stream.emit("data", Buffer.from([0x05,
                0xFE,
                0x00,
                0x01,
                0xC0, 0xA8, 0x64, 0x01,
                0x00, 0x50]));
            assert(errors.length === 1 && /invalid request command: 254/i.test(errors[0].message), "Error(s) mismatch");
            done();
        });

        it("Phase 2 - Bad address type", (done) => {
            const stream = new FakeStream();
            const parser = new Parser(stream);
            const errors = [];
            parser.authed = true;
            parser.on("methods", () => {
                assert(false, "Unexpected methods event");
            }).on("request", () => {
                assert(false, "Unexpected request event");
            }).on("error", (err) => {
                errors.push(err);
            });
            stream.emit("data", Buffer.from([0x05,
                0x01,
                0x00,
                0xFF,
                0xC0, 0xA8, 0x64, 0x01,
                0x00, 0x50]));
            assert(errors.length === 1 && /Invalid request address type: 255/i.test(errors[0].message), "Error(s) mismatch");
            done();
        });
    });

    let httpServer;
    let httpAddr;
    let httpPort;

    const HTTP_RESPONSE = "hello from the node.js http server!";

    const extractCurlError = (stderr) => {
        let m;
        return ((m = /(curl: \(\d+\)[\s\S]+)/i.exec(stderr)) && m[1].trim()) || stderr;
    };

    const destroyHttpServer = () => {
        if (httpServer) {
            httpServer.close();
            httpServer = undefined;
        }
    };

    describe("with curl", function () {
        try {
            execFileSync("curl", ["--help"]);
        } catch (err) {
            this.skip();
        }

        before((done) => {
            httpServer = adone.std.http.createServer((req, res) => {
                req.resume();
                res.statusCode = 200;
                res.end(HTTP_RESPONSE);
            });
            httpServer.listen(0, "localhost", function () {
                httpAddr = this.address().address;
                httpPort = this.address().port;
                done();
            });
        });

        after(() => {
            destroyHttpServer();

            // assert(t === tests.length - 1, makeMsg("_exit", `Only finished ${t + 1}/${tests.length} tests`));
        });

        it("No authentication, normal accept", (done) => {
            const conns = [];
            const server = createServer((info, accept) => {
                assert(info.cmd === "connect", `Unexpected command: ${info.cmd}`);
                assert(typeof info.srcAddr === "string" && info.srcAddr.length, "Bad srcAddr");
                assert(typeof info.srcPort === "number" && info.srcPort > 0, "Bad srcPort");
                assert(typeof info.dstAddr === "string" && info.dstAddr.length, "Bad dstAddr");
                assert(typeof info.dstPort === "number" && info.dstPort > 0, "Bad dstPort");
                conns.push(info);
                accept();
            });

            server.useAuth(auth.None());

            server.listen(0, "localhost", function () {
                const args = ["--socks5",
                    `${this.address().address}:${this.address().port}`,
                    `http://${httpAddr}:${httpPort}`];
                execFile("curl", args, (err, stdout, stderr) => {
                    server.close();
                    assert(!err, `Unexpected client error: ${
                        extractCurlError(stderr)}`);
                    assert(stdout === HTTP_RESPONSE, "Response mismatch");
                    assert(conns.length === 1, "Wrong number of connections");
                    done();
                });
            });
        });

        it("User/Password authentication (valid credentials), normal accept", (done) => {
            const conns = [];
            const server = createServer((info, accept) => {
                assert(info.cmd === "connect", `Unexpected command: ${info.cmd}`);
                assert(typeof info.srcAddr === "string" && info.srcAddr.length, "Bad srcAddr");
                assert(typeof info.srcPort === "number" && info.srcPort > 0, "Bad srcPort");
                assert(typeof info.dstAddr === "string" && info.dstAddr.length, "Bad dstAddr");
                assert(typeof info.dstPort === "number" && info.dstPort > 0, "Bad dstPort");
                conns.push(info);
                accept();
            });

            server.useAuth(auth.UserPassword((user, pass, cb) => {
                cb(user === "nodejs" && pass === "rules");
            }));

            server.listen(0, "localhost", function () {
                const args = ["--socks5",
                    `${this.address().address}:${this.address().port}`,
                    "-U",
                    "nodejs:rules",
                    `http://${httpAddr}:${httpPort}`];
                execFile("curl", args, (err, stdout, stderr) => {
                    server.close();
                    assert(!err, `Unexpected client error: ${
                        extractCurlError(stderr)}`);
                    assert(stdout === HTTP_RESPONSE, "Response mismatch");
                    assert(conns.length === 1, "Wrong number of connections");
                    done();
                });
            });
        });

        it("User/Password authentication (invalid credentials)", (done) => {
            const conns = [];
            const server = createServer(() => {
                assert(false, "Unexpected connection");
            });

            server.useAuth(auth.UserPassword((user, pass, cb) => {
                cb(user === "nodejs" && pass === "rules");
            }));

            server.listen(0, "localhost", function () {
                const args = ["--socks5",
                    `${this.address().address}:${this.address().port}`,
                    "-U",
                    "php:rules",
                    `http://${httpAddr}:${httpPort}`];
                execFile("curl", args, (err) => {
                    server.close();
                    assert(err, "Expected client error");
                    assert(conns.length === 0, "Unexpected connection(s)");
                    done();
                });
            });
        });

        it("No matching authentication method", (done) => {
            const conns = [];
            const server = createServer(() => {
                assert(false, "Unexpected connection");
            });

            server.useAuth(auth.UserPassword(() => {
                assert(false, "Unexpected User/Password auth");
            }));

            server.listen(0, "localhost", function () {
                const args = ["--socks5",
                    `${this.address().address}:${this.address().port}`,
                    `http://${httpAddr}:${httpPort}`];
                execFile("curl", args, (err) => {
                    server.close();
                    assert(err, "Expected client error");
                    assert(conns.length === 0, "Unexpected connection(s)");
                    done();
                });
            });
        });

        it("Deny connection", (done) => {
            const conns = [];
            const server = createServer((info, accept, deny) => {
                conns.push(info);
                deny();
            });

            server.useAuth(auth.None());

            server.listen(0, "localhost", function () {
                const args = ["--socks5",
                    `${this.address().address}:${this.address().port}`,
                    `http://${httpAddr}:${httpPort}`];
                execFile("curl", args, (err) => {
                    server.close();
                    assert(err, "Expected client error");
                    assert(conns.length === 1, "Wrong number of connections");
                    done();
                });
            });
        });
        it("Intercept connection", (done) => {
            const conns = [];
            const body = "Interception!";
            const server = createServer((info, accept) => {
                conns.push(info);
                const socket = accept(true);
                if (socket) {
                    socket.end([
                        "HTTP/1.1 200 OK",
                        "Connection: close",
                        "Content-Type: text/plain",
                        `Content-Length: ${Buffer.byteLength(body)}`,
                        "",
                        body
                    ].join("\r\n"));
                }
            });

            server.useAuth(auth.None());

            server.listen(0, "localhost", function () {
                const args = ["--socks5", `${this.address().address}:${this.address().port}`, `http://${httpAddr}:${httpPort}`];
                execFile("curl", args, (err, stdout, stderr) => {
                    server.close();
                    assert(!err, `Unexpected client error: ${extractCurlError(stderr)}`);
                    assert(stdout === body, "Response mismatch");
                    assert(conns.length === 1, "Wrong number of connections");
                    done();
                });
            });
        });

        it("maxConnections", (done) => {
            const conns = [];
            const server = createServer((info, accept) => {
                assert(info.cmd === "connect", `Unexpected command: ${info.cmd}`);
                assert(typeof info.srcAddr === "string" && info.srcAddr.length, "Bad srcAddr");
                assert(typeof info.srcPort === "number" && info.srcPort > 0, "Bad srcPort");
                assert(typeof info.dstAddr === "string" && info.dstAddr.length, "Bad dstAddr");
                assert(typeof info.dstPort === "number" && info.dstPort > 0, "Bad dstPort");
                conns.push(info);
                accept();
            });

            server.useAuth(auth.None());
            server.maxConnections = 0;

            server.listen(0, "localhost", function () {
                const args = ["--socks5",
                    `${this.address().address}:${this.address().port}`,
                    `http://${httpAddr}:${httpPort}`];
                execFile("curl", args, (err, stdout, stderr) => {
                    server.close();
                    assert(err, "Expected client error");
                    assert(conns.length === 0, "Wrong number of connections");
                    done();
                });
            });
        });
    });

    it("Disconnect socket on parser error", (done) => {
        const server = createServer((info, accept) => {
            assert(false, "Should not get here for bad client version");
        });

        server.useAuth(auth.None());

        server.listen(0, "localhost", function () {
            let tmr;

            const clientSock = new Socket();
            clientSock.on("error", (err) => {
                // ignore errors
            }).on("close", () => {
                assert(tmr !== undefined, "Socket did not connect");
                clearTimeout(tmr);
                server.close();
                done();
            }).on("connect", () => {
                tmr = setTimeout(() => {
                    assert(false, "Timeout while waiting for bad client socket end");
                }, 100);
                clientSock.write(Buffer.from([0x04, 0x01, 0x00]));
            }).connect(this.address().port, "localhost");
        });
    });
});
