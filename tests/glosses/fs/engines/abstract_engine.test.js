describe("fs", "engine", "AbstactEngine", () => {
    const { is, fs } = adone;
    const { engine } = fs;
    const { MemoryEngine, AbstractEngine, StandardEngine } = engine;

    describe("readdir", () => {
        it("should return the list of mounted engines", async () => {
            const abstract = new AbstractEngine();
            abstract.mount(new MemoryEngine(), "/memory");
            expect(await abstract.readdir("/")).to.be.deep.equal(["memory"]);

            abstract.mount(new MemoryEngine(), "/memory2");
            expect(await abstract.readdir("/")).to.be.deep.equal(["memory", "memory2"]);

            abstract.mount(new MemoryEngine(), "/a/b/c/d/e/f");

            expect(await abstract.readdir("/a/b/c/../../..")).to.be.deep.equal(["a", "memory", "memory2"]);
            expect(await abstract.readdir("/a/b/c/d")).to.be.deep.equal(["e"]);
            expect(await abstract.readdir("/a/b/c/../../.././/../a/../a/b///////./././././/../../../")).to.be.deep.equal([
                "a", "memory", "memory2"
            ]);

            abstract.mount(new MemoryEngine(), "/a/b/w");
            expect(await abstract.readdir("/a/b")).to.be.deep.equal(["c", "w"]);
        });
    });

    describe("mount", () => {
        it("should handle requests to a mounted engine", async () => {
            const abstract = new AbstractEngine();
            const memory = new MemoryEngine();
            abstract.mount(memory, "/memory");

            memory.add((ctx) => ({
                a: {
                    b: ctx.file("hello")
                }
            }));

            expect(await abstract.readdir("/memory/a")).to.be.deep.equal(["b"]);
        });

        it("should handle requests to different engines", async () => {
            const memory1 = new MemoryEngine().add((ctx) => ({
                a: ctx.file("hello"),
                b: {
                    c: ctx.file("world")
                }
            }));
            const memory2 = new MemoryEngine().add((ctx) => ({
                b: ctx.file("hello"),
                c: {
                    d: ctx.file("world")
                }
            }));
            const abstract = new AbstractEngine()
                .mount(memory1, "/first")
                .mount(memory2, "/second");

            expect(await abstract.readdir("/first")).to.be.deep.equal(["a", "b"]);
            expect(await abstract.readdir("/first/b")).to.be.deep.equal(["c"]);

            expect(await abstract.readdir("/second")).to.be.deep.equal(["b", "c"]);
            expect(await abstract.readdir("/second/c")).to.be.deep.equal(["d"]);
        });

        describe("non-normalized", () => {
            it("should correctly route non-normalized requests", async () => {
                const memory1 = new MemoryEngine().add((ctx) => ({
                    a: ctx.file("hello"),
                    b: {
                        c: ctx.file("world")
                    }
                }));
                const memory2 = new MemoryEngine().add((ctx) => ({
                    b: ctx.file("hello"),
                    c: {
                        d: ctx.file("world")
                    }
                }));
                const abstract = new AbstractEngine()
                    .mount(memory1, "/first")
                    .mount(memory2, "/second");

                expect(await abstract.readdir("/first/..")).to.be.deep.equal(["first", "second"]);
                expect(await abstract.readdir("/first/../first")).to.be.deep.equal(["a", "b"]);
                expect(await abstract.readdir("/first/../second")).to.be.deep.equal(["b", "c"]);
                expect(await abstract.readdir("/first/../../first/../././././././////second")).to.be.deep.equal(["b", "c"]);
                expect(await abstract.readdir("////////..////./././first/../././second/../first")).to.be.deep.equal(["a", "b"]);
            });

            it("should correctly handle non-normalized requests with symlinks", async () => {
                const memory1 = new MemoryEngine().add((ctx) => ({
                    a: ctx.file("hello"),
                    b: {
                        c: ctx.file("world")
                    }
                }));
                const memory2 = new MemoryEngine().add((ctx) => ({
                    b: ctx.file("hello"),
                    c: {
                        d: ctx.file("world"),
                        e: {
                            f: ctx.symlink("..")
                        }
                    }
                }));
                const abstract = new AbstractEngine()
                    .mount(memory1, "/first")
                    .mount(memory2, "/second");

                expect(await abstract.readdir("/second/c/e/f")).to.be.deep.equal(["d", "e"]);
                expect(await abstract.readdir("/second/c/e/f/..")).to.be.deep.equal(["b", "c"]);
                expect(await abstract.readdir("/second/c/e/f/../..")).to.be.deep.equal(["first", "second"]);
                expect(await abstract.readdir("/second/c/e/f/../../..")).to.be.deep.equal(["first", "second"]);
                expect(await abstract.readdir("/second/c/e/f/../../../first")).to.be.deep.equal(["a", "b"]);
                expect(await abstract.readdir("/first///./././../../../second/c/e/f/../c/e/f/../c/e/./././f/../../first")).to.be.deep.equal([
                    "a", "b"
                ]);
            });

            it("should throw ENOENT when smth/.. does not exist", async () => {
                const memory = new MemoryEngine().add((ctx) => ({
                    a: ctx.file("hello")
                }));
                const abstract = new AbstractEngine().mount(memory, "/memory");

                const err = await assert.throws(async () => {
                    await abstract.readdir("/memory/b/..");
                }, "ENOENT: no such file or directory, scandir '/memory/b/..'");
                expect(err.code).to.be.equal("ENOENT");
            });

            it("should throw ENOENT when smth/. does not exist", async () => {
                const memory = new MemoryEngine().add((ctx) => ({
                    a: ctx.file("hello")
                }));
                const abstract = new AbstractEngine().mount(memory, "/memory");

                const err = await assert.throws(async () => {
                    await abstract.readdir("/memory/b/.");
                }, "ENOENT: no such file or directory, scandir '/memory/b/.'");
                expect(err.code).to.be.equal("ENOENT");
            });

            it("should throw ENOENT when smth/ does not exist", async () => {
                const memory = new MemoryEngine().add((ctx) => ({
                    a: ctx.file("hello")
                }));
                const abstract = new AbstractEngine().mount(memory, "/memory");

                const err = await assert.throws(async () => {
                    await abstract.readdir("/memory/b/");
                }, "ENOENT: no such file or directory, scandir '/memory/b/'");
                expect(err.code).to.be.equal("ENOENT");
            });

            it("should throw ENOTDIR when smth/.. is not a directory", async () => {
                const memory = new MemoryEngine().add((ctx) => ({
                    a: ctx.file("hello")
                }));
                const abstract = new AbstractEngine().mount(memory, "/memory");

                const err = await assert.throws(async () => {
                    await abstract.readdir("/memory/a/..");
                }, "ENOTDIR: not a directory, scandir '/memory/a/..'");
                expect(err.code).to.be.equal("ENOTDIR");
            });

            it("should throw ENOTDIR when smth/. is not a directory", async () => {
                const memory = new MemoryEngine().add((ctx) => ({
                    a: ctx.file("hello")
                }));
                const abstract = new AbstractEngine().mount(memory, "/memory");

                const err = await assert.throws(async () => {
                    await abstract.readdir("/memory/a/.");
                }, "ENOTDIR: not a directory, scandir '/memory/a/.'");
                expect(err.code).to.be.equal("ENOTDIR");
            });

            it("should throw ENOTDIR when smth/ is not a directory", async () => {
                const memory = new MemoryEngine().add((ctx) => ({
                    a: ctx.file("hello")
                }));
                const abstract = new AbstractEngine().mount(memory, "/memory");

                const err = await assert.throws(async () => {
                    await abstract.readdir("/memory/a/");
                }, "ENOTDIR: not a directory, scandir '/memory/a/'");
                expect(err.code).to.be.equal("ENOTDIR");
            });
        });

        it("should allow mounting to the root", async () => {
            const abstract = new AbstractEngine()
                .mount(new MemoryEngine().add((ctx) => ({
                    a: ctx.file("hello")
                })), "/")
                .mount(new MemoryEngine().add((ctx) => ({
                    c: ctx.file("hello")
                })), "/b");
            expect(await abstract.readdir("/")).to.be.deep.equal(["a", "b"]);
            expect(await abstract.readdir("/b")).to.be.deep.equal(["c"]);
        });

        it("should prioritize the last mount when intersects", async () => {
            const abstract = new AbstractEngine()
                .mount(new MemoryEngine().add((ctx) => ({
                    a: {
                        c: ctx.file("hello")
                    }
                })), "/memory")
                .mount(new MemoryEngine().add((ctx) => ({
                    b: ctx.file("hello")
                })), "/memory/a");
            expect(await abstract.readdir("/memory/a")).to.be.deep.equal(["b"]);
        });
    });

    describe("mock", () => {
        it("should replace the target's methods with its own and add a restore method", async () => {
            const lstat = spy();
            const readdir = spy();
            const obj = { lstat, readdir };

            const engine = new MemoryEngine().add((ctx) => ({
                a: ctx.file("hello"),
                b: {
                    c: ctx.file("hello")
                }
            }));
            engine.mock(obj);

            expect((await obj.lstat("/a")).isFile()).to.be.true();
            expect(await obj.readdir("/b")).to.be.deep.equal(["c"]);
            expect(lstat).to.have.not.been.called;
            expect(readdir).to.have.not.been.called;
            obj.restore();
            obj.lstat();
            obj.readdir();
            expect(lstat).to.have.been.calledOnce;
            expect(readdir).to.have.been.calledOnce;
        });

        it("should support require from memory with std.fs mock", {
            skip: is.windows // TODO: figure out how to handle namespaced paths on windows
        }, () => {
            const memory = new MemoryEngine().add((ctx) => ({
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
            const standard = new StandardEngine();
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
