describe("fast", "transform", "flatten", () => {
    const { fast, std: { path } } = adone;
    const { File, Stream } = fast;

    const P = (p) => p.split("/").join(path.sep);

    describe("flatten()", () => {
        let fileInstance;

        beforeEach(() => {
            fileInstance = new File({
                cwd: P("/some/project/"),
                base: P("/some/project/src/"),
                path: P("/some/project/src/assets/css/app.css"),
                contents: Buffer.from("html { background-color: #777; }")
            });
        });

        it("should strip relative path without options", async () => {
            const stream = new Stream([fileInstance]).flatten();
            const [newFile] = await stream;
            assert.isOk(newFile);
            assert.isOk(newFile.path);
            assert.isOk(newFile.relative);

            assert.equal(newFile.relative, "app.css");
        });

        it("should replace relative path with option path", async () => {
            const stream = new Stream([fileInstance]).flatten({ newPath: P("new/path") });
            const [newFile] = await stream;
            assert.isOk(newFile);
            assert.isOk(newFile.path);
            assert.isOk(newFile.relative);

            assert.equal(newFile.relative, P("new/path/app.css"));
        });

        describe("ignoring", () => {
            let fixtureDir;

            before(async () => {
                fixtureDir = await adone.fs.Directory.createTmp();
                let dir = await fixtureDir.addDirectory("test_dir");
                dir = await dir.addDirectory("some.css");
                await dir.addFile("test.css", {
                    contents: ".myclass { border: 1px }"
                });
            });

            after(async () => {
                await fixtureDir.unlink();
            });

            it("should ignore directories", async () => {
                const [newFile] = await fast.src(path.join(fixtureDir.path(), "/test_dir/**/*.css")).flatten();
                assert.isOk(newFile);
                assert.isOk(newFile.path);
                assert.isOk(newFile.relative);

                assert.equal(newFile.relative, "test.css");
            });
        });

        it("should strip relative path at the specified depth if depth option is passed", async () => {
            fileInstance.path = P("/some/project/src/one/two/three/four/app.css");
            const [newFile] = await new Stream([fileInstance]).flatten({ includeParents: 2 });
            assert.isOk(newFile);
            assert.isOk(newFile.path);
            assert.isOk(newFile.relative);

            assert.equal(newFile.relative, P("one/two/app.css"));
        });

        it("should leave path from the end if depth option is passed as negative number", async () => {
            fileInstance.path = P("/some/project/src/one/two/three/four/app.css");
            const [newFile] = await new Stream([fileInstance]).flatten({ includeParents: -2 });
            assert.isOk(newFile);
            assert.isOk(newFile.path);
            assert.isOk(newFile.relative);

            assert.equal(newFile.relative, P("three/four/app.css"));
        });

        it("should make no changes if the absolute depth option is greater than the tree depth", async () => {
            fileInstance.path = P("/some/project/src/one/two/three/four/app.css");
            const [newFile] = await new Stream([fileInstance]).flatten({ includeParents: 8 });
            assert.isOk(newFile);
            assert.isOk(newFile.path);
            assert.isOk(newFile.relative);

            assert.equal(newFile.relative, P("one/two/three/four/app.css"));
        });
    });
});
