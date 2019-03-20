const {
    is,
    stream: { pull }
} = adone;
const { through2, batch } = pull;

describe("stream", "pull", "batch", () => {
    const maxLengths = [1, 10, 100];
    const writeSizes = [1, 4, 8, 16, 32];

    maxLengths.forEach((maxLength) => {
        writeSizes.forEach((writeSize) => {
            it(`writeSize=${writeSize} maxLength=${maxLength}`, (done) => {
                const input = [];

                for (let i = 0; i < writeSize; i++) {
                    input.push(input.length);
                }

                let gotCount = 0;

                pull(
                    pull.values(input),
                    batch(maxLength),
                    through2(
                        function (arr) {
                            const self = this;
                            assert.isTrue(is.array(arr), "is array");
                            assert.isTrue(arr.length <= maxLength, "array is bigger than max size");
                            arr.forEach((elem) => {
                                assert.equal(elem, gotCount, "individual element has the expected value");
                                gotCount++;
                                self.queue(elem);
                            });

                            // timers.setTimeout(function () {}, 100)
                        },
                        function (end) {
                            assert.equal(gotCount, writeSize, `got ${writeSize} elements`);
                            this.queue(null);
                        }
                    ),
                    pull.collect((err, collected) => {
                        assert.notExists(err);
                        assert.isTrue(is.array(collected));
                        assert.deepEqual(collected, input, "collected is equal to input");
                        done();
                    })
                );
            });
        });
    });
});
