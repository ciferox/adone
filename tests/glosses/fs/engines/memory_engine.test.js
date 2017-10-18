describe("fs", "engine", "MemoryEngine", () => {
    const { fs, stream: { concat }, promise } = adone;
    const { engine: { MemoryEngine } } = fs;
    const c = MemoryEngine.constants;
    const { Stats } = adone.std.fs;

    describe("methods", () => {
        let engine;

        beforeEach(() => {
            engine = new MemoryEngine();
        });

        describe("access", () => {
            it("should does not throw if a file is accessable", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));

                await engine.access("/a");
            });

            it("should throw ENOENT if there is no file", async () => {
                const err = await assert.throws(async () => {
                    await engine.access("/a");
                }, "ENOENT: no such file or directory, access '/a'");
                expect(err.code).to.be.equal("ENOENT");
            });

            it("should apply 'user' set and throw EACCES if the effective uid is the same but there are no corresponding rights", async () => {
                engine.add((ctx) => ({
                    nothing: ctx.file({
                        contents: "hello",
                        mode: 0o077
                    }),
                    r: ctx.file({
                        contents: "hello",
                        mode: 0o477
                    }),
                    w: ctx.file({
                        contents: "hello",
                        mode: 0o277
                    }),
                    x: ctx.file({
                        contents: "hello",
                        mode: 0o177
                    }),
                    rw: ctx.file({
                        contents: "hello",
                        mode: 0o677
                    }),
                    rx: ctx.file({
                        contents: "hello",
                        mode: 0o577
                    }),
                    wx: ctx.file({
                        contents: "hello",
                        mode: 0o377
                    }),
                    rwx: ctx.file({
                        contents: "hello",
                        mode: 0o777
                    })
                }));

                {
                    const err = await assert.throws(async () => {
                        await engine.access("/nothing", c.X_OK);
                    }, "EACCES: permission denied, access '/nothing'");
                    expect(err.code).to.be.equal("EACCES");
                }
                {
                    const err = await assert.throws(async () => {
                        await engine.access("/r", c.W_OK | c.X_OK);
                    }, "EACCES: permission denied, access '/r'");
                    expect(err.code).to.be.equal("EACCES");
                }
                {
                    const err = await assert.throws(async () => {
                        await engine.access("/w", c.R_OK | c.X_OK);
                    }, "EACCES: permission denied, access '/w'");
                    expect(err.code).to.be.equal("EACCES");
                }
                {
                    const err = await assert.throws(async () => {
                        await engine.access("/x", c.R_OK | c.W_OK);
                    }, "EACCES: permission denied, access '/x'");
                    expect(err.code).to.be.equal("EACCES");
                }
                await engine.access("/r", c.R_OK);
                await engine.access("/w", c.W_OK);
                await engine.access("/x", c.X_OK);
                await engine.access("/rw", c.R_OK | c.W_OK);
                await engine.access("/rx", c.R_OK | c.X_OK);
                await engine.access("/wx", c.W_OK | c.X_OK);
                await engine.access("/rwx", c.R_OK | c.W_OK | c.X_OK);
            });

            it("should apply 'group' set and throw EACCES if the effective gid is the same but there are no corresponding rights", async () => {
                engine.add((ctx) => ({
                    nothing: ctx.file({
                        contents: "hello",
                        mode: 0o707,
                        uid: -1
                    }),
                    r: ctx.file({
                        contents: "hello",
                        mode: 0o747,
                        uid: -1
                    }),
                    w: ctx.file({
                        contents: "hello",
                        mode: 0o727,
                        uid: -1
                    }),
                    x: ctx.file({
                        contents: "hello",
                        mode: 0o717,
                        uid: -1
                    }),
                    rw: ctx.file({
                        contents: "hello",
                        mode: 0o767,
                        uid: -1
                    }),
                    rx: ctx.file({
                        contents: "hello",
                        mode: 0o757,
                        uid: -1
                    }),
                    wx: ctx.file({
                        contents: "hello",
                        mode: 0o737,
                        uid: -1
                    }),
                    rwx: ctx.file({
                        contents: "hello",
                        mode: 0o777,
                        uid: -1
                    })
                }));

                {
                    const err = await assert.throws(async () => {
                        await engine.access("/nothing", c.X_OK);
                    }, "EACCES: permission denied, access '/nothing'");
                    expect(err.code).to.be.equal("EACCES");
                }
                {
                    const err = await assert.throws(async () => {
                        await engine.access("/r", c.W_OK | c.X_OK);
                    }, "EACCES: permission denied, access '/r'");
                    expect(err.code).to.be.equal("EACCES");
                }
                {
                    const err = await assert.throws(async () => {
                        await engine.access("/w", c.R_OK | c.X_OK);
                    }, "EACCES: permission denied, access '/w'");
                    expect(err.code).to.be.equal("EACCES");
                }
                {
                    const err = await assert.throws(async () => {
                        await engine.access("/x", c.R_OK | c.W_OK);
                    }, "EACCES: permission denied, access '/x'");
                    expect(err.code).to.be.equal("EACCES");
                }
                await engine.access("/r", c.R_OK);
                await engine.access("/w", c.W_OK);
                await engine.access("/x", c.X_OK);
                await engine.access("/rw", c.R_OK | c.W_OK);
                await engine.access("/rx", c.R_OK | c.X_OK);
                await engine.access("/wx", c.W_OK | c.X_OK);
                await engine.access("/rwx", c.R_OK | c.W_OK | c.X_OK);
            });

            it("should apply 'others' set and throw EACCES if there are no corresponding rights", async () => {
                engine.add((ctx) => ({
                    nothing: ctx.file({
                        contents: "hello",
                        mode: 0o770,
                        uid: -1,
                        gid: -1
                    }),
                    r: ctx.file({
                        contents: "hello",
                        mode: 0o774,
                        uid: -1,
                        gid: -1
                    }),
                    w: ctx.file({
                        contents: "hello",
                        mode: 0o772,
                        uid: -1,
                        gid: -1
                    }),
                    x: ctx.file({
                        contents: "hello",
                        mode: 0o771,
                        uid: -1,
                        gid: -1
                    }),
                    rw: ctx.file({
                        contents: "hello",
                        mode: 0o776,
                        uid: -1,
                        gid: -1
                    }),
                    rx: ctx.file({
                        contents: "hello",
                        mode: 0o775,
                        uid: -1,
                        gid: -1
                    }),
                    wx: ctx.file({
                        contents: "hello",
                        mode: 0o773,
                        uid: -1,
                        gid: -1
                    }),
                    rwx: ctx.file({
                        contents: "hello",
                        mode: 0o777,
                        uid: -1,
                        gid: -1
                    })
                }));

                {
                    const err = await assert.throws(async () => {
                        await engine.access("/nothing", c.X_OK);
                    }, "EACCES: permission denied, access '/nothing'");
                    expect(err.code).to.be.equal("EACCES");
                }
                {
                    const err = await assert.throws(async () => {
                        await engine.access("/r", c.W_OK | c.X_OK);
                    }, "EACCES: permission denied, access '/r'");
                    expect(err.code).to.be.equal("EACCES");
                }
                {
                    const err = await assert.throws(async () => {
                        await engine.access("/w", c.R_OK | c.X_OK);
                    }, "EACCES: permission denied, access '/w'");
                    expect(err.code).to.be.equal("EACCES");
                }
                {
                    const err = await assert.throws(async () => {
                        await engine.access("/x", c.R_OK | c.W_OK);
                    }, "EACCES: permission denied, access '/x'");
                    expect(err.code).to.be.equal("EACCES");
                }
                await engine.access("/r", c.R_OK);
                await engine.access("/w", c.W_OK);
                await engine.access("/x", c.X_OK);
                await engine.access("/rw", c.R_OK | c.W_OK);
                await engine.access("/rx", c.R_OK | c.X_OK);
                await engine.access("/wx", c.W_OK | c.X_OK);
                await engine.access("/rwx", c.R_OK | c.W_OK | c.X_OK);
            });
        });

        describe("appendFile", () => {
            it("should append data to a file", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));

                await engine.appendFile("/a", " world");
                expect(await engine.readFile("/a", "utf8")).to.be.equal("hello world");
            });

            it("should create a new file if there is no such file", async () => {
                await engine.appendFile("/a", "hello");
                expect(await engine.readFile("/a", "utf8")).to.be.equal("hello");
            });

            it("should throw EEXIST if the file already exists and the flag is 'ax'", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));

                await assert.throws(async () => {
                    await engine.appendFile("/a", "hello", { flag: "ax" });
                }, "EEXIST: file already exists, open '/a'");
            });

            it("should create a new file with 0o666 mode by default", async () => {
                await engine.appendFile("/a", "hello");
                const stat = await engine.stat("/a");
                expect(stat.mode & 0o777).to.be.equal(0o666);
            });

            it("should create a new file with the given mode", async () => {
                await engine.appendFile("/a", "hello", { mode: 0o700 });
                const stat = await engine.stat("/a");
                expect(stat.mode & 0o777).to.be.equal(0o700);
            });
        });

        describe("chmod", () => {
            it("should change file mode", async () => {
                engine.add((ctx) => ({
                    a: ctx.file({
                        contents: "hello",
                        mode: 0o755
                    })
                }));

                await engine.chmod("/a", 0o777);
                const stat = await engine.stat("/a");
                expect(stat.mode & 0o777).to.be.equal(0o777);
            });

            it("should throw ENOENT if there is no such file", async () => {
                const err = await assert.throws(async () => {
                    await engine.chmod("/a");
                }, "ENOENT: no such file or directory, chmod '/a'");
                expect(err.code).to.be.equal("ENOENT");
            });
        });

        describe("chown", () => {
            it("should change the file's owner uid/gid", async () => {
                engine.add((ctx) => ({
                    a: ctx.file({
                        contents: "hello",
                        gid: 1,
                        uid: 1
                    })
                }));

                await engine.chown("/a", 2, 2);
                const stat = await engine.stat("/a");
                expect(stat.uid).to.be.equal(2);
                expect(stat.gid).to.be.equal(2);
            });

            it("should throw ENOENT if there is no such file", async () => {
                const err = await assert.throws(async () => {
                    await engine.chown("/a");
                }, "ENOENT: no such file or directory, chown '/a'");
                expect(err.code).to.be.equal("ENOENT");
            });
        });

        describe("copyFile", () => {
            it("should copy file", async () => {
                engine.add((ctx) => ({
                    a: ctx.file({
                        contents: "hello",
                        mode: 0o755,
                        gid: 0,
                        uid: 0
                    })
                }));

                await engine.copyFile("/a", "/b");
                expect(await engine.readFile("/a", "utf8")).to.be.equal("hello");
                expect(await engine.readFile("/b", "utf8")).to.be.equal("hello");
                const stata = await engine.stat("/a");
                const statb = await engine.stat("/b");
                expect(statb.size).to.be.equal(stata.size);
                expect(statb.mode).to.be.equal(stata.mode);
                expect(statb.uid).to.be.equal(stata.uid);
                expect(statb.gid).to.be.equal(stata.gid);
            });

            it("should not change the source after copying", async () => {
                engine.add((ctx) => ({
                    a: ctx.file({
                        contents: "hello",
                        mode: 0o777,
                        gid: 0,
                        uid: 0
                    })
                }));

                await engine.copyFile("/a", "/b");
                await engine.writeFile("/b", " world");
                await engine.chmod("/b", 0o444);
                await engine.chown("/b", 1, 1);
                expect(await engine.readFile("/a", "utf8")).to.be.equal("hello");
                expect(await engine.readFile("/b", "utf8")).to.be.equal(" world");
                const stata = await engine.stat("/a");
                const statb = await engine.stat("/b");
                expect(stata.size).to.be.equal(5);
                expect(stata.gid).to.be.equal(0);
                expect(stata.uid).to.be.equal(0);
                expect(stata.mode & 0o777).to.be.equal(0o777);
                expect(statb.size).to.be.equal(6);
                expect(statb.gid).to.be.equal(1);
                expect(statb.uid).to.be.equal(1);
                expect(statb.mode & 0o777).to.be.equal(0o444);
            });

            it("should rewrite the dest contents if exists", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello"),
                    b: ctx.file("some content")
                }));

                await engine.copyFile("/a", "/b");
                expect(await engine.readFile("/b", "utf8")).to.be.equal("hello");
            });

            it("should throw EEXIST if the dest exists and COPYFILE_EXCL is set", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello"),
                    b: ctx.file("some content")
                }));

                const err = await assert.throws(async () => {
                    await engine.copyFile("/a", "/b", c.COPYFILE_EXCL);
                }, "EEXIST: file already exists, copyfile '/a' -> '/b'");
                expect(err.code).to.be.equal("EEXIST");
            });

            it("should copy file to another directory", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello"),
                    b: {

                    }
                }));

                await engine.copyFile("/a", "/b/c");
                expect(await engine.readFile("/b/c", "utf8")).to.be.equal("hello");
            });

            it("should throw ENOENT if the dest directory does not exist", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));

                const err = await assert.throws(async () => {
                    await engine.copyFile("/a", "/b/c");
                }, "ENOENT: no such file or directory, copyfile '/a' -> '/b/c'");
                expect(err.code).to.be.equal("ENOENT");
            });
        });

        describe("createReadStream", () => {
            it("should create a readable stream", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));

                const stream = engine.createReadStream("/a");
                const res = await stream.pipe(concat("string"));
                expect(res).to.be.deep.equal("hello");
            });

            it("should create a read stream for the given fd", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));

                const fd = await engine.open("/a", "r");
                const stream = await engine.createReadStream(null, { fd, autoClose: true });
                const res = await stream.pipe(concat("string"));
                expect(res).to.be.deep.equal("hello");
            });
        });

        describe("createWriteStream", () => {
            it("should create a writable stream", async () => {
                const stream = engine.createWriteStream("/a");
                stream.end("hello");
                await new Promise((resolve) => stream.once("finish", resolve));
                expect(await engine.readFile("/a", "utf8")).to.be.equal("hello");
            });

            it("should create a write stream for the given fd", async () => {
                const fd = await engine.open("/a", "w");
                const stream = engine.createWriteStream(null, { fd, autoClose: true });
                stream.end("hello");
                await new Promise((resolve) => stream.once("finish", resolve));
                expect(await engine.readFile("/a", "utf8")).to.be.equal("hello");
            });
        });

        describe("fchmod", () => {
            it("should change the file mode by the given fd", async () => {
                engine.add((ctx) => ({
                    a: ctx.file({
                        contents: "hello",
                        mode: 0o755
                    })
                }));

                const fd = await engine.open("/a", "r");
                await engine.fchmod(fd, 0o444);
                await engine.close(fd);
                const stat = await engine.stat("/a");
                expect(stat.mode & 0o777).to.be.equal(0o444);
            });

            it("should throw EBADF if the fd is unknown", async () => {
                const err = await assert.throws(async () => {
                    await engine.fchmod(123, 0o444);
                }, "EBADF: bad file descriptor, fchmod");
                expect(err.code).to.be.equal("EBADF");
            });
        });

        describe("fchown", () => {
            it("should change the file uid gid by the given fd", async () => {
                engine.add((ctx) => ({
                    a: ctx.file({
                        contents: "hello",
                        uid: 0,
                        gid: 0,
                        mode: 0o777
                    })
                }));

                const fd = await engine.open("/a", "r");
                await engine.fchown(fd, 1, 1);
                await engine.close(fd);
                const stat = await engine.stat("/a");
                expect(stat.gid).to.be.equal(1);
                expect(stat.uid).to.be.equal(1);
            });

            it("should throw EBADF if the fd is unknown", async () => {
                const err = await assert.throws(async () => {
                    await engine.fchown(123, 1, 1);
                }, "EBADF: bad file descriptor, fchown");
                expect(err.code).to.be.equal("EBADF");
            });
        });

        describe("fdatasync", () => {
            it("should ... not throw", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));
                const fd = await engine.open("/a", "r");
                await engine.fdatasync(fd);
                await engine.close(fd);
            });

            it("should throw EBADF if the fd is unknown", async () => {
                const err = await assert.throws(async () => {
                    await engine.fdatasync(14);
                }, "EBADF: bad file descriptor, fdatasync");
                expect(err.code).to.be.equal("EBADF");
            });
        });

        describe("fstat", () => {
            it("should return file stat by the given fd", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));

                const fd = await engine.open("/a", "r");
                const stat = await engine.fstat(fd);
                await engine.close(fd);
                expect(stat).to.be.instanceof(Stats);
                expect(stat.size).to.be.equal(5);
            });

            it("should throw EBADF is the fd is unknown", async () => {
                const err = await assert.throws(async () => {
                    await engine.fstat(100);
                }, "EBADF: bad file descriptor, fstat");
                expect(err.code).to.be.equal("EBADF");
            });
        });

        describe("fsync", () => {
            it("should ... not throw", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));

                const fd = await engine.open("/a", "r");
                await engine.fsync(fd);
                await engine.close(fd);
            });

            it("should throw EBADF if the fd is unknown", async () => {
                const err = await assert.throws(async () => {
                    await engine.fsync(100);
                }, "EBADF: bad file descriptor, fsync");
                expect(err.code).to.be.equal("EBADF");
            });
        });

        describe("ftruncate", () => {
            it("should truncate file to 0 length by the given fd", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));

                const fd = await engine.open("/a", c.O_WRONLY);
                await engine.ftruncate(fd);
                await engine.close(fd);
                expect(await engine.readFile("/a", "utf8")).to.be.empty;
            });

            it("should truncate file to the given length", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));

                const fd = await engine.open("/a", c.O_WRONLY);
                await engine.ftruncate(fd, 2);
                await engine.close(fd);
                expect(await engine.readFile("/a", "utf8")).to.be.equal("he");
            });

            it("should throw EINVAL if the fd is not open for writing", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));

                const fd = await engine.open("/a", "r");
                const err = await assert.throws(async () => {
                    await engine.ftruncate(fd);
                }, "EINVAL: invalid argument, ftruncate");
                expect(err.code).to.be.equal("EINVAL");
                await engine.close(fd);
            });

            it("should throw EBADF if the fd is unknown", async () => {
                const err = await assert.throws(async () => {
                    await engine.ftruncate(10);
                }, "EBADF: bad file descriptor, ftruncate");
                expect(err.code).to.be.equal("EBADF");
            });

            it("should fill the rest with zeroes if the length is > than the actual size", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));
                const fd = await engine.open("/a", c.O_WRONLY);
                await engine.ftruncate(fd, 15);
                await engine.close(fd);
                expect(await engine.readFile("/a", "utf8")).to.be.equal("hello\0\0\0\0\0\0\0\0\0\0");
            });
        });

        describe("futimes", () => {
            it("should change atime/mtime by the given fd", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));
                const fd = await engine.open("/a", "r");
                await engine.futimes(fd, 0, 0);
                await engine.close(fd);
                const stat = await engine.stat("/a");
                expect(stat.mtimeMs).to.be.equal(0);
                expect(stat.atimeMs).to.be.equal(0);
            });

            it("should throw EBADF if the fd is unknown", async () => {
                const err = await assert.throws(async () => {
                    await engine.futimes(14, 0, 0);
                }, "EBADF: bad file descriptor, futime");
                expect(err.code).to.be.equal("EBADF");
            });
        });

        describe("link", () => {
            it("should create a hard link (another name) for a file", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));

                await engine.link("/a", "/b");
                expect(await engine.readFile("/b", "utf8")).to.be.equal("hello");
                await engine.appendFile("/a", " world");
                expect(await engine.readFile("/b", "utf8")).to.be.equal("hello world");
                await engine.appendFile("/b", "!");
                expect(await engine.readFile("/a", "utf8")).to.be.equal("hello world!");
                expect(await engine.readFile("/b", "utf8")).to.be.equal("hello world!");
            });

            it("should throw EEXIST if the dest already exists", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello"),
                    b: ctx.file("hello")
                }));

                const err = await assert.throws(async () => {
                    await engine.link("/a", "/b");
                }, "EEXIST: file already exists, link '/a' -> '/b'");
                expect(err.code).to.be.equal("EEXIST");
            });

            it("should throw EPERM if the existing path is a directory", async () => {
                engine.add(() => ({
                    a: {

                    }
                }));

                const err = await assert.throws(async () => {
                    await engine.link("/a", "/b");
                }, "EPERM: operation not permitted, link '/a' -> '/b'");
                expect(err.code).to.be.equal("EPERM");
            });

            it("should throw EEXIST if the dest exists and the existing path is a directory", async () => {
                engine.add((ctx) => ({
                    a: {

                    },
                    b: ctx.file("hello")
                }));

                const err = await assert.throws(async () => {
                    await engine.link("/a", "/b");
                }, "EEXIST: file already exists, link '/a' -> '/b'");
                expect(err.code).to.be.equal("EEXIST");
            });

            it("should support creating links in another directory", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello"),
                    b: {
                        c: ctx.file("hello")
                    }
                }));

                await engine.link("/a", "/b/a");
                expect(await engine.readFile("/b/a", "utf8")).to.be.equal("hello");
                await engine.appendFile("/a", " world");
                expect(await engine.readFile("/b/a", "utf8")).to.be.equal("hello world");
                await engine.appendFile("/b/a", "!");
                expect(await engine.readFile("/a", "utf8")).to.be.equal("hello world!");
                expect(await engine.readFile("/b/a", "utf8")).to.be.equal("hello world!");
            });

            it("should throw ENOENT if the dest directory does not exist", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));

                const err = await assert.throws(async () => {
                    await engine.link("/a", "/b/a");
                }, "ENOENT: no such file or directory, link '/a' -> '/b/a'");
                expect(err.code).to.be.equal("ENOENT");
            });
        });

        describe("lstat", () => {
            it("should return file stats", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));

                const stat = await engine.lstat("/a");
                expect(stat).to.be.instanceof(Stats);
                expect(stat.isFile()).to.be.true;
                expect(stat.isDirectory()).to.be.false;
                expect(stat.isSymbolicLink()).to.be.false;
                expect(stat.size).to.be.equal(5);
            });

            it("should return directory stats", async () => {
                engine.add((ctx) => ({
                    a: {
                        b: ctx.file("hello")
                    }
                }));

                const stat = await engine.lstat("/a");
                expect(stat).to.be.instanceof(Stats);
                expect(stat.isFile()).to.be.false;
                expect(stat.isDirectory()).to.be.true;
                expect(stat.isSymbolicLink()).to.be.false;
            });

            it("should return symlink stats", async () => {
                engine.add((ctx) => ({
                    a: ctx.symlink("b")
                }));

                const stat = await engine.lstat("/a");
                expect(stat).to.be.instanceof(Stats);
                expect(stat.isFile()).to.be.false;
                expect(stat.isDirectory()).to.be.false;
                expect(stat.isSymbolicLink()).to.be.true;
            });
        });

        describe("mkdir", () => {
            it("should create a directory with 0o775 mode by default", async () => {
                await engine.mkdir("/a");
                const stat = await engine.stat("/a");
                expect(stat.isDirectory()).to.be.true;
                expect(stat.mode & 0o777).to.be.equal(0o775);
            });

            it("should throw EEXIST if the dest already exists", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello"),
                    b: ctx.file("hello"),
                    c: ctx.symlink("d")
                }));

                {
                    const err = await assert.throws(async () => {
                        await engine.mkdir("/a");
                    }, "EEXIST: file already exists, mkdir '/a'");
                    expect(err.code).to.be.equal("EEXIST");
                }
                {
                    const err = await assert.throws(async () => {
                        await engine.mkdir("/b");
                    }, "EEXIST: file already exists, mkdir '/b'");
                    expect(err.code).to.be.equal("EEXIST");
                }
                {
                    const err = await assert.throws(async () => {
                        await engine.mkdir("/c");
                    }, "EEXIST: file already exists, mkdir '/c'");
                    expect(err.code).to.be.equal("EEXIST");
                }
            });

            it("should throw EACCES if the parent has no write permissions", async () => {
                engine.add((ctx) => ({
                    a: [{
                        c: ctx.file("hello")
                    }, { mode: 0o555 }]
                }));

                const err = await assert.throws(async () => {
                    await engine.mkdir("/a/b");
                }, "EACCES: permission denied, mkdir '/a/b'");
                expect(err.code).to.be.equal("EACCES");
            });
        });

        describe.skip("mkdtemp", () => {
            //
        });

        describe("open", () => {
            describe("flags", () => {
                describe("r", () => {
                    it("should open an existing file for reading", async () => {
                        engine.add((ctx) => ({
                            a: ctx.file("hello")
                        }));

                        const fd = await engine.open("/a", "r");
                        const buf = Buffer.alloc(3);
                        await engine.read(fd, buf, 0, 3, 0);
                        expect(buf).to.be.deep.equal(Buffer.from("hel"));
                        await engine.close(fd);
                    });

                    it("should throw ENOENT if there is no such file", async () => {
                        const err = await assert.throws(async () => {
                            await engine.open("/a", "r");
                        }, "ENOENT: no such file or directory, open '/a'");
                        expect(err.code).to.be.equal("ENOENT");
                    });
                });

                describe("r+", () => {
                    it("should open an existing file for reading and writing", async () => {
                        engine.add((ctx) => ({
                            a: ctx.file("hello")
                        }));

                        const fd = await engine.open("/a", "r+");
                        const buf = Buffer.alloc(3);
                        await engine.read(fd, buf, 0, 3, 0);
                        expect(buf).to.be.deep.equal(Buffer.from("hel"));
                        await engine.write(fd, "world", 1);
                        await engine.close(fd);
                        expect(await engine.readFile("/a", "utf8")).to.be.equal("hworld");
                    });

                    it("should throw ENOENT if there is no such file", async () => {
                        const err = await assert.throws(async () => {
                            await engine.open("/a", "r+");
                        }, "ENOENT: no such file or directory, open '/a'");
                        expect(err.code).to.be.equal("ENOENT");
                    });
                });

                describe("rs+", () => {
                    // has no impact in memory engine as i understand
                    it("should open an existing file for reading and writing in synchronous mode", async () => {
                        engine.add((ctx) => ({
                            a: ctx.file("hello")
                        }));

                        const fd = await engine.open("/a", "rs+");
                        const buf = Buffer.alloc(3);
                        await engine.read(fd, buf, 0, 3, 0);
                        expect(buf).to.be.deep.equal(Buffer.from("hel"));
                        await engine.write(fd, "world", 1);
                        await engine.close(fd);
                        expect(await engine.readFile("/a", "utf8")).to.be.equal("hworld");
                    });

                    it("should throw ENOENT if there is no such file", async () => {
                        const err = await assert.throws(async () => {
                            await engine.open("/a", "rs+");
                        }, "ENOENT: no such file or directory, open '/a'");
                        expect(err.code).to.be.equal("ENOENT");
                    });
                });

                describe("w", () => {
                    it("should open file for writing", async () => {
                        engine.add((ctx) => ({
                            a: ctx.file("hello")
                        }));

                        const fd = await engine.open("/a", "w");
                        await engine.write(fd, "world");
                        await engine.close(fd);
                        expect(await engine.readFile("/a", "utf8")).to.be.equal("world");
                    });

                    it("should create a new file if does not exist", async () => {
                        const fd = await engine.open("/a", "w");
                        await engine.write(fd, "world");
                        await engine.close(fd);
                        expect(await engine.readFile("/a", "utf8")).to.be.equal("world");
                    });

                    it("should create a new file with the given mode if does not exist", async () => {
                        const fd = await engine.open("/a", "w", 0o222);
                        await engine.write(fd, "world");
                        await engine.close(fd);
                        expect(await engine.readFile("/a", "utf8")).to.be.equal("world");
                        const stat = await engine.stat("/a");
                        expect(stat.mode & 0o777).to.be.equal(0o222);
                    });

                    it("should truncate the file if exists", async () => {
                        engine.add((ctx) => ({
                            a: ctx.file("hello")
                        }));

                        const fd = await engine.open("/a", "w");
                        await engine.close(fd);
                        expect(await engine.readFile("/a", "utf8")).to.be.empty;
                    });
                });

                describe("wx", () => {
                    it("should open file for writing", async () => {
                        const fd = await engine.open("/a", "wx");
                        await engine.write(fd, "world");
                        await engine.close(fd);
                        expect(await engine.readFile("/a", "utf8")).to.be.equal("world");
                    });

                    it("should throw EEXIST if the file exists", async () => {
                        engine.add((ctx) => ({
                            a: ctx.file("hello")
                        }));

                        const err = await assert.throws(async () => {
                            await engine.open("/a", "wx");
                        }, "EEXIST: file already exists, open '/a'");
                        expect(err.code).to.be.equal("EEXIST");
                    });
                });

                describe("w+", () => {
                    it("should open file for reading and writing", async () => {
                        engine.add((ctx) => ({
                            a: ctx.file("hello")
                        }));

                        const fd = await engine.open("/a", "w+");
                        await engine.write(fd, "world", 0);
                        const buf = Buffer.alloc(3);
                        await engine.read(fd, buf, 0, 3, 0);
                        expect(buf).to.be.deep.equal(Buffer.from("wor"));
                        await engine.close(fd);
                        expect(await engine.readFile("/a", "utf8")).to.be.equal("world");
                    });

                    it("should create the file if does not exist", async () => {
                        const fd = await engine.open("/a", "w+");
                        await engine.write(fd, "world", 0);
                        await engine.close(fd);
                        expect(await engine.readFile("/a", "utf8")).to.be.equal("world");
                    });

                    it("should create the file with the given mode if does not exist", async () => {
                        const fd = await engine.open("/a", "w+", 0o222);
                        await engine.write(fd, "world", 0);
                        await engine.close(fd);
                        expect(await engine.readFile("/a", "utf8")).to.be.equal("world");
                        const stat = await engine.stat("/a");
                        expect(stat.mode & 0o777).to.be.equal(0o222);
                    });

                    it("should truncate the file if exists", async () => {
                        engine.add((ctx) => ({
                            a: ctx.file("hello")
                        }));
                        const fd = await engine.open("/a", "w+");
                        await engine.close(fd);
                        expect(await engine.readFile("/a", "utf8")).to.be.empty;
                    });
                });

                describe("wx+", () => {
                    it("should open file for reading and writing", async () => {
                        const fd = await engine.open("/a", "wx+");
                        await engine.write(fd, "world", 0);
                        const buf = Buffer.alloc(3);
                        await engine.read(fd, buf, 0, 3, 0);
                        expect(buf).to.be.deep.equal(Buffer.from("wor"));
                        await engine.close(fd);
                        expect(await engine.readFile("/a", "utf8")).to.be.equal("world");
                    });

                    it("should create the file if does not exist", async () => {
                        const fd = await engine.open("/a", "wx+");
                        await engine.write(fd, "world", 0);
                        await engine.close(fd);
                        expect(await engine.readFile("/a", "utf8")).to.be.equal("world");
                    });

                    it("should throw EEXIST if the file exists", async () => {
                        engine.add((ctx) => ({
                            a: ctx.file("hello")
                        }));
                        const err = await assert.throws(async () => {
                            await engine.open("/a", "wx+");
                        }, "EEXIST: file already exists, open '/a'");
                        expect(err.code).to.be.equal("EEXIST");
                    });
                });

                describe("a", () => {
                    it("should open file for appending", async () => {
                        engine.add((ctx) => ({
                            a: ctx.file("hello")
                        }));
                        const fd = await engine.open("/a", "a");
                        await engine.write(fd, " world");
                        await engine.close(fd);
                        expect(await engine.readFile("/a", "utf8")).to.be.equal("hello world");
                    });

                    it("should create the file if does not exist", async () => {
                        const fd = await engine.open("/a", "a");
                        await engine.write(fd, "hello");
                        await engine.close(fd);
                        expect(await engine.readFile("/a", "utf8")).to.be.equal("hello");
                    });

                    it("should create the file with the given mode if does not exist", async () => {
                        const fd = await engine.open("/a", "a", 0o222);
                        await engine.write(fd, "hello");
                        await engine.close(fd);
                        expect(await engine.readFile("/a", "utf8")).to.be.equal("hello");
                        const stat = await engine.stat("/a");
                        expect(stat.mode & 0o777).to.be.equal(0o222);
                    });
                });

                describe("ax", () => {
                    it("should create the file if does not exist", async () => {
                        const fd = await engine.open("/a", "ax");
                        await engine.write(fd, "hello");
                        await engine.close(fd);
                        expect(await engine.readFile("/a", "utf8")).to.be.equal("hello");
                    });

                    it("should throw EEXIST if the file exists", async () => {
                        engine.add((ctx) => ({
                            a: ctx.file("hello")
                        }));
                        const err = await assert.throws(async () => {
                            await engine.open("/a", "ax");
                        }, "EEXIST: file already exists, open '/a'");
                        expect(err.code).to.be.equal("EEXIST");
                    });
                });

                describe("a+", () => {
                    it("should open the file for reading and appending", async () => {
                        engine.add((ctx) => ({
                            a: ctx.file("hello")
                        }));
                        const fd = await engine.open("/a", "a+");
                        const buf = Buffer.alloc(3);
                        await engine.read(fd, buf, 0, 3, 0);
                        await engine.write(fd, " world");
                        await engine.close(fd);
                        expect(buf).to.be.deep.equal(Buffer.from("hel"));
                        expect(await engine.readFile("/a", "utf8")).to.be.equal("hello world");
                    });

                    it("should create a file if does not exists", async () => {
                        const fd = await engine.open("/a", "a+");
                        await engine.write(fd, "hello");
                        await engine.close(fd);
                        expect(await engine.readFile("/a", "utf8")).to.be.equal("hello");
                    });
                });

                describe("ax+", () => {
                    it("should open the file for reading and appending", async () => {
                        const fd = await engine.open("/a", "a+");
                        await engine.write(fd, "hello", 0);
                        const buf = Buffer.alloc(3);
                        await engine.read(fd, buf, 0, 3, 0);
                        await engine.close(fd);
                        expect(buf).to.be.deep.equal(Buffer.from("hel"));
                        expect(await engine.readFile("/a", "utf8")).to.be.equal("hello");
                    });

                    it("should throw EEXIST if the file exists", async () => {
                        engine.add((ctx) => ({
                            a: ctx.file("hello")
                        }));
                        const err = await assert.throws(async () => {
                            await engine.open("/a", "ax+");
                        }, "EEXIST: file already exists, open '/a'");
                        expect(err.code).to.be.equal("EEXIST");
                    });
                });

                describe("O_CREAT", () => {
                    it("should create and open the file for reading with given mode", async () => {
                        const fd = await engine.open("/a", c.O_CREAT, 0o444);
                        await engine.close(fd);
                        const stat = await engine.stat("/a");
                        expect(stat.size).to.be.equal(0);
                        expect(stat.mode & 0o777).to.be.equal(0o444);
                    });
                });

                describe("O_NOFOLLOW", () => {
                    it("should throw ELOOP if the pathname is a symlink", async () => {
                        engine.add((ctx) => ({
                            a: {
                                a: ctx.file("hello"),
                                b: ctx.symlink("a"),
                                c: ctx.symlink("d") // dangling symlink
                            }
                        }));
                        {
                            const err = await assert.throws(async () => {
                                await engine.open("/a/b", c.O_NOFOLLOW);
                            }, "ELOOP: too many symbolic links encountered, open '/a/b'");
                            expect(err.code).to.be.equal("ELOOP");
                        }
                        {
                            const err = await assert.throws(async () => {
                                await engine.open("/a/c", c.O_NOFOLLOW);
                            }, "ELOOP: too many symbolic links encountered, open '/a/c'");
                            expect(err.code).to.be.equal("ELOOP");
                        }
                    });

                    it("should follow earlier symbolic components", async () => {
                        engine.add((ctx) => ({
                            a: {
                                a: ctx.file("hello"),
                                b: ctx.symlink("a"),
                                c: ctx.symlink("d"), // dangling symlink
                                e: ctx.symlink("..")
                            }
                        }));
                        {
                            const err = await assert.throws(async () => {
                                await engine.open("/a/e/a/b", c.O_NOFOLLOW);
                            }, "ELOOP: too many symbolic links encountered, open '/a/e/a/b'");
                            expect(err.code).to.be.equal("ELOOP");
                        }
                        {
                            const err = await assert.throws(async () => {
                                await engine.open("/a/e/a/c", c.O_NOFOLLOW);
                            }, "ELOOP: too many symbolic links encountered, open '/a/e/a/c'");
                            expect(err.code).to.be.equal("ELOOP");
                        }
                    });
                });

                describe("O_TRUNC", () => {
                    it("should truncate a file", async () => {
                        engine.add((ctx) => ({
                            a: ctx.file("hello")
                        }));
                        const fd = await engine.open("/a", c.O_TRUNC);
                        await engine.close(fd);
                        expect(await engine.readFile("/a", "utf8")).to.be.empty;
                    });
                });
            });
        });

        describe("read", () => {
            it("should read data to a buffer from the given position", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));

                const buf = Buffer.alloc(3);
                const fd = await engine.open("/a", "r");
                await engine.read(fd, buf, 0, 3, 0);
                await engine.close(fd);
                expect(buf).to.be.deep.equal(Buffer.from("hel"));
            });

            it("should return the number of read bytes", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));

                const buf = Buffer.alloc(3);
                const fd = await engine.open("/a", "r");
                expect(await engine.read(fd, buf, 0, 3, 0)).to.be.equal(3);
                await engine.close(fd);
                expect(buf).to.be.deep.equal(Buffer.from("hel"));
            });

            it("should update file position if the position is null", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("0123456789")
                }));

                const buf = Buffer.alloc(3);
                const fd = await engine.open("/a", "r");
                expect(await engine.read(fd, buf, 0, 3, null)).to.be.equal(3);
                expect(buf).to.be.deep.equal(Buffer.from("012"));
                expect(await engine.read(fd, buf, 0, 3, null)).to.be.equal(3);
                expect(buf).to.be.deep.equal(Buffer.from("345"));
                expect(await engine.read(fd, buf, 0, 3, null)).to.be.equal(3);
                expect(buf).to.be.deep.equal(Buffer.from("678"));
                expect(await engine.read(fd, buf, 0, 3, null)).to.be.equal(1);
                expect(buf).to.be.deep.equal(Buffer.from("978")); // 78 from the previous reading
                expect(await engine.read(fd, buf, 0, 3, null)).to.be.equal(0);
                expect(buf).to.be.deep.equal(Buffer.from("978")); // the previous result
                await engine.close(fd);
            });

            it("should not update file position if the positon is given", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("0123456789")
                }));

                const buf = Buffer.alloc(3);
                const fd = await engine.open("/a", "r");
                expect(await engine.read(fd, buf, 0, 3, null)).to.be.equal(3);
                expect(buf).to.be.deep.equal(Buffer.from("012"));
                expect(await engine.read(fd, buf, 0, 3, 0)).to.be.equal(3);
                expect(buf).to.be.deep.equal(Buffer.from("012"));
                expect(await engine.read(fd, buf, 0, 3, null)).to.be.equal(3);
                expect(buf).to.be.deep.equal(Buffer.from("345"));
                await engine.close(fd);
            });

            it("should throw EBADF if the fd is not opened for reading", async () => {
                const fd = await engine.open("/a", "w");
                const err = await assert.throws(async () => {
                    await engine.read(fd, Buffer.alloc(10), 0, 10, 0);
                }, "EBADF: bad file descriptor, read");
                expect(err.code).to.be.equal("EBADF");
            });

            it("should throw Error if the offset is greather than the buffer length", async () => {
                const fd = await engine.open("/a", "w+");
                await assert.throws(async () => {
                    await engine.read(fd, Buffer.alloc(10), 100, 10, 0);
                }, Error, "Offset is out of bounds");
                await engine.close(fd);
            });

            it("should throw RangeError if the buffer length is not corresponding", async () => {
                const fd = await engine.open("/a", "w+");
                await assert.throws(async () => {
                    await engine.read(fd, Buffer.alloc(10), 0, 100, 0);
                }, Error, "Length extends beyond buffer");
                await assert.throws(async () => {
                    await engine.read(fd, Buffer.alloc(10), 0, 100, 0);
                }, Error, "Length extends beyond buffer");
                await engine.close(fd);
            });
        });

        describe("write", () => {
            describe("string", () => {
                it("should write a string at the given position", async () => {
                    engine.add((ctx) => ({
                        a: ctx.file("0123456789")
                    }));
                    const fd = await engine.open("/a", "r+");
                    await engine.write(fd, "hello", 1);
                    await engine.close(fd);
                    expect(await engine.readFile("/a", "utf8")).to.be.equal("0hello6789");
                });

                it("should return the number of written bytes", async () => {
                    engine.add((ctx) => ({
                        a: ctx.file("0123456789")
                    }));
                    const fd = await engine.open("/a", "r+");
                    expect(await engine.write(fd, "hello", 1)).to.be.equal(5);
                    await engine.close(fd);
                });

                it("should write at the current position if the position is not given", async () => {
                    engine.add((ctx) => ({
                        a: ctx.file("0123456789")
                    }));
                    const fd = await engine.open("/a", "r+");
                    expect(await engine.write(fd, "hello")).to.be.equal(5);
                    expect(await engine.write(fd, " ")).to.be.equal(1);
                    expect(await engine.write(fd, "world")).to.be.equal(5);
                    await engine.close(fd);
                    expect(await engine.readFile("/a", "utf8")).to.be.equal("hello world");
                });

                it("should not change file offset via positional writings", async () => {
                    engine.add((ctx) => ({
                        a: ctx.file("0123456789")
                    }));

                    const fd = await engine.open("/a", "r+");
                    await engine.write(fd, "hello");
                    await engine.write(fd, "world", 6);
                    await engine.write(fd, " ");
                    await engine.close(fd);
                    expect(await engine.readFile("/a", "utf8")).to.be.equal("hello world");
                });

                it("should fill the gap with zeroes if the position is larger than the file size", async () => {
                    engine.add((ctx) => ({
                        a: ctx.file("hello")
                    }));

                    const fd = await engine.open("/a", "r+");
                    await engine.write(fd, "world", 10);
                    await engine.close(fd);
                    expect(await engine.readFile("/a", "utf8")).to.be.equal("hello\0\0\0\0\0world");
                });

                it("should set the file position at the end before each write if O_APPEND is set", async () => {
                    engine.add((ctx) => ({
                        a: ctx.file("hello")
                    }));

                    const fd = await engine.open("/a", "a+");
                    await engine.write(fd, " ");
                    await engine.write(fd, "world");
                    await engine.close(fd);
                    expect(await engine.readFile("/a", "utf8")).to.be.equal("hello world");
                });

                it("should read zero bytes after non-positional writes if O_APPEND is set", async () => {
                    engine.add((ctx) => ({
                        a: ctx.file("hello")
                    }));

                    const fd = await engine.open("/a", "a+");
                    await engine.write(fd, " ");
                    const buf = Buffer.alloc(3);
                    expect(await engine.read(fd, buf, 0, 3)).to.be.equal(0);
                    expect(buf).to.be.deep.equal(Buffer.alloc(3));
                    await engine.write(fd, "world");
                    expect(await engine.read(fd, buf, 0, 3)).to.be.equal(0);
                    expect(buf).to.be.deep.equal(Buffer.alloc(3));
                    await engine.close(fd);
                    expect(await engine.readFile("/a", "utf8")).to.be.equal("hello world");
                });

                it("should write at the end if the position is given and O_APPEND is set but not change the offset after write", async () => {
                    engine.add((ctx) => ({
                        a: ctx.file("hello")
                    }));

                    const fd = await engine.open("/a", "a+");
                    await engine.write(fd, " ", 0);
                    await engine.write(fd, "world", 0);
                    const buf = Buffer.alloc(3);
                    expect(await engine.read(fd, buf, 0, 3)).to.be.equal(3);
                    expect(buf).to.be.deep.equal(Buffer.from("wor"));
                    await engine.close(fd);
                    expect(await engine.readFile("/a", "utf8")).to.be.equal("hello world");
                });

                it("should encode the string using the given encoding", async () => {
                    engine.add((ctx) => ({
                        a: ctx.file("hello")
                    }));

                    const fd = await engine.open("/a", "a+");
                    expect(await engine.write(fd, "010203", undefined, "hex")).to.be.equal(3);
                    await engine.close(fd);
                    expect(await engine.readFile("/a", "utf8")).to.be.equal("hello\x01\x02\x03");
                });
            });

            describe("buffer", () => {
                it("should write a buffer at the given position", async () => {
                    engine.add((ctx) => ({
                        a: ctx.file("0123456789")
                    }));
                    const fd = await engine.open("/a", "r+");
                    await engine.write(fd, Buffer.from("hello"), undefined, undefined, 1);
                    await engine.close(fd);
                    expect(await engine.readFile("/a", "utf8")).to.be.equal("0hello6789");
                });

                it("should return the number of written bytes", async () => {
                    engine.add((ctx) => ({
                        a: ctx.file("0123456789")
                    }));
                    const fd = await engine.open("/a", "r+");
                    expect(await engine.write(fd, Buffer.from("hello"), undefined, undefined, 1)).to.be.equal(5);
                    await engine.close(fd);
                });

                it("should not change file offset via positional writings", async () => {
                    engine.add((ctx) => ({
                        a: ctx.file("0123456789")
                    }));

                    const fd = await engine.open("/a", "r+");
                    await engine.write(fd, Buffer.from("hello"));
                    await engine.write(fd, Buffer.from("world"), undefined, undefined, 6);
                    await engine.write(fd, Buffer.from(" "));
                    await engine.close(fd);
                    expect(await engine.readFile("/a", "utf8")).to.be.equal("hello world");
                });

                it("should fill the gap with zeroes if the position is larger than the file size", async () => {
                    engine.add((ctx) => ({
                        a: ctx.file("hello")
                    }));

                    const fd = await engine.open("/a", "r+");
                    await engine.write(fd, Buffer.from("world"), undefined, undefined, 10);
                    await engine.close(fd);
                    expect(await engine.readFile("/a", "utf8")).to.be.equal("hello\0\0\0\0\0world");
                });

                it("should set the file position at the end before each write if O_APPEND is set", async () => {
                    engine.add((ctx) => ({
                        a: ctx.file("hello")
                    }));

                    const fd = await engine.open("/a", "a+");
                    await engine.write(fd, Buffer.from(" "));
                    await engine.write(fd, Buffer.from("world"));
                    await engine.close(fd);
                    expect(await engine.readFile("/a", "utf8")).to.be.equal("hello world");
                });

                it("should read zero bytes after non-positional writes if O_APPEND is set", async () => {
                    engine.add((ctx) => ({
                        a: ctx.file("hello")
                    }));

                    const fd = await engine.open("/a", "a+");
                    await engine.write(fd, " ");
                    const buf = Buffer.alloc(3);
                    expect(await engine.read(fd, buf, 0, 3)).to.be.equal(0);
                    expect(buf).to.be.deep.equal(Buffer.alloc(3));
                    await engine.write(fd, Buffer.from("world"));
                    expect(await engine.read(fd, buf, 0, 3)).to.be.equal(0);
                    expect(buf).to.be.deep.equal(Buffer.alloc(3));
                    await engine.close(fd);
                    expect(await engine.readFile("/a", "utf8")).to.be.equal("hello world");
                });

                it("should write at the end if the position is given and O_APPEND is set but not change the offset after write", async () => {
                    engine.add((ctx) => ({
                        a: ctx.file("hello")
                    }));

                    const fd = await engine.open("/a", "a+");
                    await engine.write(fd, Buffer.from(" "), undefined, undefined, 0);
                    await engine.write(fd, Buffer.from("world"), undefined, undefined, 0);
                    const buf = Buffer.alloc(3);
                    expect(await engine.read(fd, buf, 0, 3)).to.be.equal(3);
                    expect(buf).to.be.deep.equal(Buffer.from("wor"));
                    await engine.close(fd);
                    expect(await engine.readFile("/a", "utf8")).to.be.equal("hello world");
                });

                it("should write only the part of the buffer at the given position", async () => {
                    engine.add((ctx) => ({
                        a: ctx.file("0123456789")
                    }));
                    const fd = await engine.open("/a", "r+");
                    await engine.write(fd, Buffer.from(" hello world"), 1, 5, 1);
                    await engine.close(fd);
                    expect(await engine.readFile("/a", "utf8")).to.be.equal("0hello6789");
                });

                it("should throw RangeError if the offset is out of bounds", async () => {
                    engine.add((ctx) => ({
                        a: ctx.file("0123456789")
                    }));
                    const fd = await engine.open("/a", "r+");
                    await assert.throws(async () => {
                        await engine.write(fd, Buffer.from("hello"), 10, 5);
                    }, RangeError, "offset out of bounds");
                    await engine.close(fd);
                });

                it("should throw RangeError if the length is out of bounds", async () => {
                    engine.add((ctx) => ({
                        a: ctx.file("0123456789")
                    }));
                    const fd = await engine.open("/a", "r+");
                    await assert.throws(async () => {
                        await engine.write(fd, Buffer.from("hello"), 1, 10);
                    }, RangeError, "length out of bounds");
                    await engine.close(fd);
                });

                it("should throw RangeError if off + length if greather than the buffer length", async () => {
                    engine.add((ctx) => ({
                        a: ctx.file("0123456789")
                    }));
                    const fd = await engine.open("/a", "r+");
                    await assert.throws(async () => {
                        await engine.write(fd, Buffer.from("hello"), 1, 5);
                    }, RangeError, "off + len > buffer.length");
                });
            });
        });

        describe("readdir", () => {
            it("should read a directory", async () => {
                engine.add((ctx) => ({
                    a: {
                        b: ctx.file("hello")
                    },
                    b: {
                        c: ctx.file("hello")
                    }
                }));

                {
                    const files = await engine.readdir("/");
                    expect(files).to.be.deep.equal(["a", "b"]);
                }
                {
                    const files = await engine.readdir("/a");
                    expect(files).to.be.deep.equal(["b"]);
                }
                {
                    const files = await engine.readdir("/b");
                    expect(files).to.be.deep.equal(["c"]);
                }
            });

            it("should throw ENOENT if there is no such file", async () => {
                const err = await assert.throws(async () => {
                    await engine.readdir("/a/b/c");
                }, "ENOENT: no such file or directory, scandir '/a/b/c'");
                expect(err.code).to.be.equal("ENOENT");
            });

            it("should throw ENOTDIR if not a directory", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));

                {
                    const err = await assert.throws(async () => {
                        await engine.readdir("/a");
                    }, "ENOTDIR: not a directory, scandir '/a'");
                    expect(err.code).to.be.equal("ENOTDIR");
                }
                {
                    const err = await assert.throws(async () => {
                        await engine.readdir("/a/");
                    }, "ENOTDIR: not a directory, scandir '/a/'");
                    expect(err.code).to.be.equal("ENOTDIR");
                }
            });

            describe("symlinks", () => {
                it("should read a directory referenced by a symlink", async () => {
                    engine.add((ctx) => ({
                        a: {
                            b: ctx.file("hello")
                        },
                        c: {
                            d: ctx.symlink("../a")
                        },
                        e: {
                            f: ctx.symlink("../c/d")
                        }
                    }));

                    const files = await engine.readdir("/c/d");
                    expect(files).to.be.deep.equal(["b"]);
                });

                it("should read a directory referenced by a chain of symlinks", async () => {
                    engine.add((ctx) => ({
                        a: {
                            b: ctx.file("hello")
                        },
                        c: {
                            d: ctx.symlink("../a")
                        },
                        e: {
                            f: ctx.symlink("../c/d")
                        }
                    }));

                    const files = await engine.readdir("/e/f");
                    expect(files).to.be.deep.equal(["b"]);
                });

                it("should throw ELOOP when found a symlink loop", async () => {
                    engine.add((ctx) => ({
                        a: ctx.symlink("b"),
                        b: ctx.symlink("a")
                    }));

                    const err = await assert.throws(async () => {
                        await engine.readdir("/a");
                    }, "ELOOP: too many symbolic links encountered, scandir '/a'");
                    expect(err.code).to.be.equal("ELOOP");
                });

                it("should throw ENOENT if the symlink is dead", async () => {
                    engine.add((ctx) => ({
                        a: ctx.symlink("b")
                    }));

                    const err = await assert.throws(async () => {
                        await engine.readdir("/a");
                    }, "ENOENT: no such file or directory, scandir '/a'");
                    expect(err.code).to.be.equal("ENOENT");
                });

                it("should throw ENOTDIR if the symlink refers not to a directory", async () => {
                    engine.add((ctx) => ({
                        a: ctx.symlink("b"),
                        b: ctx.file("a")
                    }));

                    const err = await assert.throws(async () => {
                        await engine.readdir("/a");
                    }, "ENOTDIR: not a directory, scandir '/a'");
                    expect(err.code).to.be.equal("ENOTDIR");
                });

                it("should read a directory with .. and symlink references", async () => {
                    engine.add((ctx) => ({
                        a: {
                            b: {
                                c: ctx.file("hello")
                            }
                        },
                        c: {
                            d: ctx.symlink("../a/b")
                        }
                    }));

                    const files = await engine.readdir("/c/d/../b");
                    expect(files).to.be.deep.equal(["c"]);
                });
            });
        });

        describe("readFile", () => {
            it("should read a buffer by default", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));

                const buf = await engine.readFile("/a");
                expect(buf).to.be.a("buffer");
                expect(buf).to.be.deep.equal(Buffer.from("hello"));
            });

            it("should read a string if the second argument is an encoding", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));

                const buf = await engine.readFile("/a", "utf8");
                expect(buf).to.be.a("string");
                expect(buf).to.be.equal("hello");
            });

            it("should support the encoding option", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));

                const buf = await engine.readFile("/a", { encoding: "utf8" });
                expect(buf).to.be.a("string");
                expect(buf).to.be.equal("hello");
            });

            it("should support null encoding", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));

                const buf = await engine.readFile("/a", { encoding: null });
                expect(buf).to.be.a("buffer");
                expect(buf).to.be.deep.equal(Buffer.from("hello"));
            });

            it("should support reading by a fd", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));

                {
                    const fd = await engine.open("/a", "r");
                    const buf = Buffer.alloc(10);
                    await engine.read(fd, buf, 0, 1);
                    expect(await engine.readFile(fd)).to.be.deep.equal(Buffer.from("ello"));
                    await engine.close(fd);
                }
                {
                    const fd = await engine.open("/a", "r");
                    const buf = Buffer.alloc(10);
                    await engine.read(fd, buf, 0, 1);
                    expect(await engine.readFile(fd, "utf8")).to.be.deep.equal("ello");
                    await engine.close(fd);
                }
            });
        });

        describe("readlink", () => {
            it("should return the target of a symbolic link", async () => {
                engine.add((ctx) => ({
                    a: ctx.symlink("a/b/c")
                }));

                const target = await engine.readlink("/a");
                expect(target).to.be.deep.equal("a/b/c");
            });

            it("should not throw if the symlink is dangling", async () => {
                engine.add((ctx) => ({
                    a: ctx.symlink("../a")
                }));

                const target = await engine.readlink("/a");
                expect(target).to.be.equal("../a");
            });

            it("should throw EINVAL if the file is not a symbolic link", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello"),
                    b: {
                        c: ctx.file("hello")
                    }
                }));

                {
                    const err = await assert.throws(async () => {
                        await engine.readlink("/a");
                    }, "EINVAL: invalid argument, readlink '/a'");
                    expect(err.code).to.be.equal("EINVAL");
                }
                {
                    const err = await assert.throws(async () => {
                        await engine.readlink("/b");
                    }, "EINVAL: invalid argument, readlink '/b'");
                    expect(err.code).to.be.equal("EINVAL");
                }
            });
        });

        describe("realpath", () => {
            it("should resolve all the references", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello"),
                    b: {
                        c: {
                            d: {
                                a: ctx.symlink("../../../a"),
                                b: ctx.symlink("..")
                            }
                        }
                    }
                }));

                expect(await engine.realpath("/a")).to.be.equal("/a");
                expect(await engine.realpath("/b/../a")).to.be.equal("/a");
                expect(await engine.realpath("/../a")).to.be.equal("/a");
                expect(await engine.realpath("/b/../a")).to.be.equal("/a");
                expect(await engine.realpath("/b/c/../../a")).to.be.equal("/a");
                expect(await engine.realpath("/b/c//////../../a")).to.be.equal("/a");
                expect(await engine.realpath("/b/././././../b/.././././a")).to.be.equal("/a");
                expect(await engine.realpath("/b/c/../c/d/a")).to.be.equal("/a");
                expect(await engine.realpath("/b/c/../c/d/b/d/b/d/b/d/a")).to.be.equal("/a");
                expect(await engine.realpath("/b/c/../c/d/b/d/b/d/b/../../../../a")).to.be.equal("/a");
            });

            it("should return a buffer if requested", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));

                expect(await engine.realpath("/a")).to.be.equal("/a");
                expect(await engine.realpath("/a", null)).to.be.equal("/a");
                expect(await engine.realpath("/a", "buffer")).to.be.deep.equal(Buffer.from("/a"));
                expect(await engine.realpath("/a", { encoding: "utf8" })).to.be.equal("/a");
                expect(await engine.realpath("/a", { encoding: null })).to.be.equal("/a");
                expect(await engine.realpath("/a", { encoding: "buffer" })).to.be.deep.equal(Buffer.from("/a"));
            });

            it("should throw ENOENT if there is no such file", async () => {
                await assert.throws(async () => {
                    await engine.realpath("/hello");
                }, "ENOENT: no such file or directory, '/hello'");
            });

            it("should throw ENOENT on dead link", async () => {
                engine.add((ctx) => ({
                    a: ctx.symlink("b"),
                    e: {
                        c: {
                            d: ctx.symlink("../../b")
                        }
                    }
                }));

                await assert.throws(async () => {
                    await engine.realpath("/a");
                }, "ENOENT: no such file or directory, '/a'");


                await assert.throws(async () => {
                    await engine.realpath("/e/c/d/e/f/g");
                }, "ENOENT: no such file or directory, '/e/c/d/e/f/g'");
            });
        });

        describe("rename", () => {
            it("should rename a file", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));

                await engine.rename("/a", "/b");
                expect(await engine.readdir("/")).to.be.deep.equal(["b"]);
                expect(await engine.readFile("/b", "utf8")).to.be.equal("hello");
            });

            it("should throw ENOENT if the dest directory does not exist", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));

                const err = await assert.throws(async () => {
                    await engine.rename("/a", "/b/c");
                }, "ENOENT: no such file or directory, rename '/a' -> '/b/c'");
                expect(err.code).to.be.equal("ENOENT");
            });

            it("should throw ENOENT if the src does not exist", async () => {
                const err = await assert.throws(async () => {
                    await engine.rename("/a", "/b");
                }, "ENOENT: no such file or directory, rename '/a' -> '/b'");
                expect(err.code).to.be.equal("ENOENT");
            });

            it("should throw EACCES if the dest directory has no write permissions", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello"),
                    b: [{}, { mode: 0o555 }]
                }));

                const err = await assert.throws(async () => {
                    await engine.rename("/a", "/b/a");
                }, "EACCES: permission denied, rename '/a' -> '/b/a'");
                expect(err.code).to.be.equal("EACCES");
            });

            it("should throw EACCES if the src directory has no write permissions", async () => {
                engine.add((ctx) => ({
                    a: [{
                        b: ctx.file("hello"),
                        c: {

                        }
                    }, { mode: 0o555 }]
                }));

                const err = await assert.throws(async () => {
                    await engine.rename("/a/b", "/a/c/a");
                }, "EACCES: permission denied, rename '/a/b' -> '/a/c/a'");
                expect(err.code).to.be.equal("EACCES");
            });

            it("should work for directories", async () => {
                engine.add((ctx) => ({
                    a: {
                        c: ctx.file("hello")
                    }
                }));

                await engine.rename("/a", "/b");
                expect(await engine.readdir("/")).to.be.deep.equal(["b"]);
                expect(await engine.readdir("/b")).to.be.deep.equal(["c"]);
                expect(await engine.readFile("/b/c", "utf8")).to.be.equal("hello");
            });

            it("should not change the inode", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));

                const stata = await engine.stat("/a");
                await engine.rename("/a", "/b");
                const statb = await engine.stat("/b");
                expect(stata.ino).to.be.equal(statb.ino);
            });

            it("should replace the dest if it exists", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello"),
                    c: ctx.file("world")
                }));

                await engine.link("/c", "/d");
                let statd = await engine.stat("/d");
                expect(statd.nlink).to.be.equal(2);
                await engine.rename("/a", "/c");
                expect(await engine.readFile("/c", "utf8")).to.be.equal("hello");
                statd = await engine.stat("/d");
                expect(statd.nlink).to.be.equal(1);
                expect(await engine.readFile("/d", "utf8")).to.be.equal("world");
            });

            it("should throw EISDIR if the dst is a directory but the src is not", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello"),
                    b: {

                    }
                }));

                const err = await assert.throws(async () => {
                    await engine.rename("/a", "/b");
                }, "EISDIR: illegal operation on a directory, rename '/a' -> '/b'");
                expect(err.code).to.be.equal("EISDIR");
            });

            it("should do nothing if the src and the dst are the same", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));

                await engine.link("/a", "/b");
                await engine.rename("/a", "/b");
                expect(await engine.readFile("/a", "utf8")).to.be.equal("hello");
                expect(await engine.readFile("/b", "utf8")).to.be.equal("hello");
            });

            it("should throw ENOTDIR if the src is a directory but the dst is not", async () => {
                engine.add((ctx) => ({
                    a: {
                        a: ctx.file("hello")
                    },
                    b: ctx.file("hello")
                }));

                const err = await assert.throws(async () => {
                    await engine.rename("/a", "/b");
                }, "ENOTDIR: not a directory, rename '/a' -> '/b'");
                expect(err.code).to.be.equal("ENOTDIR");
            });

            it("should throw ENOTEMPTY if the src is directory and the dst is not empty directory", async () => {
                engine.add((ctx) => ({
                    a: {
                        a: ctx.file("hello")
                    },
                    b: {
                        a: ctx.file("hello")
                    }
                }));

                const err = await assert.throws(async () => {
                    await engine.rename("/a", "/b");
                }, "ENOTEMPTY: directory not empty, rename '/a' -> '/b'");
                expect(err.code).to.be.equal("ENOTEMPTY");
            });

            it("should rename symlinks", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello"),
                    b: ctx.symlink("a")
                }));

                await engine.rename("/b", "/c");
                const statc = await engine.lstat("/c");
                expect(statc.isSymbolicLink()).to.be.true;
                expect(await engine.readFile("/c", "utf8")).to.be.equal("hello");
            });
        });

        describe("rmdir", () => {
            it("should remove an empty directory", async () => {
                engine.add(() => ({
                    a: {

                    }
                }));

                await engine.rmdir("/a");
                expect(await engine.readdir("/")).to.be.empty;
            });

            it("should throw ENOTEMPTY if the directory is not empty", async () => {
                engine.add((ctx) => ({
                    a: {
                        a: ctx.file("hello")
                    }
                }));

                const err = await assert.throws(async () => {
                    await engine.rmdir("/a");
                }, "ENOTEMPTY: directory not empty, rmdir '/a'");
                expect(err.code).to.be.equal("ENOTEMPTY");
            });

            it("should throw EINVAL if path has . last component", async () => {
                engine.add(() => ({
                    a: {

                    }
                }));

                const err = await assert.throws(async () => {
                    await engine.rmdir("/a/.");
                }, "EINVAL: invalid argument, rmdir '/a/.'");
                expect(err.code).to.be.equal("EINVAL");
            });
        });

        describe("stat", () => {
            it("should return file stats", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));

                const stat = await engine.stat("/a");
                expect(stat).to.be.instanceof(Stats);
                expect(stat.isFile()).to.be.true;
                expect(stat.isDirectory()).to.be.false;
                expect(stat.isSymbolicLink()).to.be.false;
            });

            it("should return directory stat", async () => {
                engine.add((ctx) => ({
                    a: {
                        b: ctx.file("hello")
                    }
                }));

                const stat = await engine.stat("/a");
                expect(stat).to.be.instanceof(Stats);
                expect(stat.isFile()).to.be.false;
                expect(stat.isDirectory()).to.be.true;
                expect(stat.isSymbolicLink()).to.be.false;
            });

            it("should follow symlinks", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello"),
                    b: ctx.symlink("a")
                }));

                const stat = await engine.stat("/b");
                expect(stat).to.be.instanceof(Stats);
                expect(stat.isFile()).to.be.true;
                expect(stat.isSymbolicLink()).to.be.false;
                expect(stat.isDirectory()).to.be.false;
                expect(stat.size).to.be.equal(5);
            });

            it("should follow multiple symlinks", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello"),
                    b: ctx.symlink("a"),
                    c: ctx.symlink("b")
                }));

                const stat = await engine.stat("/c");
                expect(stat).to.be.instanceof(Stats);
                expect(stat.isFile()).to.be.true;
                expect(stat.isSymbolicLink()).to.be.false;
                expect(stat.isDirectory()).to.be.false;
                expect(stat.size).to.be.equal(5);
            });
        });

        describe("symlink", () => {
            it("should create a symlink", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));

                await engine.symlink("a", "/b");
                const stat = await engine.lstat("/b");
                expect(stat.isSymbolicLink()).to.be.true;
                expect(await engine.readlink("/b")).to.be.equal("a");
                expect(await engine.readFile("/b", "utf8")).to.be.equal("hello");
            });

            it("should create a dangling symlink", async () => {
                await engine.symlink("a", "/b");
                expect(await engine.readlink("/b")).to.be.equal("a");
                const stat = await engine.lstat("/b");
                expect(stat.isSymbolicLink()).to.be.true;
                await assert.throws(async () => {
                    await engine.readFile("/b");
                }, "ENOENT: no such file or directory, open '/b'");
                await engine.writeFile("/a", "hello");
                expect(await engine.readFile("/b", "utf8")).to.be.equal("hello");
            });

            it("should throw EEXIST if the dest exists", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));

                const err = await assert.throws(async () => {
                    await engine.symlink("asdads", "/a");
                }, "EEXIST: file already exists, symlink 'asdads' -> '/a'");
                expect(err.code).to.be.equal("EEXIST");
            });

            it("should throw ENOENT if the dest directory does not exist", async () => {
                const err = await assert.throws(async () => {
                    await engine.symlink("a", "/b/a");
                }, "ENOENT: no such file or directory, symlink 'a' -> '/b/a'");
                expect(err.code).to.be.equal("ENOENT");
            });
        });

        describe("truncate", () => {
            it("should truncate a file", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));

                expect(await engine.readFile("/a", "utf8")).not.to.be.empty;
                await engine.truncate("/a");
                expect(await engine.readFile("/a", "utf8")).to.be.empty;
            });

            it("should truncate a file to the given size", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));

                await engine.truncate("/a", 2);
                expect(await engine.readFile("/a", "utf8")).to.be.equal("he");
            });

            it("should fill the gap with zeroes if the length if greather thatn the file size", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));

                await engine.truncate("/a", 10);
                expect(await engine.readFile("/a", "utf8")).to.be.equal("hello\0\0\0\0\0");
            });

            it("should throw EISDIR if the file is a directory", async () => {
                engine.add(() => ({
                    a: {

                    }
                }));

                const err = await assert.throws(async () => {
                    await engine.truncate("/a", 10);
                }, "EISDIR: illegal operation on a directory, open '/a'"); // open because it opens the file first
                expect(err.code).to.be.equal("EISDIR");
            });

            it("should throw ENOENT if the file does not exist", async () => {
                const err = await assert.throws(async () => {
                    await engine.truncate("/a");
                }, "ENOENT: no such file or directory, open '/a'");
                expect(err.code).to.be.equal("ENOENT");
            });
        });

        describe("unlink", () => {
            it("should delete a file", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));

                await engine.unlink("/a");
                expect(await engine.readdir("/")).to.be.empty;
            });

            it("should remove a symlink", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello"),
                    b: ctx.symlink("a")
                }));

                await engine.unlink("/b");
                expect(await engine.readdir("/")).to.be.deep.equal(["a"]);
                expect(await engine.readFile("/a", "utf8")).to.be.equal("hello");
            });

            it("should throw EISDIR if the file is a directory", async () => {
                engine.add(() => ({
                    a: {

                    }
                }));

                const err = await assert.throws(async () => {
                    await engine.unlink("/a");
                }, "EISDIR: illegal operation on a directory, unlink '/a'");
                expect(err.code).to.be.equal("EISDIR");
            });

            it("should decreate the number of links", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));

                await engine.link("/a", "/b");
                expect((await engine.stat("/b")).nlink).to.be.equal(2);
                await engine.unlink("/a");
                expect((await engine.stat("/b")).nlink).to.be.equal(1);
            });
        });

        describe("unwatchFile", () => {
            it("should disable watchFile polling", async () => {
                const change = spy();
                engine.watchFile("/a", { interval: 100 }, change);
                await change.waitForCall();
                await Promise.all([
                    engine.writeFile("/a", "hello"),
                    change.waitForCall()
                ]);
                expect(change).to.have.callCount(2);
                engine.unwatchFile("/a");
                await engine.writeFile("/a", "hello");
                await promise.delay(200);
                expect(change).to.have.callCount(2);
            });

            it("should remove a particular listener", async () => {
                const change = spy();
                const change2 = spy();
                engine.watchFile("/a", { interval: 100 }, change).on("change", change2);
                await Promise.all([
                    change.waitForCall(),
                    change2.waitForCall()
                ]);
                await Promise.all([
                    engine.writeFile("/a", "hello"),
                    change.waitForCall(),
                    change2.waitForCall()
                ]);
                expect(change).to.have.callCount(2);
                expect(change2).to.have.callCount(2);
                engine.unwatchFile("/a", change2);
                await Promise.all([
                    engine.writeFile("/a", "hello"),
                    change.waitForCall()
                ]);
                await promise.delay(200);
                expect(change).to.have.callCount(3);
                expect(change2).to.have.callCount(2);
                engine.unwatchFile("/a");
            });
        });

        describe("utimes", () => {
            it("should change file's atime/mtime", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));

                await engine.utimes("/a", 0, 1);
                const stat = await engine.stat("/a");
                expect(stat.atimeMs).to.be.equal(0);
                expect(stat.mtimeMs).to.be.equal(1000);
            });

            it("should throw ENOENT if the file does not exist", async () => {
                const err = await assert.throws(async () => {
                    await engine.utimes("/a", 0, 1);
                }, "ENOENT: no such file or directory, utime '/a'");
                expect(err.code).to.be.equal("ENOENT");
            });
        });

        describe("watch", () => {
            describe("file", () => {
                it("should emit change when the contents is changed", async () => {
                    engine.add((ctx) => ({
                        a: ctx.file("hello")
                    }));
                    const change = spy();
                    engine.watch("/a", change);
                    await engine.writeFile("/a", "he");
                    expect(change).to.have.been.calledOnce;
                    expect(change).to.have.been.calledWith("change", "a");
                });

                it("should emit change when atime/mtime is changed", async () => {
                    engine.add((ctx) => ({
                        a: ctx.file("hello")
                    }));
                    const change = spy();
                    engine.watch("/a", change);
                    await engine.utimes("/a", 1, 1);
                    expect(change).to.have.been.calledOnce;
                    expect(change).to.have.been.calledWith("change", "a");
                });

                it("should emit rename when file is deleted", async () => {
                    engine.add((ctx) => ({
                        a: ctx.file("hello")
                    }));
                    const change = spy();
                    engine.watch("/a", change);
                    await engine.unlink("/a");
                    expect(change).to.have.been.calledOnce;
                    expect(change).to.have.been.calledWith("rename", "a");
                });

                it("should follow when renames", async () => {
                    engine.add((ctx) => ({
                        a: ctx.file("hello")
                    }));
                    const change = spy();
                    engine.watch("/a", change);
                    await engine.rename("/a", "/b");
                    expect(change).to.have.been.calledOnce;
                    expect(change).to.have.been.calledWith("rename", "a");
                    await engine.writeFile("/b", "hello");
                    expect(change).to.have.been.calledTwice;
                    expect(change).to.have.been.calledWith("change", "a");
                });

                it("should emit a change event when a hark link is created", async () => {
                    engine.add((ctx) => ({
                        a: ctx.file("hello")
                    }));
                    const change = spy();
                    engine.watch("/a", change);
                    await engine.link("/a", "/b");
                    expect(change).to.have.been.calledOnce;
                    expect(change).to.have.been.calledWith("change", "a");
                });

                it("should emit a change event when a hark link is changed", async () => {
                    engine.add((ctx) => ({
                        a: ctx.file("hello")
                    }));
                    const change = spy();
                    engine.watch("/a", change);
                    await engine.link("/a", "/b");
                    expect(change).to.have.been.calledOnce;
                    await engine.writeFile("/b", "hello");
                    expect(change).to.have.been.calledTwice;
                    expect(change.getCall(1)).to.have.been.calledWith("change", "a");
                });

                it("should emit a change event when a hark link is deleted", async () => {
                    engine.add((ctx) => ({
                        a: ctx.file("hello")
                    }));
                    const change = spy();
                    engine.watch("/a", change);
                    await engine.link("/a", "/b");
                    expect(change).to.have.been.calledOnce;
                    await engine.unlink("/b");
                    expect(change).to.have.been.calledTwice;
                    expect(change.getCall(1)).to.have.been.calledWith("change", "a");
                });

                it("should emit a change event when the source is deleted", async () => {
                    engine.add((ctx) => ({
                        a: ctx.file("hello")
                    }));
                    const change = spy();
                    engine.watch("/a", change);
                    await engine.link("/a", "/b");
                    expect(change).to.have.been.calledOnce;
                    await engine.unlink("/a");
                    expect(change).to.have.been.calledTwice;
                    expect(change.getCall(1)).to.have.been.calledWith("change", "a");
                });

                it("should emit a change and rename events when the source and hard link are deleted", async () => {
                    engine.add((ctx) => ({
                        a: ctx.file("hello")
                    }));
                    const change = spy();
                    engine.watch("/a", change);
                    await engine.link("/a", "/b");
                    expect(change).to.have.been.calledOnce;
                    await engine.unlink("/a");
                    expect(change).to.have.been.calledTwice;
                    expect(change.getCall(1)).to.have.been.calledWith("change", "a");
                    await engine.unlink("/b");
                    expect(change).to.have.been.calledThrice;
                    expect(change.getCall(2)).to.have.been.calledWith("rename", "a");
                });

                it("should stop watching after close()", async () => {
                    engine.add((ctx) => ({
                        a: ctx.file("hello")
                    }));
                    const change = spy();
                    const watcher = engine.watch("/a", change);
                    await engine.link("/a", "/b");
                    expect(change).to.have.been.calledOnce;
                    watcher.close();
                    await engine.unlink("/a");
                    expect(change).to.have.been.calledOnce;
                    await engine.writeFile("/b", "hello");
                    expect(change).to.have.been.calledOnce;
                    await engine.unlink("/b");
                    expect(change).to.have.been.calledOnce;
                });
            });

            describe("directory", () => {
                it("should emit corresponding rename event when a new file appears", async () => {
                    engine.add(() => ({
                        a: {

                        }
                    }));

                    const change = spy();
                    engine.watch("/a", change);
                    await engine.writeFile("/a/b", "hello");
                    expect(change).to.have.callCount(2); // create + write
                    expect(change.getCall(0)).to.have.been.calledWith("rename", "b");
                    expect(change.getCall(1)).to.have.been.calledWith("change", "b");
                    await engine.writeFile("/a/c", "hello");
                    expect(change).to.have.callCount(4);
                    expect(change.getCall(2)).to.have.been.calledWith("rename", "c");
                    expect(change.getCall(3)).to.have.been.calledWith("change", "c");
                });

                it("should emit rename event when a file from the directory deleted", async () => {
                    engine.add((ctx) => ({
                        a: {
                            b: ctx.file("hello")
                        }
                    }));

                    const change = spy();
                    engine.watch("/a", change);
                    await engine.unlink("/a/b");
                    expect(change).to.have.callCount(1); // create + write
                    expect(change.getCall(0)).to.have.been.calledWith("rename", "b");
                });

                it("should emit rename event when file is renamed", async () => {
                    engine.add((ctx) => ({
                        a: {
                            b: ctx.file("hello")
                        }
                    }));

                    const change = spy();
                    engine.watch("/a", change);
                    await engine.rename("/a/b", "/a/c");
                    expect(change).to.have.callCount(2);
                    expect(change.getCall(0)).to.have.been.calledWith("rename", "b");
                    expect(change.getCall(1)).to.have.been.calledWith("rename", "c");
                });

                it("should stop following the file if it is moved outside the directory", async () => {
                    engine.add((ctx) => ({
                        a: {
                            b: ctx.file("hello")
                        }
                    }));

                    const change = spy();
                    engine.watch("/a", change);
                    await engine.rename("/a/b", "/c");
                    expect(change).to.have.callCount(1);
                    expect(change.getCall(0)).to.have.been.calledWith("rename", "b");
                    await engine.writeFile("/c", "hello");
                    expect(change).to.have.callCount(1);
                });

                it("should handle hard links", async () => {
                    // here we have some differences

                    engine.add((ctx) => ({
                        a: {
                            b: ctx.file("hello")
                        }
                    }));

                    const change = spy();
                    engine.watch("/a", change);
                    await engine.link("/a/b", "/a/c");
                    expect(change).to.have.callCount(2);
                    expect(change.getCall(0)).to.have.been.calledWith("change", "b");
                    expect(change.getCall(1)).to.have.been.calledWith("rename", "c");
                    await engine.writeFile("/a/c");
                    expect(change).to.have.callCount(4);
                    expect(change.getCall(2)).to.have.been.calledWith("change", "b");
                    expect(change.getCall(3)).to.have.been.calledWith("change", "c");
                });

                it("should handle the directory rename, emit rename event with self name", async () => {
                    engine.add((ctx) => ({
                        a: {
                            b: ctx.file("hello")
                        }
                    }));

                    const change = spy();
                    engine.watch("/a", change);
                    await engine.rename("/a", "/b");
                    expect(change).to.have.callCount(1);
                    expect(change.getCall(0)).to.have.been.calledWith("rename", "a");
                    await engine.writeFile("/b/b");
                    expect(change).to.have.callCount(2);
                    expect(change.getCall(1)).to.have.been.calledWith("change", "b");
                });

                it("should emit rename event if the directory is deleted", async () => {
                    engine.add(() => ({
                        a: {

                        }
                    }));

                    const change = spy();
                    engine.watch("/a", change);
                    await engine.rmdir("/a");
                    expect(change).to.have.callCount(1);
                    expect(change).to.have.been.calledWith("rename", "a");
                });

                it("should not intercept nested directories events", async () => {
                    engine.add((ctx) => ({
                        a: {
                            b: {
                                a: ctx.file("hello")
                            }
                        }
                    }));

                    const change = spy();
                    engine.watch("/a", change);
                    await engine.writeFile("/a/b/a", "he");
                    expect(change).to.have.not.been.called;
                });

                it("should stop watching after close", async () => {
                    engine.add((ctx) => ({
                        a: {
                            a: ctx.file("hello"),
                            b: {
                                a: ctx.file("hello")
                            }
                        }
                    }));

                    const change = spy();
                    const watcher = engine.watch("/a", change);
                    await engine.writeFile("/a/a", "");
                    expect(change).to.have.been.calledOnce;
                    watcher.close();
                    await engine.writeFile("/a/a", "");
                    expect(change).to.have.been.calledOnce;
                    await engine.unlink("/a/a");
                    expect(change).to.have.been.calledOnce;
                    await engine.unlink("/a/b/a");
                    expect(change).to.have.been.calledOnce;
                    await engine.rmdir("/a/b");
                    expect(change).to.have.been.calledOnce;
                    await engine.rmdir("/a");
                    expect(change).to.have.been.calledOnce;
                });
            });
        });

        describe("watchFile", () => {
            it("should setup a watcher that uses stat polling", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));

                const change = spy();
                engine.watchFile("/a", { interval: 100 }, change);
                await promise.delay(300);
                expect(change).to.have.not.been.called;
                await engine.writeFile("/a", "a");
                if (change.callCount === 0) {
                    await change.waitForCall();
                }
                await engine.unwatchFile("/a");
                const [prev, curr] = change.getCall(0).args;
                expect(prev.size).to.be.equal(5);
                expect(curr.size).to.be.equal(1);
            });

            it("should emit two empty stats if the file does not exist", async () => {
                const change = spy();
                engine.watchFile("/a", { interval: 100 }, change);
                await promise.delay(300);
                await engine.unwatchFile("/a");
                expect(change).to.have.been.calledOnce;
                const [prev, curr] = change.getCall(0).args;
                expect(prev.ino).to.be.equal(0);
                expect(curr.ino).to.be.equal(0);
            });

            it("should emit empty and actual stat when file appears", async () => {
                const change = spy();
                engine.watchFile("/a", { interval: 100 }, change);
                await promise.delay(300);
                expect(change).to.have.been.calledOnce;
                await engine.writeFile("/a", "hello");
                if (change.callCount !== 2) {
                    await change.waitForCall();
                }
                await engine.unwatchFile("/a");
                const [prev, curr] = change.getCall(1).args;
                expect(prev.ino).to.be.equal(0);
                expect(curr.ino).not.to.be.equal(0);
                expect(curr.size).to.be.equal(5);
            });

            it("should empty prev stat and empty stat when file disappears", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello")
                }));
                const change = spy();
                engine.watchFile("/a", { interval: 100 }, change);
                await promise.delay(150);
                await engine.unlink("/a");
                if (change.callCount !== 1) {
                    await change.waitForCall();
                }
                engine.unwatchFile("/a");
                const [prev, curr] = change.getCall(0).args;
                expect(prev.size).to.be.equal(5);
                expect(curr.size).to.be.equal(0);
                expect(prev.ino).not.to.be.equal(0);
                expect(curr.ino).to.be.equal(0);
            });
        });
    });

    describe("path resolution", () => {
        let engine;

        before(() => {
            engine = new MemoryEngine();
        });

        afterEach(() => {
            engine.clean();
        });


        it("should throw ENOENT if some component does not exist", async () => {
            engine.add(() => ({
                "a/b/c": {

                }
            }));

            const err = await assert.throws(async () => {
                await engine.lstat("/a/b/c/d/e/f");
            }, "ENOENT: no such file or directory, lstat '/a/b/c/d/e/f'");
            expect(err.code).to.be.equal("ENOENT");
        });

        it("should work if all components exist", async () => {
            engine.add((ctx) => ({
                "a/b/c": {
                    d: ctx.file("hello")
                }
            }));

            const stat = await engine.lstat("/a/b/c/d");
            expect(stat.size).to.be.equal(5);
        });

        it("should throw ENOTDIR if some component if not a directory", async () => {
            engine.add((ctx) => ({
                "a/b": {
                    c: ctx.file("hello")
                }
            }));

            const err = await assert.throws(async () => {
                await engine.lstat("/a/b/c/d");
            }, "ENOTDIR: not a directory, lstat '/a/b/c/d'");
            expect(err.code).to.be.equal("ENOTDIR");
        });

        it("should not throw if all components are directories", async () => {
            engine.add(() => ({
                "a/b/c/d": {

                }
            }));

            const stat = await engine.lstat("/a/b/c/d");
            expect(stat.isDirectory()).to.be.true;
        });

        it("should throw EACCES if some component has no search permissions", async () => {
            engine.add((ctx) => ({
                a: {
                    b: {
                        c: [{
                            d: ctx.file("hello")
                        }, { mode: 0o666 }]
                    }
                }
            }));

            const err = await assert.throws(async () => {
                await engine.lstat("/a/b/c/d");
            }, "EACCES: permission denied, lstat '/a/b/c/d'");
            expect(err.code).to.be.equal("EACCES");
        });

        it("should handle .. as parent directory", async () => {
            engine.add((ctx) => ({
                a: {
                    b: {
                        c: ctx.file("hello")
                    }
                }
            }));

            const stat = await engine.stat("/a/b/../b/../b/../../a/b/c");
            expect(stat.size).to.be.equal(5);
        });

        it("should throw ENOTDIR if the part before .. is not a directory", async () => {
            engine.add((ctx) => ({
                a: {
                    b: {
                        c: ctx.file("hello")
                    }
                }
            }));

            const err = await assert.throws(async () => {
                await engine.lstat("/a/b/c/../c");
            }, "ENOTDIR: not a directory, lstat '/a/b/c/../c'");
            expect(err.code).to.be.equal("ENOTDIR");
        });

        it("should handle . as current directory", async () => {
            engine.add((ctx) => ({
                a: {
                    b: {
                        c: ctx.file("hello")
                    }
                }
            }));

            const stat = await engine.stat("/a/b/./.././b/././././../b/./././c");
            expect(stat.size).to.be.equal(5);
        });

        it("should throw ENOTDIR if the part before . is not a directory", async () => {
            engine.add((ctx) => ({
                a: {
                    b: {
                        c: ctx.file("hello")
                    }
                }
            }));

            const err = await assert.throws(async () => {
                await engine.lstat("/a/b/c/./c");
            }, "ENOTDIR: not a directory, lstat '/a/b/c/./c'");
            expect(err.code).to.be.equal("ENOTDIR");
        });

        it("should resolve paths with the trailing slash as an existing directory", async () => {
            engine.add((ctx) => ({
                a: {
                    b: {
                        c: ctx.file("hello")
                    }
                }
            }));

            expect(await engine.realpath("/a/b/")).to.be.equal("/a/b");
        });

        it("should throw ENOTDIR if the path ends with / and it is not a directory", async () => {
            engine.add((ctx) => ({
                a: {
                    b: {
                        c: ctx.file("hello")
                    }
                }
            }));

            const err = await assert.throws(async () => {
                await engine.lstat("/a/b/c/");
            }, "ENOTDIR: not a directory, lstat '/a/b/c/'");
            expect(err.code).to.be.equal("ENOTDIR");
        });

        it("should ignore consequent component slashes", async () => {
            engine.add((ctx) => ({
                a: {
                    b: {
                        c: ctx.file("hello")
                    }
                }
            }));

            const stat = await engine.lstat("/a/b//////////../////////////b/./././../b/c");
            expect(stat.size).to.be.equal(5);
        });

        it("should ignore consequent trailing slashes", async () => {
            engine.add((ctx) => ({
                a: {
                    b: {
                        c: ctx.file("hello")
                    }
                }
            }));

            expect(await engine.realpath("/a/b//////////////////////////../b/////////")).to.be.equal("/a/b");
        });

        it("should not walk down past the root", async () => {
            engine.add((ctx) => ({
                a: {
                    b: ctx.file("hello")
                }
            }));

            expect(await engine.readFile("/a/../../../../../a/b", "utf8")).to.be.equal("hello");
        });

        describe("symlinks", () => {
            it("should follow symlinks", async () => {
                engine.add((ctx) => ({
                    a: {
                        b: {
                            c: ctx.file("hello")
                        }
                    },
                    b: {
                        a: ctx.symlink("../a")
                    }
                }));

                const stat = await engine.lstat("/b/a/b/c");
                expect(stat.size).to.be.equal(5);
            });

            it("should not throw if the final part is a dangling symlink and resolving is not requested", async () => {
                engine.add((ctx) => ({
                    a: ctx.symlink("b")
                }));

                expect(await engine.readlink("/a")).to.be.equal("b");
            });

            it("should throw ENOENT the symlink is dangling", async () => {
                engine.add((ctx) => ({
                    b: {
                        a: ctx.symlink("../a")
                    }
                }));

                const err = await assert.throws(async () => {
                    await engine.lstat("/b/a/c");
                }, "ENOENT: no such file or directory, lstat '/b/a/c'");
                expect(err.code).to.be.equal("ENOENT");
            });

            it("should throw ENOENT is the part of symlink is not a directory", async () => {
                engine.add((ctx) => ({
                    a: {
                        b: ctx.file("hello")
                    },
                    b: {
                        a: ctx.symlink("../a/b/c")
                    }
                }));

                const err = await assert.throws(async () => {
                    await engine.lstat("/b/a/c");
                }, "ENOTDIR: not a directory, lstat '/b/a/c'");
                expect(err.code).to.be.equal("ENOTDIR");
            });

            it("should throw EACCES if the part of symbolic link has no search permissions", async () => {
                engine.add((ctx) => ({
                    a: {
                        b: [{
                            c: ctx.file("hello"),
                            d: {
                                e: ctx.file("hello")
                            }
                        }, { mode: 0o666 }]
                    },
                    b: {
                        a: ctx.symlink("../a/b"),
                        b: ctx.symlink("../a/b/d")
                    }
                }));

                {
                    const err = await assert.throws(async () => {
                        await engine.lstat("/b/a/c");
                    }, "EACCES: permission denied, lstat '/b/a/c'");
                    expect(err.code).to.be.equal("EACCES");
                }
                {
                    const err = await assert.throws(async () => {
                        await engine.lstat("/b/b/e");
                    }, "EACCES: permission denied, lstat '/b/b/e'");
                    expect(err.code).to.be.equal("EACCES");
                }
            });

            it("should throw ENOTDIR if the component symlink resolves as not a directory", async () => {
                engine.add((ctx) => ({
                    a: ctx.file("hello"),
                    b: {
                        a: ctx.symlink("../a")
                    }
                }));

                const err = await assert.throws(async () => {
                    await engine.lstat("/b/a/a");
                }, "ENOTDIR: not a directory, lstat '/b/a/a'");
                expect(err.code).to.be.equal("ENOTDIR");
            });

            it("should correctly handle .. after symlink resolve", async () => {
                engine.add((ctx) => ({
                    a: {
                        b: ctx.file("hello")
                    },
                    b: {
                        a: ctx.symlink("../a")
                    }
                }));

                expect(await engine.realpath("/b/a/../a/b")).to.be.equal("/a/b");
            });
        });
    });
});
