describe("fast", () => {
    const { is, fast, fs } = adone;

    /**
     * @type {adone.fs.Directory}
     */
    let tmpdir;

    before(async () => {
        tmpdir = await adone.fs.Directory.createTmp();
    });

    after(async () => {
        await tmpdir.unlink();
    });

    afterEach(async () => {
        await tmpdir.clean();
    });

    it("correct file info", async () => {
        const file = await tmpdir.addFile("in", "transpile.js");
        const files = await fast.src(file.path(), { base: tmpdir.path() });
        expect(files).to.have.lengthOf(1);
        expect(files[0].path).to.be.equal(file.path());
        expect(files[0].relative).to.be.equal(file.relativePath(tmpdir));
        expect(files[0].basename).to.be.equal("transpile.js");
        expect(files[0].extname).to.be.equal(".js");
    });

    it("correct out file", async () => {
        const file0 = await tmpdir.addFile("in", "transpile.js");
        const out = tmpdir.getDirectory("out");
        const files = await fast
            .src(file0.path(), { base: tmpdir.getDirectory("in").path() })
            .dest(out.path(), { produceFiles: true });
        expect(await out.exists()).to.be.true();
        expect(files).to.have.lengthOf(1);
        const file = out.getFile("transpile.js");
        expect(files[0].path).to.be.equal(file.path());
        expect(files[0].relative).to.be.equal(file.relativePath(out));
        expect(files[0].basename).to.be.equal("transpile.js");
        expect(files[0].extname).to.be.equal(".js");
    });

    it("should set correct base", async () => {
        await tmpdir.addFile("in", "nested", "transpile.js");
        const out = tmpdir.getDirectory("out");
        const files = await fast
            .src(tmpdir.getFile("in", "**", "*").path(), { base: tmpdir.getDirectory("in").path() })
            .dest(out.path(), { produceFiles: true });
        const dir = out.getFile("nested");
        const file = out.getFile("nested", "transpile.js");
        expect(files).to.have.lengthOf(2);

        expect(files[0].path).to.be.equal(dir.path());
        expect(files[0].base).to.be.equal(out.path());
        expect(files[0].relative).to.be.equal(dir.relativePath(out));

        expect(files[1].path).to.be.equal(file.path());
        expect(files[1].base).to.be.equal(out.path());
        expect(files[1].relative).to.be.equal(file.relativePath(out));
    });

    it("should be a core stream", () => {
        expect(is.coreStream(fast.src())).to.be.true();
    });

    it("should be a fast stream", () => {
        expect(is.fastStream(fast.src())).to.be.true();
    });

    it("should be a fast local stream", () => {
        expect(is.fastLocalStream(fast.src())).to.be.true();
    });

    describe("directories", () => {
        it("should pass directories", async () => {
            await tmpdir.addDirectory("hello");
            const files = await fast.src(tmpdir.getFile("**", "*"));
            expect(files).to.have.length(1);
            expect(files[0].isDirectory()).to.be.true();
        });

        it("should create an empty directory", async () => {
            await tmpdir.addDirectory("in", "hello");
            await fast
                .src(tmpdir.getFile("in", "**", "*"))
                .dest(tmpdir.getDirectory("out"));
            const out = tmpdir.getDirectory("out");
            const hello = out.getDirectory("hello");
            expect(await hello.exists()).to.be.true();
        });

        it("should create a directory with the origin mode", {
            skip: is.windows
        }, async () => {
            await tmpdir.addDirectory("in", "hello", { mode: 0o700 });
            await fast
                .src(tmpdir.getFile("in", "**", "*"))
                .dest(tmpdir.getDirectory("out"));
            const out = tmpdir.getDirectory("out");
            const hello = out.getDirectory("hello");
            expect(await hello.mode() & 0o777).to.be.equal(0o700);
        });

        it("should create a directory with the origin times", {
            skip: is.windows
        }, async () => {
            await tmpdir.addDirectory("in", "hello", {
                atime: new Date(0),
                mtime: new Date(100000)
            });
            await fast
                .src(tmpdir.getFile("in", "**", "*"))
                .dest(tmpdir.getDirectory("out"));
            const out = tmpdir.getDirectory("out");
            const hello = out.getDirectory("hello");
            const stat = await hello.stat();
            expect(stat.atimeMs).to.be.equal(0);
            expect(stat.mtimeMs).to.be.equal(100000);
        });

        it("should update metadata if receives directory after nested file", {
            skip: is.windows
        }, async () => {
            const helloIn = await tmpdir.addDirectory("in", "hello", {
                mode: 0o700
            });
            await tmpdir.addFile("in", "hello", "index.js");
            await helloIn.utimes(new Date(0), new Date(100000));

            let backup;
            const files = await fast
                .src(tmpdir.getFile("in", "**", "*"))
                .through(function (file) {
                    if (file.basename === "hello") {
                        backup = file;
                        return;
                    }
                    this.push(file);
                }, function () {
                    this.push(backup);
                })
                .dest(tmpdir.getDirectory("out"), { produceFiles: true });
            expect(files).to.have.length(2);
            expect(files[0].basename).to.be.equal("index.js");
            expect(files[1].basename).to.be.equal("hello");

            const hello = tmpdir.getDirectory("out", "hello");
            const stat = await hello.stat();
            expect(stat.mode & 0o777).to.be.equal(0o700);
            expect(stat.atimeMs).to.be.equal(0);
            expect(stat.mtimeMs).to.be.equal(100000);
        });
    });

    describe("symlinks", { skip: is.windows }, () => {
        it("should handle symlinks", async () => {
            const helloIn = await tmpdir.addDirectory("in", "hello");
            await helloIn.addFile("hello", { contents: "world" });
            await fs.symlink("hello", tmpdir.getFile("in", "hello", "symlink").path());
            const out = tmpdir.getDirectory("out");

            await fast
                .src(tmpdir.getFile("in", "**", "*"), { links: true })
                .dest(out);
            const hello = out.getDirectory("hello");
            expect(await hello.exists()).to.be.true();
            expect(await hello.getFile("symlink").exists()).to.be.true();
            expect(await hello.getFile("symlink").readlink()).to.be.equal("hello");
            expect(await hello.getFile("symlink").contents()).to.be.equal("world");
        });
    });

    describe("map", () => {
        it("should use mappings to map sources to destinations", async () => {
            await FS.createStructure(tmpdir, [
                ["src1", ["test1", "test2", "test3"]],
                ["src2", ["test4", "test5", "test6"]]
            ]);
            const files = await fast.map([
                { from: "src1/**/*", to: "dest1" },
                { from: "src2/**/*", to: "dest2" }
            ], { cwd: tmpdir.path() }).dest({ produceFiles: true }).map((x) => x.path);
            files.sort();
            expect(files).to.have.lengthOf(6);
            expect(files).to.be.deep.equal([
                tmpdir.getFile("dest1", "test1").path(),
                tmpdir.getFile("dest1", "test2").path(),
                tmpdir.getFile("dest1", "test3").path(),
                tmpdir.getFile("dest2", "test4").path(),
                tmpdir.getFile("dest2", "test5").path(),
                tmpdir.getFile("dest2", "test6").path()
            ]);
        });

        it("should be a core stream", () => {
            expect(is.coreStream(fast.map())).to.be.true();
        });

        it("should be a fast stream", () => {
            expect(is.fastStream(fast.map())).to.be.true();
        });

        it("should be a fast fs stream", () => {
            expect(is.fastLocalStream(fast.map())).to.be.true();
        });

        it("should be a fast fs map stream", () => {
            expect(is.fastLocalMapStream(fast.map())).to.be.true();
        });
    });

    describe("watch", () => {
        it("should watch files", async () => {
            await FS.createStructure(tmpdir, [["src1"]]);
            const files = [];
            const stream = fast
                .watch("src1/**/*", { cwd: tmpdir.path() })
                .dest("dest1", { produceFiles: true })
                .through((f) => files.push(f));

            try {
                await adone.promise.delay(100); // time to init the watcher
                const src1 = tmpdir.getDirectory("src1");
                const dest1 = tmpdir.getDirectory("dest1");

                await src1.addFile("hello");
                await adone.promise.delay(100);
                expect(files).to.have.lengthOf(1);
                expect(files[0].path).to.be.equal(dest1.getFile("hello").path());

                await src1.addFile("we", "need", "to", "go", "deeper", "index.js");
                await adone.promise.delay(100);
                expect(files).to.have.lengthOf(7);
                expect(files[1].path).to.be.equal(dest1.getFile("we").path());
                expect(files[2].path).to.be.equal(dest1.getFile("we", "need").path());
                expect(files[3].path).to.be.equal(dest1.getFile("we", "need", "to").path());
                expect(files[4].path).to.be.equal(dest1.getFile("we", "need", "to", "go").path());
                expect(files[5].path).to.be.equal(dest1.getFile("we", "need", "to", "go", "deeper").path());
                expect(files[6].path).to.be.equal(dest1.getFile("we", "need", "to", "go", "deeper", "index.js").path());
            } finally {
                stream.end();
            }
        });

        it.skip("should unlink files", async () => {
            await FS.createStructure(tmpdir, [
                ["src1", ["test1", "test2", "test3"]],
                ["src2", ["test4", "test5", "test6"]]
            ]);
            await fast.map([
                { from: "src1/**/*", to: "dest1" },
                { from: "src2/**/*", to: "dest2" }
            ], { cwd: tmpdir.path() }).dest();
            const stream = fast.watch([
                { from: "src1/**/*", to: "dest1" },
                { from: "src2/**/*", to: "dest2" }
            ], { cwd: tmpdir.path() }).dest();
            await adone.promise.delay(100); // the watcher init
            const src1 = tmpdir.getDirectory("src1");
            const src2 = tmpdir.getDirectory("src2");
            const dest1 = tmpdir.getDirectory("dest1");
            const dest2 = tmpdir.getDirectory("dest2");
            try {
                expect((await dest1.files()).map((x) => x.filename())).to.be.deep.equal(["test1", "test2", "test3"]);
                expect((await dest2.files()).map((x) => x.filename())).to.be.deep.equal(["test4", "test5", "test6"]);

                await src1.getFile("test1").unlink();
                await adone.promise.delay(100);
                expect((await dest1.files()).map((x) => x.filename())).to.be.deep.equal(["test2", "test3"]);
                expect((await dest2.files()).map((x) => x.filename())).to.be.deep.equal(["test4", "test5", "test6"]);

                await src2.getFile("test5").unlink();
                await adone.promise.delay(100);
                expect((await dest1.files()).map((x) => x.filename())).to.be.deep.equal(["test2", "test3"]);
                expect((await dest2.files()).map((x) => x.filename())).to.be.deep.equal(["test4", "test6"]);

                await src1.addFile("hello", "world");
                await adone.promise.delay(100);
                expect(await dest1.getFile("hello", "world").exists()).to.be.true();

                await src1.getDirectory("hello").unlink();
                await adone.promise.delay(100);
                expect(await dest1.getDirectory("hello").exists()).to.be.false();
            } finally {
                stream.end();
            }
        });

        it.skip("should not unlink files", async () => {
            await FS.createStructure(tmpdir, [
                ["src1", ["test1", "test2", "test3"]],
                ["src2", ["test4", "test5", "test6"]]
            ]);
            await fast.map([
                { from: "src1/**/*", to: "dest1" },
                { from: "src2/**/*", to: "dest2" }
            ], { cwd: tmpdir.path() }).dest();
            const stream = fast.watch([
                { from: "src1/**/*", to: "dest1" },
                { from: "src2/**/*", to: "dest2" }
            ], { cwd: tmpdir.path(), unlink: false }).dest();
            await adone.promise.delay(100); // the watcher init
            try {
                await tmpdir.getFile("src1", "test1").unlink();
                await tmpdir.getFile("src2", "test4").unlink();
                await adone.promise.delay(100);
                expect(await tmpdir.getFile("dest1", "test1").exists()).to.be.true();
                expect(await tmpdir.getFile("dest2", "test4").exists()).to.be.true();
            } finally {
                stream.end();
            }
        });

        it.skip("should unlink using an unlink handler", async () => {
            await FS.createStructure(tmpdir, [
                ["src1", ["test1", "test2", "test3"]],
                ["src2", ["test4", "test5", "test6"]]
            ]);
            await fast.map([
                { from: "src1/**/*", to: "dest1" },
                { from: "src2/**/*", to: "dest2" }
            ], { cwd: tmpdir.path() }).dest();
            const stream = fast.watch([
                { from: "src1/**/*", to: "dest1" },
                { from: "src2/**/*", to: "dest2" }
            ], { cwd: tmpdir.path(), unlink: () => true }).dest();
            await adone.promise.delay(100); // the watcher init
            try {
                await tmpdir.getFile("src1", "test1").unlink();
                await tmpdir.getFile("src2", "test4").unlink();
                await adone.promise.delay(100);
                expect(await tmpdir.getFile("dest1", "test1").exists()).to.be.false();
                expect(await tmpdir.getFile("dest2", "test4").exists()).to.be.false();
            } finally {
                stream.end();
            }
        });

        it.skip("should not unlink using an unlink handler", async () => {
            await FS.createStructure(tmpdir, [
                ["src1", ["test1", "test2", "test3"]],
                ["src2", ["test4", "test5", "test6"]]
            ]);
            await fast.map([
                { from: "src1/**/*", to: "dest1" },
                { from: "src2/**/*", to: "dest2" }
            ], { cwd: tmpdir.path() }).dest();
            const stream = fast.watch([
                { from: "src1/**/*", to: "dest1" },
                { from: "src2/**/*", to: "dest2" }
            ], { cwd: tmpdir.path(), unlink: () => false }).dest();
            await adone.promise.delay(100); // the watcher init
            try {
                await tmpdir.getFile("src1", "test1").unlink();
                await tmpdir.getFile("src2", "test4").unlink();
                await adone.promise.delay(100);
                expect(await tmpdir.getFile("dest1", "test1").exists()).to.be.true();
                expect(await tmpdir.getFile("dest2", "test4").exists()).to.be.true();
            } finally {
                stream.end();
            }
        });

        it.skip("should unlink using an async unlink handler", async () => {
            await FS.createStructure(tmpdir, [
                ["src1", ["test1", "test2", "test3"]],
                ["src2", ["test4", "test5", "test6"]]
            ]);
            await fast.map([
                { from: "src1/**/*", to: "dest1" },
                { from: "src2/**/*", to: "dest2" }
            ], { cwd: tmpdir.path() }).dest();
            const stream = fast.watch([
                { from: "src1/**/*", to: "dest1" },
                { from: "src2/**/*", to: "dest2" }
            ], { cwd: tmpdir.path(), unlink: async () => true }).dest();
            await adone.promise.delay(100); // the watcher init
            try {
                await tmpdir.getFile("src1", "test1").unlink();
                await tmpdir.getFile("src2", "test4").unlink();
                await adone.promise.delay(100);
                expect(await tmpdir.getFile("dest1", "test1").exists()).to.be.false();
                expect(await tmpdir.getFile("dest2", "test4").exists()).to.be.false();
            } finally {
                stream.end();
            }
        });

        it.skip("should not unlink using an async unlink handler", async () => {
            await FS.createStructure(tmpdir, [
                ["src1", ["test1", "test2", "test3"]],
                ["src2", ["test4", "test5", "test6"]]
            ]);
            await fast.map([
                { from: "src1/**/*", to: "dest1" },
                { from: "src2/**/*", to: "dest2" }
            ], { cwd: tmpdir.path() }).dest();
            const stream = fast.watch([
                { from: "src1/**/*", to: "dest1" },
                { from: "src2/**/*", to: "dest2" }
            ], { cwd: tmpdir.path(), unlink: async () => false }).dest();
            await adone.promise.delay(100); // the watcher init
            try {
                await tmpdir.getFile("src1", "test1").unlink();
                await tmpdir.getFile("src2", "test4").unlink();
                await adone.promise.delay(100);
                expect(await tmpdir.getFile("dest1", "test1").exists()).to.be.true();
                expect(await tmpdir.getFile("dest2", "test4").exists()).to.be.true();
            } finally {
                stream.end();
            }
        });

        it.skip("should pass a path and 'is directory' as the arguments to the unlink", async () => {
            await FS.createStructure(tmpdir, [
                ["src1", [["hello", ["test1"]]]],
                ["src2", [["world", ["test2"]]]]
            ]);
            await fast.map([
                { from: "src1/**/*", to: "dest1" },
                { from: "src2/**/*", to: "dest2" }
            ], { cwd: tmpdir.path() }).dest();
            const calls = [];
            const stream = fast.watch([
                { from: "src1/**/*", to: "dest1" },
                { from: "src2/**/*", to: "dest2" }
            ], {
                cwd: tmpdir.path(), unlink: (...args) => {
                    calls.push(args);
                    return true;
                }
            }).dest();
            await adone.promise.delay(100); // the watcher init
            try {
                const test1 = tmpdir.getFile("src1", "hello", "test1");
                await test1.unlink();
                await adone.promise.delay(100);
                const hello = tmpdir.getDirectory("src1", "hello");
                await hello.unlink();
                await adone.promise.delay(100);
                const test2 = tmpdir.getFile("src2", "world", "test2");
                await test2.unlink();
                await adone.promise.delay(100);
                const world = tmpdir.getDirectory("src2", "world");
                await world.unlink();
                await adone.promise.delay(100);
                expect(calls).to.be.deep.equal([
                    [test1.path(), false],
                    [hello.path(), true],
                    [test2.path(), false],
                    [world.path(), true]
                ]);
            } finally {
                stream.end();
            }
        });

        it.skip("should fail if something goes wrong", async () => {
            await FS.createStructure(tmpdir, [
                ["src1", ["test1"]],
                ["src2", ["test2"]]
            ]);
            await fast.map([
                { from: "src1/**/*", to: "dest1" },
                { from: "src2/**/*", to: "dest2" }
            ], { cwd: tmpdir.path() }).dest();
            const result = Promise.resolve(fast.watch([
                { from: "src1/**/*", to: "dest1" },
                { from: "src2/**/*", to: "dest2" }
            ], {
                cwd: tmpdir.path(), unlink: () => {
                    throw new Error("wtf");
                }
            }).dest());
            await adone.promise.delay(100); // the watcher init
            await tmpdir.getFile("src1", "test1").unlink();
            await result.then(() => {
                throw new Error("Nothing was thrown");
            }, () => {
                return true;
            });
        });

        it.skip("should fail if something goes wrong asynchronously", async () => {
            await FS.createStructure(tmpdir, [
                ["src1", ["test1"]],
                ["src2", ["test2"]]
            ]);
            await fast.map([
                { from: "src1/**/*", to: "dest1" },
                { from: "src2/**/*", to: "dest2" }
            ], { cwd: tmpdir.path() }).dest();
            const result = Promise.resolve(fast.watch([
                { from: "src1/**/*", to: "dest1" },
                { from: "src2/**/*", to: "dest2" }
            ], {
                cwd: tmpdir.path(), unlink: async () => {
                    await adone.promise.delay(100);
                    throw new Error("wtf");
                }
            }).dest());
            await adone.promise.delay(100); // the watcher init
            await tmpdir.getFile("src1", "test1").unlink();
            await result.then(() => {
                throw new Error("Nothing was thrown");
            }, () => {
                return true;
            });
        });

        it("should be a core stream", () => {
            expect(is.coreStream(fast.watch())).to.be.true();
        });

        it("should be a fast stream", () => {
            expect(is.fastStream(fast.watch())).to.be.true();
        });

        it("should be a fast local stream", () => {
            expect(is.fastLocalStream(fast.watch())).to.be.true();
        });
    });

    describe("watchMap", () => {
        it("should watch files and map them", async () => {
            await FS.createStructure(tmpdir, [
                ["src1"],
                ["src2"]
            ]);
            const files = [];
            const stream = fast.watchMap([
                { from: "src1/**/*", to: "dest1" },
                { from: "src2/**/*", to: "dest2" }
            ], { cwd: tmpdir.path() }).dest({ produceFiles: true }).through((f) => files.push(f));
            try {
                await adone.promise.delay(100); // time to init the watcher
                const src1 = tmpdir.getDirectory("src1");
                const src2 = tmpdir.getDirectory("src2");
                const dest1 = tmpdir.getDirectory("dest1");
                const dest2 = tmpdir.getDirectory("dest2");

                await src1.addFile("hello");
                await adone.promise.delay(100);
                expect(files).to.have.lengthOf(1);
                expect(files[0].path).to.be.equal(dest1.getFile("hello").path());

                await src2.addFile("hello");
                await adone.promise.delay(100);
                expect(files).to.have.lengthOf(2);
                expect(files[1].path).to.be.equal(dest2.getFile("hello").path());

                await src1.addFile("we", "need", "to", "go", "deeper", "index.js");
                await adone.promise.delay(100);
                expect(files).to.have.lengthOf(8);
                expect(files[2].path).to.be.equal(dest1.getFile("we").path());
                expect(files[3].path).to.be.equal(dest1.getFile("we", "need").path());
                expect(files[4].path).to.be.equal(dest1.getFile("we", "need", "to").path());
                expect(files[5].path).to.be.equal(dest1.getFile("we", "need", "to", "go").path());
                expect(files[6].path).to.be.equal(dest1.getFile("we", "need", "to", "go", "deeper").path());
                expect(files[7].path).to.be.equal(dest1.getFile("we", "need", "to", "go", "deeper", "index.js").path());

                await src2.addFile("we", "need", "to", "go", "deeper", "index.js");
                await adone.promise.delay(100);
                expect(files).to.have.lengthOf(14);
                expect(files[8].path).to.be.equal(dest2.getFile("we").path());
                expect(files[9].path).to.be.equal(dest2.getFile("we", "need").path());
                expect(files[10].path).to.be.equal(dest2.getFile("we", "need", "to").path());
                expect(files[11].path).to.be.equal(dest2.getFile("we", "need", "to", "go").path());
                expect(files[12].path).to.be.equal(dest2.getFile("we", "need", "to", "go", "deeper").path());
                expect(files[13].path).to.be.equal(dest2.getFile("we", "need", "to", "go", "deeper", "index.js").path());
            } finally {
                stream.end();
            }
        });

        it("should be a core stream", () => {
            expect(is.coreStream(fast.watchMap())).to.be.true();
        });

        it("should be a fast stream", () => {
            expect(is.fastStream(fast.watchMap())).to.be.true();
        });

        it("should be a fast fs stream", () => {
            expect(is.fastStream(fast.watchMap())).to.be.true();
        });

        it("should be a fast fs map stream", () => {
            expect(is.fastLocalMapStream(fast.watchMap())).to.be.true();
        });
    });
});
