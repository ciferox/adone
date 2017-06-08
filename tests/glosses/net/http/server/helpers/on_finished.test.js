describe("net", "http", "helpers", "on finished", () => {
    const { net: { http: { server: { helper: { onFinished } } } }, std: { net, http }, noop } = adone;


    describe("onFinished(res, listener)", () => {
        it("should invoke listener given an unknown object", (done) => {
            onFinished({}, done);
        });

        describe("when the response finishes", () => {
            it("should fire the callback", (done) => {
                const server = http.createServer((req, res) => {
                    onFinished(res, done);
                    setTimeout(() => {
                        res.end();
                    }, 10);
                });

                sendget(server);
            });

            it("should include the response object", (done) => {
                const server = http.createServer((req, res) => {
                    onFinished(res, (err, msg) => {
                        assert.ok(!err);
                        assert.equal(msg, res);
                        done();
                    });
                    setTimeout(res.end.bind(res), 0);
                });

                sendget(server);
            });

            it("should fire when called after finish", (done) => {
                const server = http.createServer((req, res) => {
                    onFinished(res, () => {
                        onFinished(res, done);
                    });
                    setTimeout(res.end.bind(res), 0);
                });

                sendget(server);
            });
        });

        describe("when using keep-alive", () => {
            it("should fire for each response", (done) => {
                let called = false;
                var server = http.createServer((req, res) => {
                    onFinished(res, () => {
                        if (called) {
                            socket.end();
                            server.close();
                            done(called !== req ? null : new Error("fired twice on same req"));
                            return;
                        }

                        called = req;

                        writerequest(socket);
                    });

                    res.end();
                });
                let socket;

                server.listen(function () {
                    socket = net.connect(this.address().port, function () {
                        writerequest(this);
                    });
                });
            });
        });

        describe("when requests pipelined", () => {
            it("should fire for each request", (done) => {
                let count = 0;
                const responses = [];
                const server = http.createServer((req, res) => {
                    responses.push(res);

                    onFinished(res, (err) => {
                        assert.ifError(err);
                        assert.equal(responses[0], res);
                        responses.shift();

                        if (responses.length === 0) {
                            socket.end();
                            return;
                        }

                        responses[0].end("response b");
                    });

                    onFinished(req, (err) => {
                        assert.ifError(err);

                        if (++count !== 2) {
                            return;
                        }

                        assert.equal(responses.length, 2);
                        responses[0].end("response a");
                    });

                    if (responses.length === 1) {
                        // second request
                        writerequest(socket);
                    }

                    req.resume();
                });
                let socket;

                server.listen(function () {
                    let data = "";
                    socket = net.connect(this.address().port, function () {
                        writerequest(this);
                    });

                    socket.on("data", (chunk) => {
                        data += chunk.toString("binary");
                    });
                    socket.on("end", () => {
                        assert.ok(/response a/.test(data));
                        assert.ok(/response b/.test(data));
                        server.close(done);
                    });
                });
            });
        });

        describe("when response errors", () => {
            it("should fire with error", (done) => {
                const server = http.createServer((req, res) => {
                    onFinished(res, (err) => {
                        server.close();
                        assert.ok(err);
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

            it("should include the response object", (done) => {
                const server = http.createServer((req, res) => {
                    onFinished(res, (err, msg) => {
                        server.close();
                        assert.ok(err);
                        assert.equal(msg, res);
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
            it("should execute the callback", (done) => {
                let client;
                const server = http.createServer((req, res) => {
                    onFinished(res, (err) => {
                        server.close();
                        done(err);
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

    describe("onFinished(req, listener)", () => {
        describe("when the request finishes", () => {
            it("should fire the callback", (done) => {
                const server = http.createServer((req, res) => {
                    onFinished(req, done);
                    req.resume();
                    setTimeout(res.end.bind(res), 0);
                });

                sendget(server);
            });

            it("should include the request object", (done) => {
                const server = http.createServer((req, res) => {
                    onFinished(req, (err, msg) => {
                        assert.ok(!err);
                        assert.equal(msg, req);
                        done();
                    });
                    req.resume();
                    setTimeout(res.end.bind(res), 0);
                });

                sendget(server);
            });

            it("should fire when called after finish", (done) => {
                const server = http.createServer((req, res) => {
                    onFinished(req, () => {
                        onFinished(req, done);
                    });
                    req.resume();
                    setTimeout(res.end.bind(res), 0);
                });

                sendget(server);
            });
        });

        describe("when using keep-alive", () => {
            it("should fire for each request", (done) => {
                let called = false;
                var server = http.createServer((req, res) => {
                    let data = "";

                    onFinished(req, (err) => {
                        assert.ifError(err);
                        assert.equal(data, "A");

                        if (called) {
                            server.close();
                            socket.end();
                            server.close();
                            done(called !== req ? null : new Error("fired twice on same req"));
                            return;
                        }

                        called = req;

                        res.end();
                        writerequest(socket, true);
                    });

                    req.setEncoding("utf8");
                    req.on("data", (str) => {
                        data += str;
                    });

                    socket.write("1\r\nA\r\n");
                    socket.write("0\r\n\r\n");
                });
                let socket;

                server.listen(function () {
                    socket = net.connect(this.address().port, function () {
                        writerequest(this, true);
                    });
                });
            });
        });

        describe("when request errors", () => {
            it("should fire with error", (done) => {
                const server = http.createServer((req, res) => {
                    onFinished(req, (err) => {
                        server.close();
                        assert.ok(err);
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

            it("should include the request objecy", (done) => {
                const server = http.createServer((req, res) => {
                    onFinished(req, (err, msg) => {
                        server.close();
                        assert.ok(err);
                        assert.equal(msg, req);
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
            it("should execute the callback", (done) => {
                let client;
                const server = http.createServer((req, res) => {
                    onFinished(req, (err) => {
                        server.close();
                        done(err);
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
            it("should fire when request finishes", (done) => {
                let client;
                const server = http.createServer((req, res) => {
                    res.statusCode = 405;
                    res.end();
                });
                server.on("connect", (req, socket, bodyHead) => {
                    const data = [bodyHead];

                    onFinished(req, (err) => {
                        assert.ifError(err);
                        assert.equal(Buffer.concat(data).toString(), "knock, knock");

                        socket.on("data", (chunk) => {
                            assert.equal(chunk.toString(), "ping");
                            socket.end("pong");
                        });
                        socket.write("HTTP/1.1 200 OK\r\n\r\n");
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

            it("should fire when called after finish", (done) => {
                let client;
                const server = http.createServer((req, res) => {
                    res.statusCode = 405;
                    res.end();
                });
                server.on("connect", (req, socket, bodyHead) => {
                    const data = [bodyHead];

                    onFinished(req, (err) => {
                        assert.ifError(err);
                        assert.equal(Buffer.concat(data).toString(), "knock, knock");
                        socket.write("HTTP/1.1 200 OK\r\n\r\n");
                    });

                    socket.on("data", (chunk) => {
                        assert.equal(chunk.toString(), "ping");
                        onFinished(req, (err) => {
                            socket.end("pong");
                        });
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
            it("should fire when request finishes", (done) => {
                let client;
                const server = http.createServer((req, res) => {
                    res.statusCode = 405;
                    res.end();
                });
                server.on("upgrade", (req, socket, bodyHead) => {
                    const data = [bodyHead];

                    onFinished(req, (err) => {
                        assert.ifError(err);
                        assert.equal(Buffer.concat(data).toString(), "knock, knock");

                        socket.on("data", (chunk) => {
                            assert.equal(chunk.toString(), "ping");
                            socket.end("pong");
                        });
                        socket.write("HTTP/1.1 101 Switching Protocols\r\n");
                        socket.write("Connection: Upgrade\r\n");
                        socket.write("Upgrade: Raw\r\n");
                        socket.write("\r\n");
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

            it("should fire when called after finish", (done) => {
                let client;
                const server = http.createServer((req, res) => {
                    res.statusCode = 405;
                    res.end();
                });
                server.on("upgrade", (req, socket, bodyHead) => {
                    const data = [bodyHead];

                    onFinished(req, (err) => {
                        assert.ifError(err);
                        assert.equal(Buffer.concat(data).toString(), "knock, knock");

                        socket.write("HTTP/1.1 101 Switching Protocols\r\n");
                        socket.write("Connection: Upgrade\r\n");
                        socket.write("Upgrade: Raw\r\n");
                        socket.write("\r\n");
                    });

                    socket.on("data", (chunk) => {
                        assert.equal(chunk.toString(), "ping");
                        onFinished(req, (err) => {
                            socket.end("pong");
                        });
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

    function sendget(server) {
        server.listen(function onListening() {
            const port = this.address().port;
            http.get(`http://localhost:${port}`, function onResponse(res) {
                res.resume();
                res.on("end", () => server.close());
            });
        });
    }

    function writerequest(socket, chunked) {
        socket.write("GET / HTTP/1.1\r\n");
        socket.write("Host: localhost\r\n");
        socket.write("Connection: keep-alive\r\n");

        if (chunked) {
            socket.write("Transfer-Encoding: chunked\r\n");
        }

        socket.write("\r\n");
    }
});
