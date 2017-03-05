import generateFixtures from "./generate_fixtures";

const { std: { stream: { Readable } }, fast } = adone;
const { File, plugin: { sourcemapsInit } } = fast;

let sourceContent;
let sourceContentCSS;
let root;
let fromdir;

function makeFile() {
    return new File({
        cwd: root.path(),
        base: fromdir.path(),
        path: fromdir.getVirtualFile("helloworld.js").path(),
        contents: new Buffer(sourceContent)
    });
}

function makeNullFile() {
    const junkBuffer = new Buffer([]);
    junkBuffer.toString = function () {
        return null;
    };

    return new File({
        cwd: root.path(),
        base: fromdir.path(),
        path: fromdir.getVirtualFile("helloworld.js").path(),
        contents: junkBuffer
    });
}

function makeStreamFile() {
    return new File({
        cwd: root.path(),
        base: fromdir.path(),
        path: fromdir.getVirtualFile("helloworld.js").path(),
        contents: new Readable()
    });
}

function makeFileWithInlineSourceMap() {
    return new File({
        cwd: root.path(),
        base: fromdir.path(),
        path: fromdir.getVirtualFile("all.js").path(),
        contents: new Buffer("console.log(\"line 1.1\"),console.log(\"line 1.2\"),console.log(\"line 2.1\"),console.log(\"line 2.2\");\n//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWxsLmpzIiwic291cmNlcyI6WyJ0ZXN0MS5qcyIsInRlc3QyLmpzIl0sIm5hbWVzIjpbImNvbnNvbGUiLCJsb2ciXSwibWFwcGluZ3MiOiJBQUFBQSxRQUFBQyxJQUFBLFlBQ0FELFFBQUFDLElBQUEsWUNEQUQsUUFBQUMsSUFBQSxZQUNBRCxRQUFBQyxJQUFBIiwic291cmNlc0NvbnRlbnQiOlsiY29uc29sZS5sb2coJ2xpbmUgMS4xJyk7XG5jb25zb2xlLmxvZygnbGluZSAxLjInKTtcbiIsImNvbnNvbGUubG9nKCdsaW5lIDIuMScpO1xuY29uc29sZS5sb2coJ2xpbmUgMi4yJyk7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9")
    });
}

function makeFileCSS() {
    return new File({
        cwd: root.path(),
        base: fromdir.path(),
        path: fromdir.getVirtualFile("test.css").path(),
        contents: new Buffer(sourceContentCSS)
    });
}

describe("Fast", () => {
    describe("transforms", () => {
        describe("sourcemaps", () => {
            describe("init", () => {
                before(async () => {
                    root = await FS.createTempDirectory();
                    fromdir = await root.addDirectory("from");
                    await generateFixtures(fromdir);
                    sourceContent = await fromdir.getVirtualFile("helloworld.js").content();
                });

                after(async () => {
                    await root.unlink();
                });

                it("should emit an error if file content is a stream", (done) => {
                    const pipeline = sourcemapsInit();
                    pipeline.on("data", function () {
                        done(new Error("should emit an error"));
                    }).on("error", function () {
                        done();
                    }).write(makeStreamFile());
                });

                it("should pass through when file is null", (done) => {
                    const file = new File();
                    const pipeline = sourcemapsInit();
                    pipeline.on("data", function (data) {
                        expect(data).to.be.ok;
                        expect(data).to.be.instanceof(File);
                        expect(data.sourceMap).not.to.be.ok;
                        expect(data).to.be.deep.equal(file);
                        done();
                    }).on("error", function (err) {
                        done(err);
                    }).resume().write(file);
                });

                it("should add an empty source map", (done) => {
                    const pipeline = sourcemapsInit();
                    pipeline.on("data", function (data) {
                        expect(data).to.be.ok;
                        expect(data).to.be.ok;
                        expect(data instanceof File).to.be.ok;
                        expect(data.sourceMap).to.be.ok;
                        expect(String(data.sourceMap.version)).to.be.equal("3");
                        expect(data.sourceMap.sources[0]).to.be.equal("helloworld.js");
                        expect(data.sourceMap.sourcesContent[0]).to.be.equal(sourceContent);
                        expect(data.sourceMap.names).to.be.deep.equal([]);
                        expect(data.sourceMap.mappings).to.be.equal("");
                        done();
                    }).on("error", function (error) {
                        done(error);
                    }).resume().write(makeFile());
                });

                it("should add a valid source map if wished", (done) => {
                    const pipeline = sourcemapsInit({ identityMap: true });
                    pipeline.on("data", function (data) {
                        expect(data).to.be.ok;
                        expect(data instanceof File).to.be.ok;
                        expect(data.sourceMap).to.be.ok;
                        expect(String(data.sourceMap.version)).to.be.equal("3");
                        expect(data.sourceMap.sources[0]).to.be.equal("helloworld.js");
                        expect(data.sourceMap.sourcesContent[0]).to.be.equal(sourceContent);
                        expect(data.sourceMap.names).to.be.deep.equal([
                            "helloWorld", "console", "log"
                        ]);
                        expect(data.sourceMap.mappings, "AAAA,YAAY;;AAEZ,SAASA,UAAU,CAAC,EAAE;IAClBC,OAAO,CAACC,GAAG,CAAC,cAAc).to.be.equal(CAAC;AAC/B");
                        done();
                    }).on("error", (err) => {
                        done(err);
                    }).resume().write(makeFile());
                });

                it.skip("should add a valid source map for css if wished", (done) => {
                    const pipeline = sourcemapsInit({ identityMap: true });
                    pipeline.on("data", function (data) {
                        expect(data).to.be.ok;
                        expect(data instanceof File).to.be.ok;
                        expect(data.sourceMap).to.be.ok;
                        expect(String(data.sourceMap.version)).to.be.equal("3");
                        expect(data.sourceMap.sources[0]).to.be.equal("test.css");
                        expect(data.sourceMap.sourcesContent[0]).to.be.equal(sourceContentCSS);
                        expect(data.sourceMap.names).to.be.deep.equal([]);
                        expect(data.sourceMap.mappings).to.be.equal("CAAC;GACE;GACA");
                        done();
                    }).on("error", function (error) {
                        done(error);
                    }).resume().write(makeFileCSS());
                });

                it("should import an existing inline source map", (done) => {
                    const pipeline = sourcemapsInit({ loadMaps: true });
                    pipeline.on("data", function (data) {
                        expect(data).to.be.ok;
                        expect(data instanceof File).to.be.ok;
                        expect(data.sourceMap).to.be.ok;
                        expect(/sourceMappingURL/.test(data.contents.toString())).to.be.false;
                        expect(String(data.sourceMap.version)).to.be.equal("3");
                        expect(data.sourceMap.sources).to.be.deep.equal([
                            "test1.js", "test2.js"
                        ]);
                        expect(data.sourceMap.sourcesContent).to.be.deep.equal([
                            "console.log('line 1.1');\nconsole.log('line 1.2');\n", "console.log('line 2.1');\nconsole.log('line 2.2');"
                        ], "should have right sourcesContent");
                        expect(data.sourceMap.mappings, "AAAAA,QAAAC,IAAA,YACAD,QAAAC,IAAA,YCDAD,QAAAC,IAAA,YACAD,QAAAC).to.be.equal(IAAA");
                        done();
                    }).on("error", function (error) {
                        done(error);
                    }).resume().write(makeFileWithInlineSourceMap());
                });

                it("should load external source map file referenced in comment with the \/\/# syntax", (done) => {
                    const file = makeFile();
                    file.contents = new Buffer(sourceContent + "\n//# sourceMappingURL=helloworld2.js.map");
                    const pipeline = sourcemapsInit({ loadMaps: true });
                    pipeline.on("data", function (data) {
                        expect(data.sourceMap).to.be.ok;
                        expect(String(data.sourceMap.version)).to.be.equal("3");
                        expect(data.sourceMap.sources).to.be.deep.equal(["helloworld2.js"]);
                        expect(data.sourceMap.sourcesContent).to.be.deep.equal(["source content from source map"]);
                        expect(data.sourceMap.mappings).to.be.equal("");
                        done();
                    }).resume().write(file);
                });

                it("should remove source map comment with the \/\/# syntax", (done) => {
                    const file = makeFile();
                    file.contents = new Buffer(sourceContent + "\n//# sourceMappingURL=helloworld2.js.map");

                    const pipeline = sourcemapsInit({ loadMaps: true });
                    pipeline.on("data", function (data) {
                        expect(/sourceMappingURL/.test(data.contents.toString())).to.be.false;
                        done();
                    }).resume().write(file);
                });

                it("should load external source map file referenced in comment with the \/*# *\/ syntax", (done) => {
                    const file = makeFile();
                    file.contents = new Buffer(sourceContent + "\n/*# sourceMappingURL=helloworld2.js.map */");

                    const pipeline = sourcemapsInit({ loadMaps: true });
                    pipeline.on("data", function (data) {
                        expect(data.sourceMap).to.be.ok;
                        expect(String(data.sourceMap.version)).to.be.equal("3");
                        expect(data.sourceMap.sources).to.be.deep.equal(["helloworld2.js"]);
                        expect(data.sourceMap.sourcesContent).to.be.deep.equal(["source content from source map"]);
                        expect(data.sourceMap.mappings).to.be.equal("");
                        done();
                    }).resume().write(file);
                });

                it("should remove source map comment with the \/\/# syntax", (done) => {
                    const file = makeFile();
                    file.contents = new Buffer(sourceContent + "\n/*# sourceMappingURL=helloworld2.js.map */");

                    const pipeline = sourcemapsInit({ loadMaps: true });
                    pipeline.on("data", function (data) {
                        expect(/sourceMappingURL/.test(data.contents.toString())).to.be.false;
                        done();
                    }).resume().write(file);
                });

                it("should load external source map if no source mapping comment", (done) => {
                    const file = makeFile();
                    file.path = file.path.replace("helloworld.js", "helloworld2.js");

                    const pipeline = sourcemapsInit({ loadMaps: true });
                    pipeline.on("data", function (data) {
                        expect(data.sourceMap).to.be.ok;
                        expect(String(data.sourceMap.version)).to.be.equal("3");
                        expect(data.sourceMap.sources).to.be.deep.equal(["helloworld2.js"]);
                        expect(data.sourceMap.sourcesContent).to.be.deep.equal(["source content from source map"]);
                        expect(data.sourceMap.mappings).to.be.equal("");
                        done();
                    }).resume().write(file);
                });

                it("should load external source map and add sourceContent if missing", (done) => {
                    const file = makeFile();
                    file.contents = new Buffer(sourceContent + "\n//# sourceMappingURL=helloworld3.js.map");

                    const pipeline = sourcemapsInit({ loadMaps: true });
                    pipeline.on("data", function (data) {
                        expect(data.sourceMap).to.be.ok;
                        expect(String(data.sourceMap.version)).to.be.equal("3");
                        expect(data.sourceMap.sources).to.be.deep.equal([
                            "helloworld.js", "test1.js"
                        ], "should have right sources");
                        expect(data.sourceMap.sourcesContent).to.be.deep.equal([
                            file.contents.toString(), "test1"
                        ], "should have right sourcesContent");
                        expect(data.sourceMap.mappings).to.be.equal("");
                        done();
                    }).resume().write(file);
                });

                it("should not throw when source file for sourceContent not found", (done) => {
                    const file = makeFile();
                    file.contents = new Buffer(sourceContent + "\n//# sourceMappingURL=helloworld4.js.map");

                    const pipeline = sourcemapsInit({ loadMaps: true });
                    pipeline.on("data", function (data) {
                        expect(data.sourceMap).to.be.ok;
                        expect(String(data.sourceMap.version)).to.be.equal("3");
                        expect(data.sourceMap.sources).to.be.deep.equal([
                            "helloworld.js", "missingfile"
                        ], "should have right sources");
                        expect(data.sourceMap.sourcesContent).to.be.deep.equal([
                            file.contents.toString(), null
                        ], "should have right sourcesContent");
                        expect(data.sourceMap.mappings).to.be.equal("");
                        done();
                    }).resume().write(file);
                });


                it("should use unix style paths in sourcemap", (done) => {
                    const file = makeFile();
                    file.base = file.cwd;

                    const pipeline = sourcemapsInit();
                    pipeline.on("data", function (data) {
                        expect(data.sourceMap.file).to.be.equal("from/helloworld.js");
                        expect(data.sourceMap.sources).to.be.deep.equal(["from/helloworld.js"]);
                        done();
                    }).resume().write(file);
                });

                it("should use sourceRoot when resolving path to sources", (done) => {
                    const file = makeFile();
                    file.contents = new Buffer(sourceContent + "\n//# sourceMappingURL=helloworld5.js.map");

                    const pipeline = sourcemapsInit({ loadMaps: true });
                    pipeline.on("data", function (data) {
                        expect(data.sourceMap).to.be.ok;
                        expect(String(data.sourceMap.version)).to.be.equal("3");
                        expect(data.sourceMap.sources).to.be.deep.equal([
                            "../helloworld.js", "../test1.js"
                        ], "should have right sources");
                        expect(data.sourceMap.sourcesContent).to.be.deep.equal([
                            file.contents.toString(), "test1"
                        ], "should have right sourcesContent");
                        expect(data.sourceMap.mappings).to.be.equal("");
                        expect(data.sourceMap.sourceRoot).to.be.equal("test");
                        done();
                    }).resume().write(file);
                });

                it("should not load source content if the path is a url", (done) => {
                    const file = makeFile();
                    file.contents = new Buffer(sourceContent + "\n//# sourceMappingURL=helloworld6.js.map");

                    const pipeline = sourcemapsInit({ loadMaps: true });
                    pipeline.on("data", function (data) {
                        expect(data.sourceMap).to.be.ok;
                        expect(String(data.sourceMap.version)).to.be.equal("3");
                        expect(data.sourceMap.sources).to.be.deep.equal([
                            "helloworld.js", "http://example2.com/test1.js"
                        ], "should have right sources");
                        expect(data.sourceMap.sourcesContent).to.be.deep.equal([null, null]);
                        expect(data.sourceMap.mappings).to.be.equal("");
                        done();
                    }).resume().write(file);
                });

                it("should pass through when file already has a source map", (done) => {
                    const sourceMap = {
                        version: 3,
                        names: [],
                        mappings: "",
                        sources: ["test.js"],
                        sourcesContent: ["testContent"]
                    };

                    const file = makeFile();
                    file.sourceMap = sourceMap;
                    const pipeline = sourcemapsInit({ loadMaps: true });
                    pipeline.on("data", function (data) {
                        expect(data).to.be.ok;
                        expect(data instanceof File).to.be.ok;
                        expect(data.sourceMap).to.be.equal(sourceMap);
                        expect(data).to.be.deep.equal(file);
                        done();
                    }).on("error", function (error) {
                        done(error);
                    }).resume().write(file);
                });

                it("handle null contents", (done) => {
                    const pipeline = sourcemapsInit({ addComment: true });
                    pipeline.on("data", function (data) {
                        expect(data).to.be.ok;
                        expect(data instanceof File).to.be.ok;
                        expect(data.sourceMap).to.be.ok;
                        expect(String(data.sourceMap.version)).to.be.equal("3");
                        expect(data.sourceMap.sources[0]).to.be.equal("helloworld.js");
                        expect(data.sourceMap.sourcesContent[0]).to.be.equal(null);
                        expect(data.sourceMap.names).to.be.deep.equal([]);
                        expect(data.sourceMap.mappings).to.be.equal("");
                        done();
                    }).on("error", function (error) {
                        done(error);
                    }).resume().write(makeNullFile());
                });
            });
        });
    });
});
