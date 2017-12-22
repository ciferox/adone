const chunky = require("chunky");

const {
    stream: { concat, Multiplex, through },
    std: { net }
} = adone;

describe("stream", "multiplex", () => {
    it("one way piping work with 2 sub-streams", (done) => {
        const plex1 = new Multiplex();
        const stream1 = plex1.createStream();
        const stream2 = plex1.createStream();

        let pending = 2;
        const results = [];

        const collect = function () {
            return concat.create((data) => {
                results.push(data.toString());
                if (--pending === 0) {
                    results.sort();
                    assert.equal(results[0].toString(), "hello");
                    assert.equal(results[1].toString(), "world");
                    done();
                }
            });
        };

        const plex2 = new Multiplex(function onStream(stream, id) {
            stream.pipe(collect());
        });

        plex1.pipe(plex2);

        stream1.write(Buffer.from("hello"));
        stream2.write(Buffer.from("world"));
        stream1.end();
        stream2.end();
    });

    it("two way piping works with 2 sub-streams", (done) => {
        const plex1 = new Multiplex();

        const plex2 = new Multiplex(function onStream(stream, id) {
            const uppercaser = through.base(function (chunk, e, done) {
                this.push(Buffer.from(chunk.toString().toUpperCase()));
                this.end();
                done();
            });
            stream.pipe(uppercaser).pipe(stream);
        });

        plex1.pipe(plex2).pipe(plex1);

        const stream1 = plex1.createStream();
        const stream2 = plex1.createStream();

        let pending = 2;
        const results = [];

        const collect = function () {
            return concat.create((data) => {
                results.push(data.toString());
                if (--pending === 0) {
                    results.sort();
                    assert.equal(results[0].toString(), "HELLO");
                    assert.equal(results[1].toString(), "WORLD");
                    done();
                }
            });
        };

        stream1.pipe(collect());
        stream2.pipe(collect());

        stream1.write(Buffer.from("hello"));
        stream2.write(Buffer.from("world"));
    });

    it("stream id should be exposed as stream.name", (done) => {
        const plex1 = new Multiplex();
        const stream1 = plex1.createStream("5");
        assert.equal(stream1.name, "5");

        const plex2 = new Multiplex(function onStream(stream, id) {
            assert.equal(stream.name, "5");
            assert.equal(id, "5");
            done();
        });

        plex1.pipe(plex2);

        stream1.write(Buffer.from("hello"));
        stream1.end();
    });

    it("stream id can be a long string", (done) => {
        const plex1 = new Multiplex();
        const stream1 = plex1.createStream("hello-yes-this-is-dog");
        assert.equal(stream1.name, "hello-yes-this-is-dog");

        const plex2 = new Multiplex(function onStream(stream, id) {
            assert.equal(stream.name, "hello-yes-this-is-dog");
            assert.equal(id, "hello-yes-this-is-dog");
            done();
        });

        plex1.pipe(plex2);

        stream1.write(Buffer.from("hello"));
        stream1.end();
    });

    it("destroy", (done) => {
        const plex1 = new Multiplex();
        const stream1 = plex1.createStream();

        const plex2 = new Multiplex(function onStream(stream, id) {
            stream.on("error", (err) => {
                assert.equal(err.message, "0 had an error");
                done();
            });
        });

        plex1.pipe(plex2);

        stream1.write(Buffer.from("hello"));
        stream1.destroy(new Error("0 had an error"));
    });

    it("testing invalid data error", (done) => {
        const plex = new Multiplex();

        plex.on("error", (err) => {
            if (err) {
                assert.equal(err.message, "Incoming message is too big");
                done();
            }
        });
        // a really stupid thing to do
        plex.write(Array(50000).join("\xff"));
    });

    it("overflow", (done) => {
        const plex1 = new Multiplex();
        const plex2 = new Multiplex({ limit: 10 });

        plex2.on("error", (err) => {
            if (err) {
                assert.equal(err.message, "Incoming message is too big");
                done();
            }
        });

        plex1.pipe(plex2).pipe(plex1);
        plex1.createStream().write(Buffer.alloc(11));
    });

    it("2 buffers packed into 1 chunk", (done) => {
        let server = null;
        const plex1 = new Multiplex();
        const plex2 = new Multiplex((b) => {
            b.pipe(concat.create((body) => {
                assert.equal(body.toString("utf8"), "abc\n123\n");
                done();
                server.close();
                plex1.end();
            }));
        });
        const a = plex1.createStream(1337);
        a.write("abc\n");
        a.write("123\n");
        a.end();

        server = net.createServer((stream) => {
            plex2.pipe(stream).pipe(plex2);
        });
        server.listen(0, () => {
            const port = server.address().port;
            plex1.pipe(net.connect(port)).pipe(plex1);
        });
    });

    it("chunks", (done) => {
        let times = 100;
        const collector = function (cb) {
            let pending = 2;
            const results = [];

            return function () {
                return concat.create((data) => {
                    results.push(data.toString());
                    if (--pending === 0) {
                        results.sort();
                        assert.equal(results[0].toString(), "hello");
                        assert.equal(results[1].toString(), "world");
                        cb();
                    }
                });
            };
        };

        (function chunk() {
            const collect = collector(() => {
                if (--times === 0) {
                    done();
                } else {
                    chunk();
                }
            });
            const plex1 = new Multiplex();
            const stream1 = plex1.createStream();
            const stream2 = plex1.createStream();

            const plex2 = new Multiplex(function onStream(stream, id) {
                stream.pipe(collect());
            });

            plex1.pipe(through.base(function (buf, enc, next) {
                const bufs = chunky(buf);
                for (let i = 0; i < bufs.length; i++) {
                    this.push(bufs[i]);
                }
                next();
            })).pipe(plex2);

            stream1.write(Buffer.from("hello"));
            stream2.write(Buffer.from("world"));
            stream1.end();
            stream2.end();
        })();
    });

    it("prefinish + corking", (done) => {
        const plex = new Multiplex();
        let async = false;

        plex.on("prefinish", () => {
            plex.cork();
            process.nextTick(() => {
                async = true;
                plex.uncork();
            });
        });

        plex.on("finish", () => {
            assert.ok(async, "finished");
            done();
        });

        plex.end();
    });

    it("quick message", (done) => {
        const plex2 = new Multiplex();
        const plex1 = new Multiplex((stream) => {
            stream.write("hello world");
        });

        plex1.pipe(plex2).pipe(plex1);

        setTimeout(() => {
            const stream = plex2.createStream();
            stream.on("data", (data) => {
                assert.deepEqual(data, Buffer.from("hello world"));
                done();
            });
        }, 100);
    });

    it("if onstream is not passed, stream is emitted", (done) => {
        const plex1 = new Multiplex();
        const plex2 = new Multiplex();

        plex1.pipe(plex2).pipe(plex1);

        plex2.on("stream", (stream, id) => {
            assert.ok(stream, "received stream");
            assert.ok(id, "has id");
            stream.write("hello world");
            stream.end();
        });

        const stream = plex1.createStream();
        stream.on("data", (data) => {
            assert.deepEqual(data, Buffer.from("hello world"));
            stream.end();
            done();
        });
    });
});
