import bl from "bl";

const {
    is,
    fs2: { custom: { MemoryFileSystem, createError } },
    std: { url: { URL } }
} = adone;
const { DEFAULT_ROOT_UID, DEFAULT_ROOT_GID, DEFAULT_FILE_PERM, DEFAULT_DIRECTORY_PERM, DEFAULT_SYMLINK_PERM } = MemoryFileSystem;

describe("fs2", "custom", "memory2", () => {
    describe("errors", () => {
        it("navigating invalid paths - sync", () => {
            const fs = new MemoryFileSystem();
            // fs.mkdirpSync("/test/a/b/c");
            // fs.mkdirpSync("/test/a/bc");
            // fs.mkdirpSync("/test/abc");
            assert.throws(() => {
                fs.readdirSync("/test/abc/a/b/c");
            });
            assert.throws(() => {
                fs.readdirSync("/abc");
            });
            assert.throws(() => {
                fs.statSync("/abc");
            });
            assert.throws(() => {
                fs.mkdirSync("/test/a/d/b/c");
            });
            assert.throws(() => {
                fs.writeFileSync("/test/a/d/b/c", "Hello");
            });
            assert.throws(() => {
                fs.readFileSync("/test/a/d/b/c");
            });
            assert.throws(() => {
                fs.readFileSync("/test/abcd");
            });
            assert.throws(() => {
                fs.mkdirSync("/test/abcd/dir");
            });
            assert.throws(() => {
                fs.unlinkSync("/test/abcd");
            });
            assert.throws(() => {
                fs.unlinkSync("/test/abcd/file");
            });
            assert.throws(() => {
                fs.statSync("/test/a/d/b/c");
            });
            assert.throws(() => {
                fs.statSync("/test/abcd");
            });
        });

        it("various failure situations - sync", () => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/test");
            fs.mkdirSync("/test/dir");
            fs.writeFileSync("/test/file", "Hello");
            assert.throws(() => {
                fs.writeFileSync("/test/dir", "Hello");
            });
            assert.throws(() => {
                fs.writeFileSync("/", "Hello");
            });
            assert.throws(() => {
                fs.rmdirSync("/");
            });
            assert.throws(() => {
                fs.unlinkSync("/");
            });
            assert.throws(() => {
                fs.mkdirSync("/test/dir");
            });
            assert.throws(() => {
                fs.mkdirSync("/test/file");
            });
            assert.throws(() => {
                fs.mkdirSync("/test/file");
            });
            assert.throws(() => {
                fs.readdirSync("/test/file");
            });
            assert.throws(() => {
                fs.readlinkSync("/test/dir");
            });
            assert.throws(() => {
                fs.readlinkSync("/test/file");
            });
        });

        it("asynchronous errors are passed to callbacks - async", (done) => {
            const fs = new MemoryFileSystem();
            fs.readFile("/nonexistent/", (err, content) => {
                assert.isTrue(err instanceof Error);
                fs.writeFile("/fail/file", "", (err) => {
                    assert.isTrue(err instanceof Error);
                    fs.mkdir("/cannot/do/this", (err) => {
                        assert.isTrue(err instanceof Error);
                        fs.readlink("/nolink", (err) => {
                            assert.isTrue(err instanceof Error);
                            done();
                        });
                    });
                });
            });
        });
    });

    describe("stat types", () => {
        it("file stat makes sense - sync", () => {
            const fs = new MemoryFileSystem();
            fs.writeFileSync("/test", "test data");
            const stat = fs.statSync("/test");
            assert.isTrue(stat.isFile());
            assert.isFalse(stat.isDirectory());
            assert.isFalse(stat.isBlockDevice());
            assert.isFalse(stat.isCharacterDevice());
            assert.isFalse(stat.isSocket());
            assert.isFalse(stat.isSymbolicLink());
            assert.isFalse(stat.isFIFO());
        });

        it("dir stat makes sense - sync", () => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/dir");
            const stat = fs.statSync("/dir");
            assert.isFalse(stat.isFile());
            assert.isTrue(stat.isDirectory());
            assert.isFalse(stat.isBlockDevice());
            assert.isFalse(stat.isCharacterDevice());
            assert.isFalse(stat.isSocket());
            assert.isFalse(stat.isSymbolicLink());
            assert.isFalse(stat.isFIFO());
        });

        it("symlink stat makes sense - sync", () => {
            const fs = new MemoryFileSystem();
            fs.writeFileSync("/a", "data");
            fs.symlinkSync("/a", "/link-to-a");
            const stat = fs.lstatSync("/link-to-a");
            assert.isFalse(stat.isFile());
            assert.isFalse(stat.isDirectory());
            assert.isFalse(stat.isBlockDevice());
            assert.isFalse(stat.isCharacterDevice());
            assert.isFalse(stat.isSocket());
            assert.isTrue(stat.isSymbolicLink());
            assert.isFalse(stat.isFIFO());
        });
    });

    describe("files", () => {
        it("can make and remove files - sync", () => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/test");
            const buf = Buffer.from("Hello World", "utf8");
            fs.writeFileSync("/test/hello-world.txt", buf);
            assert.deepEqual(fs.readFileSync("/test/hello-world.txt"), buf);
            assert.equal(fs.readFileSync("/test/hello-world.txt", "utf8"), "Hello World");
            assert.equal(fs.readFileSync("/test/hello-world.txt", { encoding: "utf8" }), "Hello World");
            fs.writeFileSync("/a", "Test", "utf-8");
            assert.equal(fs.readFileSync("/a", "utf-8"), "Test");
            const stat = fs.statSync("/a");
            assert.isTrue(stat.isFile());
            assert.isFalse(stat.isDirectory());
            fs.writeFileSync("/b", "Test", { encoding: "utf8" });
            assert.equal(fs.readFileSync("/b", "utf-8"), "Test");
            assert.throws(() => {
                fs.readFileSync("/test/other-file");
            });
            assert.throws(() => {
                fs.readFileSync("/test/other-file", "utf8");
            });
        });
    });

    describe("directories", () => {
        it("has an empty root directory at startup - sync", () => {
            const fs = new MemoryFileSystem();
            assert.deepEqual(fs.readdirSync("/"), []);
            const stat = fs.statSync("/");
            assert.equal(stat.isFile(), false);
            assert.isTrue(stat.isDirectory());
            assert.isFalse(stat.isSymbolicLink());
        });

        it("has an empty root directory at startup - async", (done) => {
            const fs = new MemoryFileSystem();
            fs.readdir("/", (err, list) => {
                assert.deepEqual(list, []);
                fs.stat("/", (err, stat) => {
                    assert.isFalse(stat.isFile());
                    assert.isTrue(stat.isDirectory());
                    assert.isFalse(stat.isSymbolicLink());
                    done();
                });
            });
        });

        it("is able to make directories - sync", () => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/first");
            fs.mkdirSync("/first//sub/");
            fs.mkdirSync("/first/sub/subsub");
            fs.mkdirSync("/first/sub2");
            assert.throws(() => fs.mkdirSync("/backslash\\dir"));
            assert.throws(() => fs.mkdirSync("/"), /EEXIST/);
            assert.deepEqual(fs.readdirSync("/"), ["first"]);
            assert.deepEqual(fs.readdirSync("/first/"), ["sub", "sub2"]);
            assert.equal(fs.existsSync("/first/sub2"), true);
            const stat = fs.statSync("/first/sub2");
            assert.isFalse(stat.isFile());
            assert.isTrue(stat.isDirectory());
        });

        it("is able to make directories - async", (done) => {
            const fs = new MemoryFileSystem();
            fs.mkdir("/first", (err) => {
                fs.mkdir("/first//sub/", (err) => {
                    fs.mkdir("/first/sub2/", (err) => {
                        fs.mkdir("/", (err) => {
                            assert.equal(err.code, "EEXIST");
                            fs.readdir("/", (err, list) => {
                                assert.deepEqual(list, ["first"]);
                                fs.readdir("/first/", (err, list) => {
                                    assert.deepEqual(list, ["sub", "sub2"]);
                                    fs.exists("/first/sub2", (err, exists) => {
                                        assert.equal(exists, true);
                                        fs.stat("/first/sub2", (err, stat) => {
                                            assert.isFalse(stat.isFile());
                                            assert.isTrue(stat.isDirectory());
                                            done();
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });

        it("should not make the root directory - sync", () => {
            const fs = new MemoryFileSystem();
            const error = assert.throws(() => {
                fs.mkdirSync("/");
            });
            assert.equal(error.code, "EEXIST");
        });

        it("should be able to navigate before root - sync", () => {
            const fs = new MemoryFileSystem();
            const buf = Buffer.from("Hello World");
            fs.mkdirSync("/first");
            fs.writeFileSync("/hello-world.txt", buf);
            let stat;
            stat = fs.statSync("/first/../../../../first");
            assert.isFalse(stat.isFile());
            assert.isTrue(stat.isDirectory());
            stat = fs.statSync("/first/../../../../hello-world.txt");
            assert.isTrue(stat.isFile());
            assert.isFalse(stat.isDirectory());
        });

        it("should be able to remove directories - sync", () => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/first");
            fs.mkdirSync("/first//sub/");
            fs.mkdirSync("/first/sub2");
            fs.rmdirSync("/first/sub//");
            const firstlist = fs.readdirSync("//first");
            assert.deepEqual(firstlist, ["sub2"]);
            fs.rmdirSync("/first/sub2");
            fs.rmdirSync("/first");
            const exists = fs.existsSync("/first");
            assert.equal(exists, false);
            const errorAccess = assert.throws(() => {
                fs.accessSync("/first");
            });
            assert.equal(errorAccess.code, "ENOENT");
            const errorReadDir = assert.throws(() => {
                fs.readdirSync("/first");
            });
            assert.equal(errorReadDir.code, "ENOENT");
            const rootlist = fs.readdirSync("/");
            assert.deepEqual(rootlist, []);
        });

        it("rmdir does not traverse the last symlink", () => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/directory");
            fs.symlinkSync("/directory", "/linktodirectory");
            const error = assert.throws(() => {
                fs.rmdirSync("/linktodirectory");
            });
            assert.equal(error.code, "ENOTDIR");
        });

        it("creating temporary directories - sync", () => {
            const fs = new MemoryFileSystem();
            const tempDir = fs.mkdtempSync("/dir");
            const buf = Buffer.from("abc");
            fs.writeFileSync(`${tempDir}/test`, buf);
            assert.equal(fs.readFileSync(`${tempDir}/test`, "utf8"), buf.toString());
        });

        it("trailing slash refers to the directory instead of a file - sync", () => {
            const fs = new MemoryFileSystem();
            fs.writeFileSync("/abc", "data");
            let error = assert.throws(() => {
                fs.accessSync("/abc/");
            });
            assert.equal(error.code, "ENOTDIR");
            error = assert.throws(() => {
                fs.accessSync("/abc/.");
            });
            assert.equal(error.code, "ENOTDIR");
            error = assert.throws(() => {
                fs.mkdirSync("/abc/.");
            });
            assert.equal(error.code, "ENOTDIR");
            error = assert.throws(() => {
                fs.mkdirSync("/abc/");
            });
            assert.equal(error.code, "EEXIST");
        });

        it("trailing slash works for non-existent directories when intending to create them - sync", () => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/abc/");
            const stat = fs.statSync("/abc/");
            assert.isTrue(stat.isDirectory());
        });

        it("trailing `/.` for mkdirSync should result in errors", () => {
            const fs = new MemoryFileSystem();
            let error;
            error = assert.throws(() => {
                fs.mkdirSync("/abc/.");
            });
            assert.equal(error.code, "ENOENT");
            fs.mkdirSync("/abc");
            error = assert.throws(() => {
                fs.mkdirSync("/abc/.");
            });
            assert.equal(error.code, "EEXIST");
        });
    });

    describe("hardlinks", () => {
        it("multiple hardlinks to the same file - sync", () => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/test");
            fs.writeFileSync("/test/a", "data");
            fs.linkSync("/test/a", "/test/b");
            const inoA = fs.statSync("/test/a").ino;
            const inoB = fs.statSync("/test/b").ino;
            assert.equal(inoA, inoB);
            assert.deepEqual(fs.readFileSync("/test/a"), fs.readFileSync("/test/b"));
        });

        it("should not create hardlinks to directories - sync", () => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/test");
            const error = assert.throws(() => {
                fs.linkSync("/test", "/hardlinkttotest");
            });
            assert.equal(error.code, "EPERM");
        });
    });

    describe("symlinks", () => {
        it("symlink paths can contain multiple slashes", () => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/dir");
            fs.writeFileSync("/dir/test", "hello");
            fs.symlinkSync("////dir////test", "/linktodirtest");
            assert.deepEqual(fs.readFileSync("/dir/test"), fs.readFileSync("/linktodirtest"));
        });

        it("resolves symlink loops 1 - sync", () => {
            const fs = new MemoryFileSystem();
            fs.symlinkSync("/test", "/test");
            const error = assert.throws(() => {
                fs.readFileSync("/test");
            });
            assert.equal(error.code, "ELOOP");
        });

        it("resolves symlink loops 2 - sync", () => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/dirtolink");
            fs.symlinkSync("/dirtolink/test", "/test");
            fs.symlinkSync("/test", "/dirtolink/test");
            const error = assert.throws(() => {
                fs.readFileSync("/test/non-existent");
            });
            assert.equal(error.code, "ELOOP");
        });

        it("is able to add and traverse symlinks transitively - sync", () => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/test");
            const buf = Buffer.from("Hello World");
            fs.writeFileSync("/test/hello-world.txt", buf);
            fs.symlinkSync("/test", "/linktotestdir");
            assert.equal(fs.readlinkSync("/linktotestdir"), "/test");
            assert.deepEqual(fs.readdirSync("/linktotestdir"), ["hello-world.txt"]);
            fs.symlinkSync("/linktotestdir/hello-world.txt", "/linktofile");
            fs.symlinkSync("/linktofile", "/linktolink");
            assert.equal(fs.readFileSync("/linktofile", "utf-8"), "Hello World");
            assert.equal(fs.readFileSync("/linktolink", "utf-8"), "Hello World");
        });

        it("is able to traverse relative symlinks - sync", () => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/test");
            const buf = Buffer.from("Hello World");
            fs.writeFileSync("/a", buf);
            fs.symlinkSync("../a", "/test/linktoa");
            assert.equal(fs.readFileSync("/test/linktoa", "utf-8"), "Hello World");
        });

        it("unlink does not traverse symlinks - sync", () => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/test");
            const buf = Buffer.from("Hello World");
            fs.writeFileSync("/test/hello-world.txt", buf);
            fs.symlinkSync("/test", "/linktotestdir");
            fs.symlinkSync("/linktotestdir/hello-world.txt", "/linktofile");
            fs.unlinkSync("/linktofile");
            fs.unlinkSync("/linktotestdir");
            assert.deepEqual(fs.readdirSync("/test"), ["hello-world.txt"]);
        });

        it("realpath expands symlinks - sync", () => {
            const fs = new MemoryFileSystem();
            fs.writeFileSync("/test", Buffer.from("Hello"));
            fs.symlinkSync("./test", "/linktotest");
            fs.mkdirSync("/dirwithlinks");
            fs.symlinkSync("../linktotest", "/dirwithlinks/linktolink");
            const realPath = fs.realpathSync("/dirwithlinks/linktolink");
            assert.equal(realPath, "/test");
        });
    });

    describe("streams", () => {
        it("readstream options start and end are both inclusive - async", (done) => {
            const fs = new MemoryFileSystem();
            const str = "Hello";
            fs.writeFileSync("/test", str);
            const readable = fs.createReadStream(
                "/test",
                { encoding: "utf8", start: 0, end: str.length - 1 }
            );
            readable.on("readable", () => {
                assert.equal(readable.read(), str);
                done();
            });
        });

        it("readstreams respect start and end options - async", (done) => {
            const fs = new MemoryFileSystem();
            const str = "Hello";
            fs.writeFileSync("/file", str);
            fs.createReadStream("/file", {
                start: 1,
                end: 3
            }).pipe(bl((err, data) => {
                assert.equal(data.toString("utf8"), str.slice(1, 4));
                done();
            }));
        });

        it("readstream respects the start option - async", (done) => {
            const fs = new MemoryFileSystem();
            const str = "Hello";
            fs.writeFileSync("file", str);
            const offset = 1;
            const readable = fs.createReadStream("file", { encoding: "utf8", start: offset });
            readable.on("readable", () => {
                assert.equal(readable.read(), str.slice(offset));
                done();
            });
        });

        it("readstream end option is ignored without the start option - async", (done) => {
            const fs = new MemoryFileSystem();
            const str = "Hello";
            fs.writeFileSync("file", str);
            const readable = fs.createReadStream("file", { encoding: "utf8", end: 1 });
            readable.on("readable", () => {
                assert.equal(readable.read(), str);
                done();
            });
        });

        it("readstream can use a file descriptor - async", (done) => {
            const fs = new MemoryFileSystem();
            const str = "Hello";
            fs.writeFileSync("file", str);
            const fd = fs.openSync("file", "r");
            const offset = 1;
            fs.lseekSync(fd, offset);
            const readable = fs.createReadStream("", { encoding: "utf8", fd });
            readable.on("readable", () => {
                assert.equal(readable.read(), str.slice(offset));
                done();
            });
        });

        it("readstream with start option overrides the file descriptor position - async", (done) => {
            const fs = new MemoryFileSystem();
            const str = "Hello";
            fs.writeFileSync("file", str);
            const fd = fs.openSync("file", "r");
            const offset = 1;
            const readable = fs.createReadStream("", { encoding: "utf8", fd, start: offset });
            readable.on("readable", () => {
                assert.equal(readable.read(), str.slice(offset));
                const buf = Buffer.allocUnsafe(1);
                fs.readSync(fd, buf, 0, buf.length);
                assert.equal(buf.toString("utf8"), str.slice(0, buf.length));
                done();
            });
        });

        it("readstreams handle errors asynchronously - async", (done) => {
            const fs = new MemoryFileSystem();
            const stream = fs.createReadStream("/file");
            stream.on("error", (e) => {
                assert.isTrue(e instanceof Error);
                assert.equal(e.code, "ENOENT");
                done();
            });
            stream.read(0);
        });

        it("readstreams can compose with pipes - async", (done) => {
            const fs = new MemoryFileSystem();
            const str = "Hello";
            fs.writeFileSync("/file", str);
            fs.createReadStream("/file").pipe(bl((err, data) => {
                assert.equal(data.toString("utf8"), str);
                done();
            }));
        });

        it("writestream can create and truncate files - async", (done) => {
            const fs = new MemoryFileSystem();
            const str = "Hello";
            fs.createWriteStream("/file").end(str, () => {
                assert.equal(fs.readFileSync("/file", "utf8"), str);
                fs.createWriteStream("/file").end(() => {
                    assert.equal(fs.readFileSync("/file", "utf-8"), "");
                    done();
                });
            });
        });

        it("writestream can be piped into - async", (done) => {
            const fs = new MemoryFileSystem();
            const str = "Hello";
            bl(Buffer.from(str))
                .pipe(fs.createWriteStream("/file"))
                .once("finish", () => {
                    assert.equal(fs.readFileSync("/file", "utf-8"), str);
                    done();
                });
        });

        it("writestreams handle errors asynchronously - async", (done) => {
            const fs = new MemoryFileSystem();
            const writable = fs.createWriteStream("/file/unknown");
            // note that it is possible to have the finish event occur before the error event
            writable.once("error", (e) => {
                assert.isTrue(e instanceof Error);
                assert.equal(e.code, "ENOENT");
                done();
            });
            writable.end();
        });

        it("writestreams allow ignoring of the drain event, temporarily ignoring resource usage control - async", (done) => {
            const fs = new MemoryFileSystem();
            const waterMark = 10;
            const writable = fs.createWriteStream("file", { highWaterMark: waterMark });
            const buf = Buffer.allocUnsafe(waterMark).fill(97);
            const times = 4;
            for (let i = 0; i < 4; ++i) {
                assert.isFalse(writable.write(buf));
            }
            writable.end(() => {
                assert.equal(fs.readFileSync("file", "utf8"), buf.toString().repeat(times));
                done();
            });
        });

        it("writestreams can use the drain event to manage resource control - async", (done) => {
            const fs = new MemoryFileSystem();
            const waterMark = 10;
            const writable = fs.createWriteStream("file", { highWaterMark: waterMark });
            const buf = Buffer.allocUnsafe(waterMark).fill(97);
            let times = 10;
            const timesOrig = times;
            const writing = () => {
                let status;
                do {
                    status = writable.write(buf);
                    times -= 1;
                    if (times === 0) {
                        writable.end(() => {
                            assert.equal(
                                fs.readFileSync("file", "utf8"),
                                buf.toString().repeat(timesOrig)
                            );
                            done();
                        });
                    }
                } while (times > 0 && status);
                if (times > 0) {
                    writable.once("drain", writing);
                }
            };
            writing();
        });
    });

    describe("stat time changes", () => {
        it("truncate and ftruncate will change mtime and ctime - async", (done) => {
            const fs = new MemoryFileSystem();
            const str = "abcdef";
            fs.writeFileSync("/test", str);
            const stat = fs.statSync("/test");
            setTimeout(() => {
                fs.truncateSync("/test", str.length);
                const stat2 = fs.statSync("/test");
                assert.isTrue(stat.mtime < stat2.mtime && stat.ctime < stat2.ctime);
                setTimeout(() => {
                    const fd = fs.openSync("/test", "r+");
                    fs.ftruncateSync(fd, str.length);
                    const stat3 = fs.statSync("/test");
                    assert.isTrue(stat2.mtime < stat3.mtime && stat2.ctime < stat3.ctime);
                    setTimeout(() => {
                        fs.ftruncateSync(fd, str.length);
                        const stat4 = fs.statSync("/test");
                        assert.isTrue(stat3.mtime < stat4.mtime && stat3.ctime < stat4.ctime);
                        fs.closeSync(fd);
                        done();
                    }, 10);
                }, 10);
            }, 10);
        });

        it("fallocate will only change ctime - async", (done) => {
            const fs = new MemoryFileSystem();
            const fd = fs.openSync("allocate", "w");
            fs.writeSync(fd, "abcdef");
            const stat = fs.statSync("allocate");
            setTimeout(() => {
                const offset = 0;
                const length = 100;
                fs.fallocate(fd, offset, length, (e) => {
                    assert.notExists(e);
                    const stat2 = fs.statSync("allocate");
                    assert.equal(stat2.size, offset + length);
                    assert.isTrue(stat2.ctime > stat.ctime);
                    assert.isTrue(stat2.mtime === stat.mtime);
                    assert.isTrue(stat2.atime === stat.atime);
                    fs.closeSync(fd);
                    done();
                });
            }, 10);
        });
    });

    describe("directory file descriptors", () => {
        it("directory file descriptors capabilities - async", (done) => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/dir");
            const dirfd = fs.openSync("/dir", "r");
            fs.fsyncSync(dirfd);
            fs.fdatasyncSync(dirfd);
            fs.fchmodSync(dirfd, 0o666);
            fs.fchownSync(dirfd, 0, 0);
            const date = new Date();
            setTimeout(() => {
                fs.futimesSync(dirfd, date, date);
                const stats = fs.fstatSync(dirfd);
                assert.isTrue(stats instanceof adone.std.fs.Stats);
                assert.deepEqual(stats.atime, date);
                assert.deepEqual(stats.mtime, date);
                fs.closeSync(dirfd);
                done();
            }, 100);
        });

        it("directory file descriptor errors - sync", () => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/dir");
            // opening it without fs.constants.O_RDONLY would result in EISDIR
            const dirfd = fs.openSync("/dir", fs.constants.O_RDONLY | fs.constants.O_DIRECTORY);
            let error;
            const buf = Buffer.alloc(10);
            error = assert.throws(() => {
                fs.ftruncateSync(dirfd);
            });
            assert.equal(error.code, "EINVAL");
            error = assert.throws(() => {
                fs.readSync(dirfd, buf, 0, 10, null);
            });
            assert.equal(error.code, "EISDIR");
            error = assert.throws(() => {
                fs.writeSync(dirfd, buf);
            });
            assert.equal(error.code, "EBADF");
            error = assert.throws(() => {
                fs.readFileSync(dirfd);
            });
            assert.equal(error.code, "EISDIR");
            error = assert.throws(() => {
                fs.writeFileSync(dirfd, "test");
            });
            assert.equal(error.code, "EBADF");
            fs.closeSync(dirfd);
        });

        it("directory file descriptor's inode nlink becomes 0 after deletion of the directory", () => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/dir");
            const fd = fs.openSync("/dir", "r");
            fs.rmdirSync("/dir");
            const stat = fs.fstatSync(fd);
            assert.equal(stat.nlink, 1);
            fs.closeSync(fd);
        });
    });

    describe("file descriptors,", () => {
        it("appendFileSync moves with the fd position - sync", () => {
            const fs = new MemoryFileSystem();
            const fd = fs.openSync("/fdtest", "w+");
            fs.appendFileSync(fd, "a");
            fs.appendFileSync(fd, "a");
            fs.appendFileSync(fd, "a");
            assert.equal(fs.readFileSync("/fdtest", "utf8"), "aaa");
            fs.closeSync(fd);
        });

        it("ftruncateSync truncates the fd position - sync", () => {
            const fs = new MemoryFileSystem();
            let fd;
            fd = fs.openSync("/fdtest", "w+");
            fs.writeSync(fd, "abcdef");
            fs.ftruncateSync(fd, 3);
            fs.writeSync(fd, "ghi");
            assert.deepEqual(fs.readFileSync("/fdtest", "utf8"), "abcghi");
            fs.closeSync(fd);
            fs.writeFileSync("/fdtest", "abcdef");
            fd = fs.openSync("/fdtest", "r+");
            const buf = Buffer.allocUnsafe(3);
            fs.readSync(fd, buf, 0, buf.length);
            fs.ftruncateSync(fd, 4);
            fs.readSync(fd, buf, 0, buf.length);
            assert.deepEqual(buf, Buffer.from("dbc"));
            fs.closeSync(fd);
        });

        it("readSync moves with the fd position - sync", () => {
            const fs = new MemoryFileSystem();
            const str = "abc";
            const buf = Buffer.from(str).fill(0);
            fs.writeFileSync("/fdtest", str);
            const fd = fs.openSync("/fdtest", "r+");
            fs.readSync(fd, buf, 0, 1, null);
            fs.readSync(fd, buf, 1, 1, null);
            fs.readSync(fd, buf, 2, 1, null);
            assert.deepEqual(buf, Buffer.from(str));
            fs.closeSync(fd);
        });

        it("writeSync moves with the fd position - sync", () => {
            const fs = new MemoryFileSystem();
            const fd = fs.openSync("/fdtest", "w+");
            fs.writeSync(fd, "a");
            fs.writeSync(fd, "a");
            fs.writeSync(fd, "a");
            assert.equal(fs.readFileSync("/fdtest", "utf8"), "aaa");
            fs.closeSync(fd);
        });

        it("readSync does not change fd position according to position parameter - sync", () => {
            const fs = new MemoryFileSystem();
            let buf = Buffer.alloc(3);
            let fd;
            let bytesRead;
            // reading from position 0 doesn't move the fd from the end
            fd = fs.openSync("/fdtest", "w+");
            fs.writeSync(fd, "abcdef");
            buf = Buffer.alloc(3);
            bytesRead = fs.readSync(fd, buf, 0, buf.length);
            assert.equal(bytesRead, 0);
            bytesRead = fs.readSync(fd, buf, 0, buf.length, 0);
            assert.equal(bytesRead, 3);
            assert.deepEqual(buf, Buffer.from("abc"));
            fs.writeSync(fd, "ghi");
            assert.deepEqual(fs.readFileSync("/fdtest", "utf8"), "abcdefghi");
            fs.closeSync(fd);
            // reading with position null does move the fd
            fs.writeFileSync("/fdtest", "abcdef");
            fd = fs.openSync("/fdtest", "r+");
            bytesRead = fs.readSync(fd, buf, 0, buf.length);
            assert.equal(bytesRead, 3);
            fs.writeSync(fd, "ghi");
            assert.deepEqual(fs.readFileSync("/fdtest", "utf8"), "abcghi");
            fs.closeSync(fd);
            // reading with position 0 doesn't move the fd from the start
            fs.writeFileSync("/fdtest", "abcdef");
            fd = fs.openSync("/fdtest", "r+");
            buf = Buffer.alloc(3);
            bytesRead = fs.readSync(fd, buf, 0, buf.length, 0);
            assert.equal(bytesRead, 3);
            fs.writeSync(fd, "ghi");
            assert.deepEqual(fs.readFileSync("/fdtest", "utf8"), "ghidef");
            fs.closeSync(fd);
            // reading with position 3 doesn't move the fd from the start
            fs.writeFileSync("/fdtest", "abcdef");
            fd = fs.openSync("/fdtest", "r+");
            buf = Buffer.alloc(3);
            bytesRead = fs.readSync(fd, buf, 0, buf.length, 3);
            assert.equal(bytesRead, 3);
            fs.writeSync(fd, "ghi");
            assert.deepEqual(fs.readFileSync("/fdtest", "utf8"), "ghidef");
            fs.closeSync(fd);
        });

        it("writeSync does not change fd position according to position parameter - sync", () => {
            const fs = new MemoryFileSystem();
            const fd = fs.openSync("./testy", "w+");
            fs.writeSync(fd, "abcdef");
            fs.writeSync(fd, "ghi", 0);
            fs.writeSync(fd, "jkl");
            assert.deepEqual(fs.readFileSync("./testy", "utf8"), "ghidefjkl");
            fs.closeSync(fd);
        });

        it("readFileSync moves with fd position - sync", () => {
            const fs = new MemoryFileSystem();
            let fd;
            fd = fs.openSync("/fdtest", "w+");
            fs.writeSync(fd, "starting");
            assert.equal(fs.readFileSync(fd, "utf-8"), "");
            fs.closeSync(fd);
            fd = fs.openSync("/fdtest", "r+");
            assert.equal(fs.readFileSync(fd, "utf-8"), "starting");
            fs.writeSync(fd, "ending");
            assert.equal(fs.readFileSync("/fdtest", "utf-8"), "startingending");
            fs.closeSync(fd);
        });

        it("writeFileSync writes from the beginning, and does not move the fd position - sync", () => {
            const fs = new MemoryFileSystem();
            const fd = fs.openSync("/fdtest", "w+");
            fs.writeSync(fd, "a");
            fs.writeSync(fd, "a");
            fs.writeFileSync(fd, "b");
            fs.writeSync(fd, "c");
            assert.equal(fs.readFileSync("/fdtest", "utf8"), "bac");
            fs.closeSync(fd);
        });

        it("O_APPEND makes sure that writes always set their fd position to the end - sync", () => {
            const fs = new MemoryFileSystem();
            fs.writeFileSync("/fdtest", "abc");
            let buf;
            let fd;
            let bytesRead;
            buf = Buffer.alloc(3);
            // there's only 1 fd position both writes and reads
            fd = fs.openSync("/fdtest", "a+");
            fs.writeSync(fd, "def");
            bytesRead = fs.readSync(fd, buf, 0, buf.length);
            assert.equal(bytesRead, 0);
            fs.writeSync(fd, "ghi");
            assert.deepEqual(fs.readFileSync("/fdtest", "utf8"), "abcdefghi");
            fs.closeSync(fd);
            // even if read moves to to position 3, write will jump the position to the end
            fs.writeFileSync("/fdtest", "abcdef");
            fd = fs.openSync("/fdtest", "a+");
            buf = Buffer.alloc(3);
            bytesRead = fs.readSync(fd, buf, 0, buf.length);
            assert.equal(bytesRead, 3);
            assert.deepEqual(buf, Buffer.from("abc"));
            fs.writeSync(fd, "ghi");
            assert.deepEqual(fs.readFileSync("/fdtest", "utf8"), "abcdefghi");
            bytesRead = fs.readSync(fd, buf, 0, buf.length);
            assert.equal(bytesRead, 0);
            fs.closeSync(fd);
        });

        it("can seek and overwrite parts of a file - sync", () => {
            const fs = new MemoryFileSystem();
            const fd = fs.openSync("/fdtest", "w+");
            fs.writeSync(fd, "abc");
            fs.lseekSync(fd, -1, fs.constants.SEEK_CUR);
            fs.writeSync(fd, "d");
            fs.closeSync(fd);
            const str = fs.readFileSync("/fdtest", "utf8");
            assert.equal(str, "abd");
        });

        it('can seek beyond the file length and create a zeroed "sparse" file - sync', () => {
            const fs = new MemoryFileSystem();
            fs.writeFileSync("/fdtest", Buffer.from([0x61, 0x62, 0x63]));
            const fd = fs.openSync("/fdtest", "r+");
            fs.lseekSync(fd, 1, fs.constants.SEEK_END);
            fs.writeSync(fd, Buffer.from([0x64]));
            fs.closeSync(fd);
            const buf = fs.readFileSync("/fdtest");
            assert.deepEqual(buf, Buffer.from([0x61, 0x62, 0x63, 0x00, 0x64]));
        });

        it("fallocateSync can extend the file length - sync", () => {
            const fs = new MemoryFileSystem();
            const fd = fs.openSync("allocate", "w");
            const offset = 10;
            const length = 100;
            fs.fallocateSync(fd, offset, length);
            const stat = fs.statSync("allocate");
            assert.equal(stat.size, offset + length);
            fs.closeSync(fd);
        });

        it("fallocateSync does not touch existing data - sync", () => {
            const fs = new MemoryFileSystem();
            const fd = fs.openSync("allocate", "w+");
            const str = "abcdef";
            fs.writeSync(fd, str);
            const offset = 100;
            const length = 100;
            fs.fallocateSync(fd, offset, length);
            fs.lseekSync(fd, 0);
            const buf = Buffer.alloc(str.length);
            fs.readSync(fd, buf, 0, buf.length);
            assert.equal(buf.toString(), str);
            fs.closeSync(fd);
        });

        it("mmap with MAP_PRIVATE on a file descriptor gives me an immediate copy on the file buffer - async", (done) => {
            const fs = new MemoryFileSystem();
            const buf1 = Buffer.from("abcdef");
            const length = 4;
            const offset = 1;
            fs.writeFileSync("file", buf1);
            const fd = fs.openSync("file", "r");
            fs.mmap(fd, length, fs.constants.MAP_PRIVATE, offset, (e, buf2) => {
                assert.notExists(e);
                assert.equal(buf2.length, length);
                assert.deepEqual(buf2, buf1.slice(offset, offset + length));
                buf2[0] = "z".charCodeAt();
                assert.notDeepEqual(buf2, buf1.slice(offset, offset + length));
                fs.closeSync(fd);
                done();
            });
        });

        it("mmapSync with MAP_SHARED on a file descriptor gives me a persistent reference to the inode buffer", () => {
            const fs = new MemoryFileSystem();
            const buf1 = Buffer.from("abcdef");
            const length = 4;
            const offset = 1;
            fs.writeFileSync("file", buf1);
            const fd = fs.openSync("file", "r+");
            const buf2 = fs.mmapSync(fd, length, fs.constants.MAP_SHARED, offset);
            buf2[0] = "z".charCodeAt();
            // changes to the mmaped buffer propragate to the file
            assert.deepEqual(fs.readFileSync("file").slice(offset, offset + length), buf2);
            // changes to the file propagate to the mmaped buffer
            fs.writeFileSync(fd, buf1);
            assert.deepEqual(buf1.slice(offset, offset + length), buf2);
            fs.closeSync(fd);
        });
    });

    describe("function calling styles (involving intermediate optional parameters", () => {
        it("openSync calling styles work - sync", () => {
            const fs = new MemoryFileSystem();
            let fd;
            fd = fs.openSync("/test", "w+");
            fs.closeSync(fd);
            fd = fs.openSync("/test2", "w+", 0o666);
            fs.closeSync(fd);
        });

        it("open calling styles work - async", (done) => {
            const fs = new MemoryFileSystem();
            fs.open("/test", "w+", (err, fd) => {
                assert.notExists(err);
                fs.closeSync(fd);
                fs.open("/test2", "w+", 0o666, (err, fd) => {
                    assert.notExists(err);
                    fs.close(fd, (err) => {
                        assert.notExists(err);
                        done();
                    });
                });
            });
        });

        it("readSync calling styles work - sync", () => {
            // fs.readSync has undocumented optional parameters
            const fs = new MemoryFileSystem();
            const str = "Hello World";
            const buf = Buffer.from(str).fill(0);
            fs.writeFileSync("/test", str);
            const fd = fs.openSync("/test", "r+");
            let bytesRead;
            bytesRead = fs.readSync(fd, buf);
            assert.equal(bytesRead, 0);
            bytesRead = fs.readSync(fd, buf, 0);
            assert.equal(bytesRead, 0);
            bytesRead = fs.readSync(fd, buf, 0, 0);
            assert.equal(bytesRead, 0);
            bytesRead = fs.readSync(fd, buf, 0, 1);
            assert.equal(bytesRead, 1);
            bytesRead = fs.readSync(fd, buf, 0, 0, null);
            assert.equal(bytesRead, 0);
            bytesRead = fs.readSync(fd, buf, 0, 1, null);
            assert.equal(bytesRead, 1);
            fs.closeSync(fd);
        });

        it("read calling styles work - async", (done) => {
            // fs.read does not have intermediate optional parameters
            const fs = new MemoryFileSystem();
            const str = "Hello World";
            const buf = Buffer.from(str).fill(0);
            fs.writeFileSync("/test", str);
            const fd = fs.openSync("/test", "r+");
            fs.read(fd, buf, 0, buf.length, null, (err, bytesRead, buffer) => {
                assert.notExists(err);
                assert.deepEqual(buffer, Buffer.from(str));
                assert.equal(bytesRead, Buffer.from(str).length);
                fs.closeSync(fd);
                done();
            });
        });

        it("writeSync calling styles work - sync", () => {
            const fs = new MemoryFileSystem();
            const fd = fs.openSync("/test", "w");
            const str = "Hello World";
            const buf = Buffer.from(str);
            let bytesWritten;
            bytesWritten = fs.writeSync(fd, buf);
            assert.equal(bytesWritten, 11);
            bytesWritten = fs.writeSync(fd, buf, 0);
            assert.equal(bytesWritten, 11);
            fs.writeSync(fd, buf, 0, buf.length);
            fs.writeSync(fd, buf, 0, buf.length, null);
            fs.writeSync(fd, str);
            fs.writeSync(fd, str, null);
            fs.writeSync(fd, str, null, "utf-8");
            fs.closeSync(fd);
            assert.equal(fs.readFileSync("/test", "utf-8"), str.repeat(7));
        });

        it("write calling styles work - async", (done) => {
            // fs.write has intermediate optional parameters
            const fs = new MemoryFileSystem();
            const fd = fs.openSync("/test", "w+");
            const str = "Hello World";
            const buf = Buffer.from(str);
            fs.write(fd, buf, (err, bytesWritten, buffer) => {
                assert.notExists(err);
                assert.equal(bytesWritten, buf.length);
                assert.deepEqual(buffer, buf);
                fs.write(fd, buf, 0, (err, bytesWritten, buffer) => {
                    assert.notExists(err);
                    assert.equal(bytesWritten, buf.length);
                    assert.deepEqual(buffer, buf);
                    fs.write(fd, buf, 0, buf.length, (err, bytesWritten, buffer) => {
                        assert.notExists(err);
                        assert.equal(bytesWritten, buf.length);
                        assert.deepEqual(buffer, buf);
                        fs.write(fd, buf, 0, buf.length, 0, (err, bytesWritten, buffer) => {
                            assert.notExists(err);
                            assert.equal(bytesWritten, buf.length);
                            assert.deepEqual(buffer, buf);
                            fs.write(fd, str, (err, bytesWritten, string) => {
                                assert.notExists(err);
                                assert.equal(bytesWritten, buf.length);
                                assert.equal(string, str);
                                fs.write(fd, str, 0, (err, bytesWritten, string) => {
                                    assert.notExists(err);
                                    assert.equal(bytesWritten, buf.length);
                                    assert.equal(string, str);
                                    fs.write(fd, str, 0, "utf-8", (err, bytesWritten, string) => {
                                        assert.notExists(err);
                                        assert.equal(bytesWritten, buf.length);
                                        assert.equal(string, str);
                                        fs.closeSync(fd);
                                        done();
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });

        it("readFileSync calling styles work - sync", () => {
            const fs = new MemoryFileSystem();
            const str = "Hello World";
            const buf = Buffer.from(str);
            fs.writeFileSync("/test", buf);
            const fd = fs.openSync("/test", "r+");
            let contents;
            contents = fs.readFileSync("/test");
            assert.deepEqual(contents, buf);
            contents = fs.readFileSync("/test", { encoding: "utf8", flag: "r" });
            assert.equal(contents, str);
            contents = fs.readFileSync(fd);
            assert.deepEqual(contents, buf);
            contents = fs.readFileSync(fd, { encoding: "utf8", flag: "r" });
            assert.equal(contents, "");
            fs.closeSync(fd);
        });

        it("readFile calling styles work - async", (done) => {
            const fs = new MemoryFileSystem();
            const str = "Hello World";
            const buf = Buffer.from(str);
            fs.writeFileSync("/test", buf);
            const fd = fs.openSync("/test", "r+");
            fs.readFile("/test", (err, data) => {
                assert.notExists(err);
                assert.deepEqual(data, buf);
                fs.readFile("/test", { encoding: "utf8", flag: "r" }, (err, data) => {
                    assert.notExists(err);
                    assert.equal(data, str);
                    fs.readFile(fd, (err, data) => {
                        assert.notExists(err);
                        assert.deepEqual(data, buf);
                        fs.readFile(fd, { encoding: "utf8", flag: "r" }, (err, data) => {
                            assert.notExists(err);
                            assert.equal(data, "");
                            done();
                        });
                    });
                });
            });
        });

        it("writeFileSync calling styles work - sync", () => {
            const fs = new MemoryFileSystem();
            const fd = fs.openSync("/test", "w+");
            const str = "Hello World";
            const buf = Buffer.from(str);
            fs.writeFileSync("/test", str);
            assert.deepEqual(fs.readFileSync("/test"), buf);
            fs.writeFileSync("/test", str, { encoding: "utf8", mode: 0o666, flag: "w" });
            assert.deepEqual(fs.readFileSync("/test"), buf);
            fs.writeFileSync("/test", buf);
            assert.deepEqual(fs.readFileSync("/test"), buf);
            fs.writeFileSync(fd, str);
            assert.deepEqual(fs.readFileSync("/test"), buf);
            fs.writeFileSync(fd, str, { encoding: "utf8", mode: 0o666, flag: "w" });
            assert.deepEqual(fs.readFileSync("/test"), buf);
            fs.writeFileSync(fd, buf);
            assert.deepEqual(fs.readFileSync("/test"), buf);
            fs.closeSync(fd);
        });

        it("writeFile calling styles work - async", (done) => {
            const fs = new MemoryFileSystem();
            const fd = fs.openSync("/test", "w+");
            const str = "Hello World";
            const buf = Buffer.from(str);
            fs.writeFile("/test", str, (err) => {
                assert.notExists(err);
                fs.writeFile("/test", str, { encoding: "utf8", mode: 0o666, flag: "w" }, (err) => {
                    assert.notExists(err);
                    fs.writeFile("/test", buf, (err) => {
                        assert.notExists(err);
                        fs.writeFile(fd, str, (err) => {
                            assert.notExists(err);
                            fs.writeFile(fd, str, { encoding: "utf8", mode: 0o666, flag: "w" }, (err) => {
                                assert.notExists(err);
                                fs.writeFile(fd, buf, (err) => {
                                    assert.notExists(err);
                                    fs.closeSync(fd);
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    describe("current directory side effects", () => {
        it("cwd() returns the absolute fully resolved path - sync", () => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/a");
            fs.mkdirSync("/a/b");
            fs.symlinkSync("/a/b", "/c");
            fs.chdir("/c");
            const cwd = fs.cwd();
            assert.equal(cwd, "/a/b");
        });

        it("cwd() still works if the current directory is deleted - sync", () => {
            // nodejs process.cwd() will actually throw ENOENT
            // but making it work in VFS is harmless
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/removed");
            fs.chdir("/removed");
            fs.rmdirSync("../removed");
            assert.equal(fs.cwd(), "/removed");
        });

        it("deleted current directory can still use . and .. for traversal - sync", () => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/removed");
            const statRoot = fs.statSync("/");
            fs.chdir("/removed");
            const statCurrent1 = fs.statSync(".");
            fs.rmdirSync("../removed");
            const statCurrent2 = fs.statSync(".");
            const statParent = fs.statSync("..");
            assert.equal(statCurrent1.ino, statCurrent2.ino);
            assert.equal(statRoot.ino, statParent.ino);
            assert.equal(statCurrent2.nlink, 1);
            assert.equal(statParent.nlink, 3);
            const dentryCurrent = fs.readdirSync(".");
            const dentryParent = fs.readdirSync("..");
            assert.deepEqual(dentryCurrent, []);
            assert.deepEqual(dentryParent, []);
        });

        it("cannot create inodes within a deleted current directory - sync", () => {
            const fs = new MemoryFileSystem();
            fs.writeFileSync("/dummy", "hello");
            fs.mkdirSync("/removed");
            fs.chdir("/removed");
            fs.rmdirSync("../removed");
            let error;
            error = assert.throws(() => {
                fs.writeFileSync("./a", "abc");
            });
            assert.equal(error.code, "ENOENT");
            error = assert.throws(() => {
                fs.mkdirSync("./b");
            });
            assert.equal(error.code, "ENOENT");
            error = assert.throws(() => {
                fs.symlinkSync("../dummy", "c");
            });
            assert.equal(error.code, "ENOENT");
            error = assert.throws(() => {
                fs.linkSync("../dummy", "d");
            });
            assert.equal(error.code, "ENOENT");
        });

        it("can still chdir when both current and parent directories are deleted", () => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/removeda");
            fs.mkdirSync("/removeda/removedb");
            fs.chdir("/removeda/removedb");
            fs.rmdirSync("../removedb");
            fs.rmdirSync("../../removeda");
            fs.chdir("..");
            fs.chdir("..");
            const path = fs.cwd();
            assert.equal(path, "/");
        });

        it("cannot chdir into a directory without execute permissions", () => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/dir");
            fs.chmodSync("/dir", 0o666);
            fs.setUid(1000);
            const error = assert.throws(() => {
                fs.chdir("/dir");
            });
            assert.equal(error.code, "EACCES");
        });

        it("cannot delete current directory using .", () => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/removed");
            fs.chdir("/removed");
            const error = assert.throws(() => {
                fs.rmdirSync(".");
            });
            assert.equal(error.code, "EINVAL");
        });

        it("cannot delete parent directory using .. even when current directory is deleted", () => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/removeda");
            fs.mkdirSync("/removeda/removedb");
            fs.chdir("/removeda/removedb");
            fs.rmdirSync("../removedb");
            fs.rmdirSync("../../removeda");
            const error = assert.throws(() => {
                fs.rmdirSync("..");
            });
            // linux reports this as ENOTEMPTY, but EINVAL makes more sense
            assert.equal(error.code, "EINVAL");
        });

        it("cannot rename the current or parent directory to a subdirectory", () => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/cwd");
            fs.chdir("/cwd");
            let error;
            error = assert.throws(() => {
                fs.renameSync(".", "subdir");
            });
            assert.equal(error.code, "EBUSY");
            fs.mkdirSync("/cwd/cwd");
            fs.chdir("/cwd/cwd");
            error = assert.throws(() => {
                fs.renameSync("..", "subdir");
            });
            assert.equal(error.code, "EBUSY");
        });

        it("cannot rename where the old path is a strict prefix of the new path", () => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/cwd1");
            fs.mkdirSync("/cwd1/cwd2");
            fs.chdir("/cwd1/cwd2");
            let error;
            error = assert.throws(() => {
                fs.renameSync("../cwd2", "subdir");
            });
            assert.equal(error.code, "EINVAL");
            fs.mkdirSync("/cwd1/cwd2/cwd3");
            error = assert.throws(() => {
                fs.renameSync("./cwd3", "./cwd3/cwd4");
            });
            assert.equal(error.code, "EINVAL");
        });
    });

    describe("permissions", () => {
        it("chown changes uid and gid - sync", () => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/test");
            fs.chownSync("/test", 1000, 2000);
            const stat = fs.statSync("/test");
            assert.equal(stat.uid, 1000);
            assert.equal(stat.gid, 2000);
        });

        it("chownr changes uid and gid recursively - sync", () => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/dir");
            fs.writeFileSync("/dir/a", "hello");
            fs.writeFileSync("/dir/b", "world");
            fs.chownrSync("/dir", 1000, 2000);
            let stat;
            stat = fs.statSync("/dir");
            assert.equal(stat.uid, 1000);
            assert.equal(stat.gid, 2000);
            stat = fs.statSync("/dir/a");
            assert.equal(stat.uid, 1000);
            assert.equal(stat.gid, 2000);
            stat = fs.statSync("/dir/b");
            assert.equal(stat.uid, 1000);
            assert.equal(stat.gid, 2000);
            fs.writeFileSync("/file", "hello world");
            fs.chownrSync("/file", 1000, 2000);
            stat = fs.statSync("/file");
            assert.equal(stat.uid, 1000);
            assert.equal(stat.gid, 2000);
        });

        it("chownr changes uid and gid recursively - async", (done) => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/dir");
            fs.writeFileSync("/dir/a", "hello");
            fs.writeFileSync("/dir/b", "world");
            let stat;
            fs.chownr("/dir", 1000, 2000, ((err) => {
                assert.notExists(err);
                stat = fs.statSync("/dir");
                assert.equal(stat.uid, 1000);
                assert.equal(stat.gid, 2000);
                stat = fs.statSync("/dir/a");
                assert.equal(stat.uid, 1000);
                assert.equal(stat.gid, 2000);
                stat = fs.statSync("/dir/b");
                assert.equal(stat.uid, 1000);
                assert.equal(stat.gid, 2000);
                fs.writeFileSync("/file", "hello world");
                fs.chownr("/file", 1000, 2000, (err) => {
                    assert.notExists(err);
                    stat = fs.statSync("/file");
                    assert.equal(stat.uid, 1000);
                    assert.equal(stat.gid, 2000);
                    done();
                });
            }));
        });

        it("chmod with 0 wipes out all permissions - sync", () => {
            const fs = new MemoryFileSystem();
            fs.writeFileSync("/a", "abc");
            fs.chmodSync("/a", 0o000);
            const stat = fs.statSync("/a");
            assert.equal(stat.mode, fs.constants.S_IFREG);
        });

        it("mkdir and chmod affects the mode - callback", (done) => {
            const fs = new MemoryFileSystem();
            fs.mkdir("/test", 0o644, (err) => {
                fs.accessSync(
                    "/test",
                    (fs.constants.F_OK |
                        fs.constants.R_OK |
                        fs.constants.W_OK)
                );
                fs.chmod("/test", 0o444, (err) => {
                    fs.accessSync(
                        "/test",
                        (fs.constants.F_OK |
                            fs.constants.R_OK)
                    );
                    done();
                });
            });
        });

        it("umask is correctly applied", () => {
            const umask = 0o127;
            const fs = new MemoryFileSystem({ umask });
            fs.writeFileSync("/file", "hello world");
            fs.mkdirSync("/dir");
            fs.symlinkSync("/file", "/symlink");
            let stat;
            stat = fs.statSync("/file");
            assert.equal(
                (stat.mode & (fs.constants.S_IRWXU | fs.constants.S_IRWXG | fs.constants.S_IRWXO)),
                DEFAULT_FILE_PERM & (~umask)
            );
            stat = fs.statSync("/dir");
            assert.equal(
                (stat.mode & (fs.constants.S_IRWXU | fs.constants.S_IRWXG | fs.constants.S_IRWXO)),
                DEFAULT_DIRECTORY_PERM & (~umask)
            );
            // umask is not applied to symlinks
            stat = fs.lstatSync("/symlink");
            assert.equal(
                (stat.mode & (fs.constants.S_IRWXU | fs.constants.S_IRWXG | fs.constants.S_IRWXO)),
                DEFAULT_SYMLINK_PERM
            );
        });

        it("non-root users can only chown uid if they own the file and they are chowning to themselves", () => {
            const fs = new MemoryFileSystem();
            fs.writeFileSync("file", "hello");
            fs.chownSync("file", 1000, 1000);
            fs.setUid(1000);
            fs.setGid(1000);
            fs.chownSync("file", 1000, 1000);
            let error;
            // you cannot give away files
            error = assert.throws(() => {
                fs.chownSync("file", 2000, 2000);
            });
            assert.equal(error.code, "EPERM");
            // if you don't own the file, you also cannot change (even if your change is noop)
            fs.setUid(3000);
            error = assert.throws(() => {
                fs.chownSync("file", 1000, 1000);
            });
            assert.equal(error.code, "EPERM");
            fs.setUid(1000);
            fs.chownSync("file", 1000, 2000);
        });

        it("chown can change groups without any problem because we do not have a user group hierarchy - sync", () => {
            const fs = new MemoryFileSystem();
            fs.writeFileSync("file", "hello");
            fs.chownSync("file", 1000, 1000);
            fs.setUid(1000);
            fs.setGid(1000);
            fs.chownSync("file", 1000, 2000);
        });

        it("chmod only works if you are the owner of the file - sync", () => {
            const fs = new MemoryFileSystem();
            fs.writeFileSync("file", "hello");
            fs.chownSync("file", 1000, 1000);
            fs.setUid(1000);
            fs.chmodSync("file", 0o000);
            fs.setUid(2000);
            const error = assert.throws(() => {
                fs.chmodSync("file", 0o777);
            });
            assert.equal(error.code, "EPERM");
        });

        it("permissions are checked in stages of user, group then other - sync", () => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/home");
            fs.mkdirSync("/home/1000");
            fs.chownSync("/home/1000", 1000, 1000);
            fs.chdir("/home/1000");
            fs.setUid(1000);
            fs.setGid(1000);
            fs.writeFileSync("testfile", "hello");
            fs.mkdirSync("dir");
            fs.chmodSync("testfile", 0o764);
            fs.chmodSync("dir", 0o764);
            fs.accessSync(
                "testfile",
                (fs.constants.R_OK |
                    fs.constants.W_OK |
                    fs.constants.X_OK)
            );
            fs.accessSync(
                "dir",
                (fs.constants.R_OK |
                    fs.constants.W_OK |
                    fs.constants.X_OK)
            );
            fs.setUid(2000);
            fs.accessSync(
                "testfile",
                (fs.constants.R_OK |
                    fs.constants.W_OK)
            );
            fs.accessSync(
                "dir",
                (fs.constants.R_OK |
                    fs.constants.W_OK)
            );
            let error;
            error = assert.throws(() => {
                fs.accessSync("testfile", fs.constants.X_OK);
            });
            assert.equal(error.code, "EACCES");
            error = assert.throws(() => {
                fs.accessSync("dir", fs.constants.X_OK);
            });
            assert.equal(error.code, "EACCES");
            fs.setGid(2000);
            fs.accessSync("testfile", fs.constants.R_OK);
            fs.accessSync("dir", fs.constants.R_OK);
            error = assert.throws(() => {
                fs.accessSync(
                    "testfile",
                    (fs.constants.W_OK |
                        fs.constants.X_OK)
                );
            });
            assert.equal(error.code, "EACCES");
            error = assert.throws(() => {
                fs.accessSync(
                    "dir",
                    (fs.constants.W_OK |
                        fs.constants.X_OK)
                );
            });
            assert.equal(error.code, "EACCES");
        });

        it("permissions are checked in stages of user, group then other (using chownSync) - sync", () => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/home");
            fs.mkdirSync("/home/1000");
            fs.chownSync("/home/1000", 1000, 1000);
            fs.chdir("/home/1000");
            fs.setUid(1000);
            fs.setGid(1000);
            fs.writeFileSync("testfile", "hello");
            fs.mkdirSync("dir");
            fs.chmodSync("testfile", 0o764);
            fs.chmodSync("dir", 0o764);
            fs.accessSync(
                "testfile",
                (fs.constants.R_OK |
                    fs.constants.W_OK |
                    fs.constants.X_OK)
            );
            fs.accessSync(
                "dir",
                (fs.constants.R_OK |
                    fs.constants.W_OK |
                    fs.constants.X_OK)
            );
            fs.setUid(DEFAULT_ROOT_UID);
            fs.setUid(DEFAULT_ROOT_GID);
            fs.chownSync("testfile", 2000, 1000);
            fs.chownSync("dir", 2000, 1000);
            fs.setUid(1000);
            fs.setGid(1000);
            fs.accessSync(
                "testfile",
                (fs.constants.R_OK |
                    fs.constants.W_OK)
            );
            fs.accessSync(
                "dir",
                (fs.constants.R_OK |
                    fs.constants.W_OK)
            );
            let error;
            error = assert.throws(() => {
                fs.accessSync("testfile", fs.constants.X_OK);
            });
            assert.equal(error.code, "EACCES");
            error = assert.throws(() => {
                fs.accessSync("dir", fs.constants.X_OK);
            });
            assert.equal(error.code, "EACCES");
            fs.setUid(DEFAULT_ROOT_UID);
            fs.setUid(DEFAULT_ROOT_GID);
            fs.chownSync("testfile", 2000, 2000);
            fs.chownSync("dir", 2000, 2000);
            fs.setUid(1000);
            fs.setGid(1000);
            fs.accessSync("testfile", fs.constants.R_OK);
            fs.accessSync("dir", fs.constants.R_OK);
            error = assert.throws(() => {
                fs.accessSync(
                    "testfile",
                    (fs.constants.W_OK |
                        fs.constants.X_OK)
                );
            });
            assert.equal(error.code, "EACCES");
            error = assert.throws(() => {
                fs.accessSync(
                    "dir",
                    (fs.constants.W_OK |
                        fs.constants.X_OK)
                );
            });
            assert.equal(error.code, "EACCES");
        });

        it("--x-w-r-- do not provide read write and execute to the user due to permission staging", () => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/home");
            fs.mkdirSync("/home/1000");
            fs.chownSync("/home/1000", 1000, 1000);
            fs.chdir("/home/1000");
            fs.setUid(1000);
            fs.setGid(1000);
            fs.writeFileSync("file", "hello");
            fs.mkdirSync("dir");
            fs.chmodSync("file", 0o124);
            fs.chmodSync("dir", 0o124);
            let error;
            error = assert.throws(() => {
                fs.accessSync(
                    "file",
                    (fs.constants.R_OK |
                        fs.constants.W_OK)
                );
            });
            assert.equal(error.code, "EACCES");
            error = assert.throws(() => {
                fs.accessSync(
                    "dir",
                    (fs.constants.R_OK |
                        fs.constants.W_OK)
                );
            });
            assert.equal(error.code, "EACCES");
            fs.accessSync("file", fs.constants.X_OK);
            fs.accessSync("dir", fs.constants.X_OK);
        });

        it("file permissions --- - sync", () => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/home");
            fs.mkdirSync("/home/1000");
            fs.chownSync("/home/1000", 1000, 1000);
            fs.chdir("/home/1000");
            fs.setUid(1000);
            fs.setGid(1000);
            fs.writeFileSync("file", "hello");
            fs.chmodSync("file", 0o000);
            let error;
            error = assert.throws(() => {
                fs.accessSync("file", fs.constants.X_OK);
            });
            assert.equal(error.code, "EACCES");
            error = assert.throws(() => {
                fs.openSync("file", "r");
            });
            assert.equal(error.code, "EACCES");
            error = assert.throws(() => {
                fs.openSync("file", "w");
            });
            assert.equal(error.code, "EACCES");
            const stat = fs.statSync("file");
            assert.isTrue(stat.isFile());
        });

        it("file permissions r-- - sync", () => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/home");
            fs.mkdirSync("/home/1000");
            fs.chownSync("/home/1000", 1000, 1000);
            fs.chdir("/home/1000");
            fs.setUid(1000);
            fs.setGid(1000);
            const str = "hello";
            fs.writeFileSync("file", str);
            fs.chmodSync("file", 0o400);
            let error;
            error = assert.throws(() => {
                fs.accessSync("file", fs.constants.X_OK);
            });
            assert.equal(error.code, "EACCES");
            assert.equal(fs.readFileSync("file", "utf8"), str);
            error = assert.throws(() => {
                fs.openSync("file", "w");
            });
            assert.equal(error.code, "EACCES");
        });

        it("file permissions rw- - sync", () => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/home");
            fs.mkdirSync("/home/1000");
            fs.chownSync("/home/1000", 1000, 1000);
            fs.chdir("/home/1000");
            fs.setUid(1000);
            fs.setGid(1000);
            fs.writeFileSync("file", "world");
            fs.chmodSync("file", 0o600);
            const error = assert.throws(() => {
                fs.accessSync("file", fs.constants.X_OK);
            });
            assert.equal(error.code, "EACCES");
            const str = "hello";
            fs.writeFileSync("file", str);
            assert.equal(fs.readFileSync("file", "utf8"), str);
        });

        it("file permissions rwx - sync", () => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/home");
            fs.mkdirSync("/home/1000");
            fs.chownSync("/home/1000", 1000, 1000);
            fs.chdir("/home/1000");
            fs.setUid(1000);
            fs.setGid(1000);
            fs.writeFileSync("file", "world");
            fs.chmodSync("file", 0o700);
            fs.accessSync("file", fs.constants.X_OK);
            const str = "hello";
            fs.writeFileSync("file", str);
            assert.equal(fs.readFileSync("file", "utf8"), str);
        });

        it("file permissions r-x - sync", () => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/home");
            fs.mkdirSync("/home/1000");
            fs.chownSync("/home/1000", 1000, 1000);
            fs.chdir("/home/1000");
            fs.setUid(1000);
            fs.setGid(1000);
            const str = "hello";
            fs.writeFileSync("file", str);
            fs.chmodSync("file", 0o500);
            fs.accessSync("file", fs.constants.X_OK);
            assert.equal(fs.readFileSync("file", "utf8"), str);
        });

        it("file permissions -w- - sync", () => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/home");
            fs.mkdirSync("/home/1000");
            fs.chownSync("/home/1000", 1000, 1000);
            fs.chdir("/home/1000");
            fs.setUid(1000);
            fs.setGid(1000);
            const str = "hello";
            fs.writeFileSync("file", str);
            fs.chmodSync("file", 0o200);
            let error;
            error = assert.throws(() => {
                fs.accessSync("file", fs.constants.X_OK);
            });
            assert.equal(error.code, "EACCES");
            fs.writeFileSync("file", str);
            error = assert.throws(() => {
                fs.openSync("file", "r");
            });
            assert.equal(error.code, "EACCES");
        });

        it("file permissions -wx - sync", () => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/home");
            fs.mkdirSync("/home/1000");
            fs.chownSync("/home/1000", 1000, 1000);
            fs.chdir("/home/1000");
            fs.setUid(1000);
            fs.setGid(1000);
            const str = "hello";
            fs.writeFileSync("file", str);
            fs.chmodSync("file", 0o300);
            fs.accessSync("file", fs.constants.X_OK);
            fs.writeFileSync("file", str);
            const error = assert.throws(() => {
                fs.openSync("file", "r");
            });
            assert.equal(error.code, "EACCES");
        });

        it("file permissions --x - sync", () => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/home");
            fs.mkdirSync("/home/1000");
            fs.chownSync("/home/1000", 1000, 1000);
            fs.chdir("/home/1000");
            fs.setUid(1000);
            fs.setGid(1000);
            fs.writeFileSync("file", "hello");
            fs.chmodSync("file", 0o100);
            fs.accessSync("file", fs.constants.X_OK);
            let error;
            error = assert.throws(() => {
                fs.openSync("file", "w");
            });
            assert.equal(error.code, "EACCES");
            error = assert.throws(() => {
                fs.openSync("file", "r");
            });
            assert.equal(error.code, "EACCES");
        });

        it("directory permissions --- - sync", () => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/home");
            fs.mkdirSync("/home/1000");
            fs.chownSync("/home/1000", 1000, 1000);
            fs.chdir("/home/1000");
            fs.setUid(1000);
            fs.setGid(1000);
            fs.mkdirSync("---");
            fs.chmodSync("---", 0o000);
            const stat = fs.statSync("---");
            assert.isTrue(stat.isDirectory());
            let error;
            error = assert.throws(() => {
                fs.writeFileSync("---/a", "hello");
            });
            assert.equal(error.code, "EACCES");
            error = assert.throws(() => {
                fs.chdir("---");
            });
            assert.equal(error.code, "EACCES");
            error = assert.throws(() => {
                fs.readdirSync("---");
            });
            assert.equal(error.code, "EACCES");
        });

        it("directory permissions r-- - sync", () => {
            // allows listing entries
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/home");
            fs.mkdirSync("/home/1000");
            fs.chownSync("/home/1000", 1000, 1000);
            fs.chdir("/home/1000");
            fs.setUid(1000);
            fs.setGid(1000);
            fs.mkdirSync("r--");
            fs.writeFileSync("r--/a", "hello");
            fs.chmodSync("r--", 0o400);
            let error;
            error = assert.throws(() => {
                fs.writeFileSync("r--/b", "hello");
            });
            assert.equal(error.code, "EACCES");
            error = assert.throws(() => {
                fs.chdir("r--");
            });
            assert.equal(error.code, "EACCES");
            assert.deepEqual(fs.readdirSync("r--"), ["a"]);
            // you can always change metadata even without write permissions
            fs.utimesSync("r--", new Date(), new Date());
            // you cannot access the properties of the children
            error = assert.throws(() => {
                fs.statSync("r--/a");
            });
            assert.equal(error.code, "EACCES");
        });

        it("directory permissions rw- - sync", () => {
            // allows listing entries
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/home");
            fs.mkdirSync("/home/1000");
            fs.chownSync("/home/1000", 1000, 1000);
            fs.chdir("/home/1000");
            fs.setUid(1000);
            fs.setGid(1000);
            fs.mkdirSync("rw-");
            fs.writeFileSync("rw-/a", "hello");
            fs.chmodSync("rw-", 0o600);
            let error;
            // you cannot write into a file
            error = assert.throws(() => {
                fs.writeFileSync("rw-/a", "world");
            });
            assert.equal(error.code, "EACCES");
            // you cannot create a new file
            error = assert.throws(() => {
                fs.writeFileSync("rw-/b", "hello");
            });
            assert.equal(error.code, "EACCES");
            // you cannot remove files
            error = assert.throws(() => {
                fs.unlinkSync("rw-/a");
            });
            assert.equal(error.code, "EACCES");
            // you cannot traverse into it
            error = assert.throws(() => {
                fs.chdir("rw-");
            });
            assert.equal(error.code, "EACCES");
            assert.deepEqual(fs.readdirSync("rw-"), ["a"]);
            fs.utimesSync("rw-", new Date(), new Date());
            // you cannot access the properties of the children
            error = assert.throws(() => {
                fs.statSync("rw-/a");
            });
            assert.equal(error.code, "EACCES");
        });

        it("directory permissions rwx - sync", () => {
            // allows listing entries, creation of children and traversal
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/home");
            fs.mkdirSync("/home/1000");
            fs.chownSync("/home/1000", 1000, 1000);
            fs.chdir("/home/1000");
            fs.setUid(1000);
            fs.setGid(1000);
            fs.mkdirSync("rwx");
            fs.chmodSync("rwx", 0o700);
            const str = "abc";
            fs.writeFileSync("rwx/a", str);
            assert.equal(fs.readFileSync("rwx/a", "utf8"), str);
            assert.deepEqual(fs.readdirSync("rwx"), ["a"]);
            fs.chdir("rwx");
            const stat = fs.statSync("./a");
            assert.isTrue(stat.isFile());
            fs.unlinkSync("./a");
            fs.rmdirSync("../rwx");
        });

        it("directory permissions r-x - sync", () => {
            // allows listing entries and traversal
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/home");
            fs.mkdirSync("/home/1000");
            fs.chownSync("/home/1000", 1000, 1000);
            fs.chdir("/home/1000");
            fs.setUid(1000);
            fs.setGid(1000);
            fs.mkdirSync("r-x");
            fs.mkdirSync("r-x/dir");
            fs.writeFileSync("r-x/a", "hello");
            fs.chmodSync("r-x", 0o500);
            const str = "world";
            // you can write to the file
            fs.writeFileSync("r-x/a", str);
            let error;
            // you cannot create new files
            error = assert.throws(() => {
                fs.writeFileSync("r-x/b", str);
            });
            assert.equal(error.code, "EACCES");
            // you can read the directory
            assert.deepEqual(fs.readdirSync("r-x"), ["dir", "a"]);
            // you can read the file
            assert.equal(fs.readFileSync("r-x/a", "utf8"), str);
            // you can traverse into the directory
            fs.chdir("r-x");
            const stat = fs.statSync("dir");
            assert.isTrue(stat.isDirectory());
            // you cannot delete the file
            error = assert.throws(() => {
                fs.unlinkSync("./a");
            });
            assert.equal(error.code, "EACCES");
            // cannot delete the directory
            error = assert.throws(() => {
                fs.rmdirSync("dir");
            });
            assert.equal(error.code, "EACCES");
        });

        it("directory permissions -w- - sync", () => {
            // allows nothing
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/home");
            fs.mkdirSync("/home/1000");
            fs.chownSync("/home/1000", 1000, 1000);
            fs.chdir("/home/1000");
            fs.setUid(1000);
            fs.setGid(1000);
            fs.mkdirSync("-w-");
            fs.chmodSync("-w-", 0o000);
            let error;
            error = assert.throws(() => {
                fs.writeFileSync("-w-/a", "hello");
            });
            assert.equal(error.code, "EACCES");
            error = assert.throws(() => {
                fs.chdir("-w-");
            });
            assert.equal(error.code, "EACCES");
            error = assert.throws(() => {
                fs.readdirSync("-w-");
            });
            assert.equal(error.code, "EACCES");
        });

        it("directory permissions -wx - sync", () => {
            // creation of children and allows traversal
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/home");
            fs.mkdirSync("/home/1000");
            fs.chownSync("/home/1000", 1000, 1000);
            fs.chdir("/home/1000");
            fs.setUid(1000);
            fs.setGid(1000);
            fs.mkdirSync("-wx");
            fs.chmodSync("-wx", 0o300);
            const str = "hello";
            fs.writeFileSync("-wx/a", str);
            assert.equal(fs.readFileSync("-wx/a", "utf8"), str);
            fs.unlinkSync("-wx/a");
            fs.chdir("-wx");
            fs.mkdirSync("./dir");
            const error = assert.throws(() => {
                fs.readdirSync(".");
            });
            assert.equal(error.code, "EACCES");
            const stat = fs.statSync("./dir");
            assert.isTrue(stat.isDirectory());
            fs.rmdirSync("./dir");
        });

        it("directory permissions --x - sync", () => {
            // allows traversal
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/home");
            fs.mkdirSync("/home/1000");
            fs.chownSync("/home/1000", 1000, 1000);
            fs.chdir("/home/1000");
            fs.setUid(1000);
            fs.setGid(1000);
            fs.mkdirSync("--x");
            const str = "hello";
            fs.writeFileSync("--x/a", str);
            fs.chmodSync("--x", 0o100);
            fs.chdir("--x");
            let error;
            error = assert.throws(() => {
                fs.writeFileSync("./b", "world");
            });
            assert.equal(error.code, "EACCES");
            error = assert.throws(() => {
                fs.unlinkSync("./a");
            });
            assert.equal(error.code, "EACCES");
            error = assert.throws(() => {
                fs.readdirSync(".");
            });
            assert.equal(error.code, "EACCES");
            assert.equal(fs.readFileSync("./a", "utf8"), str);
        });

        it("changing file permissions does not affect already opened file descriptor", () => {
            const fs = new MemoryFileSystem();
            fs.mkdirSync("/home");
            fs.mkdirSync("/home/1000");
            fs.chownSync("/home/1000", 1000, 1000);
            fs.chdir("/home/1000");
            fs.setUid(1000);
            fs.setGid(1000);
            const str = "hello";
            fs.writeFileSync("file", str);
            fs.chmodSync("file", 0o777);
            const fd = fs.openSync("file", "r+");
            fs.chmodSync("file", 0o000);
            assert.equal(fs.readFileSync(fd, "utf8"), str);
            const str2 = "world";
            fs.writeFileSync(fd, str2);
            fs.lseekSync(fd, 0);
            assert.equal(fs.readFileSync(fd, "utf8"), str2);
            fs.closeSync(fd);
        });

        it("writeFileSync and appendFileSync respects the mode", () => {
            const fs = new MemoryFileSystem();
            let error;
            // allow others to read only
            fs.writeFileSync("/test1", "", { mode: 0o004 });
            fs.appendFileSync("/test2", "", { mode: 0o004 });
            // become the other
            fs.setUid(1000);
            fs.setGid(1000);
            fs.accessSync("/test1", fs.constants.R_OK);
            error = assert.throws(() => {
                fs.accessSync("/test1", fs.constants.W_OK);
            });
            assert.equal(error.code, "EACCES");
            fs.accessSync("/test2", fs.constants.R_OK);
            error = assert.throws(() => {
                fs.accessSync("/test1", fs.constants.W_OK);
            });
            assert.equal(error.code, "EACCES");
        });
    });

    describe("Uint8Array data support", () => {
        it("Uint8Array data support - sync", () => {
            const fs = new MemoryFileSystem();
            const buf = Buffer.from("abc");
            const array = new Uint8Array(buf);
            fs.writeFileSync("/a", array);
            assert.deepEqual(fs.readFileSync("/a"), buf);
            const fd = fs.openSync("/a", "r+");
            fs.writeSync(fd, array);
            fs.lseekSync(fd, 0);
            const array2 = new Uint8Array(array.length);
            fs.readSync(fd, array2, 0, array2.length);
            assert.deepEqual(array2, array);
            fs.closeSync(fd);
        });
    });

    describe.todo("URL path support", () => {
        it("URL path support - sync", () => {
            const fs = new MemoryFileSystem();
            let url;
            url = new URL("file:///file");
            const str = "Hello World";
            fs.writeFileSync(url, str);
            assert.equal(fs.readFileSync(url, "utf8"), str);
            const fd = fs.openSync(url, "a+");
            const str2 = "abc";
            fs.writeSync(fd, str2);
            const buf = Buffer.allocUnsafe(str.length + str2.length);
            fs.lseekSync(fd, 0);
            fs.readSync(fd, buf, 0, buf.length);
            assert.deepEqual(buf, Buffer.from(str + str2));
            url = new URL("file://hostname/file");
            const error = assert.throws(() => {
                fs.openSync(url, "w");
            });
            assert.equal(error.message, "ERR_INVALID_FILE_URL_HOST");
            fs.closeSync(fd);
        });
    });

    describe("complex tests and character devices", () => {
        const randomBytes = require("secure-random-bytes");

        const mfs = new MemoryFileSystem();

        const fullDev = {
            setPos: (fd, position, flags) => {
                fd._pos = 0;
            },
            read: (fd, buffer, position) => {
                buffer.fill(0);
                return buffer.length;
            },
            write: (fd, buffer, position, extraFlags) => {
                throw createError("ENOSPC");
            }
        };

        const nullDev = {
            setPos: (fd, position, flags) => {
                fd._pos = 0;

            },
            read: (fd, buffer, position) => {
                return 0;
            },
            write: (fd, buffer, position, extraFlags) => {
                return buffer.length;
            }
        };


        const randomDev = {
            setPos: (fd, position, flags) => {
                fd._pos = 0;

            },
            read: (fd, buffer, position) => {
                const randomBuf = Buffer.from(randomBytes(buffer.length), "ascii");
                randomBuf.copy(buffer);
                return randomBuf.length;
            },
            write: (fd, buffer, position, extraFlags) => {
                return buffer.length;
            }
        };

        let fds = 0;
        let fs = null;
        let ttyInFd = null;
        let ttyOutFd = null;

        const ttyDev = {
            open: (fd) => {
                if (fds === 0) {
                    if (process.release && process.release.name === "node") {
                        fs = require("fs");
                        ttyOutFd = process.stdout.fd;
                        if (process.platform === "win32") {
                            // on windows, stdin is in blocking mode
                            // NOTE: on windows node repl environment, stdin is in raw mode
                            //       make sure to set process.stdin.setRawMode(false)
                            ttyInFd = process.stdin.fd;
                        } else {
                            // on non-windows, stdin is in non-blocking mode
                            // to get blocking semantics we need to reopen stdin
                            try {
                                // if there are problems opening this
                                // we assume there is no stdin
                                ttyInFd = fs.openSync("/dev/fd/0", "rs");
                            } catch (e) {
                                //
                            }
                        }
                    }
                }
                ++fds;
            },
            close: (fd) => {
                --fds;
                if (fds === 0) {
                    if (ttyInFd && fs) {
                        fs.closeSync(ttyInFd);
                    }
                }
            },
            read: (fd, buffer, position) => {
                if (!is.null(ttyInFd) && fs) {
                    // $FlowFixMe: position parameter allows null
                    return fs.readSync(ttyInFd, buffer, 0, buffer.length, null);
                }
                throw createError("ENXIO");

            },
            write: (fd, buffer, position, extraFlags) => {
                if (!is.null(ttyOutFd) && fs) {
                    return fs.writeSync(ttyOutFd, buffer);
                }
                // console.log(buffer.toString());
                return buffer.length;
            }
        };

        const zeroDev = {
            setPos: (fd, position, flags) => {
                fd._pos = 0;

            },
            read: (fd, buffer, position) => {
                buffer.fill(0);
                return buffer.length;
            },
            write: (fd, buffer, position, extraFlags) => {
                return buffer.length;
            }
        };


        mfs.registerCharacterDevice(nullDev, 1, 3);
        mfs.registerCharacterDevice(zeroDev, 1, 5);
        mfs.registerCharacterDevice(fullDev, 1, 7);
        mfs.registerCharacterDevice(randomDev, 1, 8);
        mfs.registerCharacterDevice(randomDev, 1, 9);
        mfs.registerCharacterDevice(ttyDev, 4, 0);
        mfs.registerCharacterDevice(ttyDev, 5, 0);
        mfs.registerCharacterDevice(ttyDev, 5, 1);


        mfs.mkdirSync("/dev");
        mfs.chmodSync("/dev", 0o775);

        mfs.mknodSync("/dev/null", mfs.constants.S_IFCHR, 1, 3);
        mfs.mknodSync("/dev/zero", mfs.constants.S_IFCHR, 1, 5);
        mfs.mknodSync("/dev/full", mfs.constants.S_IFCHR, 1, 7);
        mfs.mknodSync("/dev/random", mfs.constants.S_IFCHR, 1, 8);
        mfs.mknodSync("/dev/urandom", mfs.constants.S_IFCHR, 1, 9);
        mfs.chmodSync("/dev/null", 0o666);
        mfs.chmodSync("/dev/zero", 0o666);
        mfs.chmodSync("/dev/full", 0o666);
        mfs.chmodSync("/dev/random", 0o666);
        mfs.chmodSync("/dev/urandom", 0o666);

        // tty0 points to the currently active virtual console (on linux this is usually tty1 or tty7)
        // tty points to the currently active console (physical, virtual or pseudo)
        // console points to the system console (it defaults to tty0)
        // refer to the tty character device to understand its implementation
        mfs.mknodSync("/dev/tty0", mfs.constants.S_IFCHR, 4, 0);
        mfs.mknodSync("/dev/tty", mfs.constants.S_IFCHR, 5, 0);
        mfs.mknodSync("/dev/console", mfs.constants.S_IFCHR, 5, 1);
        mfs.chmodSync("/dev/tty0", 0o600);
        mfs.chmodSync("/dev/tty", 0o666);
        mfs.chmodSync("/dev/console", 0o600);

        mfs.mkdirSync("/tmp");
        mfs.chmodSync("/tmp", 0o777);

        mfs.mkdirSync("/root");
        mfs.chmodSync("/root", 0o700);


        it("contains /tmp", () => {
            assert.deepEqual(mfs.readdirSync("/tmp"), []);
            mfs.setUid(1000);
            mfs.setGid(1000);
            const tmpDir = mfs.mkdtempSync("/tmp/");
            const stat = mfs.statSync(tmpDir);
            assert.isTrue(stat.isDirectory());
            mfs.chdir("/tmp");
            mfs.rmdirSync(tmpDir);
            mfs.setUid(0);
            mfs.setGid(0);
        });

        it("contains /root", () => {
            assert.deepEqual(mfs.readdirSync("/root"), []);
            mfs.setUid(1000);
            mfs.setGid(1000);
            const error = assert.throws(() => {
                mfs.chdir("/root");
            });
            assert.equal(error.code, "EACCES");
            mfs.setUid(0);
            mfs.setGid(0);
        });

        it("contains /dev", () => {
            const stat = mfs.statSync("/dev");
            assert.isTrue(stat.isDirectory());
        });

        it("/dev/null works - sync", () => {
            let fd;
            fd = mfs.openSync("/dev/null", "w");
            const str = "Hello World";
            const bytesWritten = mfs.writeSync(fd, str);
            assert.equal(bytesWritten, Buffer.from(str).length);
            mfs.lseekSync(fd, 10);
            const buf = Buffer.from(str);
            mfs.closeSync(fd);
            fd = mfs.openSync("/dev/null", "r");
            const bytesRead = mfs.readSync(fd, buf, 0, buf.length);
            assert.equal(bytesRead, 0);
            assert.deepEqual(buf, Buffer.from(str));
            mfs.closeSync(fd);
        });

        it("/dev/full works - sync", () => {
            const error = assert.throws(() => {
                mfs.writeFileSync("/dev/full", "Hello World");
            });
            assert.equal(error.code, "ENOSPC");
            const fd = mfs.openSync("/dev/full", "r");
            mfs.lseekSync(fd, 10);
            const buf = Buffer.allocUnsafe(10);
            const bytesRead = mfs.readSync(fd, buf, 0, buf.length);
            assert.equal(bytesRead, buf.length);
            for (let i = 0; i < buf.length; ++i) {
                assert.equal(buf[i], 0);
            }
        });

        it("/dev/zero works - sync", () => {
            let fd;
            fd = mfs.openSync("/dev/zero", "w");
            const str = "Hello World";
            const bytesWritten = mfs.writeSync(fd, str);
            assert.equal(bytesWritten, Buffer.from(str).length);
            mfs.closeSync(fd);
            fd = mfs.openSync("/dev/zero", "r");
            mfs.lseekSync(fd, 10);
            const bufLength = 10;
            const buf = Buffer.allocUnsafe(bufLength);
            const bytesRead = mfs.readSync(fd, buf, 0, buf.length);
            assert.equal(bytesRead, buf.length);
            assert.deepEqual(buf, Buffer.alloc(bufLength));
            mfs.closeSync(fd);
        });

        it("/dev/random and /dev/urandom works - sync", () => {
            let fdRandom;
            let fdUrandom;
            fdRandom = mfs.openSync("/dev/random", "w");
            fdUrandom = mfs.openSync("/dev/urandom", "w");
            const str = "Hello World";
            let bytesWritten;
            bytesWritten = mfs.writeSync(fdRandom, str);
            assert.equal(bytesWritten, Buffer.from(str).length);
            bytesWritten = mfs.writeSync(fdUrandom, str);
            assert.equal(bytesWritten, Buffer.from(str).length);
            mfs.closeSync(fdRandom);
            mfs.closeSync(fdUrandom);
            fdRandom = mfs.openSync("/dev/random", "r");
            fdUrandom = mfs.openSync("/dev/urandom", "r");
            let buf;
            buf = Buffer.alloc(10);
            mfs.readSync(fdRandom, buf, 0, buf.length);
            assert.notDeepEqual(buf, Buffer.alloc(10));
            buf = Buffer.alloc(10);
            mfs.readSync(fdUrandom, buf, 0, buf.length);
            assert.notDeepEqual(buf, Buffer.alloc(10));
            mfs.closeSync(fdRandom);
            mfs.closeSync(fdUrandom);
        });

        it("/dev/tty0, /dev/tty, and /dev/console", () => {
            const tty0Fd = mfs.openSync("/dev/tty0", "w");
            const ttyFd = mfs.openSync("/dev/tty", "w");
            const consoleFd = mfs.openSync("/dev/console", "w");
            const message = "\tTESTING TTY MESSAGE\n";
            let bytesWritten;
            bytesWritten = mfs.writeSync(tty0Fd, message);
            assert.equal(bytesWritten, message.length);
            bytesWritten = mfs.writeSync(ttyFd, message);
            assert.equal(bytesWritten, message.length);
            bytesWritten = mfs.writeSync(consoleFd, message);
            assert.equal(bytesWritten, message.length);
            // unlike other character devices, tty does not allow seeking
            let error = assert.throws(() => {
                mfs.lseekSync(tty0Fd, 10);
            });
            assert.equal(error.code, "ESPIPE");
            error = assert.throws(() => {
                mfs.lseekSync(ttyFd, 10);
            });
            assert.equal(error.code, "ESPIPE");
            error = assert.throws(() => {
                mfs.lseekSync(consoleFd, 10);
            });
            assert.equal(error.code, "ESPIPE");
            // we cannot test reading without blocking the thread
            // so reading must be tested manually
            // you need to test sequential reads like this
            // const fd = fs.openSync('/dev/tty', 'r');
            // const buf = Buffer.alloc(10);
            // console.log(fs.readSync(fd, buf, 0, buf.length));
            // console.log(buf.toString());
            // console.log(fs.readSync(fd, buf, 0, buf.length));
            // console.log(buf.toString());
            // pipe 20 characters into the program, and you should see
            // the first 10 characters and then the second 10 characters
        });
    });
});
