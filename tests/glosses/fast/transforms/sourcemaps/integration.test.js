import generateFixtures from "./generate_fixtures";

describe("fast", "transform", "sourcemaps", "integration", () => {
    const { fast } = adone;

    let sourceContent;
    let root;
    let fromdir;

    const base64JSON = (object) => {
        return `data:application/json;charset=utf8;base64,${Buffer.from(JSON.stringify(object)).toString("base64")}`;
    };

    before(async () => {
        root = await adone.fs.Directory.createTmp();
        fromdir = await root.addDirectory("from");
        await generateFixtures(fromdir);
        sourceContent = await fromdir.getFile("helloworld.js").contents();
    });

    after(async () => {
        await root.unlink();
    });

    it("creates inline mapping", async () => {
        await fast.src(fromdir.getFile("helloworld.js").path())
            .sourcemapsInit()
            .sourcemapsWrite()
            .map((data) => {
                expect(data.sourceMap).to.be.ok;
                expect(data.contents.toString()).to.be.equal(
                    `${sourceContent}\n//# ${"sourceMappingURL"}=${base64JSON(data.sourceMap)}\n`,
                    "file should be sourcemapped"
                );
            });
    });

    it("creates preExistingComment , no new previous line", async () => {
        await fast.src(fromdir.getFile("helloworld.map.js").path())
            .sourcemapsInit({ loadMaps: true })
            .sourcemapsWrite()
            .map((data) => {
                expect(data.sourceMap).to.be.ok;
                expect(Boolean(data.sourceMap.preExistingComment)).to.be.true;
                expect(data.contents.toString()).to.be.equal(
                    data.contents.toString(),
                    `${sourceContent}\n//# ${"sourceMappingURL"}=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJoZWxsb3dvcmxkLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gaGVsbG9Xb3JsZCgpIHtcbiAgICBjb25zb2xlLmxvZygnSGVsbG8gd29ybGQhJyk7XG59XG4iXSwiZmlsZSI6ImhlbGxvd29ybGQuanMifQ==`,
                    "file should be sourcemapped"
                );
            });
    });

    it("concat files with final combined sourcemap file", async () => {
        await fast.src([
            fromdir.getFile("*").path(),
            `!${fromdir.getFile("test*.js").path()}`,
            `!${fromdir.getFile("*map.js").path()}`
        ])
            .sourcemapsInit()
            .if((file) => file.extname === ".js", fast.transform.concat("index.js"))
            .sourcemapsWrite(".", { sourceRoot: "../from" })
            .dest(root.getDirectory("to").path(), { produceFiles: true })
            .map((data) => {
                if (/index\.js$/.test(data.path)) {
                    expect(/\/\/# sourceMappingURL=index.js.map/.test(data.contents.toString())).to.be.true;
                    expect(data.contents.toString().match(/\/\/# sourceMappingURL/g).length).to.be.equal(1);
                }
            });
    });


    it("inline concatenated file", async () => {
        await fast.src([
            fromdir.getFile("*").path(),
            `!${fromdir.getFile("test*.js").path()}`,
            `!${fromdir.getFile("*map.js").path()}`
        ])
            .sourcemapsInit()
            .if((file) => file.extname === ".js", fast.transform.concat("index.js"))
            .sourcemapsWrite({ sourceRoot: "../from" })
            .dest(root.getDirectory("to").path(), { produceFiles: true })
            .map((data) => {
                if (/index\.js$/.test(data.path)) {
                    expect(/\/\/# sourceMappingURL=data:application.*/.test(data.contents.toString())).to.be.ok;
                    expect(data.contents.toString().match(/\/\/# sourceMappingURL/g).length).to.be.equal(1);
                }
            });
    });

    it("mapped preExisting", async () => {

        await fast.src([
            //picking a file with no existing sourcemap, if we use helloworld2 it will attempt to use helloworld2.js.map
            fromdir.getFile("helloworld7.js").path(),  //NO PRE-MAP at all
            fromdir.getFile("helloworld.map.js").path()  //INLINE PRE-MAp
        ])
            .sourcemapsInit({ loadMaps: true })
            .if((file) => file.extname === ".js", fast.transform.concat("index.js"))
            .sourcemapsWrite(".", { sourceRoot: "../from" })
            .dest(root.getDirectory("to").path(), { produceFiles: true })
            .map((data) => {
                if (/index\.js$/.test(data.path)) {
                    expect(/\/\/# sourceMappingURL=index.js.map/.test(data.contents.toString())).to.be.ok;
                    expect(data.contents.toString().match(/\/\/# sourceMappingURL/g).length).to.be.equal(1);
                }
            });
    });

    it("inlined preExisting", async () => {
        await fast.src([
            //picking a file with no existing sourcemap, if we use helloworld2 it will attempt to use helloworld2.js.map
            fromdir.getFile("helloworld7.js").path(),  //NO PRE-MAP at all
            fromdir.getFile("helloworld.map.js").path()  //INLINE PRE-MAp
        ])
            .sourcemapsInit({ loadMaps: true })
            .if((file) => file.extname === ".js", fast.transform.concat("index.js"))
            .sourcemapsWrite({ sourceRoot: "../from" })
            .dest(root.getDirectory("to").path(), { produceFiles: true })
            .map((data) => {
                if (/index\.js$/.test(data.path)) {
                    expect(/\/\/# sourceMappingURL=data:application.*/.test(data.contents.toString())).to.be.true;
                    expect(data.contents.toString().match(/\/\/# sourceMappingURL/g).length).to.be.equal(1);
                }
            });
    });

    it("mapped preExisting with two tasks", async () => {
        await fast.src(fromdir.getFile("helloworld7.js").path())
            .sourcemapsInit()
            .if((file) => file.extname === ".js", fast.transform.concat("h7.js"))
            .sourcemapsWrite(".")
            .dest(root.getDirectory("to", "tmp").path());

        await fast.src([
            root.getFile("to", "tmp", "h7.js").path(),
            fromdir.getFile("helloworld.map.js").path()
        ])
            .sourcemapsInit({ loadMaps: true })
            .if((file) => file.extname === ".js", fast.transform.concat("index.js"))
            .sourcemapsWrite(".", { sourceRoot: "../from" })
            .dest(root.getDirectory("to").path(), { produceFiles: true })
            .map((data) => {
                if (/index\.js$/.test(data.path)) {
                    expect(/\/\/# sourceMappingURL=index.js.map/.test(data.contents.toString())).to.be.true;
                    expect(data.contents.toString().match(/\/\/# sourceMappingURL/g).length).to.be.equal(1);
                }
            });
    });

    it("should be valid with concat", async () => {
        const files = await fast.src(fromdir.getFile("test{3,4}.js").path())
            .sourcemapsInit()
            .concat("index.js")
            .sourcemapsWrite(".")
            .on("data", (file) => {
                if (!/.*\.map/.test(file.path)) {
                    return;
                }
                const contents = JSON.parse(file.contents.toString());
                expect(contents.sources.sort()).to.be.deep.equal(["test3.js", "test4.js"]);
            });
        expect(files).to.have.lengthOf(2);  // index + map
    });

    it("should be valid with concat and mapSourcesAbsolute=true", async () => {
        const files = await fast.src(fromdir.getFile("test{3,4}.js").path())
            .sourcemapsInit()
            .concat("index.js")
            .sourcemapsWrite(".", { mapSourcesAbsolute: true })
            .on("data", (file) => {
                if (!/.*\.map/.test(file.path)) {
                    return;
                }
                const contents = JSON.parse(file.contents.toString());
                expect(contents.sources.sort()).to.be.deep.equal([
                    fromdir.getFile("test3.js").path().replace(/\\/g, "/"),
                    fromdir.getFile("test4.js").path().replace(/\\/g, "/")
                ]);
            });
        expect(files).to.have.lengthOf(2);  // index + map
    });
});
