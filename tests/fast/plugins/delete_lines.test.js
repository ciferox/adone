describe("fast", "transform", "deleteLines", () => {
    const { fast } = adone;

    let root;
    let fromdir;
    let todir;
    let srcPath;

    before(async () => {
        root = await adone.fs.Directory.createTmp();
    });

    after(async () => {
        await root.unlink();
    });

    beforeEach(async () => {
        fromdir = await root.addDirectory("from");
        todir = await root.addDirectory("to");
        srcPath = adone.std.path.join(fromdir.path(), "**", "*");
    });

    afterEach(async () => {
        await root.clean();
    });

    it("should delete lines by regex and string", async () => {
        await fromdir.addFile("test.txt", {
            contents: "Hello, World!\nHallo, World!\nScotland!!!\nFreedom!!!\n"
        });

        await fast.src(srcPath).deleteLines([/H[ae]llo/, "Scotland"]).dest(todir.path());

        const file = todir.getFile("test.txt");
        assert.ok(await file.exists());
        assert.equal(await file.contents(), "Freedom!!!\n");
    });

    it("should throw on stream", async () => {
        await fromdir.addFile("test.txt");
        const files = [];
        try {
            await fast.src(srcPath, { stream: true }).map((x) => {
                files.push(x);
                return x;
            }).deleteLines([]).dest(todir.path());
        } catch (error) {
            assert.instanceOf(error, adone.exception.NotSupported);
            return;
        } finally {
            files.map((x) => x.contents.close());
        }
        assert.fail("Didn't throw any error!");
    });
});
