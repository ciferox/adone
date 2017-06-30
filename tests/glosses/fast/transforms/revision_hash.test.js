describe("fast", "transform", "revision hash", () => {
    const { fast, std: { path } } = adone;

    let fromdir;
    let root;
    let srcPath;

    before(async () => {
        root = await adone.fs.Directory.createTmp();
    });

    after(async () => {
        await root.unlink();
    });

    beforeEach(async () => {
        fromdir = await root.addDirectory("from");
        srcPath = path.join(fromdir.path(), "**", "*");
    });

    afterEach(async () => {
        await root.clean();
    });

    it("should rev files", async () => {
        await fromdir.addFile("hello.css");
        await fast.src(srcPath).revisionHash().map((file) => {
            expect(file.relative).to.be.equal("hello-d41d8cd98f.css");
            expect(file.revOrigPath).to.be.equal(fromdir.getVirtualFile("hello.css").path());
        });
    });

    it("should add the revision hash before the first `.` in the filename", async () => {
        await fromdir.addFile("hello.css.map");
        await fast.src(srcPath).revisionHash().map((file) => {
            expect(file.relative).to.be.equal("hello-d41d8cd98f.css.map");
            expect(file.revOrigPath).to.be.equal(fromdir.getVirtualFile("hello.css.map").path());
        });
    });

    it("should build a rev manifest file", async () => {
        await fromdir.addFile("hello-d41d8cd98f.css");
        await fast.src(srcPath).map((file) => {
            file.revOrigPath = "hello.css";
            return file;
        }).revisionHash({ manifest: true }).map((file) => {
            expect(file.relative).to.be.equal("rev-manifest.json");
            expect(JSON.parse(file.contents.toString())).to.be.deep.equal({ "hello.css": "hello-d41d8cd98f.css" });
        });
    });

    it("should allow naming the manifest file", async () => {
        await fromdir.addFile("hello-d41d8cd98f.css");
        await fast.src(srcPath).map((file) => {
            file.revOrigPath = "hello.css";
            return file;
        }).revisionHash({ manifest: { path: "manifest.json" } }).map((file) => {
            expect(file.relative).to.be.equal("manifest.json");
        });
    });

    it("should append to an existing rev manifest file", async () => {
        const m = await FS.createTempFile();
        await m.write("{ \"app.js\": \"app-a41d8cd1.js\", \"hello.css\": \"hello-d41d8cd98f.css\" }");
        await fromdir.addFile("hello-d41d8cd98f.css");

        await fast.src(srcPath).map((file) => {
            file.revOrigPath = "hello.css";
            return file;
        }).revisionHash({ manifest: { path: m.path(), merge: true } }).map((file) => {
            expect(file.basename).to.be.equal(m.filename());
            expect(JSON.parse(file.contents.toString())).to.be.deep.equal({ "app.js": "app-a41d8cd1.js", "hello.css": "hello-d41d8cd98f.css" });
        });
    });

    it("should not append to an existing rev manifest by default", async () => {
        const m = await FS.createTempFile();
        await m.write("{ \"app.js\": \"app-a41d8cd1.js\", \"hello.css\": \"hello-d41d8cd98f.css\" }");
        await fromdir.addFile("hello-d41d8cd98f.css");

        await fast.src(srcPath).map((file) => {
            file.revOrigPath = "hello.css";
            return file;
        }).revisionHash({ manifest: { path: m.path() } }).map((file) => {
            expect(file.basename).to.be.equal(m.filename());
            expect(JSON.parse(file.contents.toString())).to.be.deep.equal({ "hello.css": "hello-d41d8cd98f.css" });
        });
    });

    it("should sort the rev manifest keys", async () => {
        const m = await FS.createTempFile();
        await m.write("{ \"app.js\": \"app-a41d8cd1.js\", \"hello.css\": \"hello-d41d8cd98f.css\" }");
        await fromdir.addFile("bombaleilo-d41d8cd98f.css");
        await fromdir.addFile("hello-d41d8cd98f.css");

        await fast.src(srcPath).map((file) => {
            if (file.basename === "bombaleilo-d41d8cd98f.css") {
                file.revOrigPath = "bombaleilo.css";
            } else {
                file.revOrigPath = "hello.css";
            }
            return file;
        }).revisionHash({ manifest: { path: m.path(), merge: true } }).map((file) => {
            expect(Object.keys(JSON.parse(file.contents.toString()))).to.be.deep.equal(["app.js", "bombaleilo.css", "hello.css"]);
        });
    });

    it("should respect directories", async () => {
        await fromdir.addFile("foo", "hello-d41d8cd98f.css");
        await fromdir.addFile("bar", "bombaleilo-d41d8cd98f.css");

        await fast.src(srcPath).map((file) => {
            if (file.basename.startsWith("hello")) {
                file.revOrigBase = fromdir.path();
                file.revOrigPath = fromdir.getVirtualFile("foo", "hello.css").path();
                file.origName = "hello.css";
                file.revname = "hello-d41d8cd98f.css";
            } else {
                file.revOrigBase = fromdir.path();
                file.revOrigPath = fromdir.getVirtualFile("bar", "bombaleilo.css").path();
                file.origName = "bombaleilo.css";
                file.revName = "bombaleilo-d41d8cd98f.css";
            }
            return file;
        }).revisionHash({ manifest: true }).map((file) => {
            const MANIFEST = {};
            MANIFEST["foo/hello.css"] = "foo/hello-d41d8cd98f.css";
            MANIFEST["bar/bombaleilo.css"] = "bar/bombaleilo-d41d8cd98f.css";

            expect(file.relative).to.be.equal("rev-manifest.json");
            expect(JSON.parse(file.contents.toString())).to.be.deep.equal(MANIFEST);
        });
    });

    it("should respect files coming from directories with different bases", async () => {
        await fromdir.addFile("foo", "scriptfoo-d41d8cd98f.js");
        await fromdir.addFile("bar", "scriptbar-d41d8cd98f.js");

        await fast.src(srcPath).map((file) => {
            if (file.basename.startsWith("scriptfoo")) {
                file.revOrigBase = fromdir.getVirtualFile("vendor1").path();
                file.revOrigPath = fromdir.getVirtualFile("vendor1", "foo", "scriptfoo.js").path();
                file.origName = "scriptfoo.js";
                file.revName = "scriptfoo-d41d8cd98f.js";
            } else {
                file.revOrigBase = fromdir.getVirtualFile("vendor1").path();
                file.revOrigPath = fromdir.getVirtualFile("vendor1", "bar", "scriptbar.js").path();
                file.origName = "scriptbar.js";
                file.revName = "scriptbar-d41d8cd98f.js";
            }
            return file;
        }).revisionHash({ manifest: true }).map((file) => {
            const MANIFEST = {};
            MANIFEST["foo/scriptfoo.js"] = "foo/scriptfoo-d41d8cd98f.js";
            MANIFEST["bar/scriptbar.js"] = "bar/scriptbar-d41d8cd98f.js";

            expect(file.basename).to.be.equal("rev-manifest.json");
            expect(JSON.parse(file.contents.toString())).to.be.deep.equal(MANIFEST);
        });
    });

    it("should store the hashes for later", async () => {
        await fromdir.addFile("hello.css");
        await fast.src(srcPath).revisionHash().map((file) => {
            expect(file.basename).to.be.equal("hello-d41d8cd98f.css");
            expect(file.revOrigPath).to.be.equal(fromdir.getVirtualFile("hello.css").path());
            expect(file.revHash).to.be.equal("d41d8cd98f");
        });
    });

    it("should handle sourcemaps transparently", async () => {
        await fromdir.addFile("hello.css");
        await fromdir.addFile("maps", "hello.css.map", {
            content: Buffer.from(JSON.stringify({ file: "../hello.css" }))
        });

        await fast.src(srcPath).revisionHash().map((file) => {
            if (file.extname === ".map") {
                expect(file.relative).to.be.equal("maps/hello-d41d8cd98f.css.map".split("/").join(path.sep));
            }
        });
    });

    it("should handle unparseable sourcemaps correctly", async () => {
        await fromdir.addFile("hello.css");
        await fromdir.addFile("hello.css.map", {
            content: "Not a valid JSON!"
        });

        await fast.src(srcPath).revisionHash().map((file) => {
            if (file.extname === ".map") {
                expect(file.relative).to.be.equal("hello-d41d8cd98f.css.map");
            }
        });
    });

    it("should be okay when the optional sourcemap.file is not defined", async () => {
        await fromdir.addFile("hello.css");
        await fromdir.addFile("hello.css.map", {
            content: Buffer.from("{}")
        });

        await fast.src(srcPath).revisionHash().map((file) => {
            if (file.extname === ".map") {
                expect(file.relative).to.be.equal("hello-d41d8cd98f.css.map");
            }
        });
    });

    it("should handle a . in the folder name", async () => {
        await fromdir.addFile("hello.com", "hello.css");

        await fast.src(srcPath).revisionHash().map((file) => {
            expect(file.relative).to.be.equal("hello.com/hello-d41d8cd98f.css".split("/").join(path.sep));
            expect(file.revOrigPath).to.be.equal(fromdir.getVirtualFile("hello.com", "hello.css").path());
        });
    });

    it("should use correct base path for each file", async () => {
        await fromdir.addFile("app", "foo", "scriptfoo-d41d8cd98f.js");
        await fromdir.addFile("assets", "bar", "scriptbar-d41d8cd98f.js");

        await fast.src([
            fromdir.getVirtualDirectory("app", "**", "*").path(),
            fromdir.getVirtualDirectory("assets", "**", "*").path()
        ]).map((file) => {
            if (file.basename.startsWith("scriptfoo")) {
                file.revOrigPath = "scriptfoo.js";
            } else {
                file.revOrigPath = "scriptbar.js";
            }
            return file;
        }).revisionHash({ manifest: true }).map((file) => {
            const MANIFEST = {};
            MANIFEST["foo/scriptfoo.js"] = "foo/scriptfoo-d41d8cd98f.js";
            MANIFEST["bar/scriptbar.js"] = "bar/scriptbar-d41d8cd98f.js";

            expect(JSON.parse(file.contents.toString())).to.be.deep.equal(MANIFEST);
        });
    });
});
