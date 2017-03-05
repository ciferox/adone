const { fast } = adone;

describe("FAST", function() {
    describe("transforms", function() {
        describe("deleteLines", function() {
            let root;
            let fromdir;
            let todir;
            let srcPath;

            before(async () => {
                root = await FS.createTempDirectory();
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

            it("should delete lines by regex and string", async function() {
                await fromdir.addFile("test.txt", {
                    content: "Hello, World!\nHallo, World!\nScotland!!!\nFreedom!!!\n"
                });

                await fast.src(srcPath).deleteLines([/H[ae]llo/, "Scotland"]).dest(todir.path());

                const file = todir.getVirtualFile("test.txt");
                assert.isOk(await file.exists());
                assert.equal(await file.content(), "Freedom!!!\n");
            });

            it("should throw on stream", async function() {
                await fromdir.addFile("test.txt");
                const files = [];
                try {
                    await fast.src(srcPath, { stream: true }).map((x) => {
                        files.push(x);
                        return x;
                    }).deleteLines([]).dest(todir.path());
                } catch (error) {
                    assert.instanceOf(error, adone.x.NotSupported);
                    return;
                } finally {
                    files.map((x) => x.contents.close());
                }
                assert.fail("Didn't throw any error!");
            });
        });
    });
});
