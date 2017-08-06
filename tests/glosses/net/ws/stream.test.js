const { is } = adone;
let server = null;
const port = 8343;

const echo = {
    port,
    url: `ws://localhost:${port}`,
    start: (opts, cb) => {
        if (server) {
            cb(new Error("already started"));
            return;
        }

        if (is.function(opts)) {
            cb = opts;
            opts = {};
        }

        server = adone.std.http.createServer();
        opts.server = server;

        adone.net.ws.stream.createServer(opts, (stream) => {
            stream.pipe(stream);
        });

        server.listen(port, cb);
    },
    stop: (cb) => {
        if (!server) {
            cb(new Error("not started"));
            return;
        }

        server.close(cb);
        server = null;
    }
};

describe("net", "ws", "stream", () => {
    it("echo server", (done) => {
        echo.start(() => {
            const client = adone.net.ws.stream.createClient(echo.url);

            client.on("error", console.error);

            client.on("data", (data) => {
                assert.isOk(is.buffer(data), "is a buffer");
                assert.equal(data.toString(), "hello world");
                client.end();
                echo.stop(() => {
                    done();
                });
            });
            client.write("hello world");
        });
    });

    it("emitting not connected errors", (done) => {
        echo.start(() => {
            const client = adone.net.ws.stream.createClient(echo.url);
            client.on("error", () => {
                echo.stop(() => {
                    assert.isTrue(true, "should emit error");
                    done();
                });
            });

            client.once("data", (data) => {
                client.end();
                client.write("abcde");
            });

            client.write("hello world");
        });
    });

    it("passes options to websocket constructor", (done) => {
        const opts = {
            verifyClient: function verifyClient(info) {
                assert.equal(info.req.headers["x-custom-header"], "Custom Value");
                return true;
            }
        };
        echo.start(opts, () => {
            const options = { headers: { "x-custom-header": "Custom Value" } };
            const client = adone.net.ws.stream.createClient(echo.url, options);

            client.on("error", console.error);

            client.on("data", (data) => {
                assert.isOk(is.buffer(data), "is a buffer");
                assert.equal(data.toString(), "hello world");
                client.end();
                echo.stop(() => {
                    done();
                });
            });

            client.write("hello world");
        });
    });

    it("destroy", (done) => {
        echo.start(() => {
            const client = adone.net.ws.stream.createClient(echo.url, echo.options);

            client.on("close", () => {
                echo.stop(() => {
                    done();
                });
            });

            setTimeout(() => {
                client.destroy();
            }, 200);
        });
    });

    it("drain", (done) => {
        echo.start(() => {
            const client = adone.net.ws.stream.createClient(echo.url, echo.options);

            client.on("drain", () => {
                client.destroy();
                echo.stop(() => {
                    done();
                });
            });

            // write until buffer is full
            while (client.write("foobar")) { }
        });
    });

    it("emit sending errors if the socket is closed by the other party", (done) => {
        const server = adone.std.http.createServer();
        const wss = new adone.net.ws.Server({ server });

        server.listen(8344, () => {
            const client = adone.net.ws.stream.createClient("ws://localhost:8344");

            wss.on("connection", (ws) => {
                const stream = adone.net.ws.stream.createClient(ws);

                client.destroy();

                setTimeout(() => {
                    stream.write("hello world");
                }, 50);

                stream.on("error", (err) => {
                    assert.isOk(err, "client errors");
                    server.close(done);
                });
            });
        });
    });

    it("destroy client pipe should close server pipe", (done) => {
        const clientDestroy = function () {
            const client = adone.net.ws.stream.createClient(echo.url, echo.options);
            client.on("data", (o) => {
                client.destroy();
            });
            client.write(Buffer.from("hello"));
        };

        const opts = {};
        const server = adone.std.http.createServer();
        opts.server = server;
        const wss = new adone.net.ws.Server(opts);
        wss.on("connection", (ws) => {
            const stream = adone.net.ws.stream.createClient(ws);
            stream.on("close", () => {
                server.close(() => {
                    done();
                });
            });
            stream.pipe(stream);
        });
        server.listen(echo.port, clientDestroy);
    });

    it("error on socket should forward it to pipe", (done) => {
        const clientConnect = function () {
            adone.net.ws.stream.createClient(echo.url, echo.options);
        };

        const opts = {};
        const server = adone.std.http.createServer();
        opts.server = server;
        const wss = new adone.net.ws.Server(opts);
        wss.on("connection", (ws) => {
            const stream = adone.net.ws.stream.createClient(ws);
            stream.on("error", () => {
                server.close(() => {
                    done();
                });
            });
            stream.socket.emit("error", new Error("Fake error"));
        });
        server.listen(echo.port, clientConnect);
    });

    it("stream end", (done) => {
        const server = adone.std.http.createServer();
        adone.net.ws.stream.createServer({ server }, (stream) => {
            stream.pipe(adone.stream.concat()).then((body) => {
                assert.equal(body.toString(), "pizza cats\n");
                server.close(done);
            }, done);
        });

        server.listen(0, () => {
            const w = adone.net.ws.stream.createClient(`ws://localhost:${server.address().port}`);
            w.end("pizza cats\n");
        });
    });

    it("stream handlers should fire once per connection", (done) => {
        let m = 0;
        const server = adone.std.http.createServer();
        const wss = adone.net.ws.stream.createServer({ server }, () => {
            server.close(() => {
                assert.equal(m, 1);
                done();
            });
        });

        wss.on("stream", (stream, request) => {
            assert.isOk(request instanceof adone.std.http.IncomingMessage);
            m++;
        });
        server.listen(0, () => {
            const w = adone.net.ws.stream.createClient(`ws://localhost:${server.address().port}`);
            w.end("pizza cats\n");
        });
    });

    it("client with writev", (done) => {
        const server = adone.std.http.createServer();

        let str = "";
        adone.net.ws.stream.createServer({
            server
        }, (stream) => {
            stream.once("data", (data) => {
                assert.isOk(is.buffer(data), "is a buffer");
                assert.equal(data.toString(), "hello world");

                stream.once("data", (data) => {
                    assert.isOk(is.buffer(data), "is a buffer");
                    assert.equal(data.toString(), str);
                    stream.end();
                    server.close();
                    done();
                });
            });
        });

        server.listen(8352, () => {
            const client = adone.net.ws.stream.createClient("ws://localhost:8352", {
                objectMode: false
            });

            client.on("error", console.error);

            client.once("connect", () => {
                client.cork();
                do {
                    str += "foobar";
                } while (client.write("foobar"));
                client.uncork();
            });

            client.write("hello world");
        });
    });

    it("server with writev", (done) => {
        const server = adone.std.http.createServer();

        let str = "";
        adone.net.ws.stream.createServer({
            server,
            objectMode: false
        }, (stream) => {
            stream.cork();
            do {
                str += "foobar";
            } while (stream.write("foobar"));
            stream.uncork();
        });

        server.listen(8352, () => {
            const client = adone.net.ws.stream.createClient("ws://localhost:8352");

            client.on("error", console.error);

            client.once("data", (data) => {
                assert.isOk(is.buffer(data), "is a buffer");
                assert.equal(data.toString(), str);
                client.end();
                server.close();
                done();
            });
        });
    });

    it("stop echo", (done) => {
        echo.stop(() => {
            done();
        });
    });
});
