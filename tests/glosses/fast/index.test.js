const { is, fast } = adone;

describe("FAST", () => {
    let root;

    before(async () => {
        root = await adone.fs.Directory.createTmp();
    });

    after(async () => {
        await root.unlink();
    });

    afterEach(async () => {
        await root.clean();
    });

    it("correct file info", async () => {
        const file = await root.addFile("in", "transpile.js");
        const files = await fast.src(file.path(), { base: root.path() });
        expect(files).to.have.lengthOf(1);
        expect(files[0].path).to.be.equal(file.path());
        expect(files[0].relative).to.be.equal(file.relativePath(root));
        expect(files[0].basename).to.be.equal("transpile.js");
        expect(files[0].extname).to.be.equal(".js");
    });

    it("correct out file", async () => {
        const file0 = await root.addFile("in", "transpile.js");
        const out = root.getVirtualDirectory("out");
        const files = await fast
            .src(file0.path(), { base: root.getVirtualDirectory("in").path() })
            .dest(out.path(), { produceFiles: true });
        expect(await out.exists()).to.be.true;
        expect(files).to.have.lengthOf(1);
        const file = out.getVirtualFile("transpile.js");
        expect(files[0].path).to.be.equal(file.path());
        expect(files[0].relative).to.be.equal(file.relativePath(out));
        expect(files[0].basename).to.be.equal("transpile.js");
        expect(files[0].extname).to.be.equal(".js");
    });

    it("should be a core stream", () => {
        expect(is.coreStream(fast.src())).to.be.true;
    });

    it("should be a fast stream", () => {
        expect(is.fastStream(fast.src())).to.be.true;
    });

    it("should be a fast fs stream", () => {
        expect(is.fastFSStream(fast.src())).to.be.true;
    });

    describe("map", () => {
        it("should use mappings to map sources to destinations", async () => {
            await FS.createStructure(root, [
                ["src1", ["test1", "test2", "test3"]],
                ["src2", ["test4", "test5", "test6"]]
            ]);
            const files = await fast.map([
                { from: "src1/**/*", to: "dest1" },
                { from: "src2/**/*", to: "dest2" }
            ], { cwd: root.path() }).dest({ produceFiles: true }).map((x) => x.path);
            files.sort();
            expect(files).to.have.lengthOf(6);
            expect(files).to.be.deep.equal([
                root.getVirtualFile("dest1", "test1").path(),
                root.getVirtualFile("dest1", "test2").path(),
                root.getVirtualFile("dest1", "test3").path(),
                root.getVirtualFile("dest2", "test4").path(),
                root.getVirtualFile("dest2", "test5").path(),
                root.getVirtualFile("dest2", "test6").path()
            ]);
        });

        it("should be a core stream", () => {
            expect(is.coreStream(fast.map())).to.be.true;
        });

        it("should be a fast stream", () => {
            expect(is.fastStream(fast.map())).to.be.true;
        });

        it("should be a fast fs stream", () => {
            expect(is.fastFSStream(fast.map())).to.be.true;
        });

        it("should be a fast fs map stream", () => {
            expect(is.fastFSMapStream(fast.map())).to.be.true;
        });
    });

    describe("watch", () => {
        it("should watch files", async () => {
            await FS.createStructure(root, [["src1"]]);
            const files = [];
            const stream = fast
                .watch("src1/**/*", { cwd: root.path() })
                .dest("dest1", { produceFiles: true })
                .through((f) => files.push(f));

            try {
                await adone.promise.delay(100);  // time to init the watcher
                const src1 = root.getVirtualDirectory("src1");
                const dest1 = root.getVirtualDirectory("dest1");

                await src1.addFile("hello");
                await adone.promise.delay(100);
                expect(files).to.have.lengthOf(1);
                expect(files[0].path).to.be.equal(dest1.getVirtualFile("hello").path());

                await src1.addFile("we", "need", "to", "go", "deeper", "index.js");
                await adone.promise.delay(100);
                expect(files).to.have.lengthOf(2);
                expect(files[1].path).to.be.equal(dest1.getVirtualFile("we", "need", "to", "go", "deeper", "index.js").path());
            } finally {
                stream.end();
            }
        });

        it.skip("should unlink files", async () => {
            await FS.createStructure(root, [
                ["src1", ["test1", "test2", "test3"]],
                ["src2", ["test4", "test5", "test6"]]
            ]);
            await fast.map([
                { from: "src1/**/*", to: "dest1" },
                { from: "src2/**/*", to: "dest2" }
            ], { cwd: root.path() }).dest();
            const stream = fast.watch([
                { from: "src1/**/*", to: "dest1" },
                { from: "src2/**/*", to: "dest2" }
            ], { cwd: root.path() }).dest();
            await adone.promise.delay(100);  // the watcher init
            const src1 = root.getVirtualDirectory("src1");
            const src2 = root.getVirtualDirectory("src2");
            const dest1 = root.getVirtualDirectory("dest1");
            const dest2 = root.getVirtualDirectory("dest2");
            try {
                expect((await dest1.files()).map((x) => x.filename())).to.be.deep.equal(["test1", "test2", "test3"]);
                expect((await dest2.files()).map((x) => x.filename())).to.be.deep.equal(["test4", "test5", "test6"]);

                await src1.getVirtualFile("test1").unlink();
                await adone.promise.delay(100);
                expect((await dest1.files()).map((x) => x.filename())).to.be.deep.equal(["test2", "test3"]);
                expect((await dest2.files()).map((x) => x.filename())).to.be.deep.equal(["test4", "test5", "test6"]);

                await src2.getVirtualFile("test5").unlink();
                await adone.promise.delay(100);
                expect((await dest1.files()).map((x) => x.filename())).to.be.deep.equal(["test2", "test3"]);
                expect((await dest2.files()).map((x) => x.filename())).to.be.deep.equal(["test4", "test6"]);

                await src1.addFile("hello", "world");
                await adone.promise.delay(100);
                expect(await dest1.getVirtualFile("hello", "world").exists()).to.be.true;

                await src1.getVirtualDirectory("hello").unlink();
                await adone.promise.delay(100);
                expect(await dest1.getVirtualDirectory("hello").exists()).to.be.false;
            } finally {
                stream.end();
            }
        });

        it.skip("should not unlink files", async () => {
            await FS.createStructure(root, [
                ["src1", ["test1", "test2", "test3"]],
                ["src2", ["test4", "test5", "test6"]]
            ]);
            await fast.map([
                { from: "src1/**/*", to: "dest1" },
                { from: "src2/**/*", to: "dest2" }
            ], { cwd: root.path() }).dest();
            const stream = fast.watch([
                { from: "src1/**/*", to: "dest1" },
                { from: "src2/**/*", to: "dest2" }
            ], { cwd: root.path(), unlink: false }).dest();
            await adone.promise.delay(100);  // the watcher init
            try {
                await root.getVirtualFile("src1", "test1").unlink();
                await root.getVirtualFile("src2", "test4").unlink();
                await adone.promise.delay(100);
                expect(await root.getVirtualFile("dest1", "test1").exists()).to.be.true;
                expect(await root.getVirtualFile("dest2", "test4").exists()).to.be.true;
            } finally {
                stream.end();
            }
        });

        it.skip("should unlink using an unlink handler", async () => {
            await FS.createStructure(root, [
                ["src1", ["test1", "test2", "test3"]],
                ["src2", ["test4", "test5", "test6"]]
            ]);
            await fast.map([
                { from: "src1/**/*", to: "dest1" },
                { from: "src2/**/*", to: "dest2" }
            ], { cwd: root.path() }).dest();
            const stream = fast.watch([
                { from: "src1/**/*", to: "dest1" },
                { from: "src2/**/*", to: "dest2" }
            ], { cwd: root.path(), unlink: () => true }).dest();
            await adone.promise.delay(100);  // the watcher init
            try {
                await root.getVirtualFile("src1", "test1").unlink();
                await root.getVirtualFile("src2", "test4").unlink();
                await adone.promise.delay(100);
                expect(await root.getVirtualFile("dest1", "test1").exists()).to.be.false;
                expect(await root.getVirtualFile("dest2", "test4").exists()).to.be.false;
            } finally {
                stream.end();
            }
        });

        it.skip("should not unlink using an unlink handler", async () => {
            await FS.createStructure(root, [
                ["src1", ["test1", "test2", "test3"]],
                ["src2", ["test4", "test5", "test6"]]
            ]);
            await fast.map([
                { from: "src1/**/*", to: "dest1" },
                { from: "src2/**/*", to: "dest2" }
            ], { cwd: root.path() }).dest();
            const stream = fast.watch([
                { from: "src1/**/*", to: "dest1" },
                { from: "src2/**/*", to: "dest2" }
            ], { cwd: root.path(), unlink: () => false }).dest();
            await adone.promise.delay(100);  // the watcher init
            try {
                await root.getVirtualFile("src1", "test1").unlink();
                await root.getVirtualFile("src2", "test4").unlink();
                await adone.promise.delay(100);
                expect(await root.getVirtualFile("dest1", "test1").exists()).to.be.true;
                expect(await root.getVirtualFile("dest2", "test4").exists()).to.be.true;
            } finally {
                stream.end();
            }
        });

        it.skip("should unlink using an async unlink handler", async () => {
            await FS.createStructure(root, [
                ["src1", ["test1", "test2", "test3"]],
                ["src2", ["test4", "test5", "test6"]]
            ]);
            await fast.map([
                { from: "src1/**/*", to: "dest1" },
                { from: "src2/**/*", to: "dest2" }
            ], { cwd: root.path() }).dest();
            const stream = fast.watch([
                { from: "src1/**/*", to: "dest1" },
                { from: "src2/**/*", to: "dest2" }
            ], { cwd: root.path(), unlink: async () => true }).dest();
            await adone.promise.delay(100);  // the watcher init
            try {
                await root.getVirtualFile("src1", "test1").unlink();
                await root.getVirtualFile("src2", "test4").unlink();
                await adone.promise.delay(100);
                expect(await root.getVirtualFile("dest1", "test1").exists()).to.be.false;
                expect(await root.getVirtualFile("dest2", "test4").exists()).to.be.false;
            } finally {
                stream.end();
            }
        });

        it.skip("should not unlink using an async unlink handler", async () => {
            await FS.createStructure(root, [
                ["src1", ["test1", "test2", "test3"]],
                ["src2", ["test4", "test5", "test6"]]
            ]);
            await fast.map([
                { from: "src1/**/*", to: "dest1" },
                { from: "src2/**/*", to: "dest2" }
            ], { cwd: root.path() }).dest();
            const stream = fast.watch([
                { from: "src1/**/*", to: "dest1" },
                { from: "src2/**/*", to: "dest2" }
            ], { cwd: root.path(), unlink: async () => false }).dest();
            await adone.promise.delay(100);  // the watcher init
            try {
                await root.getVirtualFile("src1", "test1").unlink();
                await root.getVirtualFile("src2", "test4").unlink();
                await adone.promise.delay(100);
                expect(await root.getVirtualFile("dest1", "test1").exists()).to.be.true;
                expect(await root.getVirtualFile("dest2", "test4").exists()).to.be.true;
            } finally {
                stream.end();
            }
        });

        it.skip("should pass a path and 'is directory' as the arguments to the unlink", async () => {
            await FS.createStructure(root, [
                ["src1", [["hello", ["test1"]]]],
                ["src2", [["world", ["test2"]]]]
            ]);
            await fast.map([
                { from: "src1/**/*", to: "dest1" },
                { from: "src2/**/*", to: "dest2" }
            ], { cwd: root.path() }).dest();
            const calls = [];
            const stream = fast.watch([
                { from: "src1/**/*", to: "dest1" },
                { from: "src2/**/*", to: "dest2" }
            ], {
                cwd: root.path(), unlink: (...args) => {
                    calls.push(args);
                    return true;
                }
            }).dest();
            await adone.promise.delay(100);  // the watcher init
            try {
                const test1 = root.getVirtualFile("src1", "hello", "test1");
                await test1.unlink();
                await adone.promise.delay(100);
                const hello = root.getVirtualDirectory("src1", "hello");
                await hello.unlink();
                await adone.promise.delay(100);
                const test2 = root.getVirtualFile("src2", "world", "test2");
                await test2.unlink();
                await adone.promise.delay(100);
                const world = root.getVirtualDirectory("src2", "world");
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
            await FS.createStructure(root, [
                ["src1", ["test1"]],
                ["src2", ["test2"]]
            ]);
            await fast.map([
                { from: "src1/**/*", to: "dest1" },
                { from: "src2/**/*", to: "dest2" }
            ], { cwd: root.path() }).dest();
            const result = Promise.resolve(fast.watch([
                { from: "src1/**/*", to: "dest1" },
                { from: "src2/**/*", to: "dest2" }
            ], {
                cwd: root.path(), unlink: () => {
                    throw new Error("wtf");
                }
            }).dest());
            await adone.promise.delay(100);  // the watcher init
            await root.getVirtualFile("src1", "test1").unlink();
            await result.then(() => {
                throw new Error("Nothing was thrown");
            }, () => {
                return true;
            });
        });

        it.skip("should fail if something goes wrong asynchronously", async () => {
            await FS.createStructure(root, [
                ["src1", ["test1"]],
                ["src2", ["test2"]]
            ]);
            await fast.map([
                { from: "src1/**/*", to: "dest1" },
                { from: "src2/**/*", to: "dest2" }
            ], { cwd: root.path() }).dest();
            const result = Promise.resolve(fast.watch([
                { from: "src1/**/*", to: "dest1" },
                { from: "src2/**/*", to: "dest2" }
            ], {
                cwd: root.path(), unlink: async () => {
                    await adone.promise.delay(100);
                    throw new Error("wtf");
                }
            }).dest());
            await adone.promise.delay(100);  // the watcher init
            await root.getVirtualFile("src1", "test1").unlink();
            await result.then(() => {
                throw new Error("Nothing was thrown");
            }, () => {
                return true;
            });
        });

        it("should be a core stream", () => {
            expect(is.coreStream(fast.watch())).to.be.true;
        });

        it("should be a fast stream", () => {
            expect(is.fastStream(fast.watch())).to.be.true;
        });

        it("should be a fast fs stream", () => {
            expect(is.fastFSStream(fast.watch())).to.be.true;
        });
    });

    describe("watchMap", () => {
        it("should watch files and map them", async () => {
            await FS.createStructure(root, [
                ["src1"],
                ["src2"]
            ]);
            const files = [];
            const stream = fast.watchMap([
                { from: "src1/**/*", to: "dest1" },
                { from: "src2/**/*", to: "dest2" }
            ], { cwd: root.path() }).dest({ produceFiles: true }).through((f) => files.push(f));
            await adone.promise.delay(100);  // time to init the watcher
            const src1 = root.getVirtualDirectory("src1");
            const src2 = root.getVirtualDirectory("src2");
            const dest1 = root.getVirtualDirectory("dest1");
            const dest2 = root.getVirtualDirectory("dest2");

            await src1.addFile("hello");
            await adone.promise.delay(100);
            expect(files).to.have.lengthOf(1);
            expect(files[0].path).to.be.equal(dest1.getVirtualFile("hello").path());

            await src2.addFile("hello");
            await adone.promise.delay(100);
            expect(files).to.have.lengthOf(2);
            expect(files[1].path).to.be.equal(dest2.getVirtualFile("hello").path());

            await src1.addFile("we", "need", "to", "go", "deeper", "index.js");
            await adone.promise.delay(100);
            expect(files).to.have.lengthOf(3);
            expect(files[2].path).to.be.equal(dest1.getVirtualFile("we", "need", "to", "go", "deeper", "index.js").path());

            await src2.addFile("we", "need", "to", "go", "deeper", "index.js");
            await adone.promise.delay(100);
            expect(files).to.have.lengthOf(4);
            expect(files[3].path).to.be.equal(dest2.getVirtualFile("we", "need", "to", "go", "deeper", "index.js").path());
            stream.end();
        });

        it("should be a core stream", () => {
            expect(is.coreStream(fast.watchMap())).to.be.true;
        });

        it("should be a fast stream", () => {
            expect(is.fastStream(fast.watchMap())).to.be.true;
        });

        it("should be a fast fs stream", () => {
            expect(is.fastFSStream(fast.watchMap())).to.be.true;
        });

        it("should be a fast fs map stream", () => {
            expect(is.fastFSMapStream(fast.watchMap())).to.be.true;
        });
    });
});
