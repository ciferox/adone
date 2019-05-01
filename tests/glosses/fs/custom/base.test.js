/* eslint-disable no-loop-func */
import { fsCalls, cases } from "./fs";

const {
    assertion,
    is,
    fs
} = adone;
const { custom } = fs;
const { MemoryFileSystem, BaseFileSystem, StdFileSystem } = custom;

assertion.use(assertion.extension.checkmark);

describe("fs", "custom", "BaseFileSystem", () => {
    describe("correct call of main fs methods", () => {
        const check = {
            success(info, err, result) {
                assert.isNull(err);
                if (is.array(info.validArgs)) {
                    assert.sameDeepMembers(result, info.validArgs);
                }
            },
            fail(info, err, result) {
                assert.exists(err);
                if (is.array(info.validArgs)) {
                    assert.sameDeepMembers(err.args, info.validArgs);
                }
            }
        };

        const callMethod = (type, fs, info) => {
            const method = info.method;
            if (method.endsWith("Sync")) {
                if (type === "fail") {
                    try {
                        fs[method](...info.args);
                    } catch (err) {
                        check[type](info, err);
                    }
                } else {
                    check[type](info, null, fs[method](...info.args));
                }
                return;
            }
            return new Promise((resolve, reject) => {
                fs[method](...info.args, (err, result) => {
                    try {
                        check[type](info, err, result);
                        resolve();
                    } catch (err) {
                        reject(err);
                    }
                });
            });
        };

        for (const c of cases) {
            // eslint-disable-next-line no-loop-func
            describe(c.name, () => {
                for (const info of fsCalls) {
                    it(`${info.method}(${info.args.join(", ")})`, async () => {
                        await callMethod(c.type, c.fs, info);
                    });
                }
            });
        }
    });


    describe("readdir", () => {
        it("should return the list of mounted engines", (done) => {
            const baseFs = new BaseFileSystem();
            baseFs.mount(new MemoryFileSystem(), "/memory");
            baseFs.readdir("/", (err, files) => {
                expect(files).to.have.same.members(["memory"]);

                baseFs.mount(new MemoryFileSystem(), "/memory2");
                baseFs.readdir("/", (err, files) => {
                    expect(files).to.have.same.members(["memory", "memory2"]);

                    baseFs.mount(new MemoryFileSystem(), "/a/b/c/d/e/f");

                    baseFs.readdir("/a/b/c/../../..", (err, files) => {
                        expect(files).to.have.same.members(["a", "memory", "memory2"]);

                        baseFs.readdir("/a/b/c/d", (err, files) => {
                            expect(files).to.have.same.members(["e"]);

                            baseFs.readdir("/a/b/c/../../.././/../a/../a/b///////./././././/../../../", (err, files) => {
                                expect(files).to.have.same.members(["a", "memory", "memory2"]);

                                baseFs.mount(new MemoryFileSystem(), "/a/b/w");

                                baseFs.readdir("/a/b", (err, files) => {
                                    expect(files).to.be.deep.equal(["c", "w"]);
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    describe("copyFile", () => {
        describe("async", () => {
            it("copy existent file to existent destination inside within the same file system", (done) => {
                const baseFs = new BaseFileSystem();
                const mfs1 = fs.improveFs(new MemoryFileSystem());
                // const mfs2 = fs.improveFs(new MemoryFileSystem());

                baseFs
                    .mount(mfs1, "/mount1");

                mfs1.mkdirSync("/dir1");
                mfs1.mkdirSync("/dir1/dir2");
                mfs1.writeFileSync("/file1", "abra cadabra", "utf8");

                baseFs.copyFile("/mount1/file1", "/mount1/dir1/dir2/copied", (err) => {
                    assert.notExists(err);

                    assert.isTrue(mfs1.existsSync("/dir1/dir2/copied"));
                    try {
                        assert.equal(mfs1.readFileSync("/file1", "utf8"), mfs1.readFileSync("/dir1/dir2/copied", "utf8"));
                    } catch (err) {
                        done(err);
                    }
                    done();
                });
            });

            it("copy existent file to existent destination", (done) => {
                const baseFs = new BaseFileSystem();
                const mfs1 = new MemoryFileSystem();
                const mfs2 = new MemoryFileSystem();

                baseFs
                    .mount(mfs1, "/mount1")
                    .mount(mfs2, "/mount2");

                mfs1.writeFileSync("/file1", "abra cadabra", "utf8");

                baseFs.copyFile("/mount1/file1", "/mount2/copied", (err) => {
                    if (err) {
                        done(err);
                        return;
                    }

                    assert.isTrue(mfs2.existsSync("/copied"));
                    try {
                        assert.equal(mfs1.readFileSync("/file1", "utf8"), mfs2.readFileSync("copied", "utf8"));
                    } catch (err) {
                        done(err);
                    }
                    done();
                });
            });

            it("copy with 'COPYFILE_EXCL' flag", (done) => {
                const baseFs = new BaseFileSystem();
                const mfs1 = new MemoryFileSystem();
                const mfs2 = new MemoryFileSystem();

                baseFs
                    .mount(mfs1, "/mount1")
                    .mount(mfs2, "/mount2");

                mfs1.writeFileSync("/file1", "abra", "utf8");
                mfs2.writeFileSync("/copied", "cadabra", "utf8");

                baseFs.copyFile("/mount1/file1", "/mount2/copied", fs.constants.COPYFILE_EXCL, (err) => {
                    if (err) {
                        done();
                        return;
                    }
                    done(new Error("should copy with error"));
                });
            });
        });

        describe("sync", () => {
            it("copy existent file to existent destination inside within the same file system", () => {
                const baseFs = new BaseFileSystem();
                const mfs1 = fs.improveFs(new MemoryFileSystem());

                baseFs
                    .mount(mfs1, "/mount1");

                mfs1.mkdirSync("/dir1");
                mfs1.mkdirSync("/dir1/dir2");
                mfs1.writeFileSync("/file1", "abra cadabra", "utf8");

                baseFs.copyFileSync("/mount1/file1", "/mount1/dir1/dir2/copied");
                assert.isTrue(mfs1.existsSync("/dir1/dir2/copied"));
                assert.equal(mfs1.readFileSync("/file1", "utf8"), mfs1.readFileSync("/dir1/dir2/copied", "utf8"));
            });

            it("copy existent file to existent destination", () => {
                const baseFs = new BaseFileSystem();
                const mfs1 = new MemoryFileSystem();
                const mfs2 = new MemoryFileSystem();

                baseFs
                    .mount(mfs1, "/mount1")
                    .mount(mfs2, "/mount2");

                mfs1.writeFileSync("/file1", "abra cadabra", "utf8");

                baseFs.copyFileSync("/mount1/file1", "/mount2/copied");
                assert.isTrue(mfs2.existsSync("/copied"));
                assert.equal(mfs1.readFileSync("/file1", "utf8"), mfs2.readFileSync("copied", "utf8"));
            });

            it("copy with 'COPYFILE_EXCL' flag", () => {
                const baseFs = new BaseFileSystem();
                const mfs1 = new MemoryFileSystem();
                const mfs2 = new MemoryFileSystem();

                baseFs
                    .mount(mfs1, "/mount1")
                    .mount(mfs2, "/mount2");

                mfs1.writeFileSync("/file1", "abra", "utf8");
                mfs2.writeFileSync("/copied", "cadabra", "utf8");

                const err = assert.throws(() => baseFs.copyFileSync("/mount1/file1", "/mount2/copied", fs.constants.COPYFILE_EXCL));
                assert.equal(err.code, "EEXIST");
            });
        });
    });

    describe("mount", () => {
        it("should handle requests to a mounted engine", async (done) => {
            const baseFs = new BaseFileSystem();
            const mfs = fs.improveFs(new MemoryFileSystem());
            baseFs.mount(mfs, "/memory");

            await mfs.createFiles({
                struct: {
                    a: {
                        b: "hello"
                    }
                }
            });

            baseFs.readdir("/memory/a", (err, files) => {
                assert.notExists(err);
                expect(files).to.be.deep.equal(["b"]);
                done();
            });
        });

        it("should handle requests to different engines", async (done) => {
            expect(4).checks(done);
            const mfs1 = fs.improveFs(new MemoryFileSystem());
            await mfs1.createFiles({
                struct: {
                    a: "hello",
                    b: {
                        c: "world"
                    }
                }
            });
            const mfs2 = fs.improveFs(new MemoryFileSystem());
            await mfs2.createFiles({
                struct: {
                    b: "hello",
                    c: {
                        d: "world"
                    }
                }
            });
            const baseFs = new BaseFileSystem()
                .mount(mfs1, "/first")
                .mount(mfs2, "/second");

            baseFs.readdir("/first", (err, files) => {
                assert.notExists(err);
                expect(files).to.be.deep.equal(["a", "b"]).mark();
            });

            baseFs.readdir("/first/b", (err, files) => {
                assert.notExists(err);
                expect(files).to.be.deep.equal(["c"]).mark();
            })

            baseFs.readdir("/second", (err, files) => {
                assert.notExists(err);
                expect(files).to.be.deep.equal(["b", "c"]).mark();
            });

            baseFs.readdir("/second/c", (err, files) => {
                assert.notExists(err);
                expect(files).to.be.deep.equal(["d"]).mark();
            });
        });

        describe("non-normalized", () => {
            it("should correctly route non-normalized requests", async (done) => {
                expect(5).checks(done);

                const mfs1 = fs.improveFs(new MemoryFileSystem());
                await mfs1.createFiles({
                    struct: {
                        a: "hello",
                        b: {
                            c: "world"
                        }
                    }
                });
                const mfs2 = fs.improveFs(new MemoryFileSystem());
                await mfs2.createFiles({
                    struct: {
                        b: "hello",
                        c: {
                            d: "world"
                        }
                    }
                });
                const baseFs = new BaseFileSystem()
                    .mount(mfs1, "/first")
                    .mount(mfs2, "/second");


                baseFs.readdir("/first/..", (err, files) => {
                    assert.notExists(err);
                    expect(files).to.be.deep.equal(["first", "second"]).mark();
                });

                baseFs.readdir("/first/../first", (err, files) => {
                    assert.notExists(err);
                    expect(files).to.be.deep.equal(["a", "b"]).mark();
                });

                baseFs.readdir("/first/../second", (err, files) => {
                    assert.notExists(err);
                    expect(files).to.be.deep.equal(["b", "c"]).mark();
                });

                baseFs.readdir("/first/../../first/../././././././////second", (err, files) => {
                    assert.notExists(err);
                    expect(files).to.be.deep.equal(["b", "c"]).mark();
                });

                baseFs.readdir("////////..////./././first/../././second/../first", (err, files) => {
                    assert.notExists(err);
                    expect(files).to.be.deep.equal(["a", "b"]).mark();
                });
            });

            it("should correctly handle non-normalized requests with symlinks", async (done) => {
                expect(6).checks(done);

                const mfs1 = fs.improveFs(new MemoryFileSystem());
                await mfs1.createFiles({
                    struct: {
                        a: "hello",
                        b: {
                            c: "world"
                        }
                    }
                });
                const mfs2 = fs.improveFs(new MemoryFileSystem());
                await mfs2.createFiles({
                    struct: {
                        b: "hello",
                        c: {
                            d: "world",
                            e: {
                                f: ["symlink", ".."]
                            }
                        }
                    }
                });

                const baseFs = new BaseFileSystem()
                    .mount(mfs1, "/first")
                    .mount(mfs2, "/second");

                baseFs.readdir("/second/c/e/f", (err, files) => {
                    assert.notExists(err);
                    expect(files).to.be.deep.equal(["d", "e"]).mark();
                });

                baseFs.readdir("/second/c/e/f/..", (err, files) => {
                    assert.notExists(err);
                    expect(files).to.be.deep.equal(["b", "c"]).mark();
                });

                baseFs.readdir("/second/c/e/f/../..", (err, files) => {
                    assert.notExists(err);
                    expect(files).to.be.deep.equal(["first", "second"]).mark();
                });

                baseFs.readdir("/second/c/e/f/../../..", (err, files) => {
                    assert.notExists(err);
                    expect(files).to.be.deep.equal(["first", "second"]).mark();
                });

                baseFs.readdir("/second/c/e/f/../../../first", (err, files) => {
                    assert.notExists(err);
                    expect(files).to.be.deep.equal(["a", "b"]).mark();
                });

                baseFs.readdir("/first///./././../../../second/c/e/f/../c/e/f/../c/e/./././f/../../first", (err, files) => {
                    assert.notExists(err);
                    expect(files).to.be.deep.equal(["a", "b"]).mark();
                });
            });

            it("should throw ENOENT when smth/.. does not exist", async (done) => {
                const mfs = fs.improveFs(new MemoryFileSystem());
                await mfs.createFiles({
                    struct: {
                        a: "hello"
                    }
                });
                const baseFs = new BaseFileSystem().mount(mfs, "/memory");

                baseFs.readdir("/memory/b/..", (err) => {
                    assert.exists(err);
                    assert.equal(err.message, "ENOENT: no such file or directory, scandir '/memory/b/..'");
                    expect(err.code).to.be.equal("ENOENT");
                    done();
                });
            });

            it("should throw ENOENT when smth/. does not exist", async (done) => {
                const mfs = fs.improveFs(new MemoryFileSystem());
                await mfs.createFiles({
                    struct: {
                        a: "hello"
                    }
                });
                const baseFs = new BaseFileSystem().mount(mfs, "/memory");

                baseFs.readdir("/memory/b/.", (err) => {
                    assert.exists(err);
                    assert.equal(err.message, "ENOENT: no such file or directory, scandir '/memory/b/.'");
                    expect(err.code).to.be.equal("ENOENT");
                    done();
                });
            });

            it("should throw ENOENT when smth/ does not exist", async (done) => {
                const mfs = fs.improveFs(new MemoryFileSystem());
                await mfs.createFiles({
                    struct: {
                        a: "hello"
                    }
                });
                const baseFs = new BaseFileSystem().mount(mfs, "/memory");

                baseFs.readdir("/memory/b/", (err) => {
                    assert.exists(err);
                    assert.equal(err.message, "ENOENT: no such file or directory, scandir '/memory/b/'");
                    expect(err.code).to.be.equal("ENOENT");
                    done();
                });
            });

            it("should throw ENOTDIR when smth/.. is not a directory", async (done) => {
                const mfs = fs.improveFs(new MemoryFileSystem());
                await mfs.createFiles({
                    struct: {
                        a: "hello"
                    }
                });
                const baseFs = new BaseFileSystem().mount(mfs, "/memory");

                baseFs.readdir("/memory/a/..", (err) => {
                    assert.exists(err);
                    assert.equal(err.message, "ENOTDIR: not a directory, scandir '/memory/a/..'");
                    expect(err.code).to.be.equal("ENOTDIR");
                    done();
                });
            });

            it("should throw ENOTDIR when smth/. is not a directory", async (done) => {
                const mfs = fs.improveFs(new MemoryFileSystem());
                await mfs.createFiles({
                    struct: {
                        a: "hello"
                    }
                });
                const baseFs = new BaseFileSystem().mount(mfs, "/memory");

                baseFs.readdir("/memory/a/.", (err) => {
                    assert.exists(err);
                    assert.equal(err.message, "ENOTDIR: not a directory, scandir '/memory/a/.'");
                    expect(err.code).to.be.equal("ENOTDIR");
                    done();
                });
            });

            it("should throw ENOTDIR when smth/ is not a directory", async (done) => {
                const mfs = fs.improveFs(new MemoryFileSystem());
                await mfs.createFiles({
                    struct: {
                        a: "hello"
                    }
                });
                const baseFs = new BaseFileSystem().mount(mfs, "/memory");

                baseFs.readdir("/memory/a/", (err) => {
                    assert.exists(err);
                    assert.equal(err.message, "ENOTDIR: not a directory, scandir '/memory/a/'");
                    expect(err.code).to.be.equal("ENOTDIR");
                    done();
                });
            });
        });

        it("should allow mounting to the root", async (done) => {
            expect(2).checks(done);

            const baseFs = new BaseFileSystem();
            const mfs1 = fs.improveFs(new MemoryFileSystem());
            await mfs1.createFiles({
                struct: {
                    a: "hello"
                }
            });

            const mfs2 = fs.improveFs(new MemoryFileSystem());
            await mfs2.createFiles({
                struct: {
                    c: "hello"
                }
            });

            baseFs
                .mount(mfs1, "/")
                .mount(mfs2, "/b");

            baseFs.readdir("/", (err, files) => {
                assert.notExists(err);
                expect(files).to.be.deep.equal(["a", "b"]).mark();
            });

            baseFs.readdir("/b", (err, files) => {
                assert.notExists(err);
                expect(files).to.be.deep.equal(["c"]).mark();
            });
        });

        it("should prioritize the last mount when intersects", async (done) => {
            const baseFs = new BaseFileSystem();
            const mfs1 = fs.improveFs(new MemoryFileSystem());
            await mfs1.createFiles({
                struct: {
                    a: {
                        c: "hello"
                    }
                }
            });
            const mfs2 = fs.improveFs(new MemoryFileSystem());
            await mfs2.createFiles({
                struct: {
                    b: "hello"
                }
            });
            baseFs
                .mount(mfs1, "/memory")
                .mount(mfs2, "/memory/a");

            baseFs.readdir("/memory/a", (err, files) => {
                assert.notExists(err);
                expect(files).to.be.deep.equal(["b"]);
                done();
            });
        });
    });

    describe("redirects", () => {
        it("not allow redirect to self", () => {
            const baseFs = new BaseFileSystem();

            assert.throws(() => baseFs.addRedirect("/", "/"));
            assert.throws(() => baseFs.addRedirect("/tmp", "/tmp"));
            assert.throws(() => baseFs.addRedirect("/home/user", "/home/user/"));
        });

        it("redirect using relative paths is not allowed", () => {
            const baseFs = new BaseFileSystem();

            assert.throws(() => baseFs.addRedirect("/", "some/path/"));
            assert.throws(() => baseFs.addRedirect("tmp", "/tmp"));
            assert.throws(() => baseFs.addRedirect("home/user", "a/"));
        });

        it("added redirect should be ended with '/'", () => {
            const baseFs = new BaseFileSystem();

            baseFs.addRedirect("/a/a/b/c", "/");
            baseFs.addRedirect("/tmp", "/othertmp");
            baseFs.addRedirect("/home/user/", "/var/");

            assert.isTrue("/a/a/b/c/" in baseFs._redirects);
            assert.isTrue("/tmp/" in baseFs._redirects);
            assert.isTrue("/home/user/" in baseFs._redirects);
        });

        it("redirect from non-existent path to existent", () => {
            const memFs = new MemoryFileSystem();
            memFs.mkdirSync("/a");
            memFs.mkdirSync("/a/b");
            memFs.mkdirSync("/a/b/c");
            // memFs.mkdirp("/d/e");
            memFs.addRedirect("/d/e", "/a/b");

            memFs.writeFileSync("/d/e/file1", "adone");
            assert.isTrue(memFs.existsSync("/a/b/file1"));
            assert.equal(memFs.readFileSync("/a/b/file1", "utf8"), "adone");
        });

        it("redirect both paths in copyFile()", () => {
            const memFs = new MemoryFileSystem();
            memFs.mkdirSync("/a");
            memFs.mkdirSync("/a/b");
            memFs.mkdirSync("/a/b/c");
            memFs.mkdirSync("/d");
            // memFs.mkdirp("/d/e");

            memFs.writeFileSync("/a/b/file1", "adone");

            memFs.addRedirect("/f", "/a/b");
            memFs.addRedirect("/g/h/", "/d");

            memFs.copyFileSync("/f/file1", "/g/h/file1copy");
            assert.isTrue(memFs.existsSync("/f/file1"));
            assert.equal(memFs.readFileSync("/d/file1copy", "utf8"), "adone");
        });
    });
});
