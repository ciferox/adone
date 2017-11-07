const {
    fs,
    std
} = adone;

const { os, crypto, path } = std;

/* global afterEach, beforeEach, describe, it */

const SIZE = 16 * 64 * 1024 + 7;
let TEST_DIR = "";

describe("fs", "copy", () => {
    beforeEach(async () => {
        TEST_DIR = path.join(os.tmpdir(), "fs", "copy");
        const dir = new fs.Directory(TEST_DIR);
        await dir.create();
        await dir.clean();
    });

    afterEach(async () => {
        await fs.rm(TEST_DIR);
    });

    it("should return an error if src and dest are the same", async () => {
        const fileSrc = path.join(TEST_DIR, "TEST_fs_copy");
        const fileDest = path.join(TEST_DIR, "TEST_fs_copy");
        const err = await assert.throws(async () => fs.copy(fileSrc, fileDest));
        assert.equal(err.message, "Source and destination must not be the same.");
    });

    describe("when the source is a file", () => {
        it("should copy the file asynchronously", async () => {
            const fileSrc = path.join(TEST_DIR, "TEST_fs_src");
            const fileDest = path.join(TEST_DIR, "TEST_fs_copy");
            std.fs.writeFileSync(fileSrc, crypto.randomBytes(SIZE));
            const srcMd5 = crypto.createHash("md5").update(std.fs.readFileSync(fileSrc)).digest("hex");
            let destMd5 = "";

            await fs.copy(fileSrc, fileDest);
            destMd5 = crypto.createHash("md5").update(std.fs.readFileSync(fileDest)).digest("hex");
            assert.strictEqual(srcMd5, destMd5);
        });

        it("should return an error if the source file does not exist", async () => {
            const fileSrc = "we-simply-assume-this-file-does-not-exist.bin";
            const fileDest = path.join(TEST_DIR, "TEST_fs_copy");

            await assert.throws(async () => fs.copy(fileSrc, fileDest));
        });

        it("should copy to a destination file with two '$' characters in name (eg: TEST_fs_$$_copy)", async () => {
            const fileSrc = path.join(TEST_DIR, "TEST_fs_src");
            const fileDest = path.join(TEST_DIR, "TEST_fs_$$_copy");

            std.fs.writeFileSync(fileSrc, "");

            await fs.copy(fileSrc, fileDest);
            fs.statSync(fileDest);
        });

        describe("when the destination dir does not exist", () => {
            it("should create the destination directory and copy the file", async () => {
                const src = path.join(TEST_DIR, "file.txt");
                const dest = path.join(TEST_DIR, "this/path/does/not/exist/copied.txt");
                const data = "did it copy?\n";

                std.fs.writeFileSync(src, data, "utf8");

                await fs.copy(src, dest);
                const data2 = fs.readFileSync(dest, "utf8");
                assert.strictEqual(data, data2);
            });
        });
    });

    describe("when the source is a directory", () => {
        describe("when the source directory does not exist", () => {
            it("should return an error", async () => {
                const ts = path.join(TEST_DIR, "this_dir_does_not_exist");
                const td = path.join(TEST_DIR, "this_dir_really_does_not_matter");
                await assert.throws(async () => fs.copy(ts, td));
            });
        });

        it("should copy the directory asynchronously", async () => {
            const FILES = 2;
            const src = path.join(TEST_DIR, "src");
            const dest = path.join(TEST_DIR, "dest");

            await fs.mkdirp(src);
            for (let i = 0; i < FILES; ++i) {
                fs.writeFileSync(path.join(src, i.toString()), crypto.randomBytes(SIZE));
            }

            const subdir = path.join(src, "subdir");
            await fs.mkdirp(subdir);
            for (let i = 0; i < FILES; ++i) {
                fs.writeFileSync(path.join(subdir, i.toString()), crypto.randomBytes(SIZE));
            }

            await fs.copy(src, dest);
            assert(fs.existsSync(dest));

            for (let i = 0; i < FILES; ++i) {
                assert(fs.existsSync(path.join(dest, i.toString())));
            }

            const destSub = path.join(dest, "subdir");
            for (let j = 0; j < FILES; ++j) {
                assert(fs.existsSync(path.join(destSub, j.toString())));
            }
        });

        describe("when the destination dir does not exist", () => {
            it("should create the destination directory and copy the file", async () => {
                const src = path.join(TEST_DIR, "data/");
                await fs.mkdirp(src);
                const d1 = "file1";
                const d2 = "file2";

                std.fs.writeFileSync(path.join(src, "f1.txt"), d1);
                std.fs.writeFileSync(path.join(src, "f2.txt"), d2);

                const dest = path.join(TEST_DIR, "this/path/does/not/exist/outputDir");

                await fs.copy(src, dest);
                const o1 = fs.readFileSync(path.join(dest, "f1.txt"), "utf8");
                const o2 = fs.readFileSync(path.join(dest, "f2.txt"), "utf8");

                assert.strictEqual(d1, o1);
                assert.strictEqual(d2, o2);
            });
        });

        describe("when src dir does not exist", () => {
            it("should have thrown", async () => {
                await assert.throws(async () => fs.copy("/does/not/exist", "/something/else"));
            });
        });
    });

    describe("when filter is used", () => {
        it("should only copy files allowed by filter fn", async () => {
            const srcFile1 = path.join(TEST_DIR, "1.css");
            std.fs.writeFileSync(srcFile1, "");
            const destFile1 = path.join(TEST_DIR, "dest1.css");
            const filter = (s) => s.split(".").pop() !== "css";

            await fs.copy(srcFile1, destFile1, { filter });
            assert(!fs.existsSync(destFile1));
        });

        it("accepts options object in place of filter", async () => {
            const srcFile1 = path.join(TEST_DIR, "1.jade");
            std.fs.writeFileSync(srcFile1, "");
            const destFile1 = path.join(TEST_DIR, "dest1.jade");
            const options = { filter: (s) => /.html$|.css$/i.test(s) };

            await fs.copy(srcFile1, destFile1, options);
            assert(!fs.existsSync(destFile1));
        });

        it("should should apply filter recursively", async () => {
            const FILES = 2;
            // Don't match anything that ends with a digit higher than 0:
            const filter = (s) => /(0|\D)$/i.test(s);

            const src = path.join(TEST_DIR, "src");
            await fs.mkdirp(src);

            for (let i = 0; i < FILES; ++i) {
                std.fs.writeFileSync(path.join(src, i.toString()), crypto.randomBytes(SIZE));
            }

            const subdir = path.join(src, "subdir");
            await fs.mkdirp(subdir);

            for (let i = 0; i < FILES; ++i) {
                std.fs.writeFileSync(path.join(subdir, i.toString()), crypto.randomBytes(SIZE));
            }
            const dest = path.join(TEST_DIR, "dest");
            await fs.copy(src, dest, { filter });
            assert(std.fs.existsSync(dest));
            assert(FILES > 1);

            for (let i = 0; i < FILES; ++i) {
                if (i === 0) {
                    assert(std.fs.existsSync(path.join(dest, i.toString())));
                } else {
                    assert(!std.fs.existsSync(path.join(dest, i.toString())));
                }
            }

            const destSub = path.join(dest, "subdir");

            for (let j = 0; j < FILES; ++j) {
                if (j === 0) {
                    assert(std.fs.existsSync(path.join(destSub, j.toString())));
                } else {
                    assert(!std.fs.existsSync(path.join(destSub, j.toString())));
                }
            }
        });

        it("should apply the filter to directory names", async () => {
            const IGNORE = "ignore";
            const filter = (p) => !~p.indexOf(IGNORE);

            const src = path.join(TEST_DIR, "src");
            await fs.mkdirp(src);

            const ignoreDir = path.join(src, IGNORE);
            await fs.mkdirp(ignoreDir);

            std.fs.writeFileSync(path.join(ignoreDir, "file"), crypto.randomBytes(SIZE));

            const dest = path.join(TEST_DIR, "dest");

            await fs.copy(src, dest, { filter });

            assert(!fs.existsSync(path.join(dest, IGNORE)), "directory was not ignored");
            assert(!fs.existsSync(path.join(dest, IGNORE, "file")), "file was not ignored");
        });

        it("should apply filter when it is applied only to dest", async () => {
            const timeCond = new Date().getTime();

            const filter = (s, d) => fs.statSync(d).birthtime.getTime() < timeCond;

            const src = path.join(TEST_DIR, "src");
            await fs.mkdirp(src);
            const subdir = path.join(src, "subdir");
            await fs.mkdirp(subdir);

            const dest = path.join(TEST_DIR, "dest");

            await adone.promise.delay(1000);
            await fs.mkdirp(dest);

            await fs.copy(src, dest, { filter });
            assert(!std.fs.existsSync(path.join(dest, "subdir")));
        });

        it("should apply filter when it is applied to both src and dest", async () => {
            const timeCond = new Date().getTime();
            const filter = (s, d) => s.split(".").pop() !== "css" && fs.statSync(path.dirname(d)).birthtime.getTime() > timeCond;

            const dest = path.join(TEST_DIR, "dest");
            await adone.promise.delay(1000);
            await fs.mkdirp(dest);

            const srcFile1 = path.join(TEST_DIR, "1.html");
            const srcFile2 = path.join(TEST_DIR, "2.css");
            const srcFile3 = path.join(TEST_DIR, "3.jade");

            std.fs.writeFileSync(srcFile1, "");
            std.fs.writeFileSync(srcFile2, "");
            std.fs.writeFileSync(srcFile3, "");

            const destFile1 = path.join(dest, "dest1.html");
            const destFile2 = path.join(dest, "dest2.css");
            const destFile3 = path.join(dest, "dest3.jade");

            await fs.copy(srcFile1, destFile1, { filter });
            assert(fs.existsSync(destFile1));

            await fs.copy(srcFile2, destFile2, { filter });
            assert(!fs.existsSync(destFile2));

            await fs.copy(srcFile3, destFile3, { filter });
            assert(fs.existsSync(destFile3));
        });
    });

    describe("when src is /dev/null", () => {
        it("should copy successfully", async () => {
            // no /dev/null on windows
            if (!adone.is.windows) {
                const tmpFile = path.join(TEST_DIR, "foo");

                await fs.copy("/dev/null", tmpFile);
                const stats = fs.lstatSync(tmpFile);
                assert.strictEqual(stats.size, 0);
            }
        });
    });

    describe("permissions", () => {
        const o777 = parseInt("777", 8);
        const o666 = parseInt("666", 8);
        const o444 = parseInt("444", 8);

        // pretty UNIX specific, may not pass on windows... only tested on Mac OS X 10.9
        it("should maintain file permissions and ownership", async () => {
            if (adone.is.windows) {
                return;
            }

            // var userid = require('userid')

            // http://man7.org/linux/man-pages/man2/stat.2.html
            const S_IFREG = parseInt("0100000", 8); // regular file
            const S_IFDIR = parseInt("0040000", 8); // directory

            // these are Mac specific I think (at least staff), should find Linux equivalent
            let gidWheel;
            let gidStaff;

            try {
                gidWheel = process.getgid(); // userid.gid('wheel')
            } catch (err) {
                gidWheel = process.getgid();
            }

            try {
                gidStaff = process.getgid(); // userid.gid('staff')
            } catch (err) {
                gidStaff = process.getgid();
            }

            const permDir = path.join(TEST_DIR, "perms");
            std.fs.mkdirSync(permDir);

            const srcDir = path.join(permDir, "src");
            std.fs.mkdirSync(srcDir);

            const f1 = path.join(srcDir, "f1.txt");
            std.fs.writeFileSync(f1, "");
            std.fs.chmodSync(f1, o666);
            std.fs.chownSync(f1, process.getuid(), gidWheel);
            const f1stats = std.fs.lstatSync(f1);
            assert.strictEqual(f1stats.mode - S_IFREG, o666);

            const d1 = path.join(srcDir, "somedir");
            std.fs.mkdirSync(d1);
            std.fs.chmodSync(d1, o777);
            std.fs.chownSync(d1, process.getuid(), gidStaff);
            const d1stats = std.fs.lstatSync(d1);
            assert.strictEqual(d1stats.mode - S_IFDIR, o777);

            const f2 = path.join(d1, "f2.bin");
            std.fs.writeFileSync(f2, "");
            std.fs.chmodSync(f2, o777);
            std.fs.chownSync(f2, process.getuid(), gidStaff);
            const f2stats = std.fs.lstatSync(f2);
            assert.strictEqual(f2stats.mode - S_IFREG, o777);

            const d2 = path.join(srcDir, "crazydir");
            std.fs.mkdirSync(d2);
            std.fs.chmodSync(d2, o444);
            std.fs.chownSync(d2, process.getuid(), gidWheel);
            const d2stats = std.fs.lstatSync(d2);
            assert.strictEqual(d2stats.mode - S_IFDIR, o444);

            const destDir = path.join(permDir, "dest");
            await fs.copy(srcDir, destDir);

            const newf1stats = std.fs.lstatSync(path.join(permDir, "dest/f1.txt"));
            const newd1stats = std.fs.lstatSync(path.join(permDir, "dest/somedir"));
            const newf2stats = std.fs.lstatSync(path.join(permDir, "dest/somedir/f2.bin"));
            const newd2stats = std.fs.lstatSync(path.join(permDir, "dest/crazydir"));

            assert.strictEqual(newf1stats.mode, f1stats.mode);
            assert.strictEqual(newd1stats.mode, d1stats.mode);
            assert.strictEqual(newf2stats.mode, f2stats.mode);
            assert.strictEqual(newd2stats.mode, d2stats.mode);

            assert.strictEqual(newf1stats.gid, f1stats.gid);
            assert.strictEqual(newd1stats.gid, d1stats.gid);
            assert.strictEqual(newf2stats.gid, f2stats.gid);
            assert.strictEqual(newd2stats.gid, d2stats.gid);

            assert.strictEqual(newf1stats.uid, f1stats.uid);
            assert.strictEqual(newd1stats.uid, d1stats.uid);
            assert.strictEqual(newf2stats.uid, f2stats.uid);
            assert.strictEqual(newd2stats.uid, d2stats.uid);
        });
    });

    const describeIf64 = adone.is.windows ? describe.skip : describe;
    
    describeIf64("preserve times", () => {
        describe("modification option", () => {
            const SRC_FIXTURES_DIR = path.join(__dirname, "fixtures", "copy");
            const FILES = ["a-file", path.join("a-folder", "another-file"), path.join("a-folder", "another-folder", "file3")];

            const testFile = (options) => {
                return function (file) {
                    const a = path.join(SRC_FIXTURES_DIR, file);
                    const b = path.join(TEST_DIR, file);
                    const fromStat = std.fs.statSync(a);
                    const toStat = std.fs.statSync(b);
                    if (options.preserveTimestamps) {
                        // https://github.com/nodejs/io.js/issues/2069
                        if (process.platform !== "win32") {
                            assert.strictEqual(toStat.mtime.getTime(), fromStat.mtime.getTime());
                            assert.strictEqual(toStat.atime.getTime(), fromStat.atime.getTime());
                        } else {
                            assert.strictEqual(toStat.mtime.getTime(), std.fs.utimes.timeRemoveMillis(fromStat.mtime.getTime()));
                            assert.strictEqual(toStat.atime.getTime(), std.fs.utimes.timeRemoveMillis(fromStat.atime.getTime()));
                        }
                    } else {
                        assert.notEqual(toStat.mtime.getTime(), fromStat.mtime.getTime());
                        // the access time might actually be the same, so check only modification time
                    }
                };
            };

            describe("when modified option is turned off", () => {
                it("should have different timestamps on copy", async () => {
                    const from = path.join(SRC_FIXTURES_DIR);
                    const to = path.join(TEST_DIR);

                    await fs.copy(from, to, { preserveTimestamps: false });
                    FILES.forEach(testFile({ preserveTimestamps: false }));
                });
            });

            describe("when modified option is turned on", () => {
                it("should have the same timestamps on copy", async () => {
                    const from = path.join(SRC_FIXTURES_DIR);
                    const to = path.join(TEST_DIR);

                    await fs.copy(from, to, { preserveTimestamps: true });
                    FILES.forEach(testFile({ preserveTimestamps: true }));
                });
            });
        });
    });
});
