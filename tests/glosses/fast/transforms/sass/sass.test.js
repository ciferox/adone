import generateFixtures from "./generate_fixtures";

const { std: { path, fs }, fast } = adone;
const { File, plugin: { sass } } = fast;

describe("Fast", () => {
    describe("transforms", () => {
        describe("resivion hash", () => {
            let scssdir;
            let expectdir;

            let root;

            function createVinyl(filename, contents) {
                const file = scssdir.getVirtualFile(filename);
                return new File({
                    cwd: scssdir.path(),
                    base: scssdir.path(),
                    path: file.path(),
                    contents: contents || fs.readFileSync(file.path())
                });
            }

            before(async () => {
                root = await FS.createTempDirectory();
                await generateFixtures(root);
                scssdir = await root.getVirtualDirectory("scss");
                expectdir = await root.getVirtualDirectory("expected");
            });

            after(async () => {
                await root.unlink();
            });

            it("should pass file when it isNull()", function (done) {
                const stream = sass();
                const emptyFile = {
                    isNull() {
                        return true;
                    }
                };
                stream.on("data", function (data) {
                    expect(data).to.be.equal(emptyFile);
                    done();
                });
                stream.resume().write(emptyFile);
            });

            it("should emit error when file isStream()", function (done) {
                const stream = sass();
                const streamFile = {
                    isNull() {
                        return false;
                    },
                    isStream() {
                        return true;
                    }
                };
                stream.on("error", function (err) {
                    expect(err.message).to.be.equal("Streaming is not supported");
                    done();
                });
                stream.resume().write(streamFile);
            });

            it("should compile an empty sass file", async () => {
                const sassFile = createVinyl("empty.scss");
                const stream = sass();
                let cssFile = new Promise((resolve) => stream.on("data", resolve));
                stream.resume().write(sassFile);
                cssFile = await cssFile;
                expect(cssFile).to.be.ok;
                expect(cssFile.path).to.be.ok;
                expect(cssFile.relative).to.be.ok;
                expect(cssFile.contents).to.be.ok;
                expect(cssFile.basename).to.be.equal("empty.css");
                expect(cssFile.contents.toString()).to.be.equal(await expectdir.getVirtualFile("empty.css").content());
            });

            it("should compile a single sass file", async () => {
                const sassFile = createVinyl("mixins.scss");
                const stream = sass();
                let cssFile = new Promise((resolve) => stream.on("data", resolve));
                stream.resume().write(sassFile);
                cssFile = await cssFile;
                expect(cssFile).to.be.ok;
                expect(cssFile.path).to.be.ok;
                expect(cssFile.relative).to.be.ok;
                expect(cssFile.contents).to.be.ok;
                expect(cssFile.contents.toString()).to.be.equal(await expectdir.getVirtualFile("mixins.css").content());
            });

            it("should compile multiple sass files", function (done) {
                const files = [
                    createVinyl("mixins.scss"),
                    createVinyl("variables.scss")
                ];
                const stream = sass();
                let mustSee = files.length;

                stream.on("data", function (cssFile) {
                    expect(cssFile).to.be.ok;
                    expect(cssFile.path).to.be.ok;
                    expect(cssFile.relative).to.be.ok;
                    expect(cssFile.contents).to.be.ok;
                    expect(cssFile.contents.toString()).to.be.equal(
                        expectdir.getVirtualFile(cssFile.basename).contentSync()
                    );
                    mustSee--;
                    if (mustSee <= 0) {
                        done();
                    }
                });
                stream.resume();
                files.forEach(function (file) {
                    stream.write(file);
                });
            });

            it("should compile files with partials in another folder", function (done) {
                const sassFile = createVinyl("inheritance.scss");
                const stream = sass();
                stream.on("data", function (cssFile) {
                    expect(cssFile).to.be.ok;
                    expect(cssFile.path).to.be.ok;
                    expect(cssFile.relative).to.be.ok;
                    expect(cssFile.contents).to.be.ok;
                    expect(cssFile.contents.toString()).to.be.equal(
                        expectdir.getVirtualFile(cssFile.basename).contentSync()
                    );
                    done();
                });
                stream.resume().write(sassFile);
            });

            it("should handle sass errors", function (done) {
                const errorFile = createVinyl("error.scss");
                const stream = sass();

                stream.on("error", function (err) {
                    // Error must include message body
                    expect(err.message).to.match(/property \"font\" must be followed by a ':'/);
                    expect(err.message).to.match(/scss\/error.scss/);
                    expect(err.message).to.match(/on line 2/);
                    expect(err.relativePath).to.be.equal("error.scss");
                    done();
                });
                stream.resume().write(errorFile);
            });

            it("should preserve the original sass error message", function (done) {
                const errorFile = createVinyl("error.scss");
                const stream = sass();

                stream.on("error", function (err) {
                    // Error must include original error message
                    expect(err.message).to.match(/property \"font\" must be followed by a ':'/);
                    expect(err.message).to.match(/on line 2/);
                    done();
                });
                stream.resume().write(errorFile);
            });

            it("should compile a single sass file if the file name has been changed in the stream", function (done) {
                const sassFile = createVinyl("mixins.scss");

                // Transform file name
                sassFile.path = scssdir.getVirtualFile("mixin--changed.scss").path();

                const stream = sass();
                stream.on("data", function (cssFile) {
                    expect(cssFile).to.be.ok;
                    expect(cssFile.path).to.be.ok;
                    expect(cssFile.path.split(path.sep).pop()).to.be.equal("mixin--changed.css");
                    expect(cssFile.relative).to.be.ok;
                    expect(cssFile.contents).to.be.ok;
                    expect(cssFile.contents.toString()).to.be.equal(
                        expectdir.getVirtualFile("mixins.css").contentSync()
                    );
                    done();
                });
                stream.resume().write(sassFile);
            });

            it("should preserve changes made in-stream to a Sass file", function (done) {
                const sassFile = createVinyl("mixins.scss");

                // Transform file name
                sassFile.contents = new Buffer("/* Added Dynamically */" + sassFile.contents.toString());

                const stream = sass();
                stream.on("data", function (cssFile) {
                    expect(cssFile).to.be.ok;
                    expect(cssFile.path).to.be.ok;
                    expect(cssFile.relative).to.be.ok;
                    expect(cssFile.contents).to.be.ok;
                    expect(cssFile.contents.toString()).to.be.equal("/* Added Dynamically */\n" +
                        expectdir.getVirtualFile(cssFile.basename).contentSync()
                    );
                    done();
                });
                stream.resume().write(sassFile);
            });

            it("should work with sourcemaps", function (done) {
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

                const stream = sass();
                stream.on("data", function (cssFile) {
                    expect(cssFile.sourceMap).to.be.ok;
                    expect(cssFile.sourceMap.sources).to.be.deep.equal(expectedSources);
                    done();
                });
                stream.resume().write(sassFile);
            });

            it("should compile a single indented sass file", function (done) {
                const sassFile = createVinyl("indent.sass");
                const stream = sass();
                stream.on("data", function (cssFile) {
                    expect(cssFile).to.be.ok;
                    expect(cssFile.path).to.be.ok;
                    expect(cssFile.relative).to.be.ok;
                    expect(cssFile.contents).to.be.ok;
                    expect(cssFile.contents.toString()).to.be.equal(
                        expectdir.getVirtualFile(cssFile.basename).contentSync()
                    );
                    done();
                });
                stream.resume().write(sassFile);
            });

            it("should parse files in sass and scss", function (done) {
                const files = [
                    createVinyl("mixins.scss"),
                    createVinyl("indent.sass")
                ];
                const stream = sass();
                let mustSee = files.length;

                stream.on("data", function (cssFile) {
                    expect(cssFile).to.be.ok;
                    expect(cssFile.path).to.be.ok;
                    expect(cssFile.relative).to.be.ok;
                    expect(cssFile.contents).to.be.ok;
                    expect(cssFile.contents.toString()).to.be.equal(
                        expectdir.getVirtualFile(cssFile.basename).contentSync()
                    );
                    mustSee--;
                    if (mustSee <= 0) {
                        done();
                    }
                });
                stream.resume();
                files.forEach(function (file) {
                    stream.write(file);
                });
            });

            it("should work with sourcemaps and a globbed source", async () => {
                const files = await adone.glob(scssdir.getVirtualFile("globbed", "**", "*.scss").path());

                const filesContent = {};
                files.forEach(function (file) {
                    const globPath = new adone.fs.File(file).relativePath(scssdir.getVirtualDirectory("globbed"));
                    filesContent[globPath] = fs.readFileSync(file, "utf8");
                });

                const sfiles = await fast.src(scssdir.getVirtualFile("globbed", "**", "*.scss").path())
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

                const files = await fast.src(scssdir.getVirtualFile("inheritance.scss").path(), { base: root.path() })
                    .sourcemapsInit()
                    .sass();
                for (const file of files) {
                    expect(file.sourceMap.sources).to.be.deep.equal(expectedSourcesBefore);
                }
            });

            it("should work with empty files", async () => {
                await fast.src(scssdir.getVirtualFile("empty.scss").path())
                    .sass()
                    .dest(root.getVirtualDirectory("results").path(), { produceFiles: true });
                const file = root.getVirtualFile("results", "empty.css");
                expect(await file.exists()).to.be.true;
            });
        });
    });
});
