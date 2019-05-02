const {
    stream: { pull }
} = adone;
const { asyncIteratorToPullStream } = pull;

const futureValue = (value, ms) => new Promise((resolve, reject) => setTimeout(() => resolve(value), ms));

describe("stream", "pull", "asyncIteratorToPullStream", () => {
    it("should convert async iterator to pull stream", (done) => {
        const sourceValues = [1, 2, 3, 4, 5];

        const iterator = async function* () {
            for (let i = 0; i < sourceValues.length; i++) {
                yield await futureValue(sourceValues[i], sourceValues[i]);
            }
        };

        pull(
            asyncIteratorToPullStream(iterator()),
            pull.collect((err, values) => {
                assert.notExists(err);
                assert.deepEqual(values, sourceValues);
                done();
            })
        );
    });

    it("should return mid way through async iterator source", (done) => {
        const sourceValues = [1, 2, 3, 4, 5];

        const iterator = async function* () {
            for (let i = 0; i < sourceValues.length; i++) {
                yield await futureValue(sourceValues[i], sourceValues[i]);
            }
        };

        pull(
            asyncIteratorToPullStream(iterator()),
            pull.take(1),
            pull.collect((err, values) => {
                assert.notExists(err);
                assert.deepEqual(values, [sourceValues[0]]);
                done();
            })
        );
    });

    it("should convert iterator to pull stream", (done) => {
        const sourceValues = [1, 2, 3, 4, 5];

        const iterator = function* () {
            for (let i = 0; i < sourceValues.length; i++) {
                yield sourceValues[i];
            }
        };

        pull(
            asyncIteratorToPullStream(iterator()),
            pull.collect((err, values) => {
                assert.notExists(err);
                assert.deepEqual(values, sourceValues);
                done();
            })
        );
    });

    it("should handle error in iterator", (done) => {
        const sourceValues = [1, 2, 3, 4, new Error("Boom!")];

        const iterator = function* () {
            for (let i = 0; i < sourceValues.length; i++) {
                if (sourceValues[i] instanceof Error) {
                    throw sourceValues[i];
                }
                yield sourceValues[i];
            }
        };

        pull(
            asyncIteratorToPullStream(iterator()),
            pull.collect((err, values) => {
                assert.exists(err);
                assert.deepEqual(values, sourceValues.slice(0, -1));
                done();
            })
        );
    });

    it("should accept iterable", (done) => {
        const sourceValues = [1, 2, 3, 4, 5];

        pull(
            asyncIteratorToPullStream(sourceValues),
            pull.collect((err, values) => {
                assert.notExists(err);
                assert.deepEqual(values, sourceValues);
                done();
            })
        );
    });

    it("should accept async iterable", (done) => {
        const sourceValues = [1, 2, 3, 4, 5];

        const iterator = async function* () {
            for (let i = 0; i < sourceValues.length; i++) {
                yield await futureValue(sourceValues[i], sourceValues[i]);
            }
        };

        pull(
            asyncIteratorToPullStream({ [Symbol.asyncIterator]: () => iterator() }),
            pull.collect((err, values) => {
                assert.notExists(err);
                assert.deepEqual(values, sourceValues);
                done();
            })
        );
    });

    it("should convert async iterable through stream to pull through stream", (done) => {
        const sourceValues = [1, 2, 3, 4, 5];

        const passThrough = (source) => (async function* () {
            for await (const chunk of source) {
                yield chunk; // here we _could_ change the chunk or buffer it or whatever
            }
        })();

        pull(
            pull.values(sourceValues),
            asyncIteratorToPullStream.through(passThrough),
            pull.collect((err, values) => {
                assert.notExists(err);
                assert.deepEqual(values, sourceValues);
                done();
            })
        );
    });

    it("should handle error in async iterable through stream", (done) => {
        const sourceValues = [1, 2, 3, 4, 5];

        const passThrough = (source) => (async function* () {
            for await (const _ of source) { // eslint-disable-line no-unused-vars
                throw new Error("boom");
            }
        })();

        pull(
            pull.values(sourceValues),
            asyncIteratorToPullStream.through(passThrough),
            pull.collect((err, values) => {
                assert.exists(err);
                assert.equal(err.message, "boom");
                done();
            })
        );
    });

    it("should convert async iterable sink to pull sink", (done) => {
        const sourceValues = [1, 2, 3, 4, 5];

        pull(
            pull.values(sourceValues),
            asyncIteratorToPullStream.sink(async (source) => {
                let i = 0;
                for await (const value of source) {
                    assert.equal(value, sourceValues[i]);
                    i++;
                }
                assert.equal(i, sourceValues.length);
                done();
            })
        );
    });

    it("should return mid way through async iterable sink", (done) => {
        const sourceValues = [1, 2, 3, 4, 5];

        pull(
            pull.values(sourceValues),
            asyncIteratorToPullStream.sink(async (source) => {
                await source.next();
                await source.return();
                done();
            })
        );
    });

    it("should throw mid way through async iterable sink", (done) => {
        const sourceValues = [1, 2, 3, 4, 5];

        pull(
            pull.values(sourceValues),
            asyncIteratorToPullStream.sink(async (source) => {
                await source.next();
                await assert.throws(async () => source.throw(new Error("boom")));
                done();
            })
        );
    });
});
