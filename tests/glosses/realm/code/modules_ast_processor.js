const {
    realm: { code }
} = adone;

export const tests = [
    {
        realName: "_.js",
        fileName: "_",
        testName: "defaults",
        check(mod, modulePath) {
            assert.equal(mod.filename, modulePath);
            assert.isUndefined(mod.ast);
            assert.isUndefined(mod.content);
            assert.lengthOf(mod.dependencies, 0);
        }
    },
    {
        realName: "empty.js",
        testName: "should allow load empty files",
        load: true,
        check(mod) {
            assert.equal(mod.content, "");
            assert.equal(mod.ast.program.sourceType, "module");
            assert.lengthOf(mod.ast.program.body, 0);
        }
    },
    {
        realName: "empty.js",
        testName: "proper initialization of module scope",
        load: true,
        check(mod) {
            assert.strictEqual(mod.scope.module, mod);
            assert.lengthOf(mod.scope.children, 0);
            const vars = mod.scope.getAll({ declared: false });
            assert.sameMembers(vars.map((v) => v.name), ["__dirname", "__filename", "exports", "module", "require"]);
            vars.forEach((v) => {
                assert.isTrue(v.isNative);
            });

            assert.equal(mod.scope.get("__dirname").value, mod.dirname);
            assert.equal(mod.scope.get("__filename").value, mod.filename);
            assert.strictEqual(mod.scope.get("module").value, mod);
        }
    },
    {
        realName: "a.js",
        content: `
const str = "adone";
const num = 1;
const isUnix = true;
const re = /^a/;
const _null = null;
        `,
        load: true,
        testName: "separated primitive variable declarators",
        check(mod) {
            const vars = mod.scope.getAll({ native: false });
            assert.sameMembers(vars.map((v) => v.name), ["str", "num", "isUnix", "re", "_null"]);
            vars.forEach((v) => {
                assert.isFalse(v.isNative);
            });
            assert.instanceOf(mod.scope.get("str").value, code.StringLiteral);
            assert.instanceOf(mod.scope.get("num").value, code.NumericLiteral);
            assert.instanceOf(mod.scope.get("isUnix").value, code.BooleanLiteral);
            assert.instanceOf(mod.scope.get("re").value, code.RegExpLiteral);
            assert.instanceOf(mod.scope.get("_null").value, code.NullLiteral);
        }
    },
    {
        realName: "aa.js",
        load: true,
        content: `
const
    str = "adone",
    num = 1,
    isUnix = true,
    re = /^a/,
    _null = null,
    str1 = \`result: \${str}\``,
        testName: "single primitive variable declarators",
        check(mod) {
            const vars = mod.scope.getAll({ native: false });
            assert.sameMembers(vars.map((v) => v.name), ["str", "num", "isUnix", "re", "_null", "str1"]);
            vars.forEach((v) => {
                assert.isFalse(v.isNative);
            });
            assert.instanceOf(mod.scope.get("str").value, code.StringLiteral);
            assert.instanceOf(mod.scope.get("num").value, code.NumericLiteral);
            assert.instanceOf(mod.scope.get("isUnix").value, code.BooleanLiteral);
            assert.instanceOf(mod.scope.get("re").value, code.RegExpLiteral);
            assert.instanceOf(mod.scope.get("_null").value, code.NullLiteral);
            assert.instanceOf(mod.scope.get("str1").value, code.TemplateLiteral);
        }
    },
    {
        realName: "a.js",
        load: true,
        content: `
const str = "adone";
const num = 1;
const isUnix = true;
const re = /^a/;
const _null = null;`,
        testName: "get all vars",
        check(mod) {
            const vars = mod.scope.getAll();
            assert.sameMembers(vars.map((v) => v.name), ["__dirname", "__filename", "exports", "module", "require", "str", "num", "isUnix", "re", "_null"]);
        }
    },
    {
        realName: "aaa.js",
        load: true,
        testName: "common expressions",
        content: `
const
    fs = adone.fs,
    obj = {},
    arr1 = [],
    arr2 = new Array();
const obj2 = Object.create(null);
const ok = do {
    "ok"
};
const t = \`result: \${ok}\`;
const
    namedNoop = function noop () {},
    noopFn = function () {},
    noop = () => {};`,
        check(mod) {
            const vars = mod.scope.getAll({ native: false });
            const ids = ["fs", "obj", "arr1", "arr2", "obj2", "ok", "namedNoop", "noopFn", "noop", "t"];
            assert.sameMembers(vars.map((v) => v.name), ids);

            assert.instanceOf(mod.scope.get("fs").value, code.MemberExpression);
            assert.instanceOf(mod.scope.get("obj").value, code.ObjectExpression);
            assert.instanceOf(mod.scope.get("arr1").value, code.ArrayExpression);
            assert.instanceOf(mod.scope.get("arr2").value, code.NewExpression);
            assert.instanceOf(mod.scope.get("obj2").value, code.CallExpression);
            assert.instanceOf(mod.scope.get("namedNoop").value, code.FunctionExpression);
            assert.instanceOf(mod.scope.get("noopFn").value, code.FunctionExpression);
            assert.instanceOf(mod.scope.get("noop").value, code.ArrowFunctionExpression);
        }
    }
];
