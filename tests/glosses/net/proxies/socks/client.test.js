const { net: { proxy: { socks: { createServer, createConnection, auth, ClientParser: Parser } } } } = adone;

class FakeStream extends adone.EventEmitter {
    pause() {

    }

    resume() {

    }
}

const PROXY_RESPONSE = "hello from the node.js proxy server!";

const bufferStream = (stream, encoding, cb) => {
    let buf;
    if (typeof encoding === "function") {
        cb = encoding;
        encoding = undefined;
    }
    if (!encoding) {
        let nb = 0;
        stream.on("data", (d) => {
            if (nb === 0) {
                buf = [d];
            } else {
                buf.push(d);
            }
            nb += d.length;
        }).on((stream.writable ? "close" : "end"), () => {
            cb(nb ? Buffer.concat(buf, nb) : buf);
        });
    } else {
        stream.on("data", (d) => {
            if (!buf) {
                buf = d;
            } else {
                buf += d;
            }
        }).on((stream.writable ? "close" : "end"), () => {
            cb(buf);
        }).setEncoding(encoding);
    }
};

describe("net", "proxy", "socks", "Client", () => {
    describe("parser", () => {
        it("Phase 1 - Valid (whole)", () => {
            const stream = new FakeStream();
            const parser = new Parser(stream);
            let method;
            parser.on("method", (m) => {
                method = m;
            }).on("reply", () => {
                assert(false, "Unexpected reply event");
            }).on("error", (err) => {
                assert(false, `Unexpected error: ${err}`);
            });
            stream.emit("data", new Buffer([0x05, 0xFF]));
            assert(method === 0xFF, `Unexpected method: ${method}`);
        });

        it("Phase 1 - Valid (split)", () => {
            const stream = new FakeStream();
            const parser = new Parser(stream);
            let method;
            parser.on("method", (m) => {
                method = m;
            }).on("reply", () => {
                assert(false, "Unexpected reply event");
            }).on("error", (err) => {
                assert(false, `Unexpected error: ${err}`);
            });
            stream.emit("data", new Buffer([0x05]));
            stream.emit("data", new Buffer([0x09]));
            assert(method === 0x09, `Unexpected method: ${method}`);
        });

        it("Phase 1 - Bad version", () => {
            const stream = new FakeStream();
            const parser = new Parser(stream);
            const errors = [];
            parser.on("method", () => {
                assert(false, "Unexpected method event");
            }).on("reply", () => {
                assert(false, "Unexpected reply event");
            }).on("error", (err) => {
                errors.push(err);
            });
            stream.emit("data", new Buffer([0x04, 0x09]));
            assert(errors.length === 1 && /Incompatible SOCKS protocol version: 4/i.test(errors[0].message), "Error(s) mismatch");
        });

        it("Phase 2 - Valid (whole) - Success (IPv4)", () => {
            const stream = new FakeStream();
            const parser = new Parser(stream);
            let reply;
            parser.authed = true;
            parser.on("method", () => {
                assert(false, "Unexpected method event");
            }).on("reply", (r) => {
                reply = r;
            }).on("error", (err) => {
                assert(false, `Unexpected error: ${err}`);
            });
            stream.emit("data", new Buffer([0x05,
                0x00,
                0x00,
                0x01,
                0xC0, 0xA8, 0x64, 0x01,
                0x00, 0x50]));
            assert.deepEqual(reply, { bndAddr: "192.168.100.1", bndPort: 80 }, "Reply mismatch");
        });

        it("Phase 2 - Valid (whole) - Success (IPv6)", () => {
            const stream = new FakeStream();
            const parser = new Parser(stream);
            let reply;
            parser.authed = true;
            parser.on("method", () => {
                assert(false, "Unexpected method event");
            }).on("reply", (r) => {
                reply = r;
            }).on("error", (err) => {
                assert(false, `Unexpected error: ${err}`);
            });
            stream.emit("data", new Buffer([0x05,
                0x00,
                0x00,
                0x04,
                0xFF, 0xFE, 0xFD, 0xFC, 0xFB, 0xFA,
                0xF9, 0xF8, 0xF7, 0xF6, 0xF5, 0xF4,
                0xF3, 0xF2, 0xF1, 0xF0,
                0x08, 0x40]));
            assert.deepEqual(reply,
                {
                    bndAddr: "fffe:fdfc:fbfa:f9f8:f7f6:f5f4:f3f2:f1f0",
                    bndPort: 2112
                }, "Reply mismatch");
        });

        it("Phase 2 - Valid (whole) - Success (Hostname)", () => {
            const stream = new FakeStream();
            const parser = new Parser(stream);
            let reply;
            parser.authed = true;
            parser.on("method", () => {
                assert(false, "Unexpected method event");
            }).on("reply", (r) => {
                reply = r;
            }).on("error", (err) => {
                assert(false, `Unexpected error: ${err}`);
            });
            stream.emit("data", new Buffer([0x05,
                0x00,
                0x00,
                0x03,
                0x0A, 0x6E, 0x6F, 0x64, 0x65, 0x6A, 0x73,
                0x2E, 0x6F, 0x72, 0x67,
                0x05, 0x39]));
            assert.deepEqual(reply,
                {
                    bndAddr: "nodejs.org",
                    bndPort: 1337
                }, "Reply mismatch");
        });

        it("Phase 2 - Valid (split) - Success (Hostname)", () => {
            const stream = new FakeStream();
            const parser = new Parser(stream);
            let reply;
            parser.authed = true;
            parser.on("method", () => {
                assert(false, "Unexpected method event");
            }).on("reply", (r) => {
                reply = r;
            }).on("error", (err) => {
                assert(false, `Unexpected error: ${err}`);
            });
            stream.emit("data", new Buffer([0x05, 0x00]));
            stream.emit("data", new Buffer([0x00, 0x03, 0x0A, 0x6E, 0x6F, 0x64, 0x65]));
            stream.emit("data", new Buffer([0x6A, 0x73, 0x2E, 0x6F, 0x72]));
            stream.emit("data", new Buffer([0x67, 0x05]));
            stream.emit("data", new Buffer([0x39]));
            assert.deepEqual(reply,
                {
                    bndAddr: "nodejs.org",
                    bndPort: 1337
                }, "Reply mismatch");
        });

        it("Phase 2 - Valid - Error", () => {
            const stream = new FakeStream();
            const parser = new Parser(stream);
            const errors = [];
            parser.authed = true;
            parser.on("method", () => {
                assert(false, "Unexpected method event");
            }).on("reply", () => {
                assert(false, "Unexpected reply event");
            }).on("error", (err) => {
                errors.push(err);
            });
            stream.emit("data", new Buffer([0x05, 0x02]));
            assert(errors.length === 1 && /connection not allowed by ruleset/i.test(errors[0].message), "Error(s) mismatch");
        });

        it("Phase 2 - Bad version", () => {
            const stream = new FakeStream();
            const parser = new Parser(stream);
            const errors = [];
            parser.authed = true;
            parser.on("method", () => {
                assert(false, "Unexpected method event");
            }).on("reply", () => {
                assert(false, "Unexpected reply event");
            }).on("error", (err) => {
                errors.push(err);
            });
            stream.emit("data", new Buffer([0x04, 0x02]));
            assert(errors.length === 1 && /Incompatible SOCKS protocol version: 4/i.test(errors[0].message), "Error(s) mismatch");
        });

        it("Phase 2 - Bad address type", () => {
            const stream = new FakeStream();
            const parser = new Parser(stream);
            const errors = [];
            parser.authed = true;
            parser.on("method", () => {
                assert(false, "Unexpected method event");
            }).on("reply", () => {
                assert(false, "Unexpected reply event");
            }).on("error", (err) => {
                errors.push(err);
            });
            stream.emit("data", new Buffer([0x05, 0x00]));
            stream.emit("data", new Buffer([0x00, 0xFF, 0x0A, 0x6E, 0x6F, 0x64, 0x65]));
            stream.emit("data", new Buffer([0x6A, 0x73, 0x2E, 0x6F, 0x72]));
            stream.emit("data", new Buffer([0x67, 0x05]));
            stream.emit("data", new Buffer([0x39]));
            assert(errors.length === 1 && /Invalid request address type: 255/i.test(errors[0].message), "Error(s) mismatch");
        });
    });

    it("No authentication", (done) => {
        let conns = 0;
        let response;
        const server = createServer((info, accept) => {
            ++conns;
            const socket = accept(true);
            if (socket) {
                socket.end(PROXY_RESPONSE);
            }
        });

        server.useAuth(auth.None());

        server.listen(0, "localhost", () => {
            createConnection({
                host: "localhost",
                port: 1,
                proxyHost: "localhost",
                proxyPort: server.address().port
            }, (socket) => {
                bufferStream(socket, "ascii", (data) => {
                    response = data;
                });
            }).on("error", (err) => {
                assert(false, `Unexpected error: ${err}`);
            }).on("close", () => {
                server.close();
                // allow bufferStream() callback to be called first
                process.nextTick(() => {
                    assert(response === PROXY_RESPONSE, "Response mismatch");
                    assert(conns === 1, "Wrong number of connections");
                    done();
                });
            }).useAuth(auth.None());
        });
    });

    it("User/Password authentication (valid credentials)", (done) => {
        let conns = 0;
        let response;
        const server = createServer((info, accept) => {
            ++conns;
            const socket = accept(true);
            if (socket) {
                socket.end(PROXY_RESPONSE);
            }
        });

        server.useAuth(auth.UserPassword((user, pass, cb) => {
            cb(user === "nodejs" && pass === "rules");
        }));

        server.listen(0, "localhost", () => {
            createConnection({
                host: "localhost",
                port: 1,
                proxyHost: "localhost",
                proxyPort: server.address().port
            }, (socket) => {
                bufferStream(socket, "ascii", (data) => {
                    response = data;
                });
            }).on("error", (err) => {
                assert(false, `Unexpected error: ${err}`);
            }).on("close", () => {
                server.close();
                // allow bufferStream() callback to be called first
                process.nextTick(() => {
                    assert(response === PROXY_RESPONSE, "Response mismatch");
                    assert(conns === 1, "Wrong number of connections");
                    done();
                });
            }).useAuth(auth.UserPassword("nodejs", "rules"));
        });
    });

    it("User/Password authentication (invalid credentials)", (done) => {
        const errors = [];
        const server = createServer(() => {
            assert(false, "Unexpected connection");
        });

        server.useAuth(auth.UserPassword((user, pass, cb) => {
            cb(user === "nodejs" && pass === "rules");
        }));

        server.listen(0, "localhost", () => {
            createConnection({
                host: "localhost",
                port: 1,
                proxyHost: "localhost",
                proxyPort: server.address().port
            }, () => {
                assert(false, "Unexpected connect callback");
            }).on("error", (err) => {
                errors.push(err);
            }).on("close", () => {
                server.close();
                assert(errors.length === 1 && /authentication failed/i.test(errors[0].message), "Expected 1 error");
                done();
            }).useAuth(auth.UserPassword("php", "rules"));
        });
    });

    it("No matching authentication method", (done) => {
        const errors = [];
        const server = createServer(() => {
            assert(false, "Unexpected connection");
        });

        server.useAuth(auth.None());

        server.listen(0, "localhost", () => {
            createConnection({
                host: "localhost",
                port: 1,
                proxyHost: "localhost",
                proxyPort: server.address().port
            }, () => {
                assert(false, "Unexpected connect callback");
            }).on("error", (err) => {
                errors.push(err);
            }).on("close", () => {
                server.close();
                assert(errors.length === 1 && /Authentication method mismatch/i.test(errors[0].message), "Expected 1 error");
                done();
            }).useAuth(auth.UserPassword("nodejs", "rules"));
        });
    });

    it("Denied connection", (done) => {
        let conns = 0;
        const errors = [];
        const server = createServer((info, accept, deny) => {
            ++conns;
            deny();
        });

        server.useAuth(auth.None());

        server.listen(0, "localhost", () => {
            createConnection({
                host: "localhost",
                port: 1,
                proxyHost: "localhost",
                proxyPort: server.address().port
            }, () => {
                assert(false, "Unexpected connect callback");
            }).on("error", (err) => {
                errors.push(err);
            }).on("close", () => {
                server.close();
                assert(errors.length === 1 && /not allowed by ruleset/i.test(errors[0].message), "Expected 1 error");
                assert(conns === 1, "Wrong number of connections");
                done();
            }).useAuth(auth.None());
        });
    });
});
