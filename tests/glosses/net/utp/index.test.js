const {
    net: { utp },
    std: { dgram }
} = adone;

describe("net", "utp", () => {
    describe("net api", () => {
        it("server + connect", (done) => {
            let connected = false;

            const server = utp.createServer((socket) => {
                connected = true;
                socket.write("hello mike");
            });

            server.listen(() => {
                const socket = utp.connect(server.address().port);

                socket.on("connect", () => {
                    socket.destroy();
                    server.close();
                    assert.ok(connected, "connected successfully");
                    done();
                });

                socket.write("hello joe");
            });
        });

        it("server + connect with resolve", (done) => {
            let connected = false;

            const server = utp.createServer((socket) => {
                connected = true;
                socket.write("hello mike");
            });

            server.listen(() => {
                const socket = utp.connect(server.address().port, "localhost");

                socket.on("connect", () => {
                    socket.destroy();
                    server.close();
                    assert.ok(connected, "connected successfully");
                    done();
                });

                socket.write("hello joe");
            });
        });

        it("bad resolve", (done) => {
            const socket = utp.connect(10000, "domain.does-not-exist");

            socket.on("connect", () => {
                assert.fail("should not connect");
            });

            socket.on("error", () => {
            });

            socket.on("close", () => {
                done();
            });
        });

        it("server immediate close", (done) => {
            const server = utp.createServer((socket) => {
                socket.write("hi");
                socket.end();
                server.close(() => {
                    done();
                });
            });

            server.listen(0, () => {
                const socket = utp.connect(server.address().port);

                socket.write("hi");
                socket.once("connect", () => {
                    socket.end();
                });

                socket.on("close", () => {
                });
            });
        });

        it.skip("only server sends", () => {
            // this is skipped because it doesn't work.
            // utpcat has the same issue so this seems to be a bug
            // in libutp it self
            // in practice this is less of a problem as most protocols
            // exchange a handshake message. would be great to get fixed though
            const server = utp.createServer((socket) => {
                socket.write("hi");
            });

            server.listen(0, () => {
                const socket = utp.connect(server.address().port);

                socket.on("data", (data) => {
                    assert.deepEqual(data, Buffer.from("hi"));
                    socket.destroy();
                    server.close();
                });
            });
        });

        it("server listens on a port in use", (done) => {
            if (Number(process.versions.node.split(".")[0]) === 0) {
                done();
                return;
            }

            const server = utp.createServer();
            server.listen(0, () => {
                const server2 = utp.createServer();
                server2.listen(server.address().port, () => {
                    assert.fail("should not be listening");
                });
                server2.on("error", () => {
                    server.close();
                    server2.close();
                    done();
                });
            });
        });

        it("echo server", (done) => {
            const server = utp.createServer((socket) => {
                socket.pipe(socket);
                socket.on("data", (data) => {
                    assert.deepEqual(data, Buffer.from("hello"));
                });
            });

            server.listen(0, () => {
                const socket = utp.connect(server.address().port);

                socket.write("hello");
                socket.on("data", (data) => {
                    socket.destroy();
                    server.close();
                    assert.deepEqual(data, Buffer.from("hello"));
                    done();
                });
            });
        });

        it("echo server back and fourth", (done) => {
            let echoed = 0;
            const server = utp.createServer((socket) => {
                socket.pipe(socket);
                socket.on("data", (data) => {
                    echoed++;
                    assert.deepEqual(data, Buffer.from("hello"));
                });
            });

            server.listen(0, () => {
                const socket = utp.connect(server.address().port);
                let rounds = 10;

                socket.write("hello");
                socket.on("data", (data) => {
                    if (--rounds) {
                        return socket.write(data);
                    }
                    socket.destroy();
                    server.close();
                    assert.deepEqual(echoed, 10);
                    assert.deepEqual(Buffer.from(data), data);
                    done();
                });
            });
        });

        it("echo big message", (done) => {
            const big = Buffer.alloc(4 * 1024 * 1024);
            big.fill("yolo");
            const server = utp.createServer((socket) => {
                socket.pipe(socket);
            });

            server.listen(0, () => {
                const socket = utp.connect(server.address().port);
                const buffer = Buffer.alloc(big.length);
                let ptr = 0;

                socket.write(big);
                socket.on("data", (data) => {
                    data.copy(buffer, ptr);
                    ptr += data.length;
                    if (big.length === ptr) {
                        socket.destroy();
                        server.close();
                        assert.deepEqual(buffer, big);
                        done();
                    }
                });
            });
        });

        it("two connections", (dn) => {
            let count = 0;
            let gotA = false;
            let gotB = false;

            const server = utp.createServer((socket) => {
                count++;
                socket.pipe(socket);
            });

            server.listen(0, () => {
                const socket1 = utp.connect(server.address().port);
                const socket2 = utp.connect(server.address().port);

                socket1.write("a");
                socket2.write("b");

                const done = function () {
                    socket1.destroy();
                    socket2.destroy();
                    server.close();
                    assert.ok(gotA);
                    assert.ok(gotB);
                    assert.deepEqual(count, 2);
                    dn();
                };

                socket1.on("data", (data) => {
                    gotA = true;
                    assert.deepEqual(data, Buffer.from("a"));
                    if (gotB) {
                        done();
                    }
                });

                socket2.on("data", (data) => {
                    gotB = true;
                    assert.deepEqual(data, Buffer.from("b"));
                    if (gotA) {
                        done();
                    }
                });
            });
        });

        it("emits close", (dn) => {
            let serverClosed = false;
            let clientClosed = false;
            let server = null;

            const done = function () {
                server.close();
                assert.ok(serverClosed);
                assert.ok(clientClosed);
                dn();
            };

            server = utp.createServer((socket) => {
                socket.on("close", () => {
                    serverClosed = true;
                    if (clientClosed) {
                        done();
                    }
                });
            });

            server.listen(0, () => {
                const socket = utp.connect(server.address().port);
                socket.write("hi");
                socket.end(); // utp does not support half open
                socket.on("close", () => {
                    clientClosed = true;
                    if (serverClosed) {
                        done();
                    }
                });
            });
        });

        it("flushes", (done) => {
            let sent = "";
            const server = utp.createServer((socket) => {
                let buf = "";
                socket.setEncoding("utf-8");
                socket.on("data", (data) => {
                    buf += data;
                });
                socket.on("end", () => {
                    server.close();
                    assert.deepEqual(buf, sent);
                    done();
                });
            });

            server.listen(0, () => {
                const socket = utp.connect(server.address().port);
                for (let i = 0; i < 50; i++) {
                    socket.write(`${i}\n`);
                    sent += `${i}\n`;
                }
                socket.end();
            });
        });

        it("close waits for connections to close", (done) => {
            let sent = "";
            const server = utp.createServer((socket) => {
                let buf = "";
                socket.setEncoding("utf-8");
                socket.on("data", (data) => {
                    buf += data;
                });
                socket.on("end", () => {
                    assert.deepEqual(buf, sent);
                    done();
                });
                server.close();
            });

            server.listen(0, () => {
                const socket = utp.connect(server.address().port);
                for (let i = 0; i < 50; i++) {
                    socket.write(`${i}\n`);
                    sent += `${i}\n`;
                }
                socket.end();
            });
        });

        it("timeout", (dn) => {
            let serverClosed = false;
            let clientClosed = false;
            let missing = 2;
            let server = null;

            const done = function () {
                if (--missing) {
                    return;
                }
                server.close();
                assert.ok(clientClosed);
                assert.ok(serverClosed);
                dn();
            };

            server = utp.createServer((socket) => {
                socket.setTimeout(100, socket.destroy);
                socket.write("hi");
                socket.on("close", () => {
                    serverClosed = true;
                    done();
                });
            });

            server.listen(0, () => {
                const socket = utp.connect(server.address().port);
                socket.write("hi");
                socket.on("close", () => {
                    clientClosed = true;
                    done();
                });
            });
        });
    });

    describe("socket api", () => {
        it("dgram-like socket", (done) => {
            const socket = new utp.UTP();

            socket.on("message", (buf, rinfo) => {
                assert.deepEqual(rinfo.port, socket.address().port);
                assert.deepEqual(rinfo.address, "127.0.0.1");
                assert.deepEqual(buf, Buffer.from("hello"));
                socket.close();
                done();
            });

            socket.bind(() => {
                socket.send(Buffer.from("hello"), 0, 5, socket.address().port, "127.0.0.1");
            });
        });

        it("double close", (done) => {
            const socket = new utp.UTP();

            socket.on("close", () => {
                socket.close(() => {
                    done();
                });
            });

            socket.bind(0, () => {
                socket.close();
            });
        });

        it("echo socket", (done) => {
            const socket = new utp.UTP();

            socket.on("message", (buf, rinfo) => {
                socket.send(buf, 0, buf.length, rinfo.port, rinfo.address);
            });

            socket.bind(() => {
                const other = dgram.createSocket("udp4");
                other.on("message", (buf, rinfo) => {
                    assert.deepEqual(rinfo.port, socket.address().port);
                    assert.deepEqual(rinfo.address, "127.0.0.1");
                    assert.deepEqual(buf, Buffer.from("hello"));
                    socket.close();
                    other.close();
                    done();
                });
                other.send(Buffer.from("hello"), 0, 5, socket.address().port, "127.0.0.1");
            });
        });

        it("echo socket with resolve", (done) => {
            const socket = new utp.UTP();

            socket.on("message", (buf, rinfo) => {
                socket.send(buf, 0, buf.length, rinfo.port, "localhost");
            });

            socket.bind(() => {
                const other = dgram.createSocket("udp4");
                other.on("message", (buf, rinfo) => {
                    assert.deepEqual(rinfo.port, socket.address().port);
                    assert.deepEqual(rinfo.address, "127.0.0.1");
                    assert.deepEqual(buf, Buffer.from("hello"));
                    socket.close();
                    other.close();
                    done();
                });
                other.send(Buffer.from("hello"), 0, 5, socket.address().port, "127.0.0.1");
            });
        });

        it("combine server and connection", (done) => {
            const socket = new utp.UTP();
            let gotClient = false;

            socket.on("connection", (client) => {
                gotClient = true;
                client.pipe(client);
            });

            socket.listen(() => {
                const client = socket.connect(socket.address().port);
                client.write("hi");
                client.on("data", (data) => {
                    socket.close();
                    client.destroy();
                    assert.deepEqual(data, Buffer.from("hi"));
                    assert.ok(gotClient);
                    done();
                });
            });
        });

        it("both ends write first", (dn) => {
            let missing = 2;
            const socket = new utp.UTP();

            const done = function () {
                if (--missing) {
                    return;
                }
                socket.close();
                dn();
            };

            socket.on("connection", (connection) => {
                connection.write("a");
                connection.on("data", (data) => {
                    assert.deepEqual(data, Buffer.from("b"));
                    done();
                });
            });

            socket.listen(0, () => {
                const connection = socket.connect(socket.address().port);
                connection.write("b");
                connection.on("data", (data) => {
                    assert.deepEqual(data, Buffer.from("a"));
                    connection.end();
                    done();
                });
            });
        });
    });

    describe("timeouts", () => {
        it("connection timeout. this may take >20s", (done) => {
            const socket = dgram.createSocket("udp4");
            socket.bind(0, () => {
                const connection = utp.connect(socket.address().port);
                connection.on("error", (err) => {
                    socket.close();
                    assert.deepEqual(err.message, "UTP_ETIMEDOUT");
                    done();
                });
            });
        });

        it("write timeout. this may take >20s", (done) => {
            const server = utp.createServer();
            let connection;

            server.on("connection", (socket) => {
                server.close();
                socket.destroy();
            });

            server.on("close", () => {
                connection.write("hello?");
            });

            server.listen(() => {
                connection = utp.connect(server.address().port);
                connection.on("connect", () => {
                });
                connection.on("error", (err) => {
                    assert.deepEqual(err.message, "UTP_ETIMEDOUT");
                    done();
                });
            });
        });

        it("server max connections", (done) => {
            let inc = 0;
            const server = utp.createServer((socket) => {
                inc++;
                assert.ok(inc < 3);
                socket.write("hi");
            });

            server.maxConnections = 2;
            server.listen(0, () => {
                const a = utp.connect(server.address().port);
                a.write("hi");
                a.on("connect", () => {
                    const b = utp.connect(server.address().port);
                    b.write("hi");
                    b.on("connect", () => {
                        const c = utp.connect(server.address().port);
                        c.write("hi");
                        c.on("connect", () => {
                            assert.fail("only 2 connections");
                        });
                        c.on("error", () => {
                            a.destroy();
                            b.destroy();
                            c.destroy();
                            server.close();
                            done();
                        });
                    });
                });
            });
        });
    });
});
