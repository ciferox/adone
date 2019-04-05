const {
    error,
    realm: { code },
    std: { path }
} = adone;
const { Module, Sandbox } = code;

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

        assert.equal(mod.filename, `${getPath("a")}.js`);
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

    describe("scope", () => {
        describe("literals", () => {
            it("get only native vars", async () => {
                const mod = createModule(getPath("a"));
                await mod.load();

                const vars = mod.scope.getAll({ declared: false });
                assert.sameMembers(vars.map((v) => v.name), ["__dirname", "__filename", "exports", "module", "require"]);
                assert.equal(mod.scope.get("__dirname").value, mod.dirname);
                assert.equal(mod.scope.get("__filename").value, mod.filename);
                assert.strictEqual(mod.scope.get("module").value, mod);
            });

            it("get only declared vars", async () => {
                const mod = createModule(getPath("a"));
                await mod.load();

                const vars = mod.scope.getAll({ native: false });
                assert.sameMembers(vars.map((v) => v.name), ["str", "num", "isUnix", "re", "_null"]);
                assert.equal(mod.scope.get("str").value, "adone");
                assert.equal(mod.scope.get("num").value, 1);
                assert.equal(mod.scope.get("isUnix").value, true);
                assert.deepEqual(mod.scope.get("re").value, new RegExp("^a"));
                assert.equal(mod.scope.get("_null").value, null);
            });

            it("get all vars", async () => {
                const mod = createModule(getPath("a"));
                await mod.load();

                const vars = mod.scope.getAll();
                assert.sameMembers(vars.map((v) => v.name), ["__dirname", "__filename", "exports", "module", "require", "str", "num", "isUnix", "re", "_null"]);
            });
        });

        describe("expressions", () => {
            it("common expressions", async () => {
                const mod = createModule(getPath("aa"));
                await mod.load();

                const vars = mod.scope.getAll({ native: false });
                const ids = ["fs", "arrowFn", "namedNoop", "noop", "obj", "arr1", "arr2"];
                assert.sameMembers(vars.map((v) => v.name), ids);

                for (const id of ids) {
                    assert.instanceOf(mod.scope.get(id).value, code.Expression);
                }
            });
        });
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

        it("should ignore special modules", async () => {
            const mod = createModule(getPath("specials"));
            await mod.load();
            assert.sameMembers([...mod.dependencies.keys()], [getPath("c", "index.js")]);
        });

        describe("adone/cli module", () => {
            it.todo("should correctly process 'require(\"..\")'", async () => {
                const mod = createModule(path.join(adone.SRC_PATH, "app", "adone.js"));
                await mod.load({ virtualPath: adone.BIN_PATH });
                // console.log([...mod.dependencies.keys()]);
            });
        });
    });
});
