const {
    assertion,
    stream: { MultiStream }
} = adone;
assertion.use(assertion.extension.checkmark);

const concat = require("simple-concat");
const str = require("string-to-stream");
const through = require("through");
const ary = require("array-to-stream");

describe("stream", "MultiStream", () => {
    it("combine streams", (done) => {
        const streams = [
            str("1"),
            str("2"),
            str("3")
        ];

        const stream = new MultiStream(streams);
        stream.on("error", (err) => {
            assert.fail(err);
        });

        concat(stream, (err, data) => {
            assert.notExists(err);
            assert.equal(data.toString(), "123");
            done();
        });
    });

    it("combine streams (classic)", (done) => {
        const streams = [
            through(),
            through(),
            through()
        ];

        const stream = new MultiStream(streams)
            .on("error", (err) => {
                assert.fail(err);
            });

        concat(stream, (err, data) => {
            assert.notExists(err);
            assert.equal(data.toString(), "123");
            done();
        });

        streams[0].end("1");
        streams[1].end("2");
        streams[2].end("3");
    });

    it("lazy stream creation", (done) => {
        const streams = [
            str("1"),
            function () {
                return str("2");
            },
            function () {
                return str("3");
            }
        ];

        const stream = new MultiStream(streams)
            .on("error", (err) => {
                assert.fail(err);
            });

        concat(stream, (err, data) => {
            assert.notExists(err);
            assert.equal(data.toString(), "123");
            done();
        });
    });

    it("lazy stream via factory", (done) => {
        let count = 0;
        const factory = (cb) => {
            if (count > 2) {
                return cb(null, null);
            }
            count++;
            setTimeout(() => {
                cb(null, str(count.toString()));
            }, 0);
        };

        const stream = new MultiStream(factory)
            .on("error", (err) => {
                assert.fail(err);
            });

        concat(stream, (err, data) => {
            assert.notExists(err);
            assert.equal(data.toString(), "123");
            done();
        });
    });

    it("lazy stream via factory (factory returns error)", (done) => {
        expect(2).checks(done);
        let count = 0;
        const factory = (cb) => {
            if (count > 2) {
                return cb(new Error("factory error"));
            }
            count++;
            setTimeout(() => {
                cb(null, str(count.toString()));
            }, 0);
        };

        new MultiStream(factory)
            .on("error", (err) => {
                expect(err).to.exist.mark();
            })
            .on("close", () => {
                expect(true).to.be.true.mark();
            })
            .resume();
    });

    it("lazy stream via factory (classic)", (done) => {
        let count = 0;
        const factory = (cb) => {
            if (count > 2) {
                return cb(null, null);
            }
            count++;
            const s = through();
            process.nextTick(() => {
                s.write(count.toString());
                s.end();
            });
            cb(null, s);
        };

        const stream = new MultiStream(factory)
            .on("error", (err) => {
                assert.fail(err);
            });

        concat(stream, (err, data) => {
            assert.notExists(err);
            assert.equal(data.toString(), "123");
            done();
        });
    });

    it("throw immediate error", (done) => {
        const streams = [
            str("1"),
            through() // will emit 'error'
        ];

        new MultiStream(streams).on("error", (err) => {
            assert.ok(err instanceof Error, "got expected error");
            done();
        });

        streams[1].emit("error", new Error("immediate error!"));
    });


    it("combine object streams", (done) => {
        const objects = [true, { x: "b" }, "c", "d", "e", "f"];

        const streams = [
            ary(objects.slice(0, 2)),
            ary(objects.slice(2, 3)),
            ary(objects.slice(3))
        ];

        const received = [];
        MultiStream.obj(streams)
            .on("error", (err) => {
                assert.fail(err);
            })
            .on("data", (object) => {
                received.push(object);
            })
            .on("end", () => {
                assert.deepEqual(objects, received);
                done();
            });
    });
});
