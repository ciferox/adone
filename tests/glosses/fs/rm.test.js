const {
    fs,
    std
} = adone;

describe("fs", "rm", () => {
    /**
     * @type {adone.fs.Directory}
     */
    let rootTmp = null;

    before(async () => {
        rootTmp = await adone.fs.Directory.createTmp();
    });

    afterEach(async () => {
        await rootTmp.clean();
    });

    after(async () => {
        await rootTmp.unlink();
    });


    it("should delete a file", async () => {
        const tmp = await rootTmp.addDirectory("tmp");
        const file = await tmp.addFile("test.js");
        try {
            await fs.rm(file.path());
            expect(await file.exists()).to.be.false();
        } finally {
            await tmp.unlink();
        }
    });

    it("should delete a directory", async () => {
        const tmp = await rootTmp.addDirectory("tmp");
        const dir = await tmp.addDirectory("test");
        try {
            await fs.rm(dir.path());
            expect(await dir.exists()).to.be.false();
        } finally {
            await tmp.unlink();
        }
    });

    it("should delete a directory with all the nested files", async () => {
        const tmp = await rootTmp.addDirectory("tmp");
        const dir = await tmp.addDirectory("hello");
        await FS.createStructure(dir, [
            ["nested1", [
                ["nested11", [
                    "file1",
                    "file2",
                    "file3"
                ]],
                ["nested12", [
                    "file1",
                    "file2",
                    "file3"
                ]]
            ]],
            ["nested2", [
                ["nested21", [
                    ["nested211", [
                        "file1"
                    ]]
                ]],
                "file3",
                ["nested22", [
                    ["nested221", [
                        ["nested2211", [
                            "file1",
                            "file2"
                        ]],
                        "file1"
                    ]],
                    "file1"
                ]]
            ]],
            "file1",
            "file2"
        ]);
        expect(await dir.find({ files: true, dirs: true })).to.be.not.empty;
        try {
            await fs.rm(dir.path());
            expect(await dir.exists()).to.be.false();
            expect(await tmp.find({ files: true, dirs: true })).to.be.empty();
        } finally {
            await tmp.unlink();
        }
    });

    it("should use cwd", async () => {
        const tmp = await rootTmp.addDirectory("tmp");
        const file = await tmp.addFile("hello");
        try {
            await fs.rm(file.relativePath(tmp), { cwd: tmp.path() });
            expect(await file.exists()).to.be.false();
        } finally {
            await tmp.unlink();
        }
    });

    it("should not throw if a file doesnt exist", async () => {
        const tmp = await rootTmp.addDirectory("tmp");
        const file = await tmp.addFile("hello");
        await file.unlink();
        const err = await fs.rm(file.path()).catch((err) => err);
        await tmp.unlink();
        expect(err).to.be.not.ok;
    });

    it("should support globs", async () => {
        const tmp = await rootTmp.addDirectory("tmp");
        const file1 = await tmp.addFile("hello1");
        const file2 = await tmp.addFile("hello2");
        const err = await fs.rm(`${tmp.getFile("hello").path()}*`).catch((err) => err);
        expect(await file1.exists()).to.be.false();
        expect(await file2.exists()).to.be.false();
        await tmp.unlink();
        expect(err).to.be.not.ok;
    });

    // gathered from https://github.com/sindresorhus/del
    describe("complex glob", () => {
        /**
         * @type {adone.fs.Directory}
         */
        let tmp;

        beforeEach(async () => {
            tmp = await rootTmp.addDirectory("complex");
        });

        beforeEach(async () => {
            await FS.createStructure(tmp, [
                "1.tmp",
                "2.tmp",
                "3.tmp",
                "4.tmp",
                ".dot.tmp",
                ["dir", [
                    "1.tmp"
                ]]
            ]);
        });

        afterEach(async () => {
            await tmp.clean();
        });

        const exists = async (files) => {
            for (let file of files) {
                file = adone.util.arrify(file);
                const relative = std.path.join(...file);
                const p = std.path.join(tmp.path(), relative);
                assert.true(await fs.exists(p), `expected ${relative} to exist`); // eslint-disable-line
            }
        };

        const notExists = async (files) => {
            for (let file of files) {
                file = adone.util.arrify(file);
                const relative = std.path.join(...file);
                const p = std.path.join(tmp.path(), relative);
                assert.false(await fs.exists(p), `expected ${relative} not to exist`); // eslint-disable-line
            }
        };

        it("delete files", async () => {
            await fs.rm(["*.tmp", "!1*"], { cwd: tmp.path() });

            await exists(["1.tmp", ".dot.tmp", ["dir", "1.tmp"]]);
            await notExists(["2.tmp", "3.tmp", "4.tmp"]);
        });

        it("take options into account", async () => {
            await fs.rm(["*.tmp", "!1*"], {
                cwd: tmp.path(),
                glob: {
                    dot: true
                }
            });

            await exists(["1.tmp", ["dir", "1.tmp"]]);
            await notExists(["2.tmp", "3.tmp", "4.tmp", ".dot.tmp"]);
        });

        it("return deleted files", async () => {
            assert.deepEqual(await fs.rm("1.tmp", { cwd: tmp.path() }), [std.path.join(tmp.path(), "1.tmp")]);
        });

        it("should append sep suffix for deleted directories", async () => {
            const files = await fs.rm("dir", { cwd: tmp.path() });
            assert.deepEqual(files.sort(), [
                std.path.join(tmp.path(), "dir", std.path.sep),
                std.path.join(tmp.path(), "dir", "1.tmp")
            ]);
        });

        it("don't delete files, but return them", async () => {
            const deletedFiles = await fs.rm(["*.tmp", "!1*"], {
                cwd: tmp.path(),
                dryRun: true
            });
            await exists(["1.tmp", "2.tmp", "3.tmp", "4.tmp", ".dot.tmp"]);
            assert.deepEqual(deletedFiles.sort(), [
                std.path.join(tmp.path(), "2.tmp"),
                std.path.join(tmp.path(), "3.tmp"),
                std.path.join(tmp.path(), "4.tmp")
            ]);
        });
    });

    it("should handle ignoring regular files", async () => {
        await FS.createStructure(rootTmp, [
            ["dir", [
                "1.txt",
                "2.txt"
            ]]
        ]);
        const [a, b] = [rootTmp.getFile("dir", "1.txt"), rootTmp.getFile("dir", "2.txt")];
        expect(await a.exists()).to.be.true();
        expect(await b.exists()).to.be.true();
        await fs.rm(["dir", "!dir/2.txt"], { cwd: rootTmp.path() });
        expect(await a.exists()).to.be.false();
        expect(await b.exists()).to.be.true();
    });

    it("should handle ignoring glob patters", async () => {
        await FS.createStructure(rootTmp, [
            "1.txt",
            "1.js",
            ["dir", [
                "2.txt",
                "2.js",
                ["dir2", [
                    "3.txt",
                    "3.js"
                ]]
            ]],
            ["dir2", [
                "1.txt",
                "2.txt",
                "3.js"
            ]],
            ["dir3", [
                "1",
                "2",
                "3",
                ["dir4", [
                    "1"
                ]],
                ["dir5", []]
            ]]
        ]);
        await fs.rm(["**/*", "!**/*.js", "!dir2/**"], { cwd: rootTmp.path() });
        expect(await rootTmp.getFile("1.txt").exists()).to.be.false();
        expect(await rootTmp.getFile("1.js").exists()).to.be.true();
        expect(await rootTmp.getFile("dir", "2.txt").exists()).to.be.false();
        expect(await rootTmp.getFile("dir", "2.js").exists()).to.be.true();
        expect(await rootTmp.getFile("dir", "dir2", "3.txt").exists()).to.be.false();
        expect(await rootTmp.getFile("dir", "dir2", "3.js").exists()).to.be.true();
        expect(await rootTmp.getFile("dir2", "1.txt").exists()).to.be.true();
        expect(await rootTmp.getFile("dir2", "2.txt").exists()).to.be.true();
        expect(await rootTmp.getFile("dir2", "3.js").exists()).to.be.true();
        expect(await rootTmp.getFile("dir3").exists()).to.be.false();
    });

    it("should handle ignoring glob patterns with non glob targets", async () => {
        await FS.createStructure(rootTmp, [
            "1.txt",
            "1.js",
            ["dir", [
                "2.txt",
                "2.js",
                ["dir2", [
                    "3.txt",
                    "3.js"
                ]]
            ]],
            ["dir2", [
                "1.txt",
                "2.txt",
                "3.js"
            ]],
            ["dir3", [
                "1",
                "2",
                "3",
                ["dir4", [
                    "1"
                ]],
                ["dir5", []]
            ]]
        ]);
        await fs.rm(["dir", "dir2", "dir3", "!**/*.js", "!dir2/**"], { cwd: rootTmp.path() });
        expect(await rootTmp.getFile("1.txt").exists()).to.be.true();
        expect(await rootTmp.getFile("1.js").exists()).to.be.true();
        expect(await rootTmp.getFile("dir", "2.txt").exists()).to.be.false();
        expect(await rootTmp.getFile("dir", "2.js").exists()).to.be.true();
        expect(await rootTmp.getFile("dir", "dir2", "3.txt").exists()).to.be.false();
        expect(await rootTmp.getFile("dir", "dir2", "3.js").exists()).to.be.true();
        expect(await rootTmp.getFile("dir2", "1.txt").exists()).to.be.true();
        expect(await rootTmp.getFile("dir2", "2.txt").exists()).to.be.true();
        expect(await rootTmp.getFile("dir2", "3.js").exists()).to.be.true();
        expect(await rootTmp.getFile("dir3").exists()).to.be.false();
    });
});
