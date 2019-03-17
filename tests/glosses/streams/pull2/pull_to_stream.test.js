const {
    is,
    stream: { pull2: pull }
} = adone;
const { values, error, pullToStream } = pull;

describe("stream", "pull", "pullToStream", () => {
    it("source on data", (done) => {
        const vStream = pullToStream.readable(values([1, 2, 3, 4]));

        vStream.on("data", (d) => {
            assert.ok(d);
        });
        vStream.on("end", (d) => {
            assert.notExists(d);
            done();
        });
    });

    it("source readable", (done) => {
        const readable = pullToStream.readable(values([1, 2, 3, 4]));

        readable.on("readable", () => {
            let chunk;

            while (!is.null(chunk = readable.read())) {
                assert.ok(chunk);
            }
            done();
        });
    });

    it("source error from pull-stream", (done) => {
        const vStream = pullToStream.readable(error(new Error("test error")));

        vStream.on("data", (d) => console.log("data", d));
        vStream.on("error", (d) => {
            assert.isTrue(d instanceof Error, d.message);
            done();
        });
    });

    it("source stream abort", (done) => {
        const vStream = pullToStream.readable(values([1, 2, 3, 4], (b) => assert.equal(b, null)));

        vStream.on("data", (d) => {
            console.log(d);
        });
        vStream.destroy(new Error("abort"));
        vStream.on("error", (d) => assert.isTrue(d instanceof Error));
        vStream.on("close", () => {
            done();
        });
    });

    it("source pause/resume", (done) => {
        const readable = pullToStream.readable(values([1, 2, 3, 4]));

        readable.on("data", (chunk) => {
            assert.ok(chunk);
            readable.pause();
            setTimeout(() => {
                readable.resume();
            }, 1000);
        });

        readable.on("end", () => done());
    });

    it("sink basic", (done) => {
        const writeable = pullToStream.writeable(
            pull(
                pull.concat((err, c) => {
                    if (err) {
                        return;
                    }
                    assert.equal(c, "123");
                    done();
                })
            )
        );

        writeable.write(Buffer.from("1"));
        writeable.write(Buffer.from("2"));
        writeable.end(Buffer.from("3"));
    });

    it("sink basic error", (done) => {
        const writeable = pullToStream.writeable(
            pull(
                pull.concat((err) => {
                    if (err) {
                        assert.isTrue(err instanceof Error, err.message);
                    }
                })
            )
        );

        writeable.write(Buffer.from("1"));
        writeable.destroy(new Error("destroy"));
        writeable.on("error", (d) => assert.isTrue(d instanceof Error, d.message));
        writeable.on("close", () => done());
    });

    it("sink back pressure", (done) => {
        const writeable = pullToStream.writeable(
            pull(
                pull.concat((err, c) => {
                    if (err) {
                        return;
                    }
                    assert.equal(c, "12");
                })
            ),
            { writableHighWaterMark: 1 }
        );

        const first = writeable.write(Buffer.from("1"), () => {});

        assert.isFalse(first, "wait");

        writeable.once("drain", () => {
            writeable.end(Buffer.from("2"), () => {
                done();
            });
        });
    });
});
