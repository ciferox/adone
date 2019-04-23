const {
    assertion,
    is,
    fs2
} = adone;
const { custom } = fs2;
const { MemoryFileSystem, BaseFileSystem, StandardFileSystem } = custom;

assertion.use(assertion.extension.checkmark);

describe("fs2", "custom", "BaseFileSystem", () => {
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

    describe("mount", () => {
        it("should handle requests to a mounted engine", async (done) => {
            const baseFs = new BaseFileSystem();
            const mfs = fs2.improveFs(new MemoryFileSystem());
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
            const mfs1 = fs2.improveFs(new MemoryFileSystem());
            await mfs1.createFiles({
                struct: {
                    a: "hello",
                    b: {
                        c: "world"
                    }
                }
            });
            const mfs2 = fs2.improveFs(new MemoryFileSystem());
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

                const mfs1 = fs2.improveFs(new MemoryFileSystem());
                await mfs1.createFiles({
                    struct: {
                        a: "hello",
                        b: {
                            c: "world"
                        }
                    }
                });
                const mfs2 = fs2.improveFs(new MemoryFileSystem());
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

                const mfs1 = fs2.improveFs(new MemoryFileSystem());
                await mfs1.createFiles({
                    struct: {
                        a: "hello",
                        b: {
                            c: "world"
                        }
                    }
                });
                const mfs2 = fs2.improveFs(new MemoryFileSystem());
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
                const mfs = fs2.improveFs(new MemoryFileSystem());
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

            // it.only("should throw ENOENT when smth/. does not exist", async (done) => {
            //     const mfs = fs2.improveFs(new MemoryFileSystem());
            //     await mfs.createFiles({
            //         struct: {
            //             a: "hello"
            //         }
            //     });
            //     const baseFs = new BaseFileSystem().mount(mfs, "/memory");

            //     baseFs.readdir("/memory/b/.", (err) => {
            //         assert.exists(err);
            //         assert.equal(err.message, "ENOENT: no such file or directory, scandir '/memory/b/.'");
            //         expect(err.code).to.be.equal("ENOENT");
            //         done();
            //     });
            // });

            // it("should throw ENOENT when smth/ does not exist", (done) => {
            //     const memory = new MemoryFileSystem().add((ctx) => ({
            //         a: ctx.file("hello")
            //     }));
            //     const abstract = new BaseFileSystem().mount(memory, "/memory");

            //     abstract.readdir("/memory/b/", (err) => {
            //         assert.exists(err);
            //         assert.equal(err.message, "ENOENT: no such file or directory, scandir '/memory/b/'");
            //         expect(err.code).to.be.equal("ENOENT");
            //         done();
            //     });
            // });

            // it("should throw ENOTDIR when smth/.. is not a directory", (done) => {
            //     const memory = new MemoryFileSystem().add((ctx) => ({
            //         a: ctx.file("hello")
            //     }));
            //     const abstract = new BaseFileSystem().mount(memory, "/memory");

            //     abstract.readdir("/memory/a/..", (err) => {
            //         assert.exists(err);
            //         assert.equal(err.message, "ENOTDIR: not a directory, scandir '/memory/a/..'");
            //         expect(err.code).to.be.equal("ENOTDIR");
            //         done();
            //     });
            // });

            // it("should throw ENOTDIR when smth/. is not a directory", (done) => {
            //     const memory = new MemoryFileSystem().add((ctx) => ({
            //         a: ctx.file("hello")
            //     }));
            //     const abstract = new BaseFileSystem().mount(memory, "/memory");

            //     abstract.readdir("/memory/a/.", (err) => {
            //         assert.exists(err);
            //         assert.equal(err.message, "ENOTDIR: not a directory, scandir '/memory/a/.'");
            //         expect(err.code).to.be.equal("ENOTDIR");
            //         done();
            //     });
            // });

            // it("should throw ENOTDIR when smth/ is not a directory", (done) => {
            //     const memory = new MemoryFileSystem().add((ctx) => ({
            //         a: ctx.file("hello")
            //     }));
            //     const abstract = new BaseFileSystem().mount(memory, "/memory");

            //     abstract.readdir("/memory/a/", (err) => {
            //         assert.exists(err);
            //         assert.equal(err.message, "ENOTDIR: not a directory, scandir '/memory/a/'");
            //         expect(err.code).to.be.equal("ENOTDIR");
            //         done();
            //     });
            // });
        });

        // it("should allow mounting to the root", (done) => {
        //     expect(2).checks(done);

        //     const abstract = new BaseFileSystem()
        //         .mount(new MemoryFileSystem().add((ctx) => ({
        //             a: ctx.file("hello")
        //         })), "/")
        //         .mount(new MemoryFileSystem().add((ctx) => ({
        //             c: ctx.file("hello")
        //         })), "/b");

        //     abstract.readdir("/", (err, files) => {
        //         assert.notExists(err);
        //         expect(files).to.be.deep.equal(["a", "b"]).mark();
        //     });

        //     abstract.readdir("/b", (err, files) => {
        //         assert.notExists(err);
        //         expect(files).to.be.deep.equal(["c"]).mark();
        //     });
        // });

        // it("should prioritize the last mount when intersects", (done) => {
        //     const abstract = new BaseFileSystem()
        //         .mount(new MemoryFileSystem().add((ctx) => ({
        //             a: {
        //                 c: ctx.file("hello")
        //             }
        //         })), "/memory")
        //         .mount(new MemoryFileSystem().add((ctx) => ({
        //             b: ctx.file("hello")
        //         })), "/memory/a");

        //     abstract.readdir("/memory/a", (err, files) => {
        //         assert.notExists(err);
        //         expect(files).to.be.deep.equal(["b"]);
        //         done();
        //     });
        // });
    });

    describe.todo("mock", () => {
        it("should replace the target's methods with its own and add a restore method", async () => {
            const lstat = spy();
            const readdir = spy();
            const obj = { lstat, readdir };

            const engine = new MemoryFileSystem().add((ctx) => ({
                a: ctx.file("hello"),
                b: {
                    c: ctx.file("hello")
                }
            }));
            engine.mock(obj);

            expect((await obj.lstat("/a")).isFile()).to.be.true();
            expect(await obj.readdir("/b")).to.be.deep.equal(["c"]);
            expect(lstat).to.have.not.been.called();
            expect(readdir).to.have.not.been.called();
            obj.restore();
            obj.lstat();
            obj.readdir();
            expect(lstat).to.have.been.calledOnce();
            expect(readdir).to.have.been.calledOnce();
        });

        it("should support require from memory with std.fs mock", {
            skip: is.windows // TODO: figure out how to handle namespaced paths on windows
        }, () => {
            const memory = new MemoryFileSystem().add((ctx) => ({
                "script.js": ctx.file(`
                    const a = require("./a");

                    export default () => a.process();
                `),
                "a.js": ctx.file(`
                    import Module from "./lib/module";

                    export const process = () => {
                        return Module() + 21;
                    };
                `),
                lib: {
                    "module.js": ctx.file(`
                        export default function f() {
                            return 21;
                        }
                    `)
                }
            }));
            const standard = new StandardFileSystem();
            standard.mount(memory, "/memory");
            standard.mock(adone.std.fs);
            try {
                const m = adone.require("/memory/script").default;
                expect(m()).to.be.equal(42);
            } finally {
                adone.std.fs.restore();
            }
        });
    });
});