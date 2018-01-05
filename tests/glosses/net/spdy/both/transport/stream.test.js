const fixtures = require("./fixtures");

const expectData = fixtures.expectData;
const everyProtocol = fixtures.everyProtocol;

describe("Transport/Stream", () => {
    everyProtocol((name, version) => {
        let server;
        let client;

        beforeEach(() => {
            server = fixtures.server;
            client = fixtures.client;
            // var pair = fixtures.pair
        });

        it("should send request", (done) => {
            let sent = false;
            let received = false;

            client.request({
                method: "GET",
                path: "/hello",
                headers: {
                    a: "b",
                    c: "d"
                }
            }, (err, stream) => {
                assert(!err);
                sent = true;

                stream.on("response", (code, headers) => {
                    assert(received);

                    assert.strictEqual(code, 200);
                    assert.equal(headers.ohai, "yes");
                    done();
                });
            });

            server.on("stream", (stream) => {
                stream.respond(200, {
                    ohai: "yes"
                });

                received = true;

                assert(sent);
                assert.equal(stream.method, "GET");
                assert.equal(stream.path, "/hello");
                assert.equal(stream.headers.a, "b");
                assert.equal(stream.headers.c, "d");
            });
        });

        it("should send data on request", (done) => {
            client.request({
                method: "POST",
                path: "/hello-with-data",
                headers: {
                    a: "b",
                    c: "d"
                }
            }, (err, stream) => {
                assert(!err);

                stream.write("hello ");
                stream.end("world");
            });

            server.on("stream", (stream) => {
                stream.respond(200, {
                    ohai: "yes"
                });

                expectData(stream, "hello world", done);
            });
        });

        it("should send data after response", (done) => {
            client.request({
                method: "GET",
                path: "/hello-with-data",
                headers: {
                    a: "b",
                    c: "d"
                }
            }, (err, stream) => {
                assert(!err);

                let gotResponse = false;
                stream.on("response", () => {
                    gotResponse = true;
                });

                expectData(stream, "ohai", () => {
                    assert(gotResponse);
                    done();
                });
            });

            server.on("stream", (stream) => {
                stream.respond(200, {
                    ohai: "yes"
                });

                stream.end("ohai");
            });
        });

        it("should send HEADERS right before FIN", (done) => {
            client.request({
                method: "POST",
                path: "/hello-with-data"
            }, (err, stream) => {
                assert(!err);

                stream.sendHeaders({ a: "b" });
                stream.end();
            });

            server.on("stream", (stream) => {
                let gotHeaders = false;
                stream.on("headers", (headers) => {
                    gotHeaders = true;
                    assert.equal(headers.a, "b");
                });

                stream.resume();
                stream.on("end", () => {
                    assert(gotHeaders);
                    done();
                });
            });
        });

        it("should timeout when sending data request", (done) => {
            client.request({
                method: "POST",
                path: "/hello-with-data"
            }, (err, stream) => {
                assert(!err);

                stream.on("error", () => {
                    // Ignore errors
                });

                stream.write("hello ");
                setTimeout(() => {
                    stream.end("world");
                }, 100);
            });

            server.on("stream", (stream) => {
                stream.respond(200, {
                    ohai: "yes"
                });

                stream.setTimeout(50, () => {
                    stream.setTimeout(0);
                    setTimeout(done, 50);
                });
            });
        });

        it("should not timeout when sending data request", (done) => {
            client.request({
                method: "POST",
                path: "/hello-with-data"
            }, (err, stream) => {
                assert(!err);

                stream.on("error", () => {
                    assert(false);
                });

                stream.write("hell");
                setTimeout(() => {
                    stream.write("o ");
                }, 50);
                setTimeout(() => {
                    stream.write("wor");
                }, 100);
                setTimeout(() => {
                    stream.end("ld");
                }, 150);
            });

            server.on("stream", (stream) => {
                stream.respond(200, {
                    ohai: "yes"
                });

                stream.setTimeout(100, () => {
                    assert(false);
                });

                expectData(stream, "hello world", () => {
                    stream.setTimeout(0);
                    setTimeout(done, 50);
                });
            });
        });

        it("should fail to send data after FIN", (done) => {
            client.request({
                method: "POST",
                path: "/hello-with-data",
                headers: {
                    a: "b",
                    c: "d"
                }
            }, (err, stream) => {
                assert(!err);

                stream.write("hello ");
                stream.end("world", () => {
                    stream._spdyState.framer.dataFrame({
                        id: stream.id,
                        priority: 0,
                        fin: false,
                        data: Buffer.from("no way")
                    });
                });

                stream.on("error", next);
            });

            server.on("stream", (stream) => {
                stream.respond(200, {
                    ohai: "yes"
                });

                expectData(stream, "hello world", next);
            });

            let waiting = 2;
            function next() {
                if (--waiting === 0) {
                    return done(); 
                }
            }
        });

        it("should truncate data to fit maxChunk", (done) => {
            const big = Buffer.alloc(1024);
            big.fill("a");

            client.request({
                path: "/hello-with-data"
            }, (err, stream) => {
                assert(!err);

                stream.setMaxChunk(10);
                stream.end(big);
            });

            server.on("stream", (stream) => {
                stream.respond(200, {
                    ohai: "yes"
                });

                stream.on("data", (chunk) => {
                    assert(chunk.length <= 10);
                });
                expectData(stream, big, done);
            });
        });

        it("should control the flow of the request", (done) => {
            const a = Buffer.alloc(128);
            a.fill("a");
            const b = Buffer.alloc(128);
            b.fill("b");

            client.request({
                method: "POST",
                path: "/hello-flow",
                headers: {
                    a: "b",
                    c: "d"
                }
            }, (err, stream) => {
                assert(!err);

                stream.setWindow(128);

                // Make sure settings will be applied before this
                stream.on("response", () => {
                    stream.write(a);
                    stream.write(b);
                    stream.write(a);
                    stream.end(b);
                });
            });

            server.on("stream", (stream) => {
                stream.setWindow(128);
                stream.respond(200, {});

                expectData(stream, a + b + a + b, done);
            });
        });

        it("should emit `close` on stream", (done) => {
            client.request({
                method: "GET",
                path: "/hello-close",
                headers: {
                    a: "b",
                    c: "d"
                }
            }, (err, stream) => {
                assert(!err);

                stream.on("close", done);
                stream.resume();
                stream.end();
            });

            server.on("stream", (stream) => {
                stream.respond(200, {});
                stream.resume();
                stream.end();
            });
        });

        it("should split the data if it is too big", (done) => {
            const a = Buffer.alloc(1024);
            a.fill("a");

            client.request({
                path: "/hello-split"
            }, (err, stream) => {
                assert(!err);

                // Make sure settings will be applied before this
                stream.on("response", () => {
                    stream.end(a);
                });
            });

            server.on("stream", (stream) => {
                stream.respond(200, {});

                expectData(stream, a, done);
            });
        });

        it("should emit trailing headers", (done) => {
            client.request({
                method: "POST",
                path: "/hello-split"
            }, (err, stream) => {
                assert(!err);

                // Make sure settings will be applied before this
                stream.on("response", () => {
                    stream.write("hello");
                    stream.sendHeaders({ trailer: "yes" });
                    stream.end();
                });
            });

            server.on("stream", (stream) => {
                stream.respond(200, {});

                stream.resume();
                stream.on("headers", (headers) => {
                    assert.equal(headers.trailer, "yes");
                    done();
                });
            });
        });

        it("should abort request", (done) => {
            client.request({
                path: "/hello-split"
            }, (err, stream) => {
                assert(!err);

                stream.on("close", (err) => {
                    assert(err);
                    done();
                });
            });

            server.on("stream", (stream) => {
                stream.abort();
            });
        });

        it("should abort request with pending write", (done) => {
            client.request({
                path: "/hello-split"
            }, (err, stream) => {
                assert(!err);

                stream.on("data", () => {
                    assert(false, "got data on aborted stream");
                });

                stream.on("close", (err) => {
                    assert(err);
                });
            });

            server.on("stream", (stream) => {
                stream.write("hello", (err) => {
                    assert(err);

                    // Make sure it will emit the errors
                    process.nextTick(done);
                });
                stream.on("error", (err) => {
                    assert(err);
                });

                stream.abort();
            });
        });

        it("should abort request on closed stream", (done) => {
            client.request({
                path: "/hello-split"
            }, (err, stream) => {
                assert(!err);

                stream.resume();
                stream.end();
            });

            server.on("stream", (stream) => {
                stream.respond(200, {});
                stream.resume();
                stream.end();

                stream.once("close", () => {
                    stream.abort(done);
                });
            });
        });

        it("should abort request only once", (done) => {
            client.request({
                path: "/hello-split"
            }, (err, stream) => {
                assert(!err);

                let once = false;
                stream.on("close", (err) => {
                    assert(!once);
                    once = true;

                    assert(err);
                });
            });

            client.on("close", () => {
                done();
            });

            server.on("stream", (stream) => {
                stream.abort();
                server.end();
            });
        });

        it("should create prioritized stream", (done) => {
            client.request({
                path: "/path",
                priority: {
                    parent: 0,
                    exclusive: false,
                    weight: 42
                }
            }, (err, stream) => {
                assert(!err);
            });

            server.on("stream", (stream) => {
                const priority = stream._spdyState.priority;

                // SPDY has just 3 bits of priority, can't fit 256 range into it
                if (version >= 4) {
                    assert.equal(priority.weight, 42);
                } else {
                    assert.equal(priority.weight, 36);
                }
                done();
            });
        });

        it("should emit error on window overflow", (done) => {
            const req = client.request({
                path: "/path",
                priority: {
                    parent: 0,
                    exclusive: false,
                    weight: 42
                }
            }, (err, stream) => {
                assert(!err);
            });

            server.on("stream", (stream) => {
                server._spdyState.framer.windowUpdateFrame({
                    id: stream.id,
                    delta: 0x7fffffff
                });

                let waiting = 2;
                function next(err) {
                    assert(err);
                    if (--waiting === 0) {
                        done();
                    }
                }

                stream.once("error", next);

                req.once("error", next);
            });
        });

        if (version >= 4) {
            it("should update stream priority", (done) => {
                client.request({
                    method: "GET",
                    path: "/hello-split"
                }, (err, stream) => {
                    assert(!err);

                    stream.on("priority", (info) => {
                        assert.equal(info.parent, 0);
                        assert.equal(info.exclusive, false);
                        assert.equal(info.weight, 42);
                        done();
                    });
                });

                server.on("stream", (stream) => {
                    stream.setPriority({ parent: 0, exclusive: false, weight: 42 });
                });
            });
        }

        it("should send fin-request", (done) => {
            client._spdyState.framer.requestFrame({
                id: 1,
                method: "GET",
                path: "/",
                priority: null,
                headers: {},
                fin: true
            }, (err) => {
                assert(!err);
            });

            server.on("stream", (stream) => {
                stream.once("end", done);
                stream.resume();
            });
        });

        it("should reserve and send request", (done) => {
            let sent = false;
            let received = false;

            client.reserveStream({
                path: "/hello"
            }, (err, stream) => {
                assert(!err);
                sent = true;

                setTimeout(() => {
                    stream.send((err) => {
                        sent = true;
                        assert(!err);
                    });
                }, 50);

                stream.on("response", (code, headers) => {
                    assert(received);

                    done();
                });
            });

            server.on("stream", (stream) => {
                stream.respond(200, {
                });
                received = true;

                assert(sent);
            });
        });

        it("should coalesce headers in reserved stream", (done) => {
            let sent = false;
            let received = false;

            client.reserveStream({
                path: "/hello",
                headers: {
                    normal: "yes"
                }
            }, (err, stream) => {
                assert(!err);
                sent = true;

                stream.sendHeaders({ "not-trailer": "yay" });

                setTimeout(() => {
                    stream.send((err) => {
                        sent = true;
                        assert(!err);
                    });
                }, 50);

                stream.on("response", (code, headers) => {
                    assert(received);

                    done();
                });
            });

            server.on("stream", (stream) => {
                assert.equal(stream.headers.normal, "yes");
                assert.equal(stream.headers["not-trailer"], "yay");
                stream.respond(200, {
                });
                received = true;

                assert(sent);
            });
        });

        it("should reserve and end request", (done) => {
            client.reserveStream({
                method: "PUT",
                path: "/hello"
            }, (err, stream) => {
                assert(!err);
                stream.end();
            });

            server.on("frame", (frame) => {
                if (frame.type !== "HEADERS") {
                    return;
                }

                assert.equal(frame.fin, true);
                done();
            });
        });

        it("should auto-end GET request", (done) => {
            client.reserveStream({
                method: "GET",
                path: "/hello"
            }, (err, stream) => {
                assert(!err);
                stream.end();
            });

            server.on("frame", (frame) => {
                if (frame.type !== "HEADERS") {
                    return; 
                }

                assert.equal(frame.fin, true);
                done();
            });
        });

        it("should send reserved request on write", (done) => {
            client.reserveStream({
                method: "POST",
                path: "/hello"
            }, (err, stream) => {
                assert(!err);
                stream.end("hello");
            });

            server.on("stream", (stream) => {
                assert.equal(stream.method, "POST");
                expectData(stream, "hello", done);
            });
        });

        it("should not send extra frames after FIN", (done) => {
            client.request({
                path: "/hello"
            }, (err, stream) => {
                assert(!err);

                stream.resume();
                stream.end(() => {
                    stream.sendHeaders({}, (err) => {
                        assert(err);
                        done();
                    });
                });
            });

            server.on("stream", (stream) => {
                stream.resume();
            });
        });

        it("should send request with Array header value", (done) => {
            let sent = false;
            let received = false;

            client.request({
                method: "GET",
                path: "/hello",
                headers: {
                    other: ["b", "c"],
                    cookie: ["d", "e"]
                }
            }, (err, stream) => {
                assert(!err);
                sent = true;

                stream.on("response", (code, headers) => {
                    assert(received);
                    done();
                });
            });

            server.on("stream", (stream) => {
                stream.respond(200, {});

                received = true;

                assert(sent);
                assert.equal(stream.headers.other, "b, c");

                // NOTE: Browser sends them this way
                assert.equal(stream.headers.cookie, "d; e");
            });
        });
    });
});
