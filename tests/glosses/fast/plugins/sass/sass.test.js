import generateFixtures from "./generate_fixtures";

describe("fast", "transform", "sass", () => {
    const { std: { path, fs }, fast } = adone;
    const { File, Fast } = fast;

    let scssdir;
    let expectdir;

    let root;

    const createVinyl = (filename, contents) => {
        const file = scssdir.getFile(filename);
        return new File({
            cwd: scssdir.path(),
            base: scssdir.path(),
            path: file.path(),
            contents: contents || fs.readFileSync(file.path())
        });
    };

    before(async () => {
        root = await adone.fs.Directory.createTmp();
        await generateFixtures(root);
        scssdir = await root.getDirectory("scss");
        expectdir = await root.getDirectory("expected");
    });

    after(async () => {
        await root.unlink();
    });

    it("should pass file when it isNull()", async () => {
        const emptyFile = {
            isNull() {
                return true;
            }
        };
        const [file] = await new Fast([emptyFile]).sass();
        expect(file).to.be.equal(emptyFile);
    });

    it("should emit error when file isStream()", async () => {
        const streamFile = {
            isNull() {
                return false;
            },
            isStream() {
                return true;
            }
        };
        await assert.throws(async () => {
            await new Fast([streamFile]).sass();
        });
    });

    it("should compile an empty sass file", async () => {
        const sassFile = createVinyl("empty.scss");
        const [cssFile] = await new Fast([sassFile]).sass();
        expect(cssFile).to.be.ok;
        expect(cssFile.path).to.be.ok;
        expect(cssFile.relative).to.be.ok;
        expect(cssFile.contents).to.be.ok;
        expect(cssFile.basename).to.be.equal("empty.css");
        expect(cssFile.contents.toString()).to.be.equal(await expectdir.getFile("empty.css").contents());
    });

    it("should compile a single sass file", async () => {
        const sassFile = createVinyl("mixins.scss");
        const [cssFile] = await new Fast([sassFile]).sass();
        expect(cssFile).to.be.ok;
        expect(cssFile.path).to.be.ok;
        expect(cssFile.relative).to.be.ok;
        expect(cssFile.contents).to.be.ok;
        expect(cssFile.contents.toString()).to.be.equal(await expectdir.getFile("mixins.css").contents());
    });

    it("should compile multiple sass files", async () => {
        const files = [
            createVinyl("mixins.scss"),
            createVinyl("variables.scss")
        ];
        const cssFiles = await new Fast(files).sass();
        expect(cssFiles).to.have.length(2);

        for (const cssFile of cssFiles) {
            expect(cssFile).to.be.ok;
            expect(cssFile.path).to.be.ok;
            expect(cssFile.relative).to.be.ok;
            expect(cssFile.contents).to.be.ok;
            expect(cssFile.contents.toString()).to.be.equal(expectdir.getFile(cssFile.basename).contentsSync());
        }
    });

    it("should compile files with partials in another folder", async () => {
        const sassFile = createVinyl("inheritance.scss");
        const [cssFile] = await new Fast([sassFile]).sass();
        expect(cssFile).to.be.ok;
        expect(cssFile.path).to.be.ok;
        expect(cssFile.relative).to.be.ok;
        expect(cssFile.contents).to.be.ok;
        expect(cssFile.contents.toString()).to.be.equal(expectdir.getFile(cssFile.basename).contentsSync());
    });

    it("should handle sass errors", async () => {
        const errorFile = createVinyl("error.scss");
        const err = await assert.throws(async () => {
            await new Fast([errorFile]).sass();
        });
        // Error must include message body
        expect(err.message).to.match(/property \"font\" must be followed by a ':'/);
        expect(err.message).to.match(/scss\/error.scss/);
        expect(err.message).to.match(/on line 2/);
        expect(err.relativePath).to.be.equal("error.scss");
    });

    it("should preserve the original sass error message", async () => {
        const errorFile = createVinyl("error.scss");
        const err = await assert.throws(async () => {
            await new Fast([errorFile]).sass();
        });
        // Error must include original error message
        expect(err.message).to.match(/property \"font\" must be followed by a ':'/);
        expect(err.message).to.match(/on line 2/);
    });

    it("should compile a single sass file if the file name has been changed in the stream", async () => {
        const sassFile = createVinyl("mixins.scss");

        // Transform file name
        sassFile.path = scssdir.getFile("mixin--changed.scss").path();

        const [cssFile] = await new Fast([sassFile]).sass();
        expect(cssFile).to.be.ok;
        expect(cssFile.path).to.be.ok;
        expect(cssFile.path.split(path.sep).pop()).to.be.equal("mixin--changed.css");
        expect(cssFile.relative).to.be.ok;
        expect(cssFile.contents).to.be.ok;
        expect(cssFile.contents.toString()).to.be.equal(expectdir.getFile("mixins.css").contentsSync());
    });

    it("should preserve changes made in-stream to a Sass file", async () => {
        const sassFile = createVinyl("mixins.scss");

        // Transform file name
        sassFile.contents = Buffer.from(`/* Added Dynamically */${sassFile.contents.toString()}`);

        const [cssFile] = await new Fast([sassFile]).sass();
        expect(cssFile).to.be.ok;
        expect(cssFile.path).to.be.ok;
        expect(cssFile.relative).to.be.ok;
        expect(cssFile.contents).to.be.ok;
        expect(cssFile.contents.toString()).to.be.equal(`/* Added Dynamically */\n${expectdir.getFile(cssFile.basename).contentsSync()}`);
    });

    it("should work with sourcemaps", async () => {
        const sassFile = createVinyl("inheritance.scss");

        // Expected sources are relative to file.base
        const expectedSources = [
            "inheritance.scss",
            "includes/_cats.scss".split("/").join(path.sep),
            "includes/_dogs.sass".split("/").join(path.sep)
        ];

        sassFile.sourceMap = "{" +
            "\"version\": 3," +
            "\"file\": \"scss/subdir/multilevelimport.scss\"," +
            "\"names\": []," +
            "\"mappings\": \"\"," +
            "\"sources\": [ \"scss/subdir/multilevelimport.scss\" ]," +
            "\"sourcesContent\": [ \"@import ../inheritance;\" ]" +
            "}";

        const [cssFile] = await new Fast([sassFile]).sass();
        expect(cssFile.sourceMap).to.be.ok;
        expect(cssFile.sourceMap.sources).to.be.deep.equal(expectedSources);
    });

    it("should compile a single indented sass file", async () => {
        const sassFile = createVinyl("indent.sass");
        const [cssFile] = await new Fast([sassFile]).sass();
        expect(cssFile).to.be.ok;
        expect(cssFile.path).to.be.ok;
        expect(cssFile.relative).to.be.ok;
        expect(cssFile.contents).to.be.ok;
        expect(cssFile.contents.toString()).to.be.equal(expectdir.getFile(cssFile.basename).contentsSync());
    });

    it("should parse files in sass and scss", async () => {
        const files = [
            createVinyl("mixins.scss"),
            createVinyl("indent.sass")
        ];

        const cssFiles = await new Fast(files).sass();
        expect(cssFiles).to.have.length(2);

        for (const cssFile of cssFiles) {
            expect(cssFile).to.be.ok;
            expect(cssFile.path).to.be.ok;
            expect(cssFile.relative).to.be.ok;
            expect(cssFile.contents).to.be.ok;
            expect(cssFile.contents.toString()).to.be.equal(
                expectdir.getFile(cssFile.basename).contentsSync()
            );
        }
    });

    it("should work with sourcemaps and a globbed source", async () => {
        const files = await adone.fs.glob(scssdir.getFile("globbed", "**", "*.scss").path());

        const filesContent = {};
        files.forEach((file) => {
            const globPath = new adone.fs.File(file).relativePath(scssdir.getDirectory("globbed"));
            filesContent[globPath] = fs.readFileSync(file, "utf8");
        });

        const sfiles = await fast.src(scssdir.getFile("globbed", "**", "*.scss").path())
            .sourcemapsInit()
            .sass();
        for (const file of sfiles) {
            expect(file.sourceMap).to.be.ok;
            const actualContent = file.sourceMap.sourcesContent[0];
            const expectedContent = filesContent[file.sourceMap.sources[0]];
            expect(actualContent).to.be.equal(expectedContent);
        }
    });

    it("should work with with different file.base", async () => {
        const expectedSourcesBefore = [
            "scss/inheritance.scss".split("/").join(path.sep),
            "scss/includes/_cats.scss".split("/").join(path.sep),
            "scss/includes/_dogs.sass".split("/").join(path.sep)
        ];

        const files = await fast.src(scssdir.getFile("inheritance.scss").path(), { base: root.path() })
            .sourcemapsInit()
            .sass();
        for (const file of files) {
            expect(file.sourceMap.sources).to.be.deep.equal(expectedSourcesBefore);
        }
    });

    it("should work with empty files", async () => {
        await fast.src(scssdir.getFile("empty.scss").path())
            .sass()
            .dest(root.getDirectory("results").path(), { produceFiles: true });
        const file = root.getFile("results", "empty.css");
        expect(await file.exists()).to.be.true;
    });
});
