describe("fs", "engine", "MemoryEngine", () => {
    const { fs } = adone;
    const { engine: { MemoryEngine } } = fs;

    describe("methods", () => {
        let engine;

        beforeEach(() => {
            engine = new MemoryEngine();
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

        describe("lstat", () => {
            const { Stats } = adone.std.fs;

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

        describe("stat", () => {
            const { Stats } = adone.std.fs;

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

        describe("readlink", () => {
            it("should return the target of a symbolic link", async () => {
                engine.add((ctx) => ({
                    a: ctx.symlink("a/b/c")
                }));

                const target = await engine.readlink("/a");
                expect(target).to.be.deep.equal("a/b/c");
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
        });
    });
});
