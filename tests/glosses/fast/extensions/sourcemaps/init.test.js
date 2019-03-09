import generateFixtures from "./generate_fixtures";

describe("fast", "transform", "sourcemaps", "init", () => {
    const { std: { stream: { Readable } }, fast } = adone;
    const { File, Stream } = fast;

    let sourceContent;
    let sourceContentCSS;
    let root;
    let fromdir;

    const makeFile = () => new File({
        cwd: root.path(),
        base: fromdir.path(),
        path: fromdir.getFile("helloworld.js").path(),
        contents: Buffer.from(sourceContent)
    });

    const makeNullFile = () => {
        const junkBuffer = Buffer.alloc(0);
        junkBuffer.toString = () => null;

        return new File({
            cwd: root.path(),
            base: fromdir.path(),
            path: fromdir.getFile("helloworld.js").path(),
            contents: junkBuffer
        });
    };

    const makeStreamFile = () => new File({
        cwd: root.path(),
        base: fromdir.path(),
        path: fromdir.getFile("helloworld.js").path(),
        contents: new Readable()
    });

    const makeFileWithInlineSourceMap = () => new File({
        cwd: root.path(),
        base: fromdir.path(),
        path: fromdir.getFile("all.js").path(),
        contents: Buffer.from("console.log(\"line 1.1\"),console.log(\"line 1.2\"),console.log(\"line 2.1\"),console.log(\"line 2.2\");\n//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWxsLmpzIiwic291cmNlcyI6WyJ0ZXN0MS5qcyIsInRlc3QyLmpzIl0sIm5hbWVzIjpbImNvbnNvbGUiLCJsb2ciXSwibWFwcGluZ3MiOiJBQUFBQSxRQUFBQyxJQUFBLFlBQ0FELFFBQUFDLElBQUEsWUNEQUQsUUFBQUMsSUFBQSxZQUNBRCxRQUFBQyxJQUFBIiwic291cmNlc0NvbnRlbnQiOlsiY29uc29sZS5sb2coJ2xpbmUgMS4xJyk7XG5jb25zb2xlLmxvZygnbGluZSAxLjInKTtcbiIsImNvbnNvbGUubG9nKCdsaW5lIDIuMScpO1xuY29uc29sZS5sb2coJ2xpbmUgMi4yJyk7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9")
    });

    const makeFileCSS = () => new File({
        cwd: root.path(),
        base: fromdir.path(),
        path: fromdir.getFile("test.css").path(),
        contents: Buffer.from(sourceContentCSS)
    });

    before(async () => {
        root = await adone.fs.Directory.createTmp();
        fromdir = await root.addDirectory("from");
        await generateFixtures(fromdir);
        sourceContent = await fromdir.getFile("helloworld.js").contents();
    });

    after(async () => {
        await root.unlink();
    });

    it("should emit an error if file content is a stream", async () => {
        await assert.throws(async () => {
            await new Stream([makeStreamFile()]).sourcemapsInit();
        });
    });

    it("should pass through when file is null", async () => {
        const file = new File();
        const [data] = await new Stream([file]).sourcemapsInit();
        expect(data).to.be.ok();
        expect(data).to.be.instanceof(File);
        expect(data.sourceMap).not.to.be.ok();
        expect(data).to.be.deep.equal(file);
    });

    it("should add an empty source map", async () => {
        const [data] = await new Stream([makeFile()]).sourcemapsInit();
        expect(data).to.be.ok();
        expect(data).to.be.ok();
        expect(data instanceof File).to.be.ok();
        expect(data.sourceMap).to.be.ok();
        expect(String(data.sourceMap.version)).to.be.equal("3");
        expect(data.sourceMap.sources[0]).to.be.equal("helloworld.js");
        expect(data.sourceMap.sourcesContent[0]).to.be.equal(sourceContent);
        expect(data.sourceMap.names).to.be.deep.equal([]);
        expect(data.sourceMap.mappings).to.be.equal("");
    });

    it("should add a valid source map if wished", async () => {
        const [data] = await new Stream([makeFile()]).sourcemapsInit({ identityMap: true });
        expect(data).to.be.ok();
        expect(data instanceof File).to.be.ok();
        expect(data.sourceMap).to.be.ok();
        expect(String(data.sourceMap.version)).to.be.equal("3");
        expect(data.sourceMap.sources[0]).to.be.equal("helloworld.js");
        expect(data.sourceMap.sourcesContent[0]).to.be.equal(sourceContent);
        expect(data.sourceMap.names).to.be.deep.equal([
            "helloWorld", "console", "log"
        ]);
        expect(data.sourceMap.mappings, "AAAA,YAAY;;AAEZ,SAASA,UAAU,CAAC,EAAE;IAClBC,OAAO,CAACC,GAAG,CAAC,cAAc).to.be.equal(CAAC;AAC/B");
    });

    it.skip("should add a valid source map for css if wished", (done) => {
        const pipeline = sourcemapsInit({ identityMap: true });
        pipeline.on("data", (data) => {
            expect(data).to.be.ok();
            expect(data instanceof File).to.be.ok();
            expect(data.sourceMap).to.be.ok();
            expect(String(data.sourceMap.version)).to.be.equal("3");
            expect(data.sourceMap.sources[0]).to.be.equal("test.css");
            expect(data.sourceMap.sourcesContent[0]).to.be.equal(sourceContentCSS);
            expect(data.sourceMap.names).to.be.deep.equal([]);
            expect(data.sourceMap.mappings).to.be.equal("CAAC;GACE;GACA");
            done();
        }).on("error", (error) => {
            done(error);
        }).resume().write(makeFileCSS());
    });

    it("should import an existing inline source map", async () => {
        const [data] = await new Stream([makeFileWithInlineSourceMap()]).sourcemapsInit({ loadMaps: true });
        expect(data).to.be.ok();
        expect(data instanceof File).to.be.ok();
        expect(data.sourceMap).to.be.ok();
        expect(/sourceMappingURL/.test(data.contents.toString())).to.be.false();
        expect(String(data.sourceMap.version)).to.be.equal("3");
        expect(data.sourceMap.sources).to.be.deep.equal([
            "test1.js", "test2.js"
        ]);
        expect(data.sourceMap.sourcesContent).to.be.deep.equal([
            "console.log('line 1.1');\nconsole.log('line 1.2');\n", "console.log('line 2.1');\nconsole.log('line 2.2');"
        ], "should have right sourcesContent");
        expect(data.sourceMap.mappings, "AAAAA,QAAAC,IAAA,YACAD,QAAAC,IAAA,YCDAD,QAAAC,IAAA,YACAD,QAAAC).to.be.equal(IAAA");
    });

    it("should load external source map file referenced in comment with the //# syntax", async () => {
        const file = makeFile();
        file.contents = Buffer.from(`${sourceContent}\n//# ${"sourceMappingURL"}=helloworld2.js.map`);
        const [data] = await new Stream([file]).sourcemapsInit({ loadMaps: true });
        expect(data.sourceMap).to.be.ok();
        expect(String(data.sourceMap.version)).to.be.equal("3");
        expect(data.sourceMap.sources).to.be.deep.equal(["helloworld2.js"]);
        expect(data.sourceMap.sourcesContent).to.be.deep.equal(["source content from source map"]);
        expect(data.sourceMap.mappings).to.be.equal("");
    });

    it("should remove source map comment with the //# syntax", async () => {
        const file = makeFile();
        file.contents = Buffer.from(`${sourceContent}\n//# ${"sourceMappingURL"}=helloworld2.js.map`);

        const [data] = await new Stream([file]).sourcemapsInit({ loadMaps: true });
        expect(/sourceMappingURL/.test(data.contents.toString())).to.be.false();
    });

    it("should load external source map file referenced in comment with the /*# */ syntax", async () => {
        const file = makeFile();
        file.contents = Buffer.from(`${sourceContent}\n/*# ${"sourceMappingURL"}=helloworld2.js.map */`);

        const [data] = await new Stream([file]).sourcemapsInit({ loadMaps: true });
        expect(data.sourceMap).to.be.ok();
        expect(String(data.sourceMap.version)).to.be.equal("3");
        expect(data.sourceMap.sources).to.be.deep.equal(["helloworld2.js"]);
        expect(data.sourceMap.sourcesContent).to.be.deep.equal(["source content from source map"]);
        expect(data.sourceMap.mappings).to.be.equal("");
    });

    it("should remove source map comment with the //# syntax", async () => {
        const file = makeFile();
        file.contents = Buffer.from(`${sourceContent}\n/*# ${"sourceMappingURL"}=helloworld2.js.map */`);

        const [data] = await new Stream([file]).sourcemapsInit({ loadMaps: true });
        expect(/sourceMappingURL/.test(data.contents.toString())).to.be.false();
    });

    it("should load external source map if no source mapping comment", async () => {
        const file = makeFile();
        file.path = file.path.replace("helloworld.js", "helloworld2.js");

        const [data] = await new Stream([file]).sourcemapsInit({ loadMaps: true });
        expect(data.sourceMap).to.be.ok();
        expect(String(data.sourceMap.version)).to.be.equal("3");
        expect(data.sourceMap.sources).to.be.deep.equal(["helloworld2.js"]);
        expect(data.sourceMap.sourcesContent).to.be.deep.equal(["source content from source map"]);
        expect(data.sourceMap.mappings).to.be.equal("");
    });

    it("should load external source map and add sourceContent if missing", async () => {
        const file = makeFile();
        file.contents = Buffer.from(`${sourceContent}\n//# ${"sourceMappingURL"}=helloworld3.js.map`);

        const [data] = await new Stream([file]).sourcemapsInit({ loadMaps: true });
        expect(data.sourceMap).to.be.ok();
        expect(String(data.sourceMap.version)).to.be.equal("3");
        expect(data.sourceMap.sources).to.be.deep.equal([
            "helloworld.js", "test1.js"
        ], "should have right sources");
        expect(data.sourceMap.sourcesContent).to.be.deep.equal([
            file.contents.toString(), "test1"
        ], "should have right sourcesContent");
        expect(data.sourceMap.mappings).to.be.equal("");
    });

    it("should not throw when source file for sourceContent not found", async () => {
        const file = makeFile();
        file.contents = Buffer.from(`${sourceContent}\n//# ${"sourceMappingURL"}=helloworld4.js.map`);

        const [data] = await new Stream([file]).sourcemapsInit({ loadMaps: true });
        expect(data.sourceMap).to.be.ok();
        expect(String(data.sourceMap.version)).to.be.equal("3");
        expect(data.sourceMap.sources).to.be.deep.equal([
            "helloworld.js", "missingfile"
        ], "should have right sources");
        expect(data.sourceMap.sourcesContent).to.be.deep.equal([
            file.contents.toString(), null
        ], "should have right sourcesContent");
        expect(data.sourceMap.mappings).to.be.equal("");
    });


    it("should use unix style paths in sourcemap", async () => {
        const file = makeFile();
        file.base = file.cwd;

        const [data] = await new Stream([file]).sourcemapsInit();
        expect(data.sourceMap.file).to.be.equal("from/helloworld.js");
        expect(data.sourceMap.sources).to.be.deep.equal(["from/helloworld.js"]);
    });

    it("should use sourceRoot when resolving path to sources", async () => {
        const file = makeFile();
        file.contents = Buffer.from(`${sourceContent}\n//# ${"sourceMappingURL"}=helloworld5.js.map`);

        const [data] = await new Stream([file]).sourcemapsInit({ loadMaps: true });
        expect(data.sourceMap).to.be.ok();
        expect(String(data.sourceMap.version)).to.be.equal("3");
        expect(data.sourceMap.sources).to.be.deep.equal([
            "../helloworld.js", "../test1.js"
        ], "should have right sources");
        expect(data.sourceMap.sourcesContent).to.be.deep.equal([
            file.contents.toString(), "test1"
        ], "should have right sourcesContent");
        expect(data.sourceMap.mappings).to.be.equal("");
        expect(data.sourceMap.sourceRoot).to.be.equal("test");
    });

    it("should not load source content if the path is a url", async () => {
        const file = makeFile();
        file.contents = Buffer.from(`${sourceContent}\n//# ${"sourceMappingURL"}=helloworld6.js.map`);

        const [data] = await new Stream([file]).sourcemapsInit({ loadMaps: true });
        expect(data.sourceMap).to.be.ok();
        expect(String(data.sourceMap.version)).to.be.equal("3");
        expect(data.sourceMap.sources).to.be.deep.equal([
            "helloworld.js", "http://example2.com/test1.js"
        ], "should have right sources");
        expect(data.sourceMap.sourcesContent).to.be.deep.equal([null, null]);
        expect(data.sourceMap.mappings).to.be.equal("");
    });

    it("should pass through when file already has a source map", async () => {
        const sourceMap = {
            version: 3,
            names: [],
            mappings: "",
            sources: ["test.js"],
            sourcesContent: ["testContent"]
        };

        const file = makeFile();
        file.sourceMap = sourceMap;
        const [data] = await new Stream([file]).sourcemapsInit({ loadMaps: true });
        expect(data).to.be.ok();
        expect(data instanceof File).to.be.ok();
        expect(data.sourceMap).to.be.equal(sourceMap);
        expect(data).to.be.deep.equal(file);
    });

    it("handle null contents", async () => {
        const [data] = await new Stream([makeNullFile()]).sourcemapsInit({ addComment: true });
        expect(data).to.be.ok();
        expect(data instanceof File).to.be.ok();
        expect(data.sourceMap).to.be.ok();
        expect(String(data.sourceMap.version)).to.be.equal("3");
        expect(data.sourceMap.sources[0]).to.be.equal("helloworld.js");
        expect(data.sourceMap.sourcesContent[0]).to.be.equal(null);
        expect(data.sourceMap.names).to.be.deep.equal([]);
        expect(data.sourceMap.mappings).to.be.equal("");
    });
});
