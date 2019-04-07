import { getModulePath, createSandbox, createModule, suiteRunner } from "./helpers";

const {
    error,
    realm: { code },
    std: { path }
} = adone;

describe("Module", () => {
    let sandbox;

    before(() => {
        sandbox = createSandbox({
            input: __filename
        });
    });

    it("should throw with invalid value of file", () => {
        assert.throws(() => new code.Module(), error.NotValidException);
        assert.throws(() => new code.Module({}), error.NotValidException);
        assert.throws(() => new code.Module({ file: "" }), error.NotValidException);
        assert.throws(() => new code.Module({ file: "relative/path" }), error.NotValidException);
    });

    describe("public methods", () => {
        const methods = [
            "load",
            "addDependencyModule"
        ];

        let mod;
        before(async () => {
            mod = await createModule(__filename, {
                sandbox
            });
        });

        for (const m of methods) {
            // eslint-disable-next-line no-loop-func
            it(`${m}()`, () => {
                assert.isFunction(mod[m]);
            });
        }
    });

    describe("ast processor", () => {
        const suite = suiteRunner("./modules_ast_processor");

        before(async () => {
            await suite.before();
        });

        after(async () => {
            await suite.after();
        });

        suite.run();
    });


    describe("scopes", () => {
    //     describe("nested scopes", () => {
    //         const cases = ["a"/*, "b", "c", "d"*/];

    //         for (const c of cases) {
    //             // eslint-disable-next-line no-loop-func
    //             it(`one-level function declaration (${c})`, async () => {
    //                 const mod = await createModule(getModulePath(`scopes1${c}`), {
    //                     sandbox,
    //                     load: true
    //                 });
    
    //                 assert.sameMembers(mod.scope.getAll({ native: false }).map((v) => v.name), ["a", "fn"]);
    //                 assert.instanceOf(mod.scope.get("fn").value, code.Function);
    //                 assert.equal(mod.scope.get("a").value, "adone");
    //                 assert.lengthOf(mod.scope.children, 1);
    //                 assert.instanceOf(mod.scope.children[0], code.FunctionScope);
    //                 assert.sameMembers(mod.scope.children[0].getAll({ native: false }).map((v) => v.name), ["a"]);
    //                 assert.equal(mod.scope.children[0].get("a").value, 8);
    //             });
    //         }
    //     });
    });

    // describe("dependencies", () => {
    //     it("single with require()", async () => {
    //         const mod = await createModule(getModulePath("b.js"), {
    //             sandbox,
    //             load: true
    //         });

    //         assert.sameMembers([...mod.dependencies.keys()], [getModulePath("a.js")]);
    //     });

    //     it("multiple with require()", async () => {
    //         const mod = await createModule(getModulePath("c"), {
    //             sandbox,
    //             load: true
    //         });

    //         assert.sameMembers([...mod.dependencies.keys()], [getModulePath("a.js"), getModulePath("b.js")]);
    //     });

    //     it("multiple with require() recursively", async () => {
    //         const mod = await createModule(getModulePath("d"), {
    //             sandbox,
    //             load: true
    //         });

    //         assert.sameMembers([...mod.dependencies.keys()], [getModulePath("a.js"), getModulePath("b.js"), getModulePath("c", "index.js")]);
    //     });

    //     it("single with 'import'", async () => {
    //         const mod = await createModule(getModulePath("e"), {
    //             sandbox,
    //             load: true
    //         });

    //         assert.sameMembers([...mod.dependencies.keys()], [getModulePath("a.js")]);
    //     });

    //     it("multiple with 'import'", async () => {
    //         const mod = await createModule(getModulePath("f"), {
    //             sandbox,
    //             load: true
    //         });

    //         assert.sameMembers([...mod.dependencies.keys()], [getModulePath("a.js"), getModulePath("b.js"), getModulePath("c", "index.js")]);
    //     });

    //     it("adone.lazify", async () => {
    //         const mod = await createModule(getModulePath("g"), {
    //             sandbox,
    //             load: true
    //         });

    //         assert.sameMembers([...mod.dependencies.keys()], [getModulePath("a.js"), getModulePath("b.js"), getModulePath("d.js")]);
    //     });

    //     it("const __ = adone.lazify", async () => {
    //         const mod = await createModule(getModulePath("h"), {
    //             sandbox,
    //             load: true
    //         });

    //         assert.sameMembers([...mod.dependencies.keys()], [getModulePath("a.js"), getModulePath("b.js"), getModulePath("c", "index.js"), getModulePath("d.js")]);
    //     });

    //     it("many lazifiers", async () => {
    //         const mod = await createModule(getModulePath("i"), {
    //             sandbox,
    //             load: true
    //         });

    //         // console.log(adone.inspect(mod.ast.program, { depth: 6 }));

    //         assert.sameMembers([...mod.dependencies.keys()], [getModulePath("a.js"), getModulePath("b.js"), getModulePath("c", "index.js"), getModulePath("d.js"), getModulePath("e.js"), getModulePath("f.js"), getModulePath("g.js")]);
    //     });

    //     it("should ignore special modules", async () => {
    //         const mod = await createModule(getModulePath("specials"), {
    //             sandbox,
    //             load: true
    //         });

    //         assert.sameMembers([...mod.dependencies.keys()], [getModulePath("c", "index.js")]);
    //     });

    //     describe("adone/cli module", () => {
    //         it.todo("should correctly process 'require(\"..\")'", async () => {
    //             const mod = await createModule(path.join(adone.SRC_PATH, "app", "adone.js"), {
    //                 sandbox,
    //                 load: { virtualPath: adone.BIN_PATH }
    //             });
    //             // console.log([...mod.dependencies.keys()]);
    //         });
    //     });
    // });
});
