const {
    fs
} = adone;

const {
    rmEmpty
} = fs;

describe("fs", "rmEmpty", () => {
    /**
     * @type {adone.fs.Directory}
     */
    let tmp;

    before(async () => {
        tmp = await fs.Directory.createTmp();
    });

    after(async () => {
        await tmp.unlink();
    });

    beforeEach(async () => {
        await FS.createStructure(tmp, [
            ["a", [
                ["aa", [
                    ["aaa", [
                        ["aaaa", [

                        ]]
                    ]],
                    "two.txt"
                ]],
                "one.txt"
            ]],
            ["b", [

            ]],
            ["c", [

            ]]
        ]);
    });

    afterEach(async () => {
        await tmp.clean();
    });

    it("should delete the given cwd if empty", async () => {
        const d = tmp.getDirectory("b");
        await rmEmpty(d.path());
        assert.isFalse(await d.exists());
    });

    it("should delete nested directories", async () => {
        await rmEmpty(tmp.path());
        assert.isFalse(await tmp.getDirectory("a", "aa", "aaa").exists());
        assert.isTrue(await tmp.getDirectory("a", "aa").exists());
        assert.isTrue(await tmp.getDirectory("a").exists());

        assert.isFalse(await tmp.getDirectory("a", "b").exists());
        assert.isFalse(await tmp.getDirectory("a", "c").exists());
    });

    it("should return the array of deleted directories", async () => {
        const deleted = await rmEmpty(tmp.path());
        assert.deepEqual(deleted.sort(), [
            tmp.getDirectory("a", "aa", "aaa").path(),
            tmp.getDirectory("a", "aa", "aaa", "aaaa").path(),
            tmp.getDirectory("b").path(),
            tmp.getDirectory("c").path()
        ]);
    });
});
