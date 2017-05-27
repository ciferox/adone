const { fast } = adone;
const { File, plugin: { chmod } } = fast;

describe("Fast", () => {
    describe("transforms", () => {
        describe("chmod", () => {
            it("should throw if invalid argument type", () => {
                expect(() => {
                    chmod("bad argument");
                }).to.throw(/Expected mode to be/);
            });

            it("should chmod files using a number", (cb) => {
                const stream = chmod(0o755);

                stream.on("data", (file) => {
                    expect(file.stat.mode.toString(8)).to.be.equal("755");
                    cb();
                });

                stream.resume().write(new File({
                    stat: {
                        mode: 0o100644
                    },
                    contents: new Buffer("")
                }));
            });

            it("should chmod files using an object", (cb) => {
                const stream = chmod({
                    owner: {
                        read: true,
                        write: true,
                        execute: true
                    },
                    group: {
                        execute: true
                    },
                    others: {
                        execute: true
                    }
                });

                stream.on("data", (file) => {
                    expect(file.stat.mode & 0o07777).to.be.equal(0o755);
                    cb();
                });

                stream.resume().write(new File({
                    stat: {
                        mode: 0o100644
                    },
                    contents: new Buffer("")
                }));
            });

            it("should chmod files using a simple object", (cb) => {
                const stream = chmod({
                    read: false
                });

                stream.on("data", (file) => {
                    expect(file.stat.mode & 0o07777).to.be.equal(0o200);
                    cb();
                });

                stream.resume().write(new File({
                    stat: {
                        mode: 0o100644
                    },
                    contents: new Buffer("")
                }));
            });

            it("should not change folder permissions without a dirMode value", (cb) => {
                const stream = chmod(0o755);

                stream.on("data", (file) => {
                    expect(file.stat.mode).to.be.equal(0o100644);
                    cb();
                });

                stream.resume().write(new File({
                    stat: {
                        mode: 0o100644,
                        isDirectory: () => true
                    }
                }));
            });

            it("should use mode for directories when dirMode set to true", (cb) => {
                const stream = chmod(0o755, true);

                stream.on("data", (file) => {
                    expect(file.stat.mode).to.be.equal(0o755);
                    cb();
                });

                stream.resume().write(new File({
                    stat: {
                        mode: 0o100644,
                        isDirectory: () => true
                    }
                }));
            });

            it("should throw if invalid argument type", () => {
                expect(() => {
                    chmod(null, "bad argument");
                }).to.throw(/Expected dirMode to be/);
            });

            it("should chmod directories using a number", (cb) => {
                const stream = chmod(null, 0o755);

                stream.on("data", (file) => {
                    expect(file.stat.mode).to.be.equal(0o755);
                    cb();
                });

                stream.resume().write(new File({
                    stat: {
                        mode: 0o100644,
                        isDirectory: () => true
                    }
                }));
            });

            it("should chmod directories using an object", (cb) => {
                const stream = chmod(null, {
                    owner: {
                        read: true,
                        write: true,
                        execute: true
                    },
                    group: {
                        execute: true
                    },
                    others: {
                        execute: true
                    }
                });

                stream.on("data", (file) => {
                    expect(file.stat.mode & 0o07777).to.be.equal(0o755);
                    cb();
                });

                stream.resume().write(new File({
                    stat: {
                        mode: 0o100644,
                        isDirectory: () => true
                    }
                }));
            });

            it("should handle no stat object", (cb) => {
                const stream = chmod(0o755);

                stream.on("data", (file) => {
                    expect(file.stat.mode).to.be.equal(0o755);
                    cb();
                });

                stream.resume().write(new File({
                    contents: new Buffer("")
                }));
            });

            it("should use defaultMode if no mode on state object", (cb) => {
                const stream = chmod(0o755);

                stream.on("data", (file) => {
                    expect(file.stat.mode).to.be.equal(0o755);
                    cb();
                });

                stream.resume().write(new File({
                    stat: {},
                    contents: new Buffer("")
                }));
            });

            it("should handle different values for mode and dirMode", (cb) => {
                const stream = chmod(0o755, 0o777);
                let checkedDir = false;
                let checkedFile = false;

                stream.on("data", (file) => {
                    if (file.stat && file.stat.isDirectory && file.stat.isDirectory()) {
                        expect(file.stat.mode).to.be.equal(0o777);
                        checkedDir = true;
                    } else {
                        expect(file.stat.mode).to.be.equal(0o755);
                        checkedFile = true;
                    }

                    // checked both file and directory values?
                    if (checkedDir && checkedFile) {
                        cb();
                    }
                });

                stream.write(new File({
                    contents: new Buffer("")
                }));

                stream.resume().write(new File({
                    stat: {
                        isDirectory: () => true
                    }
                }));
            });

            const d = describe("integration", () => {
                let root;
                let fromdir;
                let todir;
                let srcPath;

                before(async () => {
                    root = await adone.fs.Directory.createTmp();
                    srcPath = root.getVirtualFile("from", "**", "*").path();
                });

                after(async () => {
                    await root.unlink();
                });

                beforeEach(async () => {
                    fromdir = await root.addDirectory("from");
                    todir = await root.addDirectory("to");
                });

                afterEach(async () => {
                    await root.clean();
                });

                it("should chmod files using an object", async () => {
                    await fromdir.addFile("hello.js");
                    await fast.src(srcPath).chmod({
                        owner: { read: true, write: true, execute: true },
                        group: { read: false, write: false, execute: false },
                        others: { read: false, write: false, execute: false }
                    }).dest(todir.path());
                    const file = todir.getVirtualFile("hello.js");
                    expect(await file.exists()).to.be.true;
                    const mode = await file.mode();
                    expect(mode.toOctal()).to.be.equal("0700");
                });

                it("should chmod using a number", async () => {
                    await fromdir.addFile("hello.js");
                    await fast.src(srcPath).chmod(0o700).dest(todir.path());
                    const file = todir.getVirtualFile("hello.js");
                    expect(await file.exists()).to.be.true;
                    const mode = await file.mode();
                    expect(mode.toOctal()).to.be.equal("0700");
                });
            });
            if (adone.is.windows) {
                // Windows does not have permission to make these operations.
                d.skip();
            }
        });
    });
});
