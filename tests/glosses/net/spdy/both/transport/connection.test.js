const async = require("async");
const streamPair = require("stream-pair");
const fixtures = require("./fixtures");

const expectData = fixtures.expectData;
const everyProtocol = fixtures.everyProtocol;

const {
    net: { spdy: transport }
} = adone;

describe("Transport/Connection", () => {
    everyProtocol((name, version) => {
        let server;
        let client;
        let pair;

        beforeEach(() => {
            server = fixtures.server;
            client = fixtures.client;
            pair = fixtures.pair;
        });

        it("should send SETTINGS frame on both ends", (done) => {
            async.map([server, client], (side, callback) => {
                side.on("frame", (frame) => {
                    if (frame.type !== "SETTINGS") {
                        return;
                    }

                    callback();
                });
            }, done);
        });

        it("should emit `close` after GOAWAY", (done) => {
            client.request({
                path: "/hello-split"
            }, (err, stream) => {
                assert(!err);

                stream.resume();
                stream.end();
            });

            let once = false;
            server.on("stream", (stream) => {
                assert(!once);
                once = true;

                stream.respond(200, {});
                stream.resume();
                stream.end();

                let waiting = 2;
                function next() {
                    if (--waiting === 0) {
                        done();
                    }
                }

                pair.destroySoon = next;
                server.once("close", next);
                server.end();
            });
        });

        it("should dump data on GOAWAY", (done) => {
            client.request({
                path: "/hello-split"
            }, (err, stream) => {
                assert(!err);

                stream.resume();
                stream.end();
            });

            let once = false;
            server.on("stream", (stream) => {
                assert(!once);
                once = true;

                stream.respond(200, {});
                stream.resume();
                stream.end();

                pair.destroySoon = function () {
                    pair.end();
                    server.ping();

                    setTimeout(done, 10);
                };
                server.end();
            });
        });

        it("should kill late streams on GOAWAY", (done) => {
            client.request({
                path: "/hello-split"
            }, (err, stream) => {
                assert(!err);

                stream.resume();
                stream.end();

                client.request({
                    path: "/late"
                }, (err, stream) => {
                    assert(!err);

                    stream.on("error", () => {
                        done()
                    });
                });
            });

            let once = false;
            server.on("stream", (stream) => {
                assert(!once);
                once = true;

                stream.respond(200, {});
                stream.resume();
                stream.end();

                server.end();
            });
        });

        it("should send and receive ping", (done) => {
            client.ping(() => {
                server.ping(done);
            });
        });

        it("should ignore request after GOAWAY", (done) => {
            client.request({
                path: "/hello-split"
            }, (err, stream) => {
                assert(!err);

                client.request({
                    path: "/second"
                }, (err, stream) => {
                    assert(!err);

                    stream.on("error", () => {
                        // Ignore
                    });
                });
            });

            let once = false;
            server.on("stream", (stream) => {
                assert(!once);
                once = true;

                // Send GOAWAY
                server.end();
            });

            let waiting = 2;
            server.on("frame", (frame) => {
                if (frame.type === "HEADERS" && --waiting === 0) {
                    setTimeout(done, 10);
                }
            });
        });

        it("should return Stream after GOAWAY", (done) => {
            client.end(() => {
                const stream = client.request({
                    path: "/hello-split"
                });
                assert(stream);

                stream.once("error", () => {
                    done();
                });
            });
        });

        it("should timeout when sending request", (done) => {
            server.setTimeout(50, () => {
                server.end();
                setTimeout(done, 50);
            });

            setTimeout(() => {
                client.request({
                    path: "/hello-with-data"
                }, (err, stream) => {
                    assert(err);
                });
            }, 100);

            server.on("stream", (stream) => {
                assert(false);
            });
        });

        it("should not timeout when sending request", (done) => {
            server.setTimeout(100, () => {
                assert(false);
            });

            setTimeout(() => {
                client.request({
                    path: "/hello-with-data"
                }, (err, stream) => {
                    assert(!err);

                    stream.end("ok");
                    setTimeout(second, 50);
                });
            }, 50);

            function second() {
                client.request({
                    path: "/hello-with-data"
                }, (err, stream) => {
                    assert(!err);

                    stream.end("ok");
                    setTimeout(third, 50);
                });
            }

            function third() {
                client.ping(() => {
                    server.end();
                    setTimeout(done, 50);
                });
            }

            server.on("stream", (stream) => {
                stream.respond(200, {});
                stream.end();
                expectData(stream, "ok", () => { });
            });
        });

        it("should ignore request without `stream` listener", (done) => {
            client.request({
                path: "/hello-split"
            }, (err, stream) => {
                assert(!err);

                stream.on("close", (err) => {
                    assert(err);
                    done();
                });
            });
        });

        it("should ignore HEADERS frame after FIN", (done) => {
            function sendHeaders() {
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
            }

            client.request({
                path: "/hello"
            }, (err, stream) => {
                assert(!err);

                stream.resume();
                stream.once("end", () => {
                    stream.end(sendHeaders);
                });
            });

            let incoming = 0;
            server.on("stream", (stream) => {
                incoming++;
                assert(incoming <= 1);

                stream.resume();
                stream.end();
            });

            let waiting = 2;
            server.on("frame", (frame) => {
                if (frame.type === "HEADERS" && --waiting === 0) {
                    process.nextTick(done);
                }
            });
        });

        it("should use last received id when killing streams", (done) => {
            let waiting = 2;
            function next() {
                if (--waiting === 0) {
                    return done();
                }
            }
            client.once("stream", next);
            server.once("stream", next);

            server.request({
                path: "/hello"
            }, () => {
                client.request({
                    path: "/hello"
                });
            });
        });

        it("should kill stream on wrong id", (done) => {
            client._spdyState.stream.nextId = 2;

            const stream = client.request({
                path: "/hello"
            });
            stream.once("error", (err) => {
                assert(err);
                done();
            });
        });

        it("should handle SETTINGS", (done) => {
            client._spdyState.framer.settingsFrame({
                max_frame_size: 100000,
                max_header_list_size: 1000,
                header_table_size: 32,
                enable_push: true
            }, (err) => {
                assert(!err);
            });
            client._spdyState.parser.setMaxFrameSize(100000);

            client.request({
                path: "/hello"
            }, (err, stream) => {
                assert(!err);

                stream.on("data", (chunk) => {
                    assert(chunk.length > 16384 || version < 4);
                });

                stream.once("end", done);
            });

            let incoming = 0;
            server.on("stream", (stream) => {
                incoming++;
                assert(incoming <= 1);

                stream.resume();
                server._spdyState.framer.dataFrame({
                    id: stream.id,
                    priority: stream._spdyState.priority.getPriority(),
                    fin: true,
                    data: Buffer.alloc(32000)
                });
            });
        });

        it("should handle SETTINGS.initial_window_size=0", (done) => {
            const pair = streamPair.create();

            const client = transport.connection.create(pair.other, {
                protocol: name,
                windowSize: 256,
                isServer: false
            });
            client.start(version);

            const proto = transport.protocol[name];

            const framer = proto.framer.create({
                window: new transport.Window({
                    id: 0,
                    isServer: false,
                    recv: { size: 1024 * 1024 },
                    send: { size: 1024 * 1024 }
                })
            });
            const parser = proto.parser.create({
                window: new transport.Window({
                    id: 0,
                    isServer: false,
                    recv: { size: 1024 * 1024 },
                    send: { size: 1024 * 1024 }
                })
            });

            framer.setVersion(version);
            parser.setVersion(version);

            const pool = proto.compressionPool.create();
            const comp = pool.get(version);
            framer.setCompression(comp);
            parser.setCompression(comp);

            framer.pipe(pair);
            pair.pipe(parser);

            framer.settingsFrame({
                initial_window_size: 0
            }, (err) => {
                assert(!err);
            });

            client.on("frame", (frame) => {
                if (frame.type !== "SETTINGS") {
                    return;
                }

                client.request({
                    path: "/hello"
                }, (err, stream) => {
                    assert(!err);

                    // Attempt to get data through
                    setTimeout(done, 100);
                }).end("hello");
            });

            parser.on("data", (frame) => {
                assert.notEqual(frame.type, "DATA");
            });
        });

        if (version >= 4) {
            it("should ignore too large HPACK table in SETTINGS", (done) => {
                const limit = 0xffffffff;
                server._spdyState.framer.settingsFrame({
                    header_table_size: limit
                }, (err) => {
                    assert(!err);
                });

                const headers = {};
                for (let i = 0; i < 2048; i++) {
                    headers[`h${i}`] = (i % 250).toString();
                }

                client.on("frame", (frame) => {
                    if (frame.type !== "SETTINGS" ||
                        frame.settings.header_table_size !== 0xffffffff) {
                        return;
                    }

                    // Time for request!
                    const one = client.request({
                        headers,
                        path: "/hello"
                    });
                    one.end();
                    one.resume();
                });

                server.on("frame", (frame) => {
                    if (frame.type === "SETTINGS") {
                        // Emulate bigger table on server-side
                        server._spdyState.pair.decompress._table.protocolMaxSize = limit;
                        server._spdyState.pair.decompress._table.maxSize = limit;
                    }

                    if (frame.type !== "HEADERS") {
                        return;
                    }

                    assert.equal(server._spdyState.pair.decompress._table.size, 4062);
                    assert.equal(client._spdyState.pair.compress._table.size, 4062);
                    assert.equal(client._spdyState.pair.compress._table.maxSize,
                        client._spdyState.constants.HEADER_TABLE_SIZE);
                    done();
                });
            });

            it("should allow receiving PRIORITY on idle stream", (done) => {
                client._spdyState.framer.priorityFrame({
                    id: 5,
                    priority: {
                        exclusive: false,
                        parent: 3,
                        weight: 10
                    }
                }, () => {
                });

                server.on("frame", (frame) => {
                    if (frame.type === "PRIORITY") {
                        setImmediate(done);
                    }
                });

                client.on("frame", (frame) => {
                    assert.notEqual(frame.type, "GOAWAY");
                });
            });

            it("should allow receiving PRIORITY on small-id stream", (done) => {
                server.on("stream", (stream) => {
                    stream.end();
                });

                client._spdyState.stream.nextId = 3;

                const one = client.request({
                    path: "/hello"
                });
                one.end();
                one.resume();

                one.on("close", () => {
                    client._spdyState.framer.priorityFrame({
                        id: 1,
                        priority: {
                            exclusive: false,
                            parent: 3,
                            weight: 10
                        }
                    }, () => {
                    });
                });

                server.on("frame", (frame) => {
                    if (frame.type === "PRIORITY" && frame.id === 1) {
                        setImmediate(done);
                    }
                });

                client.removeAllListeners("frame");
                client.on("frame", (frame) => {
                    assert.notEqual(frame.type, "GOAWAY");
                });
            });

            it("should allow receiving PRIORITY on even-id stream", (done) => {
                client._spdyState.framer.priorityFrame({
                    id: 2,
                    priority: {
                        exclusive: false,
                        parent: 3,
                        weight: 10
                    }
                }, () => {
                });

                server.on("frame", (frame) => {
                    if (frame.type === "PRIORITY" && frame.id === 2) {
                        setImmediate(done);
                    }
                });

                client.removeAllListeners("frame");
                client.on("frame", (frame) => {
                    assert.notEqual(frame.type, "GOAWAY");
                });
            });
        }

        it("should send X_FORWARDED_FOR", (done) => {
            client.sendXForwardedFor("1.2.3.4");

            client.request({
                path: "/hello"
            }, (err, stream) => {
                assert(!err);

                stream.resume();
                stream.once("end", done);
            });

            server.on("stream", (stream) => {
                assert.equal(server.getXForwardedFor(), "1.2.3.4");

                stream.resume();
                stream.end();
            });
        });
    });
});
