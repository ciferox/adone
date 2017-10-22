describe("fast", "transform", "rename", () => {
    const { is, fast, std: { path } } = adone;

    let fromdir;
    let todir;
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
        todir = await root.addDirectory("to");
        srcPath = path.join(fromdir.path(), "**", "test.js");
    });

    afterEach(async () => {
        await root.clean();
    });

    context("with string argument", () => {
        context("with src pattern does not contain directory glob", () => {
            it("should set the value", async () => {
                const file = await fromdir.addFile("test.js");
                await fast.src(file.path()).rename("test2.js").dest(todir.path());
                const file2 = await todir.getFile("test2.js");
                expect(await file2.exists()).to.be.true;
            });
        });

        context("with src pattern contains directory glob", () => {
            it("set relative path to value", async () => {
                await fromdir.addFile("some", "directory", "a", "b", "c", "fff.js");
                await fast.src(path.join(fromdir.path(), "**", "fff.js")).rename("mooove/fff.js").dest(todir.path());
                const file2 = todir.getFile("mooove", "fff.js");
                expect(await file2.exists()).to.be.true;
            });
        });
    });

    context("with object argument", () => {
        let srcPath;

        beforeEach(async () => {
            srcPath = path.join(fromdir.path(), "**", "test.js");
        });

        context("with empty object", () => {
            it("has no effect", async () => {
                await fromdir.addFile("test.js");
                await fast.src(srcPath).rename({}).dest(todir.path());
                expect(await todir.getFile("test.js").exists()).to.be.true;
            });
        });

        context("with dirname value", () => {
            it("replaces dirname with value", async () => {
                await fromdir.addFile("test.js");
                await fast.src(srcPath).rename({ dirname: "hello" }).dest(todir.path());
                expect(await todir.getFile("hello", "test.js").exists()).to.be.true;
            });

            it("removes dirname with \'./\'", async () => {
                await fromdir.addFile("test.js");
                await fast.src(srcPath).rename({ dirname: "./" }).dest(todir.path());
                expect(await todir.getFile("test.js").exists()).to.be.true;
            });

            it("removes dirname with empty string", async () => {
                await fromdir.addFile("hello", "test.js");
                await fast.src(srcPath).rename({ dirname: "" }).dest(todir.path());
                expect(await todir.getFile("test.js").exists()).to.be.true;
            });
        });

        context("with prefix value", () => {
            it("prepends value to basename", async () => {
                await fromdir.addFile("test.js");
                await fast.src(srcPath).rename({ prefix: "hey-" }).dest(todir.path());
                expect(await todir.getFile("hey-test.js").exists()).to.be.true;
            });
        });

        context("with basename value'", () => {
            it("replaces basename with value", async () => {
                await fromdir.addFile("test.js");
                await fast.src(srcPath).rename({ basename: "hey-test" }).dest(todir.path());
                expect(await todir.getFile("hey-test.js").exists()).to.be.true;
            });

            it("removes basename with empty string (for consistency)", async () => {
                await fromdir.addFile("test.js");
                await fast.src(srcPath).rename({ basename: "", prefix: "hey-test" }).dest(todir.path());
                expect(await todir.getFile("hey-test.js").exists()).to.be.true;
            });
        });

        context("with suffix value", () => {
            it("appends value to basename", async () => {
                await fromdir.addFile("test.js");
                await fast.src(srcPath).rename({ suffix: "-test" }).dest(todir.path());
                expect(await todir.getFile("test-test.js").exists()).to.be.true;
            });
        });

        context("with extname value", () => {
            it("replaces extname with value", async () => {
                await fromdir.addFile("test.js");
                await fast.src(srcPath).rename({ extname: ".md" }).dest(todir.path());
                expect(await todir.getFile("test.md").exists()).to.be.true;
            });

            it("removes extname with empty string", async () => {
                await fromdir.addFile("test.js");
                await fast.src(srcPath).rename({ extname: "" }).dest(todir.path());
                expect(await todir.getFile("test").exists()).to.be.true;
            });
        });
    });

    context("with function parameter", () => {
        it("receives object with dirname", async () => {
            await fromdir.addFile("yeah", "test.js");
            await fast.src(srcPath).rename((p) => {
                expect(p.dirname).to.be.equal("yeah");
                p.dirname = "otherside";
            }).dest(todir.path());
            expect(await todir.getFile("otherside", "test.js").exists()).to.be.true;
        });

        it("receives object with basename", async () => {
            await fromdir.addFile("yeah", "test.js");
            await fast.src(srcPath).rename((p) => {
                expect(p.basename).to.be.equal("test");
                p.basename = "test-test";
            }).dest(todir.path());
            expect(await todir.getFile("yeah", "test-test.js").exists()).to.be.true;
        });

        it("receives object with extname", async () => {
            await fromdir.addFile("yeah", "test.js");
            await fast.src(srcPath).rename((p) => {
                expect(p.extname).to.be.equal(".js");
                p.extname = ".md";
            }).dest(todir.path());
            expect(await todir.getFile("yeah", "test.md").exists()).to.be.true;
        });

        it("ignores the return value", async () => {
            await fromdir.addFile("yeah", "test.js");
            await fast.src(srcPath).rename(() => {
                return { extname: ".rb", basename: "another", dirname: "." };
            }).dest(todir.path());
            expect(await todir.getFile("yeah", "test.js").exists()).to.be.true;
        });

        it("receives object with extname even if a different value is returned", async () => {

        });
    });

    context("throws unsupported parameter type", () => {
        const err = adone.x.InvalidArgument;

        for (const obj of [undefined, null, "", true, 1]) {
            it(`with ${is.null(obj) ? "null" : typeof obj}`, async () => {
                await fromdir.addFile("test.js");
                const e = await fast.src(srcPath).rename(obj).dest(todir.path()).then(() => null, (e) => e);
                expect(e).to.be.instanceOf(err);
            });
        }
    });

    context("when file has source map", () => {
        it("updates source map file to match relative path of renamed file", async () => {
            await fromdir.addFile("test.js");

            const files = await fast.src(srcPath).sourcemapsInit().rename({ prefix: "test-" }).rename({ prefix: "test-" });
            expect(files).to.have.lengthOf(1);
            expect(files[0].sourceMap.file).to.be.equal("test-test-test.js");
        });
    });
});
