describe("glosses", "net", "http", "helpers", "is finished", () => {
    const { net: { http: { helper: { isFinished, onFinished } } }, std: { http, net }, noop } = adone;

    const sendget = (server) => {
        server.listen(function onListening() {
            const port = this.address().port;
            http.get(`http://localhost:${port}`, function onResponse(res) {
                res.resume();
                res.on("end", () => server.close());
            });
        });
    };

    const writerequest = (socket, chunked) => {
        socket.write("GET / HTTP/1.1\r\n");
        socket.write("Host: localhost\r\n");
        socket.write("Connection: keep-alive\r\n");

        if (chunked) {
            socket.write("Transfer-Encoding: chunked\r\n");
        }

        socket.write("\r\n");
    };

    describe("isFinished(res)", () => {
        it("should return undefined for unknown object", () => {
            assert.strictEqual(isFinished({}), undefined);
        });

        it("should be false before response finishes", (done) => {
            const server = http.createServer((req, res) => {
                assert.ok(!isFinished(res));
                res.end();
                done();
            });

            sendget(server);
        });

        it("should be true after response finishes", (done) => {
            const server = http.createServer((req, res) => {
                onFinished(res, (err) => {
                    assert.ifError(err);
                    assert.ok(isFinished(res));
                    done();
                });

                res.end();
            });

            sendget(server);
        });

        describe("when requests pipelined", () => {
            it("should have correct state when socket shared", (done) => {
                let count = 0;
                const responses = [];
                var server = http.createServer((req, res) => {
                    responses.push(res);

                    onFinished(req, (err) => {
                        assert.ifError(err);

                        if (++count !== 2) {
                            return;
                        }

                        assert.ok(!isFinished(responses[0]));
                        assert.ok(!isFinished(responses[1]));

                        responses[0].end();
                        responses[1].end();
                        socket.end();
                        server.close(done);
                    });

                    if (responses.length === 1) {
                        // second request
                        writerequest(socket);
                    }

                    req.resume();
                });
                let socket;

                server.listen(function () {
                    socket = net.connect(this.address().port, function () {
                        writerequest(this);
                    });
                });
            });

            it("should handle aborted requests", (done) => {
                let count = 0;
                let requests = 0;
                var server = http.createServer((req, res) => {
                    requests++;

                    onFinished(req, (err) => {
                        switch (++count) {
                            case 1:
                                assert.ifError(err);
                                // abort the socket
                                socket.on("error", noop);
                                socket.destroy();
                                break;
                            case 2:
                                server.close(done);
                                break;
                        }
                    });

                    req.resume();

                    if (requests === 1) {
                        // second request
                        writerequest(socket, true);
                    }
                });
                let socket;

                server.listen(function () {
                    socket = net.connect(this.address().port, function () {
                        writerequest(this);
                    });
                });
            });
        });

        describe("when response errors", () => {
            it("should return true", (done) => {
                const server = http.createServer((req, res) => {
                    onFinished(res, (err) => {
                        server.close();
                        assert.ok(err);
                        assert.ok(isFinished(res));
                        done();
                    });

                    socket.on("error", noop);
                    socket.write("W");
                });
                let socket;

                server.listen(function () {
                    socket = net.connect(this.address().port, function () {
                        writerequest(this, true);
                    });
                });
            });
        });

        describe("when the response aborts", () => {
            it("should return true", (done) => {
                let client;
                const server = http.createServer((req, res) => {
                    onFinished(res, (err) => {
                        server.close();
                        assert.ifError(err);
                        assert.ok(isFinished(res));
                        done();
                    });
                    setTimeout(client.abort.bind(client), 0);
                });
                server.listen(function () {
                    const port = this.address().port;
                    client = http.get(`http://127.0.0.1:${port}`);
                    client.on("error", noop);
                });
            });
        });
    });

    describe("isFinished(req)", () => {
        it("should return undefined for unknown object", () => {
            assert.strictEqual(isFinished({}), undefined);
        });

        it("should be false before request finishes", (done) => {
            const server = http.createServer((req, res) => {
                assert.ok(!isFinished(req));
                req.resume();
                res.end();
                done();
            });

            sendget(server);
        });

        it("should be true after request finishes", (done) => {
            const server = http.createServer((req, res) => {
                onFinished(req, (err) => {
                    assert.ifError(err);
                    assert.ok(isFinished(req));
                    done();
                });

                req.resume();
                res.end();
            });

            sendget(server);
        });

        describe("when request data buffered", () => {
            it("should be false before request finishes", (done) => {
                const server = http.createServer((req, res) => {
                    assert.ok(!isFinished(req));

                    req.pause();
                    setTimeout(() => {
                        assert.ok(!isFinished(req));
                        req.resume();
                        res.end();
                        done();
                    }, 10);
                });

                sendget(server);
            });
        });

        describe("when request errors", () => {
            it("should return true", (done) => {
                const server = http.createServer((req, res) => {
                    onFinished(req, (err) => {
                        server.close();
                        assert.ok(err);
                        assert.ok(isFinished(req));
                        done();
                    });

                    socket.on("error", noop);
                    socket.write("W");
                });
                let socket;

                server.listen(function () {
                    socket = net.connect(this.address().port, function () {
                        writerequest(this, true);
                    });
                });
            });
        });

        describe("when the request aborts", () => {
            it("should return true", (done) => {
                let client;
                const server = http.createServer((req, res) => {
                    onFinished(res, (err) => {
                        server.close();
                        assert.ifError(err);
                        assert.ok(isFinished(req));
                        done();
                    });
                    setTimeout(client.abort.bind(client), 0);
                });
                server.listen(function () {
                    const port = this.address().port;
                    client = http.get(`http://127.0.0.1:${port}`);
                    client.on("error", noop);
                });
            });
        });

        describe("when CONNECT method", () => {
            it("should be true immediately", (done) => {
                let client;
                const server = http.createServer((req, res) => {
                    res.statusCode = 405;
                    res.end();
                });

                server.on("connect", (req, socket, bodyHead) => {
                    assert.ok(isFinished(req));
                    assert.equal(bodyHead.length, 0);
                    req.resume();

                    socket.on("data", (chunk) => {
                        assert.equal(chunk.toString(), "ping");
                        socket.end("pong");
                    });
                    socket.write("HTTP/1.1 200 OK\r\n\r\n");
                });

                server.listen(function () {
                    client = http.request({
                        hostname: "127.0.0.1",
                        method: "CONNECT",
                        path: "127.0.0.1:80",
                        port: this.address().port
                    });

                    client.on("connect", (res, socket, bodyHead) => {
                        socket.write("ping");
                        socket.on("data", (chunk) => {
                            assert.equal(chunk.toString(), "pong");
                            socket.end();
                            server.close(done);
                        });
                    });
                    client.end();
                });
            });

            it("should be true after request finishes", (done) => {
                let client;
                const server = http.createServer((req, res) => {
                    res.statusCode = 405;
                    res.end();
                });
                server.on("connect", (req, socket, bodyHead) => {
                    const data = [bodyHead];

                    onFinished(req, (err) => {
                        assert.ifError(err);
                        assert.ok(isFinished(req));
                        assert.equal(Buffer.concat(data).toString(), "knock, knock");
                        socket.write("HTTP/1.1 200 OK\r\n\r\n");
                    });

                    socket.on("data", (chunk) => {
                        assert.equal(chunk.toString(), "ping");
                        socket.end("pong");
                    });

                    req.on("data", (chunk) => {
                        data.push(chunk);
                    });
                });

                server.listen(function () {
                    client = http.request({
                        hostname: "127.0.0.1",
                        method: "CONNECT",
                        path: "127.0.0.1:80",
                        port: this.address().port
                    });
                    client.on("connect", (res, socket, bodyHead) => {
                        socket.write("ping");
                        socket.on("data", (chunk) => {
                            assert.equal(chunk.toString(), "pong");
                            socket.end();
                            server.close(done);
                        });
                    });
                    client.end("knock, knock");
                });
            });
        });

        describe("when Upgrade request", () => {
            it("should be true immediately", (done) => {
                let client;
                const server = http.createServer((req, res) => {
                    res.statusCode = 405;
                    res.end();
                });

                server.on("upgrade", (req, socket, bodyHead) => {
                    assert.ok(isFinished(req));
                    assert.equal(bodyHead.length, 0);
                    req.resume();

                    socket.on("data", (chunk) => {
                        assert.equal(chunk.toString(), "ping");
                        socket.end("pong");
                    });
                    socket.write("HTTP/1.1 101 Switching Protocols\r\n");
                    socket.write("Connection: Upgrade\r\n");
                    socket.write("Upgrade: Raw\r\n");
                    socket.write("\r\n");
                });

                server.listen(function () {
                    client = http.request({
                        headers: {
                            Connection: "Upgrade",
                            Upgrade: "Raw"
                        },
                        hostname: "127.0.0.1",
                        port: this.address().port
                    });

                    client.on("upgrade", (res, socket, bodyHead) => {
                        socket.write("ping");
                        socket.on("data", (chunk) => {
                            assert.equal(chunk.toString(), "pong");
                            socket.end();
                            server.close(done);
                        });
                    });
                    client.end();
                });
            });

            it("should be true after request finishes", (done) => {
                let client;
                const server = http.createServer((req, res) => {
                    res.statusCode = 405;
                    res.end();
                });
                server.on("upgrade", (req, socket, bodyHead) => {
                    const data = [bodyHead];

                    onFinished(req, (err) => {
                        assert.ifError(err);
                        assert.ok(isFinished(req));
                        assert.equal(Buffer.concat(data).toString(), "knock, knock");

                        socket.write("HTTP/1.1 101 Switching Protocols\r\n");
                        socket.write("Connection: Upgrade\r\n");
                        socket.write("Upgrade: Raw\r\n");
                        socket.write("\r\n");
                    });

                    socket.on("data", (chunk) => {
                        assert.equal(chunk.toString(), "ping");
                        socket.end("pong");
                    });

                    req.on("data", (chunk) => {
                        data.push(chunk);
                    });
                });

                server.listen(function () {
                    client = http.request({
                        headers: {
                            Connection: "Upgrade",
                            Upgrade: "Raw"
                        },
                        hostname: "127.0.0.1",
                        port: this.address().port
                    });

                    client.on("upgrade", (res, socket, bodyHead) => {
                        socket.write("ping");
                        socket.on("data", (chunk) => {
                            assert.equal(chunk.toString(), "pong");
                            socket.end();
                            server.close(done);
                        });
                    });
                    client.end("knock, knock");
                });
            });
        });
    });
});
