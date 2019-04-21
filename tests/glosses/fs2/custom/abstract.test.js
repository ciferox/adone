const {
    assertion,
    is,
    fs2
} = adone;
const { custom } = fs2;
const { MemoryFileSystem, AbstractFileSystem, StandardFileSystem } = custom;

assertion.use(assertion.extension.checkmark);

describe("fs2", "custom", "AbstactFileSystem", () => {
    describe("readdir", () => {
        it("should return the list of mounted engines", (done) => {
            const abstract = new AbstractFileSystem();
            abstract.mount(new MemoryFileSystem(), "/memory");
            abstract.readdir("/", (err, files) => {
                expect(files).to.have.same.members(["memory"]);

                abstract.mount(new MemoryFileSystem(), "/memory2");
                abstract.readdir("/", (err, files) => {
                    expect(files).to.have.same.members(["memory", "memory2"]);

                    abstract.mount(new MemoryFileSystem(), "/a/b/c/d/e/f");

                    abstract.readdir("/a/b/c/../../..", (err, files) => {
                        expect(files).to.have.same.members(["a", "memory", "memory2"]);

                        abstract.readdir("/a/b/c/d", (err, files) => {
                            expect(files).to.have.same.members(["e"]);

                            abstract.readdir("/a/b/c/../../.././/../a/../a/b///////./././././/../../../", (err, files) => {
                                expect(files).to.have.same.members(["a", "memory", "memory2"]);

                                abstract.mount(new MemoryFileSystem(), "/a/b/w");

                                abstract.readdir("/a/b", (err, files) => {
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
        it("should handle requests to a mounted engine", (done) => {
            const abstract = new AbstractFileSystem();
            const memory = new MemoryFileSystem();
            abstract.mount(memory, "/memory");

            memory.add((ctx) => ({
                a: {
                    b: ctx.file("hello")
                }
            }));

            abstract.readdir("/memory/a", (err, files) => {
                assert.notExists(err);
                expect(files).to.be.deep.equal(["b"]);
                done();
            });
        });

        it("should handle requests to different engines", (done) => {
            expect(4).checks(done);
            const memory1 = new MemoryFileSystem().add((ctx) => ({
                a: ctx.file("hello"),
                b: {
                    c: ctx.file("world")
                }
            }));
            const memory2 = new MemoryFileSystem().add((ctx) => ({
                b: ctx.file("hello"),
                c: {
                    d: ctx.file("world")
                }
            }));
            const abstract = new AbstractFileSystem()
                .mount(memory1, "/first")
                .mount(memory2, "/second");

            abstract.readdir("/first", (err, files) => {
                assert.notExists(err);
                expect(files).to.be.deep.equal(["a", "b"]).mark();
            });

            abstract.readdir("/first/b", (err, files) => {
                assert.notExists(err);
                expect(files).to.be.deep.equal(["c"]).mark();
            })

            abstract.readdir("/second", (err, files) => {
                assert.notExists(err);
                expect(files).to.be.deep.equal(["b", "c"]).mark();
            });

            abstract.readdir("/second/c", (err, files) => {
                assert.notExists(err);
                expect(files).to.be.deep.equal(["d"]).mark();
            });
        });

        describe("non-normalized", () => {
            it("should correctly route non-normalized requests", (done) => {
                expect(5).checks(done);

                const memory1 = new MemoryFileSystem().add((ctx) => ({
                    a: ctx.file("hello"),
                    b: {
                        c: ctx.file("world")
                    }
                }));
                const memory2 = new MemoryFileSystem().add((ctx) => ({
                    b: ctx.file("hello"),
                    c: {
                        d: ctx.file("world")
                    }
                }));
                const abstract = new AbstractFileSystem()
                    .mount(memory1, "/first")
                    .mount(memory2, "/second");


                abstract.readdir("/first/..", (err, files) => {
                    assert.notExists(err);
                    expect(files).to.be.deep.equal(["first", "second"]).mark();
                });

                abstract.readdir("/first/../first", (err, files) => {
                    assert.notExists(err);
                    expect(files).to.be.deep.equal(["a", "b"]).mark();
                });

                abstract.readdir("/first/../second", (err, files) => {
                    assert.notExists(err);
                    expect(files).to.be.deep.equal(["b", "c"]).mark();
                });

                abstract.readdir("/first/../../first/../././././././////second", (err, files) => {
                    assert.notExists(err);
                    expect(files).to.be.deep.equal(["b", "c"]).mark();
                });

                abstract.readdir("////////..////./././first/../././second/../first", (err, files) => {
                    assert.notExists(err);
                    expect(files).to.be.deep.equal(["a", "b"]).mark();
                });
            });

            it("should correctly handle non-normalized requests with symlinks", (done) => {
                expect(6).checks(done);

                const memory1 = new MemoryFileSystem().add((ctx) => ({
                    a: ctx.file("hello"),
                    b: {
                        c: ctx.file("world")
                    }
                }));
                const memory2 = new MemoryFileSystem().add((ctx) => ({
                    b: ctx.file("hello"),
                    c: {
                        d: ctx.file("world"),
                        e: {
                            f: ctx.symlink("..")
                        }
                    }
                }));
                const abstract = new AbstractFileSystem()
                    .mount(memory1, "/first")
                    .mount(memory2, "/second");

                abstract.readdir("/second/c/e/f", (err, files) => {
                    assert.notExists(err);
                    expect(files).to.be.deep.equal(["d", "e"]).mark();
                });

                abstract.readdir("/second/c/e/f/..", (err, files) => {
                    assert.notExists(err);
                    expect(files).to.be.deep.equal(["b", "c"]).mark();
                });

                abstract.readdir("/second/c/e/f/../..", (err, files) => {
                    assert.notExists(err);
                    expect(files).to.be.deep.equal(["first", "second"]).mark();
                });

                abstract.readdir("/second/c/e/f/../../..", (err, files) => {
                    assert.notExists(err);
                    expect(files).to.be.deep.equal(["first", "second"]).mark();
                });

                abstract.readdir("/second/c/e/f/../../../first", (err, files) => {
                    assert.notExists(err);
                    expect(files).to.be.deep.equal(["a", "b"]).mark();
                });

                abstract.readdir("/first///./././../../../second/c/e/f/../c/e/f/../c/e/./././f/../../first", (err, files) => {
                    assert.notExists(err);
                    expect(files).to.be.deep.equal(["a", "b"]).mark();
                });

            });

            it("should throw ENOENT when smth/.. does not exist", (done) => {
                const memory = new MemoryFileSystem().add((ctx) => ({
                    a: ctx.file("hello")
                }));
                const abstract = new AbstractFileSystem().mount(memory, "/memory");

                abstract.readdir("/memory/b/..", (err) => {
                    assert.exists(err);
                    assert.equal(err.message, "ENOENT: no such file or directory, scandir '/memory/b/..'");
                    expect(err.code).to.be.equal("ENOENT");
                    done();
                });
            });

            it("should throw ENOENT when smth/. does not exist", (done) => {
                const memory = new MemoryFileSystem().add((ctx) => ({
                    a: ctx.file("hello")
                }));
                const abstract = new AbstractFileSystem().mount(memory, "/memory");

                abstract.readdir("/memory/b/.", (err) => {
                    assert.exists(err);
                    assert.equal(err.message, "ENOENT: no such file or directory, scandir '/memory/b/.'");
                    expect(err.code).to.be.equal("ENOENT");
                    done();
                });
            });

            it("should throw ENOENT when smth/ does not exist", (done) => {
                const memory = new MemoryFileSystem().add((ctx) => ({
                    a: ctx.file("hello")
                }));
                const abstract = new AbstractFileSystem().mount(memory, "/memory");

                abstract.readdir("/memory/b/", (err) => {
                    assert.exists(err);
                    assert.equal(err.message, "ENOENT: no such file or directory, scandir '/memory/b/'");
                    expect(err.code).to.be.equal("ENOENT");
                    done();
                });
            });

            it("should throw ENOTDIR when smth/.. is not a directory", (done) => {
                const memory = new MemoryFileSystem().add((ctx) => ({
                    a: ctx.file("hello")
                }));
                const abstract = new AbstractFileSystem().mount(memory, "/memory");

                abstract.readdir("/memory/a/..", (err) => {
                    assert.exists(err);
                    assert.equal(err.message, "ENOTDIR: not a directory, scandir '/memory/a/..'");
                    expect(err.code).to.be.equal("ENOTDIR");
                    done();
                });
            });

            it("should throw ENOTDIR when smth/. is not a directory", (done) => {
                const memory = new MemoryFileSystem().add((ctx) => ({
                    a: ctx.file("hello")
                }));
                const abstract = new AbstractFileSystem().mount(memory, "/memory");

                abstract.readdir("/memory/a/.", (err) => {
                    assert.exists(err);
                    assert.equal(err.message, "ENOTDIR: not a directory, scandir '/memory/a/.'");
                    expect(err.code).to.be.equal("ENOTDIR");
                    done();
                });
            });

            it("should throw ENOTDIR when smth/ is not a directory", (done) => {
                const memory = new MemoryFileSystem().add((ctx) => ({
                    a: ctx.file("hello")
                }));
                const abstract = new AbstractFileSystem().mount(memory, "/memory");

                abstract.readdir("/memory/a/", (err) => {
                    assert.exists(err);
                    assert.equal(err.message, "ENOTDIR: not a directory, scandir '/memory/a/'");
                    expect(err.code).to.be.equal("ENOTDIR");
                    done();
                });
            });
        });

        it("should allow mounting to the root", (done) => {
            expect(2).checks(done);

            const abstract = new AbstractFileSystem()
                .mount(new MemoryFileSystem().add((ctx) => ({
                    a: ctx.file("hello")
                })), "/")
                .mount(new MemoryFileSystem().add((ctx) => ({
                    c: ctx.file("hello")
                })), "/b");

            abstract.readdir("/", (err, files) => {
                assert.notExists(err);
                expect(files).to.be.deep.equal(["a", "b"]).mark();
            });

            abstract.readdir("/b", (err, files) => {
                assert.notExists(err);
                expect(files).to.be.deep.equal(["c"]).mark();
            });
        });

        it("should prioritize the last mount when intersects", (done) => {
            const abstract = new AbstractFileSystem()
                .mount(new MemoryFileSystem().add((ctx) => ({
                    a: {
                        c: ctx.file("hello")
                    }
                })), "/memory")
                .mount(new MemoryFileSystem().add((ctx) => ({
                    b: ctx.file("hello")
                })), "/memory/a");

            abstract.readdir("/memory/a", (err, files) => {
                assert.notExists(err);
                expect(files).to.be.deep.equal(["b"]);
                done();
            });
        });
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
