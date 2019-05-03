const concat = require("concat-stream");
const through = require("through2");
const net = require("net");
const chunky = require("chunky");
const pump = require("pump");

const MplexCore = require(adone.getPath("lib", "glosses", "p2p", "muxers", "mplex", "internals"));

describe("p2p", "muxer", "mplex", "internals", () => {
    it("one way piping work with 2 sub-streams", (done) => {
        const plex1 = new MplexCore();
        const stream1 = plex1.createStream();
        const stream2 = plex1.createStream();

        let pending = 2;
        const results = [];

        const collect = function () {
            return concat((data) => {
                results.push(data.toString());

                if (--pending === 0) {
                    results.sort();
                    expect(results[0].toString()).to.equal("hello");
                    expect(results[1].toString()).to.equal("world");
                    done();
                }
            });
        };

        const onStream = function (stream, id) {
            stream.pipe(collect());
        };

        const plex2 = new MplexCore(onStream);

        plex1.pipe(plex2);

        stream1.write(Buffer.from("hello"));
        stream2.write(Buffer.from("world"));
        stream1.end();
        stream2.end();
    });

    it("two way piping works with 2 sub-streams", (done) => {
        const plex1 = new MplexCore();

        const plex2 = new MplexCore(function onStream(stream, id) {
            const uppercaser = through(function (chunk, e, done) {
                this.push(Buffer.from(chunk.toString().toUpperCase()));
                this.end();
                done();
            });
            stream.pipe(uppercaser).pipe(stream);
        });

        let pending = 2;
        const results = [];

        const collect = function () {
            return concat((data) => {
                results.push(data.toString());
                if (--pending === 0) {
                    results.sort();
                    expect(results[0].toString()).to.equal("HELLO");
                    expect(results[1].toString()).to.equal("WORLD");
                    done();
                }
            });
        };

        plex1.pipe(plex2).pipe(plex1);

        const stream1 = plex1.createStream();
        const stream2 = plex1.createStream();

        stream1.pipe(collect());
        stream2.pipe(collect());

        stream1.write(Buffer.from("hello"));
        stream2.write(Buffer.from("world"));
    });

    it("stream id should be exposed as stream.name", (done) => {
        const plex1 = new MplexCore();
        const stream1 = plex1.createStream("5");
        expect(stream1.name).to.equal("5");

        const plex2 = new MplexCore(function onStream(stream, id) {
            expect(stream.name).to.equal("5");
            expect(id).to.equal("5");
            done();
        });

        plex1.pipe(plex2);

        stream1.write(Buffer.from("hello"));
        stream1.end();
    });

    it("stream id can be a long string", (done) => {
        const plex1 = new MplexCore();
        const stream1 = plex1.createStream("hello-yes-this-is-dog");
        expect(stream1.name).to.equal("hello-yes-this-is-dog");

        const plex2 = new MplexCore(function onStream(stream, id) {
            expect(stream.name).to.equal("hello-yes-this-is-dog");
            expect(id).to.equal("hello-yes-this-is-dog");
            done();
        });

        plex1.pipe(plex2);

        stream1.write(Buffer.from("hello"));
        stream1.end();
    });

    it("destroy", (done) => {
        const plex1 = new MplexCore();
        const stream1 = plex1.createStream();

        expect(2).check(done);

        const plex2 = new MplexCore(function onStream(stream, id) {
            stream.on("error", (err) => {
                expect(err.message).to.equal("0 had an error").mark();
            });
        });

        plex1.pipe(plex2);
        stream1.on("error", (err) => {
            expect(err.message).to.equal("0 had an error").mark();
        });
        stream1.write(Buffer.from("hello"));
        stream1.destroy(new Error("0 had an error"));
    });

    it("testing invalid data error", (done) => {
        const plex = new MplexCore();

        plex.on("error", (err) => {
            if (err) {
                expect(err.message).to.equal("Incoming message is too big");
                done();
            }
        });
        // a really stupid thing to do
        plex.write(Array(50000).join("\xff"));
    });

    it("overflow", (done) => {
        let count = 0;
        const check = function () {
            if (++count === 2) {
                done();
            }
        };
        const plex1 = new MplexCore();
        const plex2 = new MplexCore({ limit: 10 });

        plex2.on("stream", (stream) => {
            stream.on("error", (err) => {
                expect(err.message).to.equal("Incoming message is too big");
                check();
            });
        });

        plex2.on("error", (err) => {
            if (err) {
                expect(err.message).to.equal("Incoming message is too big");
                check();
            }
        });

        plex1.pipe(plex2).pipe(plex1);

        const stream = plex1.createStream();

        stream.write(Buffer.alloc(11));
    });

    it("2 buffers packed into 1 chunk", (done) => {
        const plex1 = new MplexCore();
        const plex2 = new MplexCore(((b) => {
            b.pipe(concat((body) => {
                expect(body.toString("utf8")).to.equal("abc\n123\n");
                server.close();
                plex1.end();
                done();
            }));
        }));

        const a = plex1.createStream(1337);
        a.write("abc\n");
        a.write("123\n");
        a.end();

        const server = net.createServer((stream) => {
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
                return concat((data) => {
                    results.push(data.toString());
                    if (--pending === 0) {
                        results.sort();
                        expect(results[0].toString()).to.equal("hello");
                        expect(results[1].toString()).to.equal("world");
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

            const plex1 = new MplexCore();
            const stream1 = plex1.createStream();
            const stream2 = plex1.createStream();

            const plex2 = new MplexCore(function onStream(stream, id) {
                stream.pipe(collect());
            });

            plex1.pipe(through(function (buf, enc, next) {
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
        const plex = new MplexCore();
        let async = false;

        plex.on("prefinish", () => {
            plex.cork();
            process.nextTick(() => {
                async = true;
                plex.uncork();
            });
        });

        plex.on("finish", () => {
            expect(async).to.be.ok();
            done();
        });

        plex.end();
    });

    it("quick message", (done) => {
        const plex2 = new MplexCore();
        const plex1 = new MplexCore(((stream) => {
            stream.write("hello world");
        }));

        plex1.pipe(plex2).pipe(plex1);

        setTimeout(() => {
            const stream = plex2.createStream();
            stream.on("data", (data) => {
                expect(data).to.eql(Buffer.from("hello world"));
                done();
            });
        }, 100);
    });

    it("if onstream is not passed, stream is emitted", (done) => {
        const plex1 = new MplexCore();
        const plex2 = new MplexCore();

        plex1.pipe(plex2).pipe(plex1);

        plex2.on("stream", (stream, id) => {
            expect(stream).to.exist();
            expect(id).to.exist();
            stream.write("hello world");
            stream.end();
        });

        const stream = plex1.createStream();
        stream.on("data", (data) => {
            expect(data).to.eql(Buffer.from("hello world"));
            stream.end();
            setTimeout(() => done(), 1000);
        });
    });

    it("half close a muxed stream", (done) => {
        const plex1 = new MplexCore();
        const plex2 = new MplexCore();

        plex1.pipe(plex2).pipe(plex1);

        plex2.on("stream", (stream, id) => {
            expect(stream).to.exist();
            expect(id).to.exist();

            // let it flow
            stream.on("data", () => { });

            stream.on("end", () => {
                done();
            });

            stream.on("error", (err) => {
                expect(err).to.not.exist();
            });

            stream.write(Buffer.from("hello world"));

            stream.end();
        });

        const stream = plex1.createStream();

        stream.on("data", (data) => {
            expect(data).to.eql(Buffer.from("hello world"));
        });

        stream.on("error", (err) => {
            expect(err).to.not.exist();
        });

        stream.on("end", () => {
            stream.end();
        });
    });

    it("half close a half closed muxed stream", (done) => {
        const plex1 = new MplexCore({ halfOpen: true });
        const plex2 = new MplexCore({ halfOpen: true });

        plex1.nameTag = "plex1:";
        plex2.nameTag = "plex2:";

        plex1.pipe(plex2).pipe(plex1);

        plex2.on("stream", (stream, id) => {
            expect(stream).to.exist();
            expect(id).to.exist();

            stream.on("data", (data) => {
                expect(data).to.eql(Buffer.from("some data"));
            });

            stream.on("end", () => {
                stream.write(Buffer.from("hello world"));
                stream.end();
            });

            stream.on("error", (err) => {
                expect(err).to.not.exist();
            });
        });

        const stream = plex1.createStream();

        stream.on("data", (data) => {
            expect(data).to.eql(Buffer.from("hello world"));
        });

        stream.on("error", (err) => {
            expect(err).to.not.exist();
        });

        stream.on("end", () => {
            done();
        });

        stream.write(Buffer.from("some data"));

        stream.end();
    });

    it.todo("underlying error is propagated to muxed streams", (done) => {
        let count = 0;
        const check = function () {
            if (++count === 4) {
                done();
            }
        };

        const plex1 = new MplexCore();
        const plex2 = new MplexCore();

        let socket;

        plex2.on("stream", (stream) => {
            stream.on("error", (err) => {
                expect(err).to.exist();
                check();
            });

            stream.on("close", () => {
                check();
            });

            socket.destroy();
        });

        const stream1to2 = plex1.createStream(1337);

        stream1to2.on("error", (err) => {
            expect(err).to.exist();
            check();
        });

        stream1to2.on("close", () => {
            check();
        });

        const server = net.createServer((stream) => {
            pump(plex2, stream);
            pump(stream, plex2);
            server.close();
        });

        server.listen(0, () => {
            const port = server.address().port;
            socket = net.connect(port);

            pump(plex1, socket);
            pump(socket, plex1);
        });
    });
});
