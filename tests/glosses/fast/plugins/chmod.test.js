describe("fast", "transform", "chmod", () => {
    const { fast } = adone;
    const { File, Fast } = fast;

    it("should throw if invalid argument type", () => {
        expect(() => {
            new Fast().chmod("bad argument");
        }).to.throw(/Expected mode to be/);
    });

    it("should chmod files using a number", async () => {
        const [file] = await new Fast([
            new File({
                stat: {
                    mode: 0o100644
                },
                contents: adone.emptyBuffer
            })
        ]).chmod(0o755);
        expect(file.stat.mode.toString(8)).to.be.equal("755");
    });

    it("should chmod files using an object", async () => {
        const [file] = await new Fast([
            new File({
                stat: {
                    mode: 0o100644
                },
                contents: adone.emptyBuffer
            })
        ]).chmod({
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

        expect(file.stat.mode & 0o07777).to.be.equal(0o755);
    });

    it("should chmod files using a simple object", async () => {
        const [file] = await new Fast([
            new File({
                stat: {
                    mode: 0o100644
                },
                contents: adone.emptyBuffer
            })
        ]).chmod({
            read: false
        });

        expect(file.stat.mode & 0o07777).to.be.equal(0o200);
    });

    it("should not change folder permissions without a dirMode value", async () => {
        const [file] = await new Fast([
            new File({
                stat: {
                    mode: 0o100644,
                    isDirectory: () => true
                }
            })
        ]).chmod(0o755);
        expect(file.stat.mode).to.be.equal(0o100644);
    });

    it("should use mode for directories when dirMode set to true", async () => {
        const [file] = await new Fast([
            new File({
                stat: {
                    mode: 0o100644,
                    isDirectory: () => true
                }
            })
        ]).chmod(0o755, true);
        expect(file.stat.mode).to.be.equal(0o755);
    });

    it("should throw if invalid argument type", () => {
        expect(() => {
            new Fast().chmod(null, "bad argument");
        }).to.throw(/Expected dirMode to be/);
    });

    it("should chmod directories using a number", async () => {
        const [file] = await new Fast([
            new File({
                stat: {
                    mode: 0o100644,
                    isDirectory: () => true
                }
            })
        ]).chmod(null, 0o755);

        expect(file.stat.mode).to.be.equal(0o755);
    });

    it("should chmod directories using an object", async () => {
        const [file] = await new Fast([
            new File({
                stat: {
                    mode: 0o100644,
                    isDirectory: () => true
                }
            })
        ]).chmod(null, {
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

        expect(file.stat.mode & 0o07777).to.be.equal(0o755);
    });

    it("should handle no stat object", async () => {
        const [file] = await new Fast([
            new File({
                contents: adone.emptyBuffer
            })
        ]).chmod(0o755);

        expect(file.stat.mode).to.be.equal(0o755);
    });

    it("should use defaultMode if no mode on state object", async () => {
        const [file] = await new Fast([
            new File({
                stat: {},
                contents: adone.emptyBuffer
            })
        ]).chmod(0o755);
        expect(file.stat.mode).to.be.equal(0o755);
    });

    it("should handle different values for mode and dirMode", async () => {
        let checkedDir = false;
        let checkedFile = false;
        await new Fast([
            new File({
                contents: adone.emptyBuffer
            }),
            new File({
                stat: {
                    isDirectory: () => true
                }
            })
        ]).chmod(0o755, 0o777).forEach((file) => {
            if (file.stat && file.stat.isDirectory && file.stat.isDirectory()) {
                expect(file.stat.mode).to.be.equal(0o777);
                checkedDir = true;
            } else {
                expect(file.stat.mode).to.be.equal(0o755);
                checkedFile = true;
            }
        });
        expect(checkedDir && checkedFile).to.be.true;
    });

    describe("integration", {
        skip: adone.is.windows
    }, () => {
        let root;
        let fromdir;
        let todir;
        let srcPath;

        before(async () => {
            root = await adone.fs.Directory.createTmp();
            srcPath = root.getFile("from", "**", "*").path();
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
            const file = todir.getFile("hello.js");
            expect(await file.exists()).to.be.true;
            const mode = await file.mode();
            expect(mode.toOctal()).to.be.equal("0700");
        });

        it("should chmod using a number", async () => {
            await fromdir.addFile("hello.js");
            await fast.src(srcPath).chmod(0o700).dest(todir.path());
            const file = todir.getFile("hello.js");
            expect(await file.exists()).to.be.true;
            const mode = await file.mode();
            expect(mode.toOctal()).to.be.equal("0700");
        });
    });
});
