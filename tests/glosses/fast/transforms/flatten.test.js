import flatten, { flattenPath } from "adone/glosses/fast/transforms/flatten";

const path = adone.std.path;
const { fast } = adone;
const { File } = fast;

describe("FAST", () => {
    describe("transforms", () => {
        describe("flatten", () => {
            function P(p) {
                return p.split("/").join(path.sep);
            }

            describe("flatten()", () => {
                let fileInstance;

                beforeEach(() => {
                    fileInstance = new File({
                        cwd: P("/some/project/"),
                        base: P("/some/project/src/"),
                        path: P("/some/project/src/assets/css/app.css"),
                        contents: new Buffer("html { background-color: #777; }")
                    });
                });

                it("should strip relative path without options", (done) => {
                    const stream = flatten();
                    stream.on("error", done);
                    stream.on("data", (newFile) => {
                        assert.isOk(newFile);
                        assert.isOk(newFile.path);
                        assert.isOk(newFile.relative);

                        assert.equal(newFile.relative, "app.css");
                        done();
                    });
                    stream.write(fileInstance);
                    stream.resume();
                });

                it("should replace relative path with option path", (done) => {
                    const stream = flatten({ newPath: P("new/path") });
                    stream.on("error", done);
                    stream.on("data", (newFile) => {
                        assert.isOk(newFile);
                        assert.isOk(newFile.path);
                        assert.isOk(newFile.relative);

                        assert.equal(newFile.relative, P("new/path/app.css"));
                        done();
                    });
                    stream.write(fileInstance);
                    stream.resume();
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

                    it("should ignore directories", (done) => {
                        const stream = fast.src(path.join(fixtureDir.path(), "/test_dir/**/*.css")).flatten();

                        stream.on("error", done);
                        stream.on("data", (newFile) => {
                            assert.isOk(newFile);
                            assert.isOk(newFile.path);
                            assert.isOk(newFile.relative);

                            assert.equal(newFile.relative, "test.css");
                            done();
                        });
                        stream.resume();
                    });
                });

                it("should strip relative path at the specified depth if depth option is passed", (done) => {
                    const stream = flatten({ includeParents: 2 });
                    stream.on("error", done);
                    stream.on("data", (newFile) => {
                        assert.isOk(newFile);
                        assert.isOk(newFile.path);
                        assert.isOk(newFile.relative);

                        assert.equal(newFile.relative, P("one/two/app.css"));
                        done();
                    });

                    fileInstance.path = P("/some/project/src/one/two/three/four/app.css");
                    stream.write(fileInstance);
                    stream.resume();
                });

                it("should leave path from the end if depth option is passed as negative number", (done) => {
                    const stream = flatten({ includeParents: -2 });
                    stream.on("error", done);
                    stream.on("data", (newFile) => {
                        assert.isOk(newFile);
                        assert.isOk(newFile.path);
                        assert.isOk(newFile.relative);

                        assert.equal(newFile.relative, P("three/four/app.css"));
                        done();
                    });

                    fileInstance.path = P("/some/project/src/one/two/three/four/app.css");
                    stream.write(fileInstance);
                    stream.resume();
                });

                it("should make no changes if the absolute depth option is greater than the tree depth", (done) => {
                    const stream = flatten({ includeParents: 8 });
                    stream.on("error", done);
                    stream.on("data", (newFile) => {
                        assert.isOk(newFile);
                        assert.isOk(newFile.path);
                        assert.isOk(newFile.relative);

                        assert.equal(newFile.relative, P("one/two/three/four/app.css"));
                        done();
                    });

                    fileInstance.path = P("/some/project/src/one/two/three/four/app.css");
                    stream.write(fileInstance);
                    stream.resume();
                });
            });

            describe("helper-functions", () => {
                let fileInstance;

                beforeEach(() => {
                    fileInstance = {
                        base: P("/some/project/src"),
                        path: P("/some/project/src/top1/top2/bottom2/bottom1/app.css"),
                        relative: P("top1/top2/bottom2/bottom1/app.css")
                    };
                });

                describe("includeParents", () => {
                    it("should keep top parent dirs from indludeParents option", (done) => {
                        const topOnly = flattenPath(fileInstance, { includeParents: 1 });
                        assert.equal(topOnly, P("top1/app.css"));

                        done();
                    });

                    it("should keep bottom parent dirs from indludeParents option", (done) => {
                        const bottomOnly = flattenPath(fileInstance, { includeParents: [0, 1] });
                        assert.equal(bottomOnly, P("bottom1/app.css"));

                        done();
                    });

                    it("should treat negative number in indludeParents as bottom parent levels", (done) => {
                        const bottomOnly = flattenPath(fileInstance, { includeParents: -1 });
                        assert.equal(bottomOnly, P("bottom1/app.css"));

                        done();
                    });

                    it("should keep top and bottom parent dirs from indludeParents option", (done) => {
                        const both = flattenPath(fileInstance, { includeParents: [1, 2] });
                        assert.equal(both, P("top1/bottom2/bottom1/app.css"));

                        done();
                    });

                    it("should pick relative path if indludeParents bottom+top too long", (done) => {
                        const relative = flattenPath(fileInstance, { includeParents: [10, 10] });
                        assert.equal(relative, fileInstance.relative);

                        done();
                    });
                });

                describe("subPath", () => {
                    it("should keep top parent dirs from subPath option", (done) => {
                        const topOnly = flattenPath(fileInstance, { subPath: [0, 2] });
                        assert.equal(topOnly, P("top1/top2/app.css"));

                        done();
                    });

                    it("should keep bottom parent dirs from subPath option", (done) => {
                        const bottomOnly = flattenPath(fileInstance, { subPath: -2 });
                        assert.equal(bottomOnly, P("bottom2/bottom1/app.css"));

                        done();
                    });

                    it("should keep top2 and bottom2 from subPath option", (done) => {
                        const middleOnly = flattenPath(fileInstance, { subPath: [1, -1] });
                        assert.equal(middleOnly, P("top2/bottom2/app.css"));

                        done();
                    });
                });
            });
        });
    });
});
