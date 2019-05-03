const {
    stream: { pull }
} = adone;
const { ws, jsonDoubleline, goodbye } = pull;

const WebSocket = require("ws");
const endpoint = `${require("./helpers/wsurl")}/echo`;

const server = require("./server")();

const srcPath = (...args) => adone.getPath("lib", "glosses", "streams", "pull", ...args);

describe("stream", "pull", "ws", () => {
    describe("closeonend", () => {
        it("websocket closed when pull source input ends", (done) => {
            const socket = new WebSocket(endpoint);
            pull(
                ws.source(socket),
                pull.collect((err) => {
                    // console.log("END");
                    assert.notExists(err, "closed without error");
                    done();
                })
            );

            pull(
                pull.values(["x", "y", "z"]),
                ws.sink(socket, { closeOnEnd: true })
            );
        });

        it("sink has callback for end of stream", (done) => {
            const socket = new WebSocket(endpoint);

            expect(2).checks(done);

            pull(
                ws.source(socket),
                pull.collect((err) => {
                    expect(err).to.not.exist.mark();
                })
            );

            pull(
                pull.values(["x", "y", "z"]),
                ws.sink(socket, (err) => {
                    expect(err).to.not.exist.mark();
                })
            );
        });


        it("closeOnEnd=false, stream doesn't close", (done) => {
            const socket = new WebSocket(endpoint);

            expect(3).checks(done);
            pull(
                ws.source(socket),
                pull.drain((item) => {
                    expect(item).to.be.ok.mark();
                })
            );

            pull(
                pull.values(["x", "y", "z"]),
                ws.sink(socket, { closeOnEnd: false })
            );
        });
    });

    describe("connection refused", () => {
        it("error when connecting to nowhere", (done) => {

            ws.connect("ws://localhost:34059", (err, stream) => {
                assert.ok(err);
                assert.notOk(stream);
                done();
            });

        });
    });

    describe("echo inline", () => {
        it("simple echo server", (done) => {
            const server = ws.createServer((stream) => {
                pull(stream, stream);
            }).listen(5678, () => {

                pull(
                    pull.values([1, 2, 3]),
                    //need a delay, because otherwise ws hangs up wrong.
                    //otherwise use pull-goodbye.
                    (read) => {
                        return function (err, cb) {
                            setTimeout(() => {
                                read(null, cb);
                            }, 10);
                        };
                    },
                    jsonDoubleline.stringify(),
                    ws.connect("ws://localhost:5678"),
                    jsonDoubleline.parse(),
                    pull.collect((err, ary) => {
                        if (err) {
                            throw err;
                        }
                        assert.deepEqual(ary, [1, 2, 3]);
                        server.close(() => {
                            done();
                        });
                    })
                );
            });
        });
    });

    describe("echo", () => {
        const WebSocket = require("ws");
        const url = `${require("./helpers/wsurl")}/echo`;

        it("setup echo reading and writing", (done) => {
            const socket = new WebSocket(url);
            const expected = ["x", "y", "z"];

            expect(expected.length).checks(done);

            pull(
                ws.source(socket),
                pull.drain((value) => {
                    // console.log(value);
                    assert.equal(value, expected.shift());
                    expect(true).to.to.true.mark();
                })
            );

            pull(
                pull.values([].concat(expected)),
                ws.sink(socket, { closeOnEnd: false })
            );

        });


        it("duplex style", (done) => {
            const expected = ["x", "y", "z"];
            const socket = new WebSocket(url);

            expect(expected.length).checks(done);

            pull(
                pull.values([].concat(expected)),
                ws(socket, { closeOnEnd: false }),
                pull.drain((value) => {
                    // console.log("echo:", value);
                    assert.equal(value, expected.shift());
                    expect(true).to.be.true.mark();
                })
            );

        });


        it.skip("duplex with goodbye handshake", (done) => {

            const expected = ["x", "y", "z"];
            const socket = new WebSocket(url);

            const pws = ws(socket);

            pull(
                pws,
                goodbye({
                    source: pull.values([].concat(expected)),
                    sink: pull.drain((value) => {
                        assert.equal(value, expected.shift());
                    }, (err) => {
                        assert.equal(expected.length, 0);
                        done();
                    })
                }),
                pws
            );

        });
    });

    describe("error", () => {
        const WebSocket = require("ws");

        //connect to a server that does not exist, and check that it errors.
        //should pass the error to both sides of the stream.
        it("test error", (done) => {
            let _err;
            pull(
                pull.values(["x", "y", "z"]),
                pull.through(null, (err) => {
                    if (_err) {
                        assert.strictEqual(err, _err);
                        done();
                    }
                    _err = err;
                }),
                ws(new WebSocket(`ws://localhost:34897/${Math.random()}`)),
                pull.collect((err) => {
                    if (_err) {
                        assert.strictEqual(err, _err);
                        done();
                    }
                    _err = err;
                })
            );

        });

        //connect to a server that does not exist, and check that it errors.
        //should pass the error to both sides of the stream.
        it("test error", (done) => {
            let _err;

            ws(new WebSocket(`ws://localhost:34897/${Math.random()}`),
                {
                    onConnect(err) {
                        assert.ok(err);
                        done();
                    }
                });
        });
    });

    describe("pass in server", () => {
        it("simple echo server", (done) => {
            const http_server = require("http").createServer();

            const server = ws.createServer({ server: http_server }, (stream) => {
                pull(stream, pull.through(console.log), stream);
            });

            server.listen(5678, () => {
                ws.connect("ws://localhost:5678", (err, stream) => {
                    pull(
                        pull.values([1, 2, 3]),
                        //need a delay, because otherwise ws hangs up wrong.
                        //otherwise use pull-goodbye.
                        (read) => {
                            return function (err, cb) {
                                setTimeout(() => {
                                    read(null, cb);
                                }, 10);
                            };
                        },
                        jsonDoubleline.stringify(),
                        stream,
                        jsonDoubleline.parse(),
                        pull.collect((err, ary) => {
                            if (err) {
                                throw err;
                            }
                            assert.deepEqual(ary, [1, 2, 3]);
                            server.close(() => {
                                done();
                            });
                        })
                    );
                });
            });
        });
    });

    describe("read", () => {
        const WebSocket = require("ws");
        const endpoint = `${require("./helpers/wsurl")}/read`;
        const ws = require(srcPath("ws", "source"));
        let socket;

        it("create a websocket connection to the server", () => {
            socket = new WebSocket(endpoint);
        });

        it("read values from the socket and end normally", (done) => {
            pull(
                ws(socket),
                pull.collect((err, values) => {
                    assert.notExists(err);
                    assert.deepEqual(values, ["a", "b", "c", "d"]);
                    done();
                })
            );
        });

        it("read values from a new socket and end normally", (done) => {
            pull(
                ws(new WebSocket(endpoint)),
                pull.collect((err, values) => {
                    assert.notExists(err);
                    assert.deepEqual(values, ["a", "b", "c", "d"]);
                    done();
                })
            );
        });
    });

    describe("server address", () => {
        it("server .address should return bound address", (done) => {
            const server = ws.createServer().listen(55214, () => {
                assert.equal(typeof server.address, "function");
                assert.equal(server.address().port, 55214, "return address should match");
                server.close(() => {
                    done();
                });
            });
        });
    });

    describe("server echo", () => {
        it("simple echo server", (done) => {
            const server = ws.createServer((stream) => {
                pull(stream, stream);
            }).listen(5678, () => {

                ws.connect("ws://localhost:5678", (err, stream) => {
                    pull(
                        pull.values([1, 2, 3]),
                        //need a delay, because otherwise ws hangs up wrong.
                        //otherwise use pull-goodbye.
                        (read) => {
                            return function (err, cb) {
                                setTimeout(() => {
                                    read(null, cb);
                                }, 10);
                            };
                        },
                        jsonDoubleline.stringify(),
                        stream,
                        jsonDoubleline.parse(),
                        pull.collect((err, ary) => {
                            if (err) {
                                throw err;
                            }
                            assert.deepEqual(ary, [1, 2, 3]);
                            server.close(() => {
                                done();
                            });
                        })
                    );
                });
            });
        });
    });

    describe("ws-url", () => {
        const wsurl = require(srcPath("ws", "ws-url"));


        it("map from a relative url to one for this domain", (done) => {
            const location = {
                protocol: "http",
                host: "foo.com",
                pathname: "/whatever",
                search: "?okay=true"
            };

            assert.equal(
                wsurl("//bar.com", location),
                "ws://bar.com"
            );
            assert.equal(
                wsurl("/this", location),
                "ws://foo.com/this"
            );

            done();
        });

        it("same path works on dev and deployed", (done) => {
            const location = {
                protocol: "http",
                host: "localhost:8000"
            };

            assert.equal(
                wsurl("/", {
                    protocol: "http",
                    host: "localhost:8000"
                }),
                "ws://localhost:8000/"
            );
            assert.equal(
                wsurl("/", {
                    protocol: "http",
                    host: "server.com:8000"
                }),
                "ws://server.com:8000/"
            );

            done();
        });

        it("universal url still works", (done) => {
            assert.equal(
                wsurl("ws://what.com/okay", {
                    protocol: "http",
                    host: "localhost:8000"
                }),
                "ws://what.com/okay"
            );
            assert.equal(
                wsurl("wss://localhost/", {
                    protocol: "https",
                    host: "localhost:8000"
                }),
                "wss://localhost/"
            );
            done();
        });
    });

    it("close", (done) => {
        server.close();
        done();
    });
});
