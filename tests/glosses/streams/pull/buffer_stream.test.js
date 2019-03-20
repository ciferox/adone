const {
    stream: { pull }
} = adone;
const { bufferStream, collect, once, map } = pull;

describe("stream", "pull", "bufferStream", () => {
    it("Should emit bytes", (done) => {
        const expected = 100;

        pull(
            bufferStream(expected),
            collect((error, buffers) => {
                assert.notExists(error);
                assert.equal(buffers.length, 1);
                assert.equal(buffers[0].length, expected);
                done();
            })
        );
    });

    it("Should emit a number of buffers", (done) => {
        const expected = 100;
        const chunkSize = 10;

        pull(
            bufferStream(expected, {
                chunkSize
            }),
            collect((error, buffers) => {
                assert.notExists(error);
                assert.equal(buffers.length, 10);
                assert.equal(buffers[0].length, expected / chunkSize);

                const total = buffers.reduce((acc, cur) => acc + cur.length, 0);

                assert.equal(expected, total);

                done();
            })
        );
    });

    it("Should allow collection of buffers", (done) => {
        const expected = 100;
        let buf = Buffer.alloc(0);

        pull(
            bufferStream(expected, {
                collector: (buffer) => {
                    buf = Buffer.concat([buf, buffer]);
                }
            }),
            collect((error, buffers) => {
                assert.notExists(error);
                assert.deepEqual(buf, buffers[0]);

                done();
            })
        );
    });

    it("Should allow generation of buffers", (done) => {
        const expected = 100;
        let buf = Buffer.alloc(0);

        pull(
            bufferStream(expected, {
                generator: (size, callback) => {
                    const output = Buffer.alloc(size, 1);
                    buf = Buffer.concat([buf, output]);

                    callback(null, output);
                }
            }),
            collect((error, buffers) => {
                assert.notExists(error);
                assert.deepEqual(buf, buffers[0]);

                done();
            })
        );
    });

    it("Should proagate byte generation errors", (done) => {
        const generationError = new Error("Urk!");

        pull(
            bufferStream(5, {
                generator: (size, callback) => {
                    callback(generationError);
                }
            }),
            collect((error) => {
                assert.equal(error, generationError);

                done();
            })
        );
    });

    it("Should proagate previous stream errors", (done) => {
        const streamError = new Error("Urk!");

        pull(
            bufferStream(5),
            map(() => {
                throw streamError;
            }),
            collect((error) => {
                assert.equal(error, streamError);

                done();
            })
        );
    });
});

