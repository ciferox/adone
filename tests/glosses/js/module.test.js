describe("js", "Module", () => {
    const {
        js,
        fs
    } = adone;

    let memory;
    const root = new fs.Directory("/", "virtual");

    before(async () => {
        memory = new fs.engine.MemoryEngine();
        const stadard = new fs.engine.StandardEngine().mount(memory, "/virtual");
        stadard.mock(adone.std.fs);
    });

    afterEach(() => {
        memory.clean();
    });

    after(() => {
        adone.std.fs.restore();
    });

    describe("unref", () => {
        const createModule = () => new js.Module(root.getFile("random_name").path());
        it("should delete from cache if only 1 ref", async () => {
            memory.add((ctx) => ({
                "test.js": ctx.file(`
                    module.exports = 123;
                `)
            }));

            const file = root.getFile("test.js");
            const m = createModule();
            expect(m.require("./test")).to.be.equal(123);
            expect(m.require("./test")).to.be.equal(123);
            await file.write("module.exports = 456");
            m.unref(file.path());
            expect(m.require("./test")).to.be.equal(456);
        });

        it("should unref module with its children", async () => {
            memory.add((ctx) => ({
                "test.js": ctx.file(`
                    const a = require("./a");
                    module.exports = a + 1;
                `),
                "a.js": ctx.file(`
                    const b = require("./b");
                    module.exports = b + 3;
                `),
                "b.js": ctx.file(`
                    module.exports = 3;
                `)
            }));

            const m = createModule();
            const test = root.getFile("test.js");
            expect(m.require(test.path())).to.be.equal(7);
            m.unref(test.path());
            await root.getFile("b.js").write("module.exports = 10");
            expect(m.require(test.path())).to.be.equal(14);
        });

        it("should not unref module if it has more than 1 ref", async () => {
            memory.add((ctx) => ({
                "a.js": ctx.file(`
                    const b = require("./b");
                    module.exports = b + 3;
                `),
                "b.js": ctx.file(`
                    module.exports = 3;
                `),
                "c.js": ctx.file(`
                    const b = require("./b");
                    module.exports = b + 18;
                `)
            }));

            const m = createModule();
            expect(m.require(root.getFile("a.js").path())).to.be.equal(6);
            expect(m.require(root.getFile("c.js").path())).to.be.equal(21);
            await root.getFile("b.js").write("module.exports = 30");
            m.unref(root.getFile("a.js").path());
            expect(m.require(root.getFile("a.js").path())).to.be.equal(6);
            m.unref(root.getFile("c.js").path());
            expect(m.require(root.getFile("c.js").path())).to.be.equal(21);
            m.unref(root.getFile("a.js").path());
            m.unref(root.getFile("c.js").path());
            // must unref b
            expect(m.require(root.getFile("a.js").path())).to.be.equal(33);
            expect(m.require(root.getFile("c.js").path())).to.be.equal(48);
        });

        it("should count only once for one module", async () => {
            memory.add((ctx) => ({
                "a.js": ctx.file(`
                    require("./b");
                    require("./b");
                    require("./b");
                    require("./b");
                    require("./b");
                    require("./b");
                    require("./b");
                    require("./b");
                    const b = require("./b");
                    module.exports = b + 3;
                `),
                "b.js": ctx.file(`
                    module.exports = 3;
                `)
            }));

            const m = createModule();
            expect(m.require(root.getFile("a.js").path())).to.be.equal(6);
            m.unref(root.getFile("a.js").path());
            await root.getFile("b.js").write("module.exports = 10");
            expect(m.require(root.getFile("a.js").path())).to.be.equal(13);
        });
    });
});
