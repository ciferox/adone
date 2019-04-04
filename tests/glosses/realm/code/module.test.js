const {
    error,
    realm: { code: { Module, Sandbox } },
    std: { path }
} = adone;

const getPath = (...args) => path.join(__dirname, "fixtures", "modules", ...args);

describe("Module", () => {
    let sandbox;

    const createModule = (path) => new Module({ sandbox, file: path });

    before(() => {
        sandbox = new Sandbox({
            input: getPath("empty")
        });
    });

    it("should throw with invalid value of file", () => {
        assert.throws(() => new Module(), error.NotValidException);
        assert.throws(() => new Module({}), error.NotValidException);
        assert.throws(() => new Module({ file: "" }), error.NotValidException);
        assert.throws(() => new Module({ file: "relative/path" }), error.NotValidException);
    });

    it("defaults", () => {
        const mod = createModule(getPath("a"));

        assert.equal(mod.id, `${getPath("a")}.js`);
        assert.isUndefined(mod.ast);
        assert.isUndefined(mod.content);
        assert.lengthOf(mod.dependencies, 0);
    });

    describe("public methods", () => {
        const methods = [
            "load"
        ];

        const s = createModule(getPath("a"));

        for (const m of methods) {
            it(`${m}()`, () => {
                assert.isFunction(s[m]);
            });
        }
    });

    it("should allow load empty files", async () => {
        const mod = createModule(getPath("empty.js"));

        await mod.load();

        assert.equal(mod.content, "");
        assert.equal(mod.ast.program.sourceType, "module");
        assert.lengthOf(mod.ast.program.body, 0);
    });

    describe("dependencies", () => {
        it("single with require()", async () => {
            const mod = createModule(getPath("b.js"));
            await mod.load();

            assert.sameMembers([...mod.dependencies.keys()], [getPath("a.js")]);
        });

        it("multiple with require()", async () => {
            const mod = createModule(getPath("c"));
            await mod.load();

            assert.sameMembers([...mod.dependencies.keys()], [getPath("a.js"), getPath("b.js")]);
        });

        it("multiple with require() recursively", async () => {
            const mod = createModule(getPath("d"));
            await mod.load();

            assert.sameMembers([...mod.dependencies.keys()], [getPath("a.js"), getPath("b.js"), getPath("c", "index.js")]);
        });

        it("single with 'import'", async () => {
            const mod = createModule(getPath("e"));
            await mod.load();

            assert.sameMembers([...mod.dependencies.keys()], [getPath("a.js")]);
        });

        it("multiple with 'import'", async () => {
            const mod = createModule(getPath("f"));
            await mod.load();

            assert.sameMembers([...mod.dependencies.keys()], [getPath("a.js"), getPath("b.js"), getPath("c", "index.js")]);
        });

        it("adone.lazify", async () => {
            const mod = createModule(getPath("g"));
            await mod.load();

            assert.sameMembers([...mod.dependencies.keys()], [getPath("a.js"), getPath("b.js"), getPath("d.js")]);
        });

        it("const __ = adone.lazify", async () => {
            const mod = createModule(getPath("h"));
            await mod.load();

            assert.sameMembers([...mod.dependencies.keys()], [getPath("a.js"), getPath("b.js"), getPath("c", "index.js"), getPath("d.js")]);
        });

        it("many lazifiers", async () => {
            const mod = createModule(getPath("i"));
            await mod.load();

            // console.log(adone.inspect(mod.ast.program, { depth: 6 }));

            assert.sameMembers([...mod.dependencies.keys()], [getPath("a.js"), getPath("b.js"), getPath("c", "index.js"), getPath("d.js"), getPath("e.js"), getPath("f.js"), getPath("g.js")]);
        });

        describe("detect adone in global scope by require", () => {
            it.only("require('a')", () => {
                const mod = createModule(getPath("require_adone_a"));

                console.log([...mod.dependencies.keys()]);
            });
        });
    });
});
