const {
    js: { compiler: { traverse, parse } }
} = adone;

const getPath = function (code, options = { sourceType: "script" }) {
    const ast = parse(code, options);
    let path;
    traverse(ast, {
        Program(_path) {
            path = _path;
            _path.stop();
        }
    });
    return path;
};

describe("js", "compiler", "traverse", "path/introspection", () => {
    describe("isInStrictMode", () => {
        describe("classes", () => {
            it("returns parent's strictness for class", () => {
                let program = getPath("class Test extends Super {}");
                let klass = program.get("body.0");
                expect(klass.isInStrictMode()).to.false();

                program = getPath("\"use strict\"; class Test extends Super {}");
                klass = program.get("body.0");
                expect(klass.isInStrictMode()).to.true();
            });

            it("returns true for class id", () => {
                const program = getPath("class Test extends Super {}");
                const id = program.get("body.0.id");
                expect(id.isInStrictMode()).to.true();
            });

            it("returns true for superClass", () => {
                const program = getPath("class Test extends Super {}");
                const superClass = program.get("body.0.superClass");
                expect(superClass.isInStrictMode()).to.true();
            });

            it("returns true for method", () => {
                const program = getPath("class Test { test() {} }");
                const method = program.get("body.0.body.body.0");
                expect(method.isInStrictMode()).to.true();
            });
        });

        describe("program", () => {
            describe("when script", () => {
                it("returns true when strict", () => {
                    let program = getPath("test;");
                    expect(program.isInStrictMode()).to.false();

                    program = getPath("\"use strict\";");
                    expect(program.isInStrictMode()).to.true();
                });
            });

            describe("when module", () => {
                it("returns true", () => {
                    const program = getPath("test;", { sourceType: "module" });
                    expect(program.isInStrictMode()).to.true();
                });
            });
        });

        describe("function", () => {
            it("returns parent's strictness for function", () => {
                let program = getPath("function test() {}");
                let fn = program.get("body.0");
                expect(fn.isInStrictMode()).to.false();

                program = getPath("function test() {\"use strict\";}");
                fn = program.get("body.0");
                expect(fn.isInStrictMode()).to.false();

                program = getPath("\"use strict\"; function test() {}");
                fn = program.get("body.0");
                expect(fn.isInStrictMode()).to.true();
            });

            it("returns function's strictness for id", () => {
                let program = getPath("function test(a) {}");
                let id = program.get("body.0.id");
                expect(id.isInStrictMode()).to.false();

                program = getPath("function test(a) {\"use strict\";}");
                id = program.get("body.0.id");
                expect(id.isInStrictMode()).to.true();
            });

            it("returns function's strictness for parameters", () => {
                let program = getPath("function test(a) {}");
                let param = program.get("body.0.params.0");
                expect(param.isInStrictMode()).to.false();

                program = getPath("function test(a) {\"use strict\";}");
                param = program.get("body.0.params.0");
                expect(param.isInStrictMode()).to.true();
            });
        });
    });
});
