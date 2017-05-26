const { stream: { concat, through, Duplexify } } = adone;

describe("stream", "Duplecify", () => {
    it("passthrough", async () => {
        const pt = through.base();
        const dup = new Duplexify(pt, pt);

        dup.end("hello world");
        dup.on("finish", () => {
            assert.isOk(true, "should finish");
        });
        const c = concat();
        dup.pipe(c);

        const data = await c;
        assert.equal(data.toString(), "hello world");
    });

    it("passthrough + double end", async () => {
        const pt = through.base();
        const dup = new Duplexify(pt, pt);

        dup.end("hello world");
        dup.end();

        dup.on("finish", () => {
            assert.isOk(true, "should finish");
        });
        const c = concat();
        dup.pipe(c);
        const data = await c;
        assert.equal(data.toString(), "hello world");
    });

    it("async passthrough + end", async () => {
        const pt = through.obj({ highWaterMark: 1 }, (data, enc, cb) => {
            setTimeout(() => {
                cb(null, data);
            }, 100);
        });

        const dup = new Duplexify(pt, pt);

        dup.write("hello ");
        dup.write("world");
        dup.end();

        dup.on("finish", () => {
            assert.isOk(true, "should finish");
        });
        const c = concat(); 
        dup.pipe(c);
        const data = await c;
        assert.equal(data.toString(), "hello world");
    });

    it("duplex", (done) => {
        const readExpected = ["read-a", "read-b", "read-c"];
        const writeExpected = ["write-a", "write-b", "write-c"];

        const readable = through.obj();
        const writable = through.obj((data, enc, cb) => {
            assert.equal(data, writeExpected.shift());
            cb();
        });

        const dup = Duplexify.obj(writable, readable);

        readExpected.slice().forEach((data) => {
            readable.write(data);
        });
        readable.end();

        writeExpected.slice().forEach((data) => {
            dup.write(data);
        });
        dup.end();

        dup.on("data", (data) => {
            assert.equal(data, readExpected.shift());
        });
        dup.on("end", () => {
            assert.isOk(true, "should end");
            done();
        });
        dup.on("finish", () => {
            assert.isOk(true, "should finish");
        });
    });

    it("async", async () => {
        const dup = new Duplexify();
        const pt = through.base();

        const c = concat();
        dup.pipe(c);

        dup.write("i");
        dup.write(" was ");
        dup.end("async");

        setTimeout(() => {
            dup.setWritable(pt);
            setTimeout(() => {
                dup.setReadable(pt);
            }, 50);
        }, 50);

        const data = await c;
        assert.equal(data.toString(), "i was async", "same in as out");
    });

    it("destroy", (done) => {
        const write = through.base();
        const read = through.base();
        const dup = new Duplexify(write, read);

        write.destroy = function () {
            assert.isOk(true, "write destroyed");
        };

        dup.on("close", () => {
            assert.isOk(true, "close emitted");
            done();
        });

        dup.destroy();
        dup.destroy(); // should only work once
    });

    it("destroy both", (done) => {
        const write = through.base();
        const read = through.base();
        const dup = new Duplexify(write, read);

        write.destroy = function () {
            assert.isOk(true, "write destroyed");
        };

        read.destroy = function () {
            assert.isOk(true, "read destroyed");
        };

        dup.on("close", () => {
            assert.isOk(true, "close emitted");
            done();
        });

        dup.destroy();
        dup.destroy(); // should only work once
    });

    it("bubble read errors", (done) => {
        const write = through.base();
        const read = through.base();
        const dup = new Duplexify(write, read);

        dup.on("error", (err) => {
            assert.equal(err.message, "read-error", "received read error");
        });
        dup.on("close", () => {
            assert.isOk(true, "close emitted");
            done();
        });

        read.emit("error", new Error("read-error"));
        write.emit("error", new Error("write-error")); // only emit first error
    });

    it("bubble write errors", (done) => {
        const write = through.base();
        const read = through.base();
        const dup = new Duplexify(write, read);

        dup.on("error", (err) => {
            assert.equal(err.message, "write-error", "received write error");
        });
        dup.on("close", () => {
            assert.isOk(true, "close emitted");
            done();
        });

        write.emit("error", new Error("write-error"));
        read.emit("error", new Error("read-error")); // only emit first error
    });

    it("reset writable / readable", (done) => {
        const toUpperCase = function (data, enc, cb) {
            cb(null, data.toString().toUpperCase());
        };

        const passthrough = through.base();
        const upper = through.base(toUpperCase);
        const dup = new Duplexify(passthrough, passthrough);

        dup.once("data", (data) => {
            assert.equal(data.toString(), "hello");
            dup.setWritable(upper);
            dup.setReadable(upper);
            dup.once("data", (data) => {
                assert.equal(data.toString(), "HELLO");
                dup.once("data", (data) => {
                    assert.equal(data.toString(), "HI");
                    done();
                });
            });
            dup.write("hello");
            dup.write("hi");
        });
        dup.write("hello");
    });

    it("cork", (done) => {
        const passthrough = through.base();
        const dup = new Duplexify(passthrough, passthrough);
        let ok = false;

        dup.on("prefinish", () => {
            dup.cork();
            setTimeout(() => {
                ok = true;
                dup.uncork();
            }, 100);
        });
        dup.on("finish", () => {
            assert.isOk(ok);
            done();
        });
        dup.end();
    });

    it("prefinish not twice", (done) => {
        const passthrough = through.base();
        const dup = new Duplexify(passthrough, passthrough);
        let prefinished = false;

        dup.on("prefinish", () => {
            assert.isOk(!prefinished, "only prefinish once");
            prefinished = true;
        });

        dup.on("finish", () => {
            done();
        });

        dup.end();
    });

    it("close", (done) => {
        const passthrough = through.base();
        const dup = new Duplexify(passthrough, passthrough);

        passthrough.emit("close");
        dup.on("close", () => {
            assert.isOk(true, "should forward close");
            done();
        });
    });

    it("works with node native streams (net)", (done) => {
        const server = adone.std.net.createServer((socket) => {
            const dup = new Duplexify(socket, socket);

            dup.once("data", (chunk) => {
                assert.deepEqual(chunk, Buffer.from("hello world"));
                server.close();
                socket.end();
                done();
            });
        });

        server.listen(0, () => {
            const socket = adone.std.net.connect(server.address().port);
            const dup = new Duplexify(socket, socket);

            dup.write(Buffer.from("hello world"));
        });
    });
});
