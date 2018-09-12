const {
    js: { compiler: { types: t, parse, traverse } }
} = adone;

const getPath = function (code) {
    const ast = parse(code, { plugins: ["flow", "asyncGenerators"] });
    let path;
    traverse(ast, {
        Program(_path) {
            path = _path;
            _path.stop();
        }
    });
    return path;
};

describe("js", "compiler", "traverse", "inference", () => {
    describe("baseTypeStrictlyMatches", () => {
        it("it should work with null", () => {
            const path = getPath("var x = null; x === null")
                .get("body")[1]
                .get("expression");
            const left = path.get("left");
            const right = path.get("right");
            const strictMatch = left.baseTypeStrictlyMatches(right);

            expect(strictMatch).to.exist();
        });

        it("it should work with numbers", () => {
            const path = getPath("var x = 1; x === 2")
                .get("body")[1]
                .get("expression");
            const left = path.get("left");
            const right = path.get("right");
            const strictMatch = left.baseTypeStrictlyMatches(right);

            expect(strictMatch).to.exist();
        });

        it("it should bail when type changes", () => {
            const path = getPath("var x = 1; if (foo) x = null;else x = 3; x === 2")
                .get("body")[2]
                .get("expression");
            const left = path.get("left");
            const right = path.get("right");

            const strictMatch = left.baseTypeStrictlyMatches(right);

            expect(strictMatch).to.not.exist();
        });

        it("it should differentiate between null and undefined", () => {
            const path = getPath("var x; x === null")
                .get("body")[1]
                .get("expression");
            const left = path.get("left");
            const right = path.get("right");
            const strictMatch = left.baseTypeStrictlyMatches(right);

            expect(strictMatch).to.false();
        });
    });
    describe("getTypeAnnotation", () => {
        it("should infer from type cast", () => {
            const path = getPath("(x: number)")
                .get("body")[0]
                .get("expression");
            expect(t.isNumberTypeAnnotation(path.getTypeAnnotation())).to.exist();
        });
        it("should infer string from template literal", () => {
            const path = getPath("`hey`")
                .get("body")[0]
                .get("expression");
            expect(t.isStringTypeAnnotation(path.getTypeAnnotation())).to.exist();
        });
        it("should infer number from +x", () => {
            const path = getPath("+x")
                .get("body")[0]
                .get("expression");
            expect(t.isNumberTypeAnnotation(path.getTypeAnnotation())).to.exist();
        });
        it("should infer T from new T", () => {
            const path = getPath("new T")
                .get("body")[0]
                .get("expression");
            const type = path.getTypeAnnotation();
            expect(
                t.isGenericTypeAnnotation(type) && type.id.name === "T",
            ).to.exist();
        });
        it("should infer number from ++x", () => {
            const path = getPath("++x")
                .get("body")[0]
                .get("expression");
            expect(t.isNumberTypeAnnotation(path.getTypeAnnotation())).to.exist();
        });
        it("should infer number from --x", () => {
            const path = getPath("--x")
                .get("body")[0]
                .get("expression");
            expect(t.isNumberTypeAnnotation(path.getTypeAnnotation())).to.exist();
        });
        it("should infer void from void x", () => {
            const path = getPath("void x")
                .get("body")[0]
                .get("expression");
            expect(t.isVoidTypeAnnotation(path.getTypeAnnotation())).to.exist();
        });
        it("should infer string from typeof x", () => {
            const path = getPath("typeof x")
                .get("body")[0]
                .get("expression");
            expect(t.isStringTypeAnnotation(path.getTypeAnnotation())).to.exist();
        });
        it("should infer boolean from !x", () => {
            const path = getPath("!x")
                .get("body")[0]
                .get("expression");
            expect(t.isBooleanTypeAnnotation(path.getTypeAnnotation())).to.exist();
        });
        it("should infer type of sequence expression", () => {
            const path = getPath("a,1")
                .get("body")[0]
                .get("expression");
            expect(t.isNumberTypeAnnotation(path.getTypeAnnotation())).to.exist();
        });
        it("should infer type of logical expression", () => {
            const path = getPath("'a' && 1")
                .get("body")[0]
                .get("expression");
            const type = path.getTypeAnnotation();
            expect(t.isUnionTypeAnnotation(type)).to.exist();
            expect(t.isStringTypeAnnotation(type.types[0])).to.exist();
            expect(t.isNumberTypeAnnotation(type.types[1])).to.exist();
        });
        it("should infer type of conditional expression", () => {
            const path = getPath("q ? true : 0")
                .get("body")[0]
                .get("expression");
            const type = path.getTypeAnnotation();
            expect(t.isUnionTypeAnnotation(type)).to.exist();
            expect(t.isBooleanTypeAnnotation(type.types[0])).to.exist();
            expect(t.isNumberTypeAnnotation(type.types[1])).to.exist();
        });
        it("should infer RegExp from RegExp literal", () => {
            const path = getPath("/.+/")
                .get("body")[0]
                .get("expression");
            const type = path.getTypeAnnotation();
            expect(
                t.isGenericTypeAnnotation(type) && type.id.name === "RegExp",
            ).to.exist();
        });
        it("should infer Object from object expression", () => {
            const path = getPath("({ a: 5 })")
                .get("body")[0]
                .get("expression");
            const type = path.getTypeAnnotation();
            expect(
                t.isGenericTypeAnnotation(type) && type.id.name === "Object",
            ).to.exist();
        });
        it("should infer Array from array expression", () => {
            const path = getPath("[ 5 ]")
                .get("body")[0]
                .get("expression");
            const type = path.getTypeAnnotation();
            expect(
                t.isGenericTypeAnnotation(type) && type.id.name === "Array",
            ).to.exist();
        });
        it("should infer Function from function", () => {
            const path = getPath("(function (): string {})")
                .get("body")[0]
                .get("expression");
            const type = path.getTypeAnnotation();
            expect(
                t.isGenericTypeAnnotation(type) && type.id.name === "Function",
            ).to.exist();
        });
        it("should infer call return type using function", () => {
            const path = getPath("(function (): string {})()")
                .get("body")[0]
                .get("expression");
            const type = path.getTypeAnnotation();
            expect(t.isStringTypeAnnotation(type)).to.exist();
        });
        it("should infer call return type using async function", () => {
            const path = getPath("(async function (): string {})()")
                .get("body")[0]
                .get("expression");
            const type = path.getTypeAnnotation();
            expect(
                t.isGenericTypeAnnotation(type) && type.id.name === "Promise",
            ).to.exist();
        });
        it("should infer call return type using async generator function", () => {
            const path = getPath("(async function * (): string {})()")
                .get("body")[0]
                .get("expression");
            const type = path.getTypeAnnotation();
            expect(
                t.isGenericTypeAnnotation(type) && type.id.name === "AsyncIterator",
            ).to.exist();
        });
        it("should infer number from x/y", () => {
            const path = getPath("x/y")
                .get("body")[0]
                .get("expression");
            const type = path.getTypeAnnotation();
            expect(t.isNumberTypeAnnotation(type)).to.exist();
        });
        it("should infer boolean from x instanceof y", () => {
            const path = getPath("x instanceof y")
                .get("body")[0]
                .get("expression");
            const type = path.getTypeAnnotation();
            expect(t.isBooleanTypeAnnotation(type)).to.exist();
        });
        it("should infer number from 1 + 2", () => {
            const path = getPath("1 + 2")
                .get("body")[0]
                .get("expression");
            const type = path.getTypeAnnotation();
            expect(t.isNumberTypeAnnotation(type)).to.exist();
        });
        it("should infer string|number from x + y", () => {
            const path = getPath("x + y")
                .get("body")[0]
                .get("expression");
            const type = path.getTypeAnnotation();
            expect(t.isUnionTypeAnnotation(type)).to.exist();
            expect(t.isStringTypeAnnotation(type.types[0])).to.exist();
            expect(t.isNumberTypeAnnotation(type.types[1])).to.exist();
        });
        it("should infer type of tagged template literal", () => {
            const path = getPath("(function (): RegExp {}) `hey`")
                .get("body")[0]
                .get("expression");
            const type = path.getTypeAnnotation();
            expect(
                t.isGenericTypeAnnotation(type) && type.id.name === "RegExp",
            ).to.exist();
        });
        it("should infer constant identifier", () => {
            const path = getPath("const x = 0; x").get("body.1.expression");
            const type = path.getTypeAnnotation();
            expect(t.isNumberTypeAnnotation(type)).to.exist();
        });
        it("should infer indirect constant identifier", () => {
            const path = getPath("const x = 0; const y = x; y").get(
                "body.2.expression",
            );
            const type = path.getTypeAnnotation();
            expect(t.isNumberTypeAnnotation(type)).to.exist();
        });
        it("should infer identifier type from if statement (===)", () => {
            const path = getPath(
                `function test(x) {
        if (x === true) x;
      }`,
            ).get("body.0.body.body.0.consequent.expression");
            const type = path.getTypeAnnotation();
            expect(t.isBooleanTypeAnnotation(type)).to.exist();
        });
        it("should infer identifier type from if statement (typeof)", () => {
            let path = getPath(
                `function test(x) {
        if (typeof x == 'string') x;
      }`,
            ).get("body.0.body.body.0.consequent.expression");
            let type = path.getTypeAnnotation();
            expect(t.isStringTypeAnnotation(type)).to.exist();
            path = getPath(
                `function test(x) {
        if (typeof x === 'number') x;
      }`,
            ).get("body.0.body.body.0.consequent.expression");
            type = path.getTypeAnnotation();
            expect(t.isNumberTypeAnnotation(type)).to.exist();
        });
        it("should infer identifier type from if statement (&&)", () => {
            let path = getPath(
                `function test(x) {
        if (typeof x == 'string' && x === 3) x;
      }`,
            ).get("body.0.body.body.0.consequent.expression");
            let type = path.getTypeAnnotation();
            expect(t.isUnionTypeAnnotation(type)).to.exist();
            expect(t.isStringTypeAnnotation(type.types[0])).to.exist();
            expect(t.isNumberTypeAnnotation(type.types[1])).to.exist();
            path = getPath(
                `function test(x) {
        if (true && x === 3) x;
      }`,
            ).get("body.0.body.body.0.consequent.expression");
            type = path.getTypeAnnotation();
            expect(t.isNumberTypeAnnotation(type)).to.exist();
            path = getPath(
                `function test(x) {
        if (x === 'test' && true) x;
      }`,
            ).get("body.0.body.body.0.consequent.expression");
            type = path.getTypeAnnotation();
            expect(t.isStringTypeAnnotation(type)).to.exist();
        });
        it("should infer identifier type from if statement (||)", () => {
            const path = getPath(
                `function test(x) {
        if (typeof x == 'string' || x === 3) x;
      }`,
            ).get("body.0.body.body.0.consequent.expression");
            const type = path.getTypeAnnotation();
            expect(t.isAnyTypeAnnotation(type)).to.exist();
        });
        it("should not infer identifier type from incorrect binding", () => {
            const path = getPath(
                `function outer(x) {
        if (x === 3) {
          function inner(x) {
            x;
          }
        }
      }`,
            ).get("body.0.body.body.0.consequent.body.0.body.body.0.expression");
            const type = path.getTypeAnnotation();
            expect(t.isAnyTypeAnnotation(type)).to.exist();
        });
    });
});
