const {
    fs,
    std: { path: spath }
} = adone;

const SRC_PATH = spath.join(__dirname, "fixtures", "copy");
const DST_PATH = spath.join(__dirname, "fixtures", "copy", "dst");

describe("fs", "copy", () => {
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
        const srcPath = spath.join(SRC_PATH, "a");
        const dstPath = spath.join(DST_PATH, "a");
        await fs.copy(srcPath, DST_PATH);

        assert.isTrue(await sameContent(srcPath, dstPath));
    });

    it("should copy a whole directory", async () => {
        const srcPath = spath.join(__dirname, "fixtures", "copy", "*");
        const names = await fs.readdir(SRC_PATH);
        
        await fs.copy(srcPath, DST_PATH);

        for (const name of names) {
            if (name === "d") {
                continue;
            }
            assert.isTrue(await sameContent(spath.join(SRC_PATH, name), spath.join(DST_PATH, name)));
        }
    });

    it("should use cwd for relative paths", async () => {
        const srcPath = spath.join("fixtures", "copy", "a");
        const dstPath = spath.join("fixtures", "copy", "dst");
        await fs.copy(srcPath, dstPath, { cwd: __dirname });

        assert.isTrue(await sameContent(spath.join(SRC_PATH, "a"), spath.join(DST_PATH, "a")));
    });

    it("should ignore of dest exists", async () => {
        const srcPath = spath.join(SRC_PATH, "a");
        const dstPath = spath.join(__dirname, "fixtures", "copy", "d");
        await fs.copy(srcPath, dstPath, { ignoreExisting: true });

        assert.isTrue(await sameContent(spath.join(SRC_PATH, "b"), spath.join(dstPath, "a")));
    });
});
