const { std: { fs, path }, compressor: { lzma }, collection: { BufferList } } = adone;

describe("glosses", "compressors", "xz", "regressions", () => {
    const commonFixturePath = (relPath) => path.join(__dirname, "../..", "fixtures", relPath);

    describe("regression-#7", () => {
        it("should perform correctly", (done) => {
            const input = fs.createReadStream(commonFixturePath("big"));
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
});
