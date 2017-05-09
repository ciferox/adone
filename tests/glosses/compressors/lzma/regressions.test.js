const { std: { fs, path }, compressor: { xz }, collection: { BufferList } } = adone;

describe("glosses", "compressors", "lzma", "regressions", () => {
    const commonFixturePath = (relPath) => path.join(__dirname, "../..", "fixtures", relPath);

    describe("regression-#7", () => {
        it("should perform correctly", (done) => {
            const input = fs.createReadStream(commonFixturePath("big"));
            const compressor = xz.compressStream({ sync: true });

            input.pipe(compressor).pipe(new BufferList(done));
        });
    });

    describe("regression-#1", () => {
        it("should perform correctly", (done) => {
            let complete = 0;
            const N = 4;

            for (let i = 0; i < N; ++i) {
                xz.compress("").then(() => {
                    if (++complete === N) {
                        done();
                    }
                });
            }
        });
    });
});
