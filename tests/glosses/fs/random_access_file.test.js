const tmp = adone.std.path.join(adone.std.os.tmpdir(), "raf-" + process.pid + "-" + Date.now());
let i = 0;

try {
    adone.std.fs.mkdirSync(tmp);
} catch (err) {
    // ...
}

function gen() {
    return adone.std.path.join(tmp, ++i + ".txt");
}

describe("fs", "RandomAccessFile", function() {
    it("write and read", async function () {
        const file = await  adone.fs.RandomAccessFile.open(gen());
        let isOk = true;
        try {
            await file.write(new Buffer("hello"), 0);
            const buf = await file.read(5, 0);
            assert.deepEqual(buf, new Buffer("hello"));
            await file.close();
            await file.unlink();
        } catch (err) {
            isOk = false;
        }
        assert.isOk(isOk);
    });

    it("read empty", async function () {
        const file = await  adone.fs.RandomAccessFile.open(gen());
        let isOk = true;
        try {
            const buf = await file.read(0, 0);
            assert.deepEqual(buf, new Buffer(0));
            await file.close();
            await file.unlink();
        } catch (err) {
            isOk = false;
        }
        assert.isOk(isOk);
    });

    it("read range > file", async function () {
        const file = await  adone.fs.RandomAccessFile.open(gen());
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

    it("random access write and read", async function () {
        const file = await  adone.fs.RandomAccessFile.open(gen());
        let isOk = true;

        try {
            await file.write(new Buffer("hi"), 10);
            await file.write(new Buffer("hello"), 0);
            let buf = await file.read(2, 10);
            assert.deepEqual(buf, new Buffer("hi"));
            buf = await file.read(5, 0);
            assert.deepEqual(buf, new Buffer("hello"));
            buf = await file.read(5, 5);
            assert.deepEqual(buf, new Buffer([0, 0, 0, 0, 0]));
            await file.close();
            await file.unlink();
        } catch (err) {
            console.log(err);
            isOk = false;
        }
        assert.isOk(isOk);
    });

    it("re-open", async function () {
        const name = gen();
        const file = await  adone.fs.RandomAccessFile.open(name);
        let isOk = true;

        try {
            await file.write(new Buffer("hello"), 10);
            const file2 = await  adone.fs.RandomAccessFile.open(name);
            const buf = await file2.read(5, 10);
            assert.deepEqual(buf, new Buffer("hello"));
            await file.close();
            await file.unlink();
        } catch (err) {
            isOk = false;
        }
        assert.isOk(isOk);
    });

    it("re-open and truncate", async function () {
        const name = gen();
        const file = await  adone.fs.RandomAccessFile.open(name);
        let file2;
        let isOk = false;

        try {
            await file.write(new Buffer("hello"), 10);
            file2 = await  adone.fs.RandomAccessFile.open(name, { truncate: 0 });
            await file2.read(5, 10);
        } catch (err) {
            isOk = (err.message === "Could not satisfy length");
        }
        await file.close();
        await file.unlink();
        assert.isOk(isOk);
    });

    it("append mode", async function() {
        const name = gen();
        let file = await  adone.fs.RandomAccessFile.open(name, { appendable: true });
        let isOk = true;
        try {
            await file.write(new Buffer("hello"));
            await file.write(new Buffer(", "));
            await file.close();
            file = await  adone.fs.RandomAccessFile.open(name, { appendable: true });
            await file.write(new Buffer("world"));
            await file.write(new Buffer("!!!"));
            await file.close();
            file = await  adone.fs.RandomAccessFile.open(name, { writable: false });
            let buf = await file.read(7, 2);
            assert.deepEqual(buf, new Buffer("llo, wo"));
            buf = await file.read(2, 9);
            assert.deepEqual(buf, new Buffer("rl"));
            buf = await file.read(3, 11);
            assert.deepEqual(buf, new Buffer("d!!"));
            await file.close();
            await file.unlink();
        } catch (err) {
            console.log(err);
            isOk = false;
        }
        assert.isOk(isOk);
    });

    it("mkdir path", async function () {
        const name = adone.std.path.join(tmp, ++i + "-folder", "test.txt");
        const file = await  adone.fs.RandomAccessFile.open(name);
        let isOk = true;

        try {
            await file.write(new Buffer("hello"), 0);
            const buf = await file.read(5, 0);
            assert.deepEqual(buf, new Buffer("hello"));
            await file.close();
            await file.unlink();
        } catch (err) {
            isOk = false;
        }
        assert.isOk(isOk);
    });

    it("end", async function () {
        const name = gen();
        const atime = new Date(1000 * Math.round((Date.now() + 1000 * 60 * 60 * 10) / 1000));
        const mtime = new Date(1000 * Math.round((Date.now() + 1000 * 60 * 60 * 20) / 1000));
        const file = await  adone.fs.RandomAccessFile.open(name, { atime });
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
        const file = new adone.fs.RandomAccessFile("hello", { cwd: "2" });
        expect(file.filename).to.be.equal(adone.std.path.resolve("2", "hello"));
    });
});