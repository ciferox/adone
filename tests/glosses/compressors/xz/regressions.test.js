const {
    std: { fs, path },
    compressor: { lzma },
    collection: { BufferList }
} = adone;

describe("compressor", "xz", "regressions", () => {
    const fixture = (...args) => path.join(__dirname, "fixtures", ...args);

    describe("regression-#7", () => {
        it("should perform correctly", (done) => {
            const input = fs.createReadStream(fixture("..", "..", "fixtures", "big"));
            const compressor = lzma.compressStream({ sync: true });

            input.pipe(compressor).pipe(new BufferList(done));
        });
    });

    describe("regression-#1", () => {
        it("should perform correctly", (done) => {
            let complete = 0;
            const N = 4;

            for (let i = 0; i < N; ++i) {
                lzma.compress("").then(() => {
                    if (++complete === N) {
                        done();
                    }
                });
            }
        });
    });

    describe("regression-#53", () => {
        it("should perform correctly", async () => {
            const input = fs.readFileSync(fixture("invalid.xz"));

            const err = await assert.throws(async () => lzma.decompress(input));
            assert.strictEqual(err.name, "LZMA_FORMAT_ERROR");
        });
    });
});
