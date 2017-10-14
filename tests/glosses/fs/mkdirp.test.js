describe("fs", "mkdirp", () => {
    const {
        fs
    } = adone;

    /**
     * @type {adone.fs.Directory}
     */
    let tmp;

    before(async () => {
        tmp = await fs.Directory.createTmp();
    });

    afterEach(async () => {
        await tmp.clean();
    });

    after(async () => {
        await tmp.unlink();
    });

    it("should create a directory with necessary subdirectories", async () => {
        const p = tmp.getDirectory("a", "b", "c", "d");
        await fs.mkdirp(p.path());
        const stat = await p.stat();
        expect(stat.isDirectory()).to.be.true;
    });

    it("should return the first created directory", async () => {
        const p = tmp.getDirectory("a", "b", "c", "d").path();
        const expected = tmp.getDirectory("a").path();
        expect(await fs.mkdirp(p)).to.be.equal(expected);
    });

    it("should return null if nothing was created", async () => {
        const p = tmp.getDirectory("a", "b", "c", "d").path();
        expect(await fs.mkdirp(p)).not.to.be.null;
        expect(await fs.mkdirp(p)).to.be.null;
    });

    it("should throw if the file already exists and it is not a directory", async () => {
        const parent = tmp.getDirectory("a", "b", "c");
        const file = parent.getFile("d");
        await fs.mkdirp(parent.path());
        await fs.writeFile(file.path(), "hello");
        await assert.throws(async () => {
            await fs.mkdirp(file.path());
        }, "EEXIST: file already exists");
        const stat = await file.stat();
        expect(stat.isFile()).to.be.true;
    });

    it("should support array argument", async () => {
        const parent = tmp.getDirectory("a", "b", "c");
        const paths = [
            parent.getDirectory("d"),
            parent.getDirectory("e"),
            parent.getDirectory("f", "g", "h"),
            parent.getDirectory("..", "..", "k")
        ];
        const ret = await fs.mkdirp(paths.map((x) => x.path()));
        await Promise.all(paths.map(async (p) => {
            const stat = await p.stat();
            expect(stat.isDirectory()).to.be.true;
        }));
        expect(ret).to.be.an("array");
        expect(ret).to.have.lengthOf(4);
        for (const r of ret) {
            expect(r).to.be.ok; // race condition, but they must be truthy
        }
    });

    it("should support a custom mode", async () => {
        const a = tmp.getDirectory("a");
        const b = a.getDirectory("b");
        await fs.mkdirp(b.path(), 0o755);
        expect((await a.stat()).mode & 0o777).to.be.equal(0o755);
        expect((await b.stat()).mode & 0o777).to.be.equal(0o755);
    });

    it("should support a custom mode for arrays", async () => {
        const parent = tmp.getDirectory("a", "b", "c");
        const paths = [
            parent.getDirectory("d"),
            parent.getDirectory("e"),
            parent.getDirectory("f", "g", "h"),
            parent.getDirectory("..", "..", "k")
        ];
        await fs.mkdirp(paths.map((x) => x.path()), 0o755);
        await Promise.all(paths.map(async (p) => {
            const stat = await p.stat();
            expect(stat.mode & 0o777).to.be.equal(0o755);
            const parent = p.getDirectory("..");
            const pstat = await parent.stat();
            expect(pstat.mode & 0o777).to.be.equal(0o755);
        }));
    });
});
