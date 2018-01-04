const {
    fs,
    std: { path }
} = adone;

const {
    rmEmpty
} = fs;

const tests = path.join.bind(path, __dirname);

describe("fs", "rmEmpty", () => {
    beforeEach(async () => {
        await fs.copy(tests("fixtures"), tests("temp"));
    });

    afterEach(async () => {
        await fs.rm(tests("temp"));
    });

    it("should delete the given cwd if empty", async () => {
        await rmEmpty(tests("temp/b"));
        assert.false(await fs.exists(tests("temp/b")));
    });

    it("should delete nested directories", async () => {
        await rmEmpty(tests("temp"));
        assert.false(await fs.exists(tests("temp/a/aa/aaa")));
        assert.false(await fs.exists(tests("temp/b")));
        assert.false(await fs.exists(tests("temp/c")));
    });

    it("should return the array of deleted directories", async () => {
        const deleted = await rmEmpty(tests("temp"));
        assert.sameDeepMembers(deleted, [
            tests("temp/a/aa/aaa/aaaa"),
            tests("temp/a/aa/aaa"),
            tests("temp/b"),
            tests("temp/c")
        ]);
    });
});
