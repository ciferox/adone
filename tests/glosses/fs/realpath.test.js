const { is, std: { fs, path } } = adone;
const lengths = [1, 128, 256];
const root = `${__dirname}/rptest`;

const clean = () => {
    try {
        fs.unlinkSync(`${root}/a/b`);
    } catch (e) {
        //
    }
    try {
        fs.rmdirSync(`${root}/a`);
    } catch (e) {
        //
    }
    try {
        fs.rmdirSync(root);
    } catch (e) {
        //
    }
};

describe("fs", "realpath", function () {
    if (is.windows) {
        this.skip();
    }
    it("setup", () => {
        clean();

        fs.mkdirSync(root);
        fs.mkdirSync(`${root}/a`);
        fs.symlinkSync("..", `${root}/a/b`);
    });

    const expect = path.resolve(`${__dirname}/rptest/a`);

    lengths.forEach((len) => {
        it(`symlinks = ${len}`, async () => {
            const long = `${root}/${Array(len).join("a/b/")}a`;

            assert.equal(adone.fs.realpathSync(long), expect);
            const actual = await adone.fs.realpath(long);
            assert.equal(actual, expect);
        });
    });

    it("cleanup", () => {
        clean();
    });
});
