const { fs } = adone;
const { path } = adone.std;

describe("fs", () => {
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

    describe("tail", () => {
        const path = (a) => adone.std.path.join(__dirname, "fixtures", "tail", a);
        const { tail } = adone.fs;

        it("should read the last 10", async () => {
            const res = await tail(path("a"));
            expect(res).to.have.lengthOf(10);
            expect(res).to.be.deep.equal([
                "4", "5", "6", "7", "8", "9",
                "10", "11", "12", "13"
            ].map(Buffer.from));
        });

        it("should have an empty buffer at the end", async () => {
            const res = await tail(path("b"));
            expect(res).to.have.lengthOf(10);
            expect(res).to.be.deep.equal([
                "5", "6", "7", "8", "9",
                "10", "11", "12", "13", ""
            ].map(Buffer.from));
        });

        it("should return 3 lines", async () => {
            const res = await tail(path("a"), 3);
            expect(res).to.have.lengthOf(3);
            expect(res).to.be.deep.equal([
                "11", "12", "13"
            ].map(Buffer.from));
        });

        it("should use a custom separator", async () => {
            const res = await tail(path("c"), 3, { separator: ",,," });
            expect(res).to.be.deep.equal([
                "7", "8", "9"
            ].map(Buffer.from));
        });

        it("should read all the lines", async () => {
            const res = await tail(path("a"), 100);
            expect(res).to.be.deep.equal([
                "1", "2", "3", "4", "5", "6", "7", "8", "9",
                "10", "11", "12", "13"
            ].map(Buffer.from));
        });

        it("should correctly work with different chuck lengths", async () => {
            let res = await tail(path("a"), 10, { chunkLength: 10101010 });
            expect(res).to.be.deep.equal([
                "4", "5", "6", "7", "8", "9",
                "10", "11", "12", "13"
            ].map(Buffer.from), "1");
            res = await tail(path("a"), 10, { chunkLength: 1 });
            expect(res).to.be.deep.equal([
                "4", "5", "6", "7", "8", "9",
                "10", "11", "12", "13"
            ].map(Buffer.from), "2");
            res = await tail(path("a"), 100, { chunkLength: 1 });
            expect(res).to.be.deep.equal([
                "1", "2", "3", "4", "5", "6", "7", "8", "9",
                "10", "11", "12", "13"
            ].map(Buffer.from), "3");
            res = await tail(path("a"), 100, { chunkLength: 101010 });
            expect(res).to.be.deep.equal([
                "1", "2", "3", "4", "5", "6", "7", "8", "9",
                "10", "11", "12", "13"
            ].map(Buffer.from), "4");
        });
    });

    describe("rm", () => {
        it("should delete a file", async () => {
            const tmp = await rootTmp.addDirectory("tmp");
            const file = await tmp.addFile("test.js");
            try {
                await fs.rm(file.path());
                expect(await file.exists()).to.be.false;
            } finally {
                await tmp.unlink();
            }
        });

        it("should delete a directory", async () => {
            const tmp = await rootTmp.addDirectory("tmp");
            const dir = await tmp.addDirectory("test");
            try {
                await fs.rm(dir.path());
                expect(await dir.exists()).to.be.false;
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
                expect(await dir.exists()).to.be.false;
                expect(await tmp.find({ files: true, dirs: true })).to.be.empty;
            } finally {
                await tmp.unlink();
            }
        });

        it("should use cwd", async () => {
            const tmp = await rootTmp.addDirectory("tmp");
            const file = await tmp.addFile("hello");
            try {
                await fs.rm(file.relativePath(tmp), { cwd: tmp.path() });
                expect(await file.exists()).to.be.false;
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
            const err = await fs.rm(`${tmp.getVirtualFile("hello").path()}*`).catch((err) => err);
            expect(await file1.exists()).to.be.false;
            expect(await file2.exists()).to.be.false;
            await tmp.unlink();
            expect(err).to.be.not.ok;
        });
    });

    describe("append", () => {
        it("should append to file", async () => {
            const tmp = await rootTmp.addDirectory("tmp");
            const tmpFile = path.join(tmp.path(), "appended");
            await fs.append(tmpFile, "hello\n");
            expect(await fs.readLines(tmpFile)).to.be.deep.equal(["hello", ""]);
            await fs.append(tmpFile, "world");
            expect(await fs.readLines(tmpFile)).to.be.deep.equal(["hello", "world"]);
        });
    });
});
