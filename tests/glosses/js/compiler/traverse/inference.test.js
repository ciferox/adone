const { types, parse, traverse } = adone.js.compiler;

const getPath = (code) => {
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
            const path = getPath("var x = null; x === null").get("body")[1].get("expression");
            const left = path.get("left");
            const right = path.get("right");
            const strictMatch = left.baseTypeStrictlyMatches(right);

            assert.ok(strictMatch, "null should be equal to null");
        });

        it("it should work with numbers", () => {
            const path = getPath("var x = 1; x === 2").get("body")[1].get("expression");
            const left = path.get("left");
            const right = path.get("right");
            const strictMatch = left.baseTypeStrictlyMatches(right);

            assert.ok(strictMatch, "number should be equal to number");
        });

        it("it should bail when type changes", () => {
            const path = getPath("var x = 1; if (foo) x = null;else x = 3; x === 2").get("body")[2].get("expression");
            const left = path.get("left");
            const right = path.get("right");

            const strictMatch = left.baseTypeStrictlyMatches(right);

            assert.ok(!strictMatch, "type might change in if statement");
        });

        it("it should differentiate between null and undefined", () => {
            const path = getPath("var x; x === null").get("body")[1].get("expression");
            const left = path.get("left");
            const right = path.get("right");
            const strictMatch = left.baseTypeStrictlyMatches(right);

            assert.ok(!strictMatch, "null should not match undefined");
        });
    });
    describe("getTypeAnnotation", () => {
        it("should infer from type cast", () => {
            const path = getPath("(x: number)").get("body")[0].get("expression");
            assert.ok(types.isNumberTypeAnnotation(path.getTypeAnnotation()), "should be number");

        });
        it("should infer string from template literal", () => {
            const path = getPath("`hey`").get("body")[0].get("expression");
            assert.ok(types.isStringTypeAnnotation(path.getTypeAnnotation()), "should be string");
        });
        it("should infer number from +x", () => {
            const path = getPath("+x").get("body")[0].get("expression");
            assert.ok(types.isNumberTypeAnnotation(path.getTypeAnnotation()), "should be number");
        });
        it("should infer T from new T", () => {
            const path = getPath("new T").get("body")[0].get("expression");
            const type = path.getTypeAnnotation();
            assert.ok(types.isGenericTypeAnnotation(type) && type.id.name === "T", "should be T");
        });
        it("should infer number from ++x", () => {
            const path = getPath("++x").get("body")[0].get("expression");
            assert.ok(types.isNumberTypeAnnotation(path.getTypeAnnotation()), "should be number");
        });
        it("should infer number from --x", () => {
            const path = getPath("--x").get("body")[0].get("expression");
            assert.ok(types.isNumberTypeAnnotation(path.getTypeAnnotation()), "should be number");
        });
        it("should infer void from void x", () => {
            const path = getPath("void x").get("body")[0].get("expression");
            assert.ok(types.isVoidTypeAnnotation(path.getTypeAnnotation()), "should be void");
        });
        it("should infer string from typeof x", () => {
            const path = getPath("typeof x").get("body")[0].get("expression");
            assert.ok(types.isStringTypeAnnotation(path.getTypeAnnotation()), "should be string");
        });
        it("should infer boolean from !x", () => {
            const path = getPath("!x").get("body")[0].get("expression");
            assert.ok(types.isBooleanTypeAnnotation(path.getTypeAnnotation()), "should be boolean");
        });
        it("should infer type of sequence expression", () => {
            const path = getPath("a,1").get("body")[0].get("expression");
            assert.ok(types.isNumberTypeAnnotation(path.getTypeAnnotation()), "should be number");
        });
        it("should infer type of logical expression", () => {
            const path = getPath("'a' && 1").get("body")[0].get("expression");
            const type = path.getTypeAnnotation();
            assert.ok(types.isUnionTypeAnnotation(type), "should be a union");
            assert.ok(types.isStringTypeAnnotation(type.types[0]), "first type in union should be string");
            assert.ok(types.isNumberTypeAnnotation(type.types[1]), "second type in union should be number");
        });
        it("should infer type of conditional expression", () => {
            const path = getPath("q ? true : 0").get("body")[0].get("expression");
            const type = path.getTypeAnnotation();
            assert.ok(types.isUnionTypeAnnotation(type), "should be a union");
            assert.ok(types.isBooleanTypeAnnotation(type.types[0]), "first type in union should be boolean");
            assert.ok(types.isNumberTypeAnnotation(type.types[1]), "second type in union should be number");
        });
        it("should infer RegExp from RegExp literal", () => {
            const path = getPath("/.+/").get("body")[0].get("expression");
            const type = path.getTypeAnnotation();
            assert.ok(types.isGenericTypeAnnotation(type) && type.id.name === "RegExp", "should be RegExp");
        });
        it("should infer Object from object expression", () => {
            const path = getPath("({ a: 5 })").get("body")[0].get("expression");
            const type = path.getTypeAnnotation();
            assert.ok(types.isGenericTypeAnnotation(type) && type.id.name === "Object", "should be Object");
        });
        it("should infer Array from array expression", () => {
            const path = getPath("[ 5 ]").get("body")[0].get("expression");
            const type = path.getTypeAnnotation();
            assert.ok(types.isGenericTypeAnnotation(type) && type.id.name === "Array", "should be Array");
        });
        it("should infer Function from function", () => {
            const path = getPath("(function (): string {})").get("body")[0].get("expression");
            const type = path.getTypeAnnotation();
            assert.ok(types.isGenericTypeAnnotation(type) && type.id.name === "Function", "should be Function");
        });
        it("should infer call return type using function", () => {
            const path = getPath("(function (): string {})()").get("body")[0].get("expression");
            const type = path.getTypeAnnotation();
            assert.ok(types.isStringTypeAnnotation(type), "should be string");
        });
        it("should infer call return type using async function", () => {
            const path = getPath("(async function (): string {})()").get("body")[0].get("expression");
            const type = path.getTypeAnnotation();
            assert.ok(types.isGenericTypeAnnotation(type) && type.id.name === "Promise", "should be Promise");
        });
        it("should infer call return type using async generator function", () => {
            const path = getPath("(async function * (): string {})()").get("body")[0].get("expression");
            const type = path.getTypeAnnotation();
            assert.ok(types.isGenericTypeAnnotation(type) && type.id.name === "AsyncIterator", "should be AsyncIterator");
        });
        it("should infer number from x/y", () => {
            const path = getPath("x/y").get("body")[0].get("expression");
            const type = path.getTypeAnnotation();
            assert.ok(types.isNumberTypeAnnotation(type), "should be number");
        });
        it("should infer boolean from x instanceof y", () => {
            const path = getPath("x instanceof y").get("body")[0].get("expression");
            const type = path.getTypeAnnotation();
            assert.ok(types.isBooleanTypeAnnotation(type), "should be boolean");
        });
        it("should infer number from 1 + 2", () => {
            const path = getPath("1 + 2").get("body")[0].get("expression");
            const type = path.getTypeAnnotation();
            assert.ok(types.isNumberTypeAnnotation(type), "should be number");
        });
        it("should infer string|number from x + y", () => {
            const path = getPath("x + y").get("body")[0].get("expression");
            const type = path.getTypeAnnotation();
            assert.ok(types.isUnionTypeAnnotation(type), "should be a union");
            assert.ok(types.isStringTypeAnnotation(type.types[0]), "first type in union should be string");
            assert.ok(types.isNumberTypeAnnotation(type.types[1]), "second type in union should be number");
        });
        it("should infer type of tagged template literal", () => {
            const path = getPath("(function (): RegExp {}) `hey`").get("body")[0].get("expression");
            const type = path.getTypeAnnotation();
            assert.ok(types.isGenericTypeAnnotation(type) && type.id.name === "RegExp", "should be RegExp");
        });
    });
});
