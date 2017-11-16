describe("fs", "RandomAccessFile", () => {
    const {
        fs: {
            RandomAccessFile
        },
        is
    } = adone;

    /**
     * @type {adone.fs.Directory}
     */
    let tmpdir;
    let filepath;

    before(async () => {
        tmpdir = await adone.fs.Directory.createTmp();
        filepath = tmpdir.getFile("test").path();
    });

    afterEach(async () => {
        await tmpdir.clean();
    });

    after(async () => {
        await tmpdir.unlink();
    });

    it("write and read", async () => {
        const file = await RandomAccessFile.open(filepath);
        let isOk = true;
        try {
            await file.write(Buffer.from("hello"), 0);
            const buf = await file.read(5, 0);
            assert.deepEqual(buf, Buffer.from("hello"));
            await file.close();
            await file.unlink();
        } catch (err) {
            isOk = false;
        }
        assert.isOk(isOk);
    });

    it("read empty", async () => {
        const file = await RandomAccessFile.open(filepath);
        let isOk = true;
        try {
            const buf = await file.read(0, 0);
            assert.deepEqual(buf, Buffer.alloc(0));
            await file.close();
            await file.unlink();
        } catch (err) {
            isOk = false;
        }
        assert.isOk(isOk);
    });

    it("read range > file", async () => {
        const file = await RandomAccessFile.open(filepath);
        let isOk = false;
        try {
            await file.read(5, 0);
        } catch (err) {
            isOk = (err.message === "Could not satisfy length");
        }
        await file.close();
        await file.unlink();
        assert.isOk(isOk);
    });

    it("random access write and read", async () => {
        const file = await RandomAccessFile.open(filepath);
        let isOk = true;

        try {
            await file.write(Buffer.from("hi"), 10);
            await file.write(Buffer.from("hello"), 0);
            let buf = await file.read(2, 10);
            assert.deepEqual(buf, Buffer.from("hi"));
            buf = await file.read(5, 0);
            assert.deepEqual(buf, Buffer.from("hello"));
            buf = await file.read(5, 5);
            assert.deepEqual(buf, Buffer.from([0, 0, 0, 0, 0]));
            await file.close();
            await file.unlink();
        } catch (err) {
            console.log(err);
            isOk = false;
        }
        assert.isOk(isOk);
    });

    it("re-open", async () => {
        const name = filepath;
        const file = await RandomAccessFile.open(name);
        let isOk = true;

        try {
            await file.write(Buffer.from("hello"), 10);
            const file2 = await RandomAccessFile.open(name);
            const buf = await file2.read(5, 10);
            assert.deepEqual(buf, Buffer.from("hello"));
            await file.close();
            await file2.close();
            await file.unlink();
        } catch (err) {
            isOk = false;
        }
        assert.isOk(isOk);
    });

    it("re-open and truncate", async () => {
        const name = filepath;
        const file = await RandomAccessFile.open(name);
        let file2;
        let isOk = false;

        try {
            await file.write(Buffer.from("hello"), 10);
            file2 = await RandomAccessFile.open(name, { truncate: 0 });
            await file2.read(5, 10);
        } catch (err) {
            isOk = (err.message === "Could not satisfy length");
        }
        await file.close();
        await file2.close();
        await file.unlink();
        assert.isOk(isOk);
    });

    it.only("append mode", {
        skip: is.windows
    }, async () => {
        const name = filepath;
        let file = await RandomAccessFile.open(name, { appendable: true });
        let isOk = true;
        try {
            await file.write(Buffer.from("hello"));
            await file.write(Buffer.from(", "));
            await file.close();
            file = await RandomAccessFile.open(name, { appendable: true });
            await file.write(Buffer.from("world"));
            await file.write(Buffer.from("!!!"));
            await file.close();
            file = await RandomAccessFile.open(name, { writable: false });
            let buf = await file.read(7, 2);
            assert.deepEqual(buf, Buffer.from("llo, wo"));
            buf = await file.read(2, 9);
            assert.deepEqual(buf, Buffer.from("rl"));
            buf = await file.read(3, 11);
            assert.deepEqual(buf, Buffer.from("d!!"));
            await file.close();
            await file.unlink();
        } catch (err) {
            console.log(err);
            isOk = false;
        }
        assert.isOk(isOk);
    });

    it("mkdir path", async () => {
        const name = tmpdir.getFile("a", "b", "c", "d.txt").path();
        const file = await RandomAccessFile.open(name);
        let isOk = true;

        try {
            await file.write(Buffer.from("hello"), 0);
            const buf = await file.read(5, 0);
            assert.deepEqual(buf, Buffer.from("hello"));
            await file.close();
            await file.unlink();
        } catch (err) {
            isOk = false;
        }
        assert.isOk(isOk);
    });

    it("end", async () => {
        const name = filepath;
        const atime = new Date(1000 * Math.round((Date.now() + 1000 * 60 * 60 * 10) / 1000));
        const mtime = new Date(1000 * Math.round((Date.now() + 1000 * 60 * 60 * 20) / 1000));
        const file = await RandomAccessFile.open(name, { atime });
        let isOk = true;
        try {
            await file.end();
            let stats = await adone.fs.stat(name);
            assert.deepEqual(stats.atime, atime);
            assert.notDeepEqual(stats.mtime, mtime);
            await file.end({ mtime });
            stats = await adone.fs.stat(name);
            assert.deepEqual(stats.mtime, mtime);
            assert.deepEqual(stats.atime, atime);
            await file.close();
            await file.unlink();
        } catch (err) {
            isOk = false;
        }
        assert.isOk(isOk);
    });

    it("should resolve the filename's path", () => {
        const file = new RandomAccessFile("hello", { cwd: "2" });
        expect(file.filename).to.be.equal(adone.std.path.resolve("2", "hello"));
    });
});
