const {
    fs,
    std
} = adone;

describe("fs", "rm", () => {
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
        const fixtures = [
            "1.tmp",
            "2.tmp",
            "3.tmp",
            "4.tmp",
            ".dot.tmp"
        ];

        let tmp;

        const exists = (files) => {
            for (const file of files) {
                assert.true(fs.existsSync(std.path.join(tmp, file)));
            }
        };

        const notExists = (files) => {
            for (const file of files) {
                assert.false(fs.existsSync(std.path.join(tmp, file)));
            }
        };

        beforeEach(async () => {
            tmp = await adone.fs.tmpName();

            for (const fixture of fixtures) {
                await adone.fs.mkdirp(std.path.join(tmp, fixture)); // eslint-disable-line
            }
        });

        afterEach(async () => {
            await fs.rm(tmp);
        });

        it("delete files", async () => {
            await fs.rm(["*.tmp", "!1*"], { cwd: tmp });

            exists(["1.tmp", ".dot.tmp"]);
            notExists(["2.tmp", "3.tmp", "4.tmp"]);
        });

        it("take options into account", async () => {
            await fs.rm(["*.tmp", "!1*"], {
                cwd: tmp,
                glob: {
                    dot: true
                }
            });

            exists(["1.tmp"]);
            notExists(["2.tmp", "3.tmp", "4.tmp", ".dot.tmp"]);
        });

        it.todo("return deleted files", async () => {
            assert.deepEqual(await fs.rm("1.tmp", { cwd: tmp }), [std.path.join(tmp, "1.tmp")]);
        });

        it.todo("don't delete files, but return them", async () => {
            const deletedFiles = await fs.rm(["*.tmp", "!1*"], {
                cwd: tmp,
                dryRun: true
            });
            exists(["1.tmp", "2.tmp", "3.tmp", "4.tmp", ".dot.tmp"]);
            assert.deepEqual(deletedFiles, [
                std.path.join(tmp, "2.tmp"),
                std.path.join(tmp, "3.tmp"),
                std.path.join(tmp, "4.tmp")
            ]);
        });
    });
});
