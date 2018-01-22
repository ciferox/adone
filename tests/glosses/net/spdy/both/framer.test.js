const {
    is,
    net: { spdy: transport }
} = adone;

describe("Framer", () => {
    let framer;
    let parser;

    const protocol = function (name, version, body) {
        describe(`${name} (v${version})`, () => {
            beforeEach(() => {
                const proto = transport.protocol[name];

                const pool = proto.CompressionPool.create();
                framer = proto.Framer.create({
                    window: new transport.Window({
                        id: 0,
                        isServer: false,
                        recv: { size: 1024 * 1024 },
                        send: { size: 1024 * 1024 }
                    })
                });
                parser = proto.Parser.create({
                    isServer: true,
                    window: new transport.Window({
                        id: 0,
                        isServer: true,
                        recv: { size: 1024 * 1024 },
                        send: { size: 1024 * 1024 }
                    })
                });

                const comp = pool.get(version);
                framer.setCompression(comp);
                parser.setCompression(comp);

                framer.setVersion(version);
                parser.setVersion(version);

                parser.skipPreface();

                framer.pipe(parser);
            });

            body(name, version);
        });
    };

    const everyProtocol = function (body) {
        protocol("http2", 4, body);
        protocol("spdy", 2, body);
        protocol("spdy", 3, body);
        protocol("spdy", 3.1, body);
    };

    const expect = function (expected, done) {
        const acc = [];
        if (!is.array(expected)) {
            expected = [expected];
        }
        parser.on("data", (frame) => {
            acc.push(frame);

            if (acc.length !== expected.length) {
                return;
            }

            assert.deepEqual(acc, expected);
            done();
        });
    };

    everyProtocol((name, version) => {
        describe("SETTINGS", () => {
            it("should generate empty frame", (done) => {
                framer.settingsFrame({}, (err) => {
                    assert(!err);

                    expect({
                        type: "SETTINGS",
                        settings: {}
                    }, done);
                });
            });

            it("should generate regular frame", (done) => {
                framer.settingsFrame({
                    max_concurrent_streams: 100,
                    initial_window_size: 42
                }, (err) => {
                    assert(!err);

                    expect({
                        type: "SETTINGS",
                        settings: {
                            max_concurrent_streams: 100,
                            initial_window_size: 42
                        }
                    }, done);
                });
            });

            it("should not put Infinity values", (done) => {
                framer.settingsFrame({
                    max_concurrent_streams: Infinity
                }, (err) => {
                    assert(!err);

                    expect({
                        type: "SETTINGS",
                        settings: {}
                    }, done);
                });
            });

            if (version >= 4) {
                it("should generate ACK frame", (done) => {
                    framer.ackSettingsFrame((err) => {
                        assert(!err);

                        expect({
                            type: "ACK_SETTINGS"
                        }, done);
                    });
                });
            }
        });

        describe("WINDOW_UPDATE", () => {
            it("should generate regular frame", (done) => {
                framer.windowUpdateFrame({
                    id: 41,
                    delta: 257
                }, (err) => {
                    assert(!err);

                    expect({
                        type: "WINDOW_UPDATE",
                        id: 41,
                        delta: 257
                    }, done);
                });
            });

            it("should generate negative delta frame", (done) => {
                framer.windowUpdateFrame({
                    id: 41,
                    delta: -257
                }, (err) => {
                    assert(!err);

                    expect({
                        type: "WINDOW_UPDATE",
                        id: 41,
                        delta: -257
                    }, done);
                });
            });
        });

        describe("DATA", () => {
            it("should generate regular frame", (done) => {
                framer.dataFrame({
                    id: 41,
                    priority: 0,
                    fin: false,
                    data: Buffer.from("hello")
                }, (err) => {
                    assert(!err);

                    expect({
                        type: "DATA",
                        id: 41,
                        fin: false,
                        data: Buffer.from("hello")
                    }, done);
                });
            });

            it("should generate fin frame", (done) => {
                framer.dataFrame({
                    id: 41,
                    priority: 0,
                    fin: true,
                    data: Buffer.from("hello")
                }, (err) => {
                    assert(!err);

                    expect({
                        type: "DATA",
                        id: 41,
                        fin: true,
                        data: Buffer.from("hello")
                    }, done);
                });
            });

            it("should generate empty frame", (done) => {
                framer.dataFrame({
                    id: 41,
                    priority: 0,
                    fin: false,
                    data: Buffer.alloc(0)
                }, (err) => {
                    assert(!err);

                    expect({
                        type: "DATA",
                        id: 41,
                        fin: false,
                        data: Buffer.alloc(0)
                    }, done);
                });
            });

            it("should split frame in multiple", (done) => {
                framer.setMaxFrameSize(10);
                parser.setMaxFrameSize(10);

                const big = Buffer.alloc(32);
                big.fill("A");

                framer.dataFrame({
                    id: 41,
                    priority: 0,
                    fin: false,
                    data: big
                }, (err) => {
                    assert(!err);

                    let waiting = big.length;
                    let actual = "";
                    parser.on("data", (frame) => {
                        assert.equal(frame.type, "DATA");
                        actual += frame.data;
                        waiting -= frame.data.length;
                        if (waiting !== 0) {
                            return;
                        }

                        assert.equal(actual, big.toString());
                        done();
                    });
                });
            });

            it("should update window on both sides", (done) => {
                framer.dataFrame({
                    id: 41,
                    priority: 0,
                    fin: false,
                    data: Buffer.from("hello")
                }, (err) => {
                    assert(!err);

                    expect({
                        type: "DATA",
                        id: 41,
                        fin: false,
                        data: Buffer.from("hello")
                    }, () => {
                        assert.equal(framer.window.send.current,
                            parser.window.recv.current);
                        assert.equal(framer.window.send.current, 1024 * 1024 - 5);
                        done();
                    });
                });
            });
        });

        describe("HEADERS", () => {
            it("should generate request frame", (done) => {
                const headers = {
                    a: "b",
                    host: "localhost",

                    // Should be removed
                    connection: "keep-alive",
                    "keep-alive": "yes",
                    "proxy-connection": "totally",
                    "transfer-encoding": "chunked"
                };

                // Should be removed too
                if (version >= 4) {
                    headers.upgrade = "h2";
                }

                framer.requestFrame({
                    id: 1,
                    path: "/",
                    host: "localhost",
                    method: "GET",
                    headers
                }, (err) => {
                    assert(!err);

                    expect({
                        type: "HEADERS",
                        id: 1,
                        fin: false,
                        writable: true,
                        priority: {
                            weight: 16,
                            parent: 0,
                            exclusive: false
                        },
                        path: "/",
                        headers: {
                            ":authority": "localhost",
                            ":path": "/",
                            ":scheme": "https",
                            ":method": "GET",

                            a: "b"
                        }
                    }, done);
                });
            });

            it("should skip internal headers", (done) => {
                framer.requestFrame({
                    id: 1,
                    path: "/",
                    host: "localhost",
                    method: "GET",
                    headers: {
                        a: "b",
                        host: "localhost",
                        ":method": "oopsie"
                    }
                }, (err) => {
                    assert(!err);

                    expect({
                        type: "HEADERS",
                        id: 1,
                        fin: false,
                        writable: true,
                        priority: {
                            weight: 16,
                            parent: 0,
                            exclusive: false
                        },
                        path: "/",
                        headers: {
                            ":authority": "localhost",
                            ":path": "/",
                            ":scheme": "https",
                            ":method": "GET",

                            a: "b"
                        }
                    }, done);
                });
            });

            it("should generate priority request frame", (done) => {
                framer.requestFrame({
                    id: 1,
                    path: "/",
                    host: "localhost",
                    method: "GET",
                    headers: {
                        a: "b"
                    },
                    priority: {
                        exclusive: true,
                        weight: 1
                    }
                }, (err) => {
                    assert(!err);

                    expect({
                        type: "HEADERS",
                        id: 1,
                        fin: false,
                        writable: true,
                        priority: {
                            weight: 1,
                            parent: 0,

                            // No exclusive flag in SPDY
                            exclusive: version >= 4
                        },
                        path: "/",
                        headers: {
                            ":authority": "localhost",
                            ":path": "/",
                            ":scheme": "https",
                            ":method": "GET",

                            a: "b"
                        }
                    }, done);
                });
            });

            it("should generate fin request frame", (done) => {
                framer.requestFrame({
                    id: 1,
                    fin: true,
                    path: "/",
                    host: "localhost",
                    method: "GET",
                    headers: {
                        a: "b"
                    }
                }, (err) => {
                    assert(!err);

                    expect({
                        type: "HEADERS",
                        id: 1,
                        fin: true,
                        writable: true,
                        priority: {
                            weight: 16,
                            parent: 0,
                            exclusive: false
                        },
                        path: "/",
                        headers: {
                            ":authority": "localhost",
                            ":path": "/",
                            ":scheme": "https",
                            ":method": "GET",

                            a: "b"
                        }
                    }, done);
                });
            });

            it("should generate response frame", (done) => {
                framer.responseFrame({
                    id: 1,
                    status: 200,
                    reason: "OK",
                    host: "localhost",
                    headers: {
                        a: "b"
                    }
                }, (err) => {
                    assert(!err);

                    expect({
                        type: "HEADERS",
                        id: 1,
                        fin: false,
                        writable: true,
                        priority: {
                            weight: 16,
                            parent: 0,
                            exclusive: false
                        },
                        path: undefined,
                        headers: {
                            ":status": "200",

                            a: "b"
                        }
                    }, done);
                });
            });

            it("should not update window on both sides", (done) => {
                framer.requestFrame({
                    id: 1,
                    fin: true,
                    path: "/",
                    host: "localhost",
                    method: "GET",
                    headers: {
                        a: "b"
                    }
                }, (err) => {
                    assert(!err);

                    expect({
                        type: "HEADERS",
                        id: 1,
                        fin: true,
                        writable: true,
                        priority: {
                            weight: 16,
                            parent: 0,
                            exclusive: false
                        },
                        path: "/",
                        headers: {
                            ":authority": "localhost",
                            ":path": "/",
                            ":scheme": "https",
                            ":method": "GET",

                            a: "b"
                        }
                    }, () => {
                        assert.equal(framer.window.send.current,
                            parser.window.recv.current);
                        assert.equal(framer.window.send.current, 1024 * 1024);
                        done();
                    });
                });
            });
        });

        describe("PUSH_PROMISE", () => {
            it("should generate regular frame", (done) => {
                framer.pushFrame({
                    id: 3,
                    promisedId: 41,
                    path: "/",
                    host: "localhost",
                    method: "GET",
                    status: 200,
                    headers: {
                        a: "b"
                    }
                }, (err) => {
                    assert(!err);

                    expect([{
                        type: "PUSH_PROMISE",
                        id: 3,
                        promisedId: 41,
                        fin: false,
                        path: "/",
                        headers: {
                            ":authority": "localhost",
                            ":path": "/",
                            ":scheme": "https",
                            ":method": "GET",

                            a: "b"
                        }
                    }, {
                        type: "HEADERS",
                        id: 41,
                        priority: {
                            exclusive: false,
                            parent: 0,
                            weight: 16
                        },
                        writable: true,
                        path: undefined,
                        fin: false,
                        headers: {
                            ":status": "200"
                        }
                    }], done);
                });
                framer.enablePush(true);
            });

            it("should generate priority frame", (done) => {
                framer.pushFrame({
                    id: 3,
                    promisedId: 41,
                    path: "/",
                    host: "localhost",
                    method: "GET",
                    status: 200,
                    priority: {
                        exclusive: false,
                        weight: 1,
                        parent: 0
                    },
                    headers: {
                        a: "b"
                    }
                }, (err) => {
                    assert(!err);

                    expect([{
                        type: "PUSH_PROMISE",
                        id: 3,
                        promisedId: 41,
                        fin: false,
                        path: "/",
                        headers: {
                            ":authority": "localhost",
                            ":path": "/",
                            ":scheme": "https",
                            ":method": "GET",

                            a: "b"
                        }
                    }, {
                        type: "HEADERS",
                        id: 41,
                        priority: {
                            exclusive: false,
                            parent: 0,
                            weight: 1
                        },
                        writable: true,
                        path: undefined,
                        fin: false,
                        headers: {
                            ":status": "200"
                        }
                    }], done);
                });
                framer.enablePush(true);
            });

            if (version >= 4) {
                it("should fail to generate regular frame on disabled PUSH",
                    (done) => {
                        framer.pushFrame({
                            id: 3,
                            promisedId: 41,
                            path: "/",
                            host: "localhost",
                            method: "GET",
                            status: 200,
                            headers: {
                                a: "b"
                            }
                        }, (err) => {
                            assert(err);
                            done();
                        });
                        framer.enablePush(false);
                    });
            }
        });

        describe("trailing HEADERS", () => {
            it("should generate regular frame", (done) => {
                framer.headersFrame({
                    id: 3,
                    headers: {
                        a: "b"
                    }
                }, (err) => {
                    assert(!err);

                    expect({
                        type: "HEADERS",
                        id: 3,
                        priority: {
                            parent: 0,
                            exclusive: false,
                            weight: 16
                        },
                        fin: false,
                        writable: true,
                        path: undefined,
                        headers: {
                            a: "b"
                        }
                    }, done);
                });
            });

            it("should generate frames concurrently", (done) => {
                framer.headersFrame({
                    id: 3,
                    headers: {
                        a: "b"
                    }
                });
                framer.headersFrame({
                    id: 3,
                    headers: {
                        c: "d"
                    }
                });

                expect([{
                    type: "HEADERS",
                    id: 3,
                    priority: {
                        parent: 0,
                        exclusive: false,
                        weight: 16
                    },
                    fin: false,
                    writable: true,
                    path: undefined,
                    headers: {
                        a: "b"
                    }
                }, {
                    type: "HEADERS",
                    id: 3,
                    priority: {
                        parent: 0,
                        exclusive: false,
                        weight: 16
                    },
                    fin: false,
                    writable: true,
                    path: undefined,
                    headers: {
                        c: "d"
                    }
                }], done);
            });

            it("should generate continuations", (done) => {
                framer.setMaxFrameSize(10);
                parser.setMaxFrameSize(10);

                framer.headersFrame({
                    id: 3,
                    headers: {
                        a: "+++++++++++++++++++++++",
                        c: "+++++++++++++++++++++++",
                        e: "+++++++++++++++++++++++",
                        g: "+++++++++++++++++++++++",
                        i: "+++++++++++++++++++++++"
                    }
                }, (err) => {
                    assert(!err);

                    expect({
                        type: "HEADERS",
                        id: 3,
                        priority: {
                            parent: 0,
                            exclusive: false,
                            weight: 16
                        },
                        fin: false,
                        writable: true,
                        path: undefined,
                        headers: {
                            a: "+++++++++++++++++++++++",
                            c: "+++++++++++++++++++++++",
                            e: "+++++++++++++++++++++++",
                            g: "+++++++++++++++++++++++",
                            i: "+++++++++++++++++++++++"
                        }
                    }, done);
                });
            });

            it("should generate empty frame", (done) => {
                framer.headersFrame({
                    id: 3,
                    headers: {}
                }, (err) => {
                    assert(!err);

                    expect({
                        type: "HEADERS",
                        id: 3,
                        priority: {
                            parent: 0,
                            exclusive: false,
                            weight: 16
                        },
                        fin: false,
                        writable: true,
                        path: undefined,
                        headers: {}
                    }, done);
                });
            });
        });

        describe("RST", () => {
            it("should generate regular frame", (done) => {
                framer.rstFrame({
                    id: 3,
                    code: "CANCEL"
                }, (err) => {
                    assert(!err);

                    expect({
                        type: "RST",
                        id: 3,
                        code: "CANCEL"
                    }, done);
                });
            });
        });

        describe("PING", () => {
            it("should generate regular frame", (done) => {
                framer.pingFrame({
                    opaque: Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]),
                    ack: true
                }, (err) => {
                    assert(!err);

                    expect({
                        type: "PING",
                        opaque: version < 4
                            ? Buffer.from([5, 6, 7, 8])
                            : Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]),
                        ack: true
                    }, done);
                });
            });
        });

        describe("GOAWAY", () => {
            it("should generate regular frame", (done) => {
                framer.goawayFrame({
                    lastId: 41,
                    code: "PROTOCOL_ERROR"
                }, (err) => {
                    assert(!err);

                    expect({
                        type: "GOAWAY",
                        lastId: 41,
                        code: "PROTOCOL_ERROR"
                    }, done);
                });
            });

            it("should generate OK frame", (done) => {
                framer.goawayFrame({
                    lastId: 41,
                    code: "OK"
                }, (err) => {
                    assert(!err);

                    expect({
                        type: "GOAWAY",
                        lastId: 41,
                        code: "OK"
                    }, done);
                });
            });
        });

        describe("X_FORWARDED_FOR", () => {
            it("should generate regular frame", (done) => {
                framer.xForwardedFor({
                    host: "ok"
                }, (err) => {
                    assert(!err);

                    expect({
                        type: "X_FORWARDED_FOR",
                        host: "ok"
                    }, done);
                });
            });
        });
    });
});
