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
    },
    {
        realName: "scopes.js",
        load: true,
        testName: "nested scope - one level",
        content: [`
const a = "adone";

function fn() {
    const a = 8;
    return a;
}`, `
const a = "adone";

const fn = function fn_() {
    const a = 8;
    return a;
}`, `
const a = "adone";

const fn = function () {
    const a = 8;
    return a;
}`, `
const a = "adone";

const fn = () => {
    const a = 8;
    return a;
}`],
        check(mod, filePath, index) {
            assert.sameMembers(mod.scope.getAll({ native: false }).map((v) => v.name), ["a", "fn"]);
            if (index === 0) {
                assert.instanceOf(mod.scope.get("fn").node, code.FunctionDeclaration);
            } else {
                assert.instanceOf(mod.scope.get("fn").node, code.VariableDeclarator);
            }
            assert.instanceOf(mod.scope.get("a").node, code.VariableDeclarator);
            assert.equal(mod.scope.get("a").rawValue, "adone");
            assert.instanceOf(mod.scope.get("a").value, code.StringLiteral);
            assert.lengthOf(mod.scope.children, 1);
            assert.instanceOf(mod.scope.children[0], code.FunctionScope);
            assert.sameMembers(mod.scope.children[0].getAll({ native: false }).map((v) => v.name), ["a"]);
            assert.equal(mod.scope.children[0].get("a").rawValue, 8);
            assert.instanceOf(mod.scope.children[0].get("a").value, code.NumericLiteral);
        }
    },
    {
        realName: "scopes2.js",
        load: true,
        testName: "nested scopes - two levels",
        content: [`
const a = "adone";

function fn() {
    const handler = (b) => {
        let a = true;
        return typeof b === undefined
            ? a
            : b;
    }
    const a = 8;
    return handler(a);
}`, `
const a = "adone";

function fn() {
    function handler (b) {
        let a = true;
        return typeof b === undefined
            ? a
            : b;
    }
    const a = 8;
    return handler(a);
}`, `
const a = "adone";

function fn() {
    const handler = function (b) {
        let a = true;
        return typeof b === undefined
            ? a
            : b;
    }
    const a = 8;
    return handler(a);
}`, `
const a = "adone";

function fn() {
    const handler = function ({ b }) {
        let a = true;
        return typeof b === undefined
            ? a
            : b;
    }
    const a = 8;
    return handler(a);
}`],
        check(mod, filePath, index) {
            assert.sameMembers(mod.scope.getAll({ native: false }).map((v) => v.name), ["a", "fn"]);
            if (index === 0) {
                assert.instanceOf(mod.scope.get("fn").node, code.FunctionDeclaration);
            }
            
            assert.instanceOf(mod.scope.get("a").node, code.VariableDeclarator);
            assert.equal(mod.scope.get("a").rawValue, "adone");
            assert.instanceOf(mod.scope.get("a").value, code.StringLiteral);
            assert.lengthOf(mod.scope.children, 1);
            const nestedScope1 = mod.scope.children[0];
            assert.instanceOf(nestedScope1, code.FunctionScope);
            assert.sameMembers(nestedScope1.getAll({ native: false }).map((v) => v.name), ["a", "handler"]);
            assert.equal(nestedScope1.get("a").rawValue, 8);
            assert.instanceOf(nestedScope1.get("a").value, code.NumericLiteral);
            assert.equal(nestedScope1.get("handler").rawValue, undefined);
            if (index === 0) {
                assert.instanceOf(nestedScope1.get("handler").node, code.VariableDeclarator);
            } else if (index === 1) {
                assert.instanceOf(nestedScope1.get("handler").node, code.FunctionDeclaration);
            }

            assert.lengthOf(nestedScope1.children, 1);
            const nestedScope2 = nestedScope1.children[0];
            assert.instanceOf(nestedScope2, code.FunctionScope);
            assert.sameMembers(nestedScope2.getAll({ native: false }).map((v) => v.name), ["a", "b"]);
            assert.equal(nestedScope2.get("a").rawValue, true);
            assert.instanceOf(nestedScope2.get("a").value, code.BooleanLiteral);
            assert.equal(nestedScope2.get("b").rawValue, undefined);
            assert.instanceOf(nestedScope2.get("b").node, code.Identifier);
            if (index === 0) {
                assert.isTrue(nestedScope2.get("b").isArg);
            }
        }
    }
];
