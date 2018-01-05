const fixtures = require("./fixtures");

const expectData = fixtures.expectData;
const everyProtocol = fixtures.everyProtocol;

describe("Transport/Push", () => {
    everyProtocol((name, version) => {
        let server;
        let client;

        beforeEach(() => {
            server = fixtures.server;
            client = fixtures.client;
            // var pair = fixtures.pair
        });

        it("should create PUSH_PROMISE", (done) => {
            client.request({
                path: "/parent"
            }, (err, stream) => {
                assert(!err);

                stream.on("pushPromise", (push) => {
                    assert.equal(push.path, "/push");
                    assert.equal(client.getCounter("push"), 1);
                    push.on("response", (status, headers) => {
                        assert.equal(status, 201);
                        done();
                    });
                });
            });

            server.on("stream", (stream) => {
                assert.equal(stream.path, "/parent");

                stream.respond(200, {});
                stream.pushPromise({
                    path: "/push",
                    status: 201,
                    priority: {
                        parent: 0,
                        exclusive: false,
                        weight: 42
                    }
                }, (err, stream) => {
                    assert(!err);
                });
            });
        });

        it("should send HEADERS on PUSH_PROMISE", (done) => {
            client.request({
                path: "/parent"
            }, (err, stream) => {
                assert(!err);

                stream.on("pushPromise", (push) => {
                    push.on("headers", (headers) => {
                        assert.deepEqual(headers, { a: "b" });
                        done();
                    });
                });
            });

            server.on("stream", (stream) => {
                assert.equal(stream.path, "/parent");

                stream.respond(200, {});
                stream.pushPromise({
                    path: "/push",
                    priority: {
                        parent: 0,
                        exclusive: false,
                        weight: 42
                    }
                }, (err, stream) => {
                    assert(!err);

                    stream.sendHeaders({ a: "b" });
                });
            });
        });

        if (version >= 4) {
            it("should send PUSH_PROMISE+HEADERS and HEADERS concurrently",
                (done) => {
                    const seq = [];

                    client.request({
                        path: "/parent"
                    }, (err, stream) => {
                        assert(!err);

                        stream.on("pushPromise", (push) => {
                            assert.equal(push.path, "/push");
                            assert.equal(client.getCounter("push"), 1);
                            push.on("response", (status) => {
                                assert.equal(status, 201);
                                assert.deepEqual(seq, [0, 1, 2]);
                                done();
                            });
                        });
                    });

                    client.on("frame", (frame) => {
                        if (frame.type === "HEADERS" || frame.type === "PUSH_PROMISE") {
                            seq.push(frame.headers.seq | 0);
                        }
                    });

                    server.on("stream", (stream) => {
                        assert.equal(stream.path, "/parent");

                        stream.pushPromise({
                            path: "/push",
                            status: 201,
                            priority: {
                                parent: 0,
                                exclusive: false,
                                weight: 42
                            },
                            headers: {
                                seq: "0"
                            },
                            response: {
                                seq: "2"
                            }
                        }, (err, stream) => {
                            assert(!err);
                        });
                        process.nextTick(() => {
                            stream.respond(200, {
                                seq: "1"
                            });
                        });
                    });
                });
        }

        it("should create PUSH_PROMISE and end parent req", (done) => {
            client.request({
                path: "/parent"
            }, (err, stream) => {
                assert(!err);

                stream.resume();
                stream.end();
                stream.on("pushPromise", (push) => {
                    assert.equal(push.path, "/push");
                    done();
                });
            });

            server.on("stream", (stream) => {
                assert.equal(stream.path, "/parent");

                stream.respond(200, {});
                stream.resume();
                stream.on("end", () => {
                    stream.pushPromise({
                        path: "/push",
                        priority: {
                            parent: 0,
                            exclusive: false,
                            weight: 42
                        }
                    }, (err, stream) => {
                        assert(!err);
                    });
                    stream.end();
                });
            });
        });

        it("should cork PUSH_PROMISE on write", (done) => {
            client.request({
                path: "/parent"
            }, (err, stream) => {
                assert(!err);

                stream.on("pushPromise", (push) => {
                    assert.equal(push.path, "/push");
                    expectData(push, "ok", done);
                });
            });

            server.on("stream", (stream) => {
                assert.equal(stream.path, "/parent");

                stream.respond(200, {});
                const push = stream.pushPromise({
                    path: "/push",
                    priority: {
                        parent: 0,
                        exclusive: false,
                        weight: 42
                    }
                }, (err, stream) => {
                    assert(!err);
                });

                push.end("ok");
            });
        });

        it("should emit `close` on PUSH_PROMISE", (done) => {
            client.request({
                path: "/parent"
            }, (err, stream) => {
                assert(!err);

                stream.on("pushPromise", (push) => {
                    assert.equal(push.path, "/push");

                    push.on("close", next);
                    push.resume();
                });
            });

            server.on("stream", (stream) => {
                assert.equal(stream.path, "/parent");

                stream.respond(200, {});
                stream.pushPromise({
                    path: "/push",
                    priority: {
                        parent: 0,
                        exclusive: false,
                        weight: 42
                    }
                }, (err, stream) => {
                    assert(!err);
                    stream.on("close", next);
                    stream.end("ohai");
                });
            });

            let waiting = 2;
            function next() {
                if (--waiting === 0) {
                    return done();
                }
            }
        });

        it("should ignore PUSH_PROMISE", (done) => {
            client.request({
                path: "/parent"
            }, (err, stream) => {
                assert(!err);
            });

            server.on("stream", (stream) => {
                assert.equal(stream.path, "/parent");

                stream.respond(200, {});
                stream.pushPromise({
                    path: "/push",
                    priority: {
                        parent: 0,
                        exclusive: false,
                        weight: 42
                    }
                }, (err, stream) => {
                    assert(!err);
                    stream.once("close", (err) => {
                        assert(err);
                        done();
                    });
                });
            });
        });

        it("should fail on server-disabled PUSH_PROMISE", (done) => {
            client.request({
                path: "/parent"
            }, (err, stream) => {
                assert(!err);

                stream._spdyState.framer.enablePush(true);
                stream.pushPromise({
                    path: "/push",
                    priority: {
                        parent: 0,
                        exclusive: false,
                        weight: 42
                    }
                }, (err, stream) => {
                    assert(!err);
                    stream.on("error", (err) => {
                        assert(err);
                    });
                });

                client.on("close", (err) => {
                    assert(err);
                    done();
                });
            });

            server.on("stream", (stream) => {
                assert.equal(stream.path, "/parent");

                stream.respond(200, {});
                stream.on("pushPromise", () => {
                    assert(false);
                });
            });
        });

        it("should fail on client-disabled PUSH_PROMISE", (done) => {
            client.request({
                path: "/parent"
            }, (err, stream) => {
                assert(!err);

                stream._spdyState.framer.enablePush(false);
                const push = stream.pushPromise({
                    path: "/push",
                    priority: {
                        parent: 0,
                        exclusive: false,
                        weight: 42
                    }
                }, (err, stream) => {
                    assert(err);
                    setTimeout(() => {
                        done();
                    }, 50);
                });
                push.write("hello");
            });

            // The PUSH data should not be sent
            server.on("frame", (frame) => {
                assert.notEqual(frame.type, "DATA");
            });

            server.on("stream", (stream) => {
                assert.equal(stream.path, "/parent");

                stream.respond(200, {});
                stream.on("pushPromise", () => {
                    assert(false);
                });
            });
        });

        it("should get error on disabled PUSH_PROMISE", (done) => {
            client.request({
                path: "/parent"
            }, (err, stream) => {
                assert(!err);

                stream.pushPromise({
                    path: "/push",
                    priority: {
                        parent: 0,
                        exclusive: false,
                        weight: 42
                    }
                }, (err, stream) => {
                    assert(err);
                    done();
                });
            });

            server.on("stream", (stream) => {
                assert.equal(stream.path, "/parent");

                stream.respond(200, {});

                stream.on("pushPromise", () => {
                    assert(false);
                });
            });
        });

        it("should not error on extra PRIORITY frame", (done) => {
            client.request({
                path: "/parent"
            }, (err, stream) => {
                assert(!err);

                stream.on("pushPromise", (push) => {
                    push.on("response", () => {
                        // .abort() does this only on next tick
                        push.emit("close");

                        stream.end("ok");
                    });
                });
            });

            server.on("stream", (stream) => {
                assert.equal(stream.path, "/parent");

                stream.respond(200, {});
                stream.pushPromise({
                    path: "/push",
                    priority: {
                        parent: 0,
                        exclusive: false,
                        weight: 42
                    }
                }, (err, stream) => {
                    assert(!err);
                    stream.on("error", () => {
                        assert(false);
                    });
                });

                expectData(stream, "ok", done);
            });
        });

        it("should not fail on aborting PUSH_PROMISE frame", (done) => {
            client.request({
                path: "/parent"
            }, (err, stream) => {
                assert(!err);

                stream.on("pushPromise", (push) => {
                    push.abort();
                    stream.end("ok");
                });
            });

            server.on("stream", (stream) => {
                assert.equal(stream.path, "/parent");

                stream.respond(200, {});
                stream.pushPromise({
                    path: "/push",
                    priority: {
                        parent: 0,
                        exclusive: false,
                        weight: 42
                    }
                }, (err, stream) => {
                    assert(!err);
                    stream.on("error", () => {
                        assert(false);
                    });
                });

                expectData(stream, "ok", done);
            });
        });
    });
});
