const {
    fs,
    std: { path: spath }
} = adone;

const FIXTURES_PATH = spath.join(__dirname, "fixtures", "copy_to");
const DST_PATH = spath.join(FIXTURES_PATH, "dst");

describe("fs", "copyTo", () => {
    const sameContent = async (srcPath, dstPath) => {
        const srcContent = await fs.readFile(srcPath);
        const dstContent = await fs.readFile(dstPath);

        return srcContent.compare(dstContent) === 0;
    };

    // beforeEach(async () => {
    // });

    afterEach(async () => {
        await fs.rm(DST_PATH);
    });

    it("should copy a file", async () => {
        const srcPath = spath.join(FIXTURES_PATH, "a");
        const dstPath = spath.join(DST_PATH, "a");
        await fs.copyTo(srcPath, DST_PATH);

        assert.isTrue(await sameContent(srcPath, dstPath));
    });

    it("should copy a whole directory", async () => {
        const srcPath = spath.join(FIXTURES_PATH, "*");
        const names = await fs.readdir(FIXTURES_PATH);

        await fs.copyTo(srcPath, DST_PATH);

        for (const name of names) {
            if (name === "d") {
                continue;
            }
            assert.isTrue(await sameContent(spath.join(FIXTURES_PATH, name), spath.join(DST_PATH, name))); // eslint-disable-line
        }
    });

    it("should use cwd for relative paths", async () => {
        const srcPath = spath.join("fixtures", "copy_to", "a");
        const dstPath = spath.join("fixtures", "copy_to", "dst");
        await fs.copyTo(srcPath, dstPath, { cwd: __dirname });

        assert.isTrue(await sameContent(spath.join(FIXTURES_PATH, "a"), spath.join(DST_PATH, "a")));
    });

    it("should ignore of dest exists", async () => {
        const srcPath = spath.join(FIXTURES_PATH, "a");
        const dstPath = spath.join(FIXTURES_PATH, "d");
        await fs.copyTo(srcPath, dstPath, { ignoreExisting: true });

        assert.isTrue(await sameContent(spath.join(FIXTURES_PATH, "b"), spath.join(dstPath, "a")));
    });
});
