describe("fast", "transform", "concat", () => {
    const { fast, std: { path }, error } = adone;
    const { File, Stream } = fast;

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
        srcPath = path.join(fromdir.path(), "**", "*");
    });

    afterEach(async () => {
        await root.clean();
    });

    it("should throw, when arguments is missing", async () => {
        let err;
        try {
            fast.src("").concat();
        } catch (_err) {
            err = _err;
        }
        expect(err).to.be.instanceOf(adone.error.InvalidArgument);
    });

    it("should ignore null files", async () => {
        const values = await new Stream([new File()]).concat("test");
        expect(values).to.be.empty();
    });

    it("should emit error on streamed file", async () => {
        const file = await fromdir.addFile("test.js");
        const files = [];
        const e = await fast
            .src(file.path(), { stream: true })
            .map((error) => {
                files.push(error);
                return error;
            })
            .concat("test.js")
            .dest(todir.path(), { produceFiles: true })
            .then(() => null, (e) => e);
        files.map((error) => error.contents.close());
        expect(e).to.be.instanceOf(error.NotSupported);
    });

    it("should concat one file", async () => {
        await fromdir.addFile("test.js", {
            contents: "console.log(123);"
        });
        await fast.src(srcPath).concat("test.js").dest(todir.path());
        const file = todir.getFile("test.js");
        expect(await file.exists()).to.be.true();
        expect(await file.contents()).to.be.equal("console.log(123);");
    });

    it("should concat multiple files", async () => {
        await fromdir.addFile("test.js", {
            contents: "console.log(123);"
        });
        await fromdir.addFile("test2.js", {
            contents: "console.log(456);"
        });
        const files = await fast.src(srcPath).concat("test.js").dest(todir.path(), { produceFiles: true });
        const file = todir.getFile("test.js");
        expect(await file.exists()).to.be.true();
        expect(await file.contents()).to.be.equal(files.map((error) => error.contents.toString()).join("\n"));
    });

    it("should preserve mode from files", async () => {
        await fromdir.addFile("test.js", {
            contents: "consle.log(123);"
        });
        let mode;
        const [file] = await fast.src(srcPath).map((error) => {
            mode = error.stat.mode;
            return error;
        }).concat("test12.js").dest(todir.path(), { produceFiles: true });
        expect(file.stat.mode).to.be.equal(mode);
    });

    it("should take path from latest file", async () => {
        await fromdir.addFile("test.js", {
            contents: "console.log(123);"
        });
        await fromdir.addFile("hello", "test2.js", {
            contents: "console.log(456);"
        });
        await fromdir.addFile("hello", "world", "test3.js", {
            contents: "console.log(789);"
        });
        let latest;
        const [file] = await fast.src(srcPath).map((error) => latest = error).concat("test.js");
        expect(latest.base).to.be.equal(path.dirname(file.path));
    });

    it("should preserve relative path from files", async () => {
        await fromdir.addFile("test.js", {
            contents: "console.log(123);"
        });
        await fromdir.addFile("hello", "test2.js", {
            contents: "console.log(456);"
        });
        const [file] = await fast.src(srcPath).concat("all.js");
        expect(file.relative).to.be.equal("all.js");
    });

    it("should support source maps", async () => {
        await fromdir.addFile("test.js", {
            contents: "console.log(123);"
        });
        await fromdir.addFile("hello", "test2.js", {
            contents: "console.log(456);"
        });

        await fast.src(srcPath)
            .sourcemapsInit()
            .concat("all.js")
            .map((error) => {
                expect(error.sourceMap.sources).to.have.lengthOf(2);
                expect(error.sourceMap.file).to.be.equal("all.js");
            });
    });

    describe("should not fail if there is no files", () => {
        it("when argument is a string", async () => {
            await fast.src(srcPath).concat("test.js").dest(todir.path());
            expect(await todir.find({ files: true, dirs: true })).to.be.empty();
        });

        it("when argument is an object", async () => {
            await fast.src(srcPath).concat({ path: "test" }).dest(todir.path());
            expect(await todir.find({ files: true, dirs: true })).to.be.empty();
        });
    });

    describe("object as argument", () => {
        it("should throw without path", () => {
            let err;
            try {
                new Stream().concat({ path: undefined });
            } catch (_err) {
                err = _err;
            }
            expect(err).to.be.instanceOf(adone.error.InvalidArgument);
        });

        it("should create file based on path property", async () => {
            await fromdir.addFile("test.js", {
                contents: "console.log(123);"
            });
            await fast.src(srcPath).concat({ path: "new.txt" }).dest(todir.path());
            const file = todir.getFile("new.txt");
            expect(await file.exists()).to.be.true();
            expect(await file.contents()).to.be.equal("console.log(123);");
        });

        it("should calculate relative path from cwd and path in arguments", async () => {
            await fromdir.addFile("test.js", {
                contents: "console.log(123);"
            });
            await fast
                .src(srcPath)
                .concat({ cwd: path.normalize("/a/b/c"), path: path.normalize("/a/b/c/d/new.txt") })
                .dest(todir.path());
            const file = todir.getFile("d", "new.txt");
            expect(await file.exists()).to.be.true();
            expect(await file.contents()).to.be.equal("console.log(123);");
        });
    });
});
