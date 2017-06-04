describe("fast", "transforms", "concat", () => {
    const { fast, std: { path }, x } = adone;
    const { File, transform: { concat } } = fast;

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
        expect(err).to.be.instanceOf(adone.x.InvalidArgument);
    });

    it("should ignore null files", async () => {
        const values = [];
        const stream = concat("test.js");
        stream.on("data", (x) => values.push(x));
        stream.write(new File());
        stream.resume();
        await adone.promise.delay(1);
        expect(values).to.be.empty;
    });

    it("should emit error on streamed file", async () => {
        const file = await fromdir.addFile("test.js");
        const files = [];
        const e = await fast
            .src(file.path(), { stream: true })
            .map((x) => {
                files.push(x);
                return x;
            })
            .concat("test.js")
            .dest(todir.path(), { produceFiles: true })
            .then(() => null, (e) => e);
        files.map((x) => x.contents.close());
        expect(e).to.be.instanceOf(x.NotSupported);
    });

    it("should concat one file", async () => {
        await fromdir.addFile("test.js", {
            content: "console.log(123);"
        });
        await fast.src(srcPath).concat("test.js").dest(todir.path());
        const file = todir.getVirtualFile("test.js");
        expect(await file.exists()).to.be.true;
        expect(await file.content()).to.be.equal("console.log(123);");
    });

    it("should concat multiple files", async () => {
        await fromdir.addFile("test.js", {
            content: "console.log(123);"
        });
        await fromdir.addFile("test2.js", {
            content: "console.log(456);"
        });
        const files = await fast.src(srcPath).concat("test.js").dest(todir.path(), { produceFiles: true });
        const file = todir.getVirtualFile("test.js");
        expect(await file.exists()).to.be.true;
        expect(await file.content()).to.be.equal(files.map((x) => x.contents.toString()).join("\n"));
    });

    it("should preserve mode from files", async () => {
        await fromdir.addFile("test.js", {
            content: "consle.log(123);"
        });
        let mode;
        const [file] = await fast.src(srcPath).map((x) => {
            mode = x.stat.mode;
            return x;
        }).concat("test12.js").dest(todir.path(), { produceFiles: true });
        expect(file.stat.mode).to.be.equal(mode);
    });

    it("should take path from latest file", async () => {
        await fromdir.addFile("test.js", {
            content: "console.log(123);"
        });
        await fromdir.addFile("hello", "test2.js", {
            content: "console.log(456);"
        });
        await fromdir.addFile("hello", "world", "test3.js", {
            content: "console.log(789);"
        });
        let latest;
        const [file] = await fast.src(srcPath).map((x) => latest = x).concat("test.js");
        expect(latest.base).to.be.equal(path.dirname(file.path));
    });

    it("should preserve relative path from files", async () => {
        await fromdir.addFile("test.js", {
            content: "console.log(123);"
        });
        await fromdir.addFile("hello", "test2.js", {
            content: "console.log(456);"
        });
        const [file] = await fast.src(srcPath).concat("all.js");
        expect(file.relative).to.be.equal("all.js");
    });

    it("should support source maps", async () => {
        await fromdir.addFile("test.js", {
            content: "console.log(123);"
        });
        await fromdir.addFile("hello", "test2.js", {
            content: "console.log(456);"
        });

        await fast.src(srcPath)
            .sourcemapsInit()
            .concat("all.js")
            .map((x) => {
                expect(x.sourceMap.sources).to.have.lengthOf(2);
                expect(x.sourceMap.file).to.be.equal("all.js");
            });
    });

    describe("should not fail if there is no files", () => {
        it("when argument is a string", async () => {
            await fast.src(srcPath).concat("test.js").dest(todir.path());
            expect(await todir.find({ files: true, dirs: true })).to.be.empty;
        });

        it("when argument is an object", async () => {
            await fast.src(srcPath).concat({ path: "test" }).dest(todir.path());
            expect(await todir.find({ files: true, dirs: true })).to.be.empty;
        });
    });

    describe("object as argument", () => {
        it("should throw without path", () => {
            let err;
            try {
                concat({ path: undefined });
            } catch (_err) {
                err = _err;
            }
            expect(err).to.be.instanceOf(adone.x.InvalidArgument);
        });

        it("should create file based on path property", async () => {
            await fromdir.addFile("test.js", {
                content: "console.log(123);"
            });
            await fast.src(srcPath).concat({ path: "new.txt" }).dest(todir.path());
            const file = todir.getVirtualFile("new.txt");
            expect(await file.exists()).to.be.true;
            expect(await file.content()).to.be.equal("console.log(123);");
        });

        it("should calculate relative path from cwd and path in arguments", async () => {
            await fromdir.addFile("test.js", {
                content: "console.log(123);"
            });
            await fast
                .src(srcPath)
                .concat({ cwd: path.normalize("/a/b/c"), path: path.normalize("/a/b/c/d/new.txt") })
                .dest(todir.path());
            const file = todir.getVirtualFile("d", "new.txt");
            expect(await file.exists()).to.be.true;
            expect(await file.content()).to.be.equal("console.log(123);");
        });
    });
});
