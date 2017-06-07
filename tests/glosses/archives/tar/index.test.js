const { is: { windows }, noop, archive: { tar }, std } = adone;


describe("glosses", "archives", "tar", () => {
    const mtime = function (st) {
        return Math.floor(st.mtime.getTime() / 1000);
    };

    const fixtures = new adone.fs.Directory(std.path.join(__dirname, "fixtures"));

    beforeEach(async () => {
        await fixtures.getVirtualDirectory("copy").unlink().catch(noop);
    });

    specify("copy a -> copy/a", async () => {
        const a = fixtures.getVirtualDirectory("a");
        const b = fixtures.getVirtualDirectory("copy", "a");

        await new Promise((resolve) => {
            tar.packStream(a.path()).pipe(tar.extractStream(b.path())).on("finish", resolve);
        });

        const files = await b.files();
        expect(files).to.have.lengthOf(1);
        expect(files[0].filename()).to.be.equal("hello.txt");

        const fileA = a.getVirtualFile("hello.txt");
        const fileB = b.getVirtualFile("hello.txt");

        const aStat = await fileA.stat();
        const bStat = await fileB.stat();

        expect(aStat.mode).to.be.equal(bStat.mode);
        expect(mtime(aStat)).to.be.equal(mtime(bStat));
        expect(await fileA.content()).to.be.equal(await fileB.content());
    });

    specify("copy b -> copy/b", async () => {
        const a = fixtures.getVirtualDirectory("b");
        const b = fixtures.getVirtualDirectory("copy", "b");

        await new Promise((resolve) => {
            tar.packStream(a.path()).pipe(tar.extractStream(b.path())).on("finish", resolve);
        });

        const files = await b.files();
        expect(files).to.have.lengthOf(1);
        expect(files[0].filename()).to.be.equal("a");

        const dirA = a.getVirtualDirectory("a");
        const dirB = b.getVirtualDirectory("a");

        const adStat = await dirA.stat();
        const bdStat = await dirB.stat();

        expect(adStat.mode).to.be.equal(bdStat.mode);
        expect(mtime(adStat)).to.be.equal(mtime(bdStat));
        expect(bdStat.isDirectory()).to.be.true;

        const fileA = dirA.getVirtualFile("test.txt");
        const fileB = dirB.getVirtualFile("test.txt");

        const aStat = await fileA.stat();
        const bStat = await fileB.stat();

        expect(aStat.mode).to.be.equal(bStat.mode);
        expect(mtime(aStat)).to.be.equal(mtime(bStat));
        expect(await fileA.content()).to.be.equal(await fileB.content());
    });

    specify("symlink", async function () {
        if (windows) {  // no symlink support on win32 currently. TODO: test if this can be enabled somehow
            this.skip();
            return;
        }

        const a = fixtures.getVirtualDirectory("c");
        const b = fixtures.getVirtualDirectory("copy", "c");

        const hello = fixtures.getVirtualFile("a", "hello.txt");
        const link = fixtures.getVirtualFile("c", "link");
        await link.unlink().catch(noop);
        await hello.symbolicLink(link);

        await new Promise((resolve) => {
            tar.packStream(a.path()).pipe(tar.extractStream(b.path())).on("finish", resolve);
        });

        const files = (await b.files()).map((x) => x.filename()).sort();

        expect(files).to.have.lengthOf(2);
        expect(files).to.be.deep.equal([".gitignore", "link"]);

        const linkA = a.getVirtualSymbolicLinkFile("link");
        const linkB = b.getVirtualSymbolicLinkFile("link");

        const lstatA = await linkA.lstat();
        const lstatB = await linkB.lstat();

        expect(mtime(lstatA)).to.be.equal(mtime(lstatB));
        expect(await linkA.content()).to.be.equal(await linkB.content());
    });

    specify("follow symlinks", async () => {
        if (windows) {  // no symlink support on win32 currently. TODO: test if this can be enabled somehow
            this.skip();
            return;
        }

        const a = fixtures.getVirtualDirectory("c");
        const b = fixtures.getVirtualDirectory("copy", "c-dereference");

        const hello = fixtures.getVirtualFile("a", "hello.txt");
        const link = fixtures.getVirtualFile("c", "link");
        await link.unlink().catch(noop);
        await hello.symbolicLink(link);

        await new Promise((resolve) => {
            tar.packStream(a.path(), { dereference: true }).pipe(tar.extractStream(b.path())).on("finish", resolve);
        });

        const files = (await b.files()).map((x) => x.filename()).sort();

        expect(files).to.have.lengthOf(2);
        expect(files).to.be.deep.equal([".gitignore", "link"]);

        const file1 = fixtures.getVirtualFile("a", "hello.txt");
        const file2 = b.getVirtualFile("link");

        const stat1 = await file1.lstat();
        const stat2 = await file2.lstat();
        expect(stat2.isSymbolicLink()).to.be.false;
        expect(mtime(stat1)).to.be.equal(mtime(stat2));
        expect(await file1.content()).to.be.equal(await file2.content());
    });

    specify("strip", async () => {
        const a = fixtures.getVirtualDirectory("b");
        const b = fixtures.getVirtualDirectory("copy", "b-strip");

        await new Promise((resolve) => {
            tar.packStream(a.path()).pipe(tar.extractStream(b.path(), { strip: 1 })).on("finish", resolve);
        });

        const files = await b.files();

        expect(files).to.have.lengthOf(1);
        expect(files[0].relativePath(b)).to.be.equal("test.txt");
    });

    specify("strip + map", async () => {
        const a = fixtures.getVirtualDirectory("b");
        const b = fixtures.getVirtualDirectory("copy", "b-strip");

        const uppercase = (header) => {
            header.name = header.name.toUpperCase();
            return header;
        };

        await new Promise((resolve) => {
            tar.packStream(a.path()).pipe(tar.extractStream(b.path(), { map: uppercase, strip: 1 })).on("finish", resolve);
        });

        const files = await b.files();

        expect(files).to.have.lengthOf(1);
        expect(files[0].relativePath(b)).to.be.equal("TEST.TXT");
    });

    specify("map + dir + permissions", async () => {
        const a = fixtures.getVirtualDirectory("b");
        const b = fixtures.getVirtualDirectory("copy", "b-perms");

        const aWithMode = function (header) {
            if (header.name === "a") {
                header.mode = parseInt(700, 8);
            }
            return header;
        };

        await new Promise((resolve) => {
            tar.packStream(a.path()).pipe(tar.extractStream(b.path(), { map: aWithMode })).on("finish", resolve);
        });

        const files = await b.files();

        expect(files).to.have.lengthOf(1);
        const stat = await files[0].stat();
        if (!windows) {
            expect(stat.mode & 0o777).to.be.equal(0o700);
        }
    });

    specify("specific entries", async () => {
        const a = fixtures.getVirtualDirectory("d");
        const b = fixtures.getVirtualDirectory("copy", "d-entries");

        const entries = ["file1", "sub-files/file3", "sub-dir"];

        await new Promise((resolve) => {
            tar.packStream(a.path(), { entries }).pipe(tar.extractStream(b.path())).on("finish", resolve);
        });

        const files = await b.files();
        expect(files).to.have.lengthOf(3);
        expect(files.map((x) => x.relativePath(b)).sort()).to.be.deep.equal([
            "file1", "sub-dir", "sub-files"
        ]);

        const subFiles = await b.getVirtualDirectory("sub-files").files();
        expect(subFiles).to.have.lengthOf(1);
        expect(subFiles[0].filename()).to.be.equal("file3");

        const subDir = await b.getVirtualDirectory("sub-dir").files();
        expect(subDir).to.have.lengthOf(1);
        expect(subDir[0].filename()).to.be.equal("file5");
    });

    specify("check type while mapping header on packing", (done) => {
        const a = fixtures.getVirtualDirectory("e");

        const checkHeaderType = function (header) {
            if (header.name.indexOf(".") === -1) {
                expect(header.type).to.be.equal(header.name);
                done();
            }
        };

        tar.packStream(a.path(), { map: checkHeaderType });
    });
});

