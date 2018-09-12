import { multiple as getFixtures } from "../helper_fixtures";

const {
    is,
    js: { compiler: { parse, parseExpression } },
    std: { fs, path }
} = adone;

const save = function (test, ast) {
    // Ensure that RegExp are serialized as strings
    const toJSON = RegExp.prototype.toJSON;
    RegExp.prototype.toJSON = RegExp.prototype.toString;
    require("fs").writeFileSync(test.expect.loc, JSON.stringify(ast, null, "  "));
    RegExp.prototype.toJSON = toJSON;
};

const ppJSON = function (v) {
    v = v instanceof RegExp ? v.toString() : v;
    return JSON.stringify(v, null, 2);
};

const addPath = function (str, pt) {
    if (str.charAt(str.length - 1) == ")") {
        return `${str.slice(0, str.length - 1)}/${pt})`;
    }
    return `${str} (${pt})`;

};


const misMatch = function (exp, act) {
    if (exp instanceof RegExp || act instanceof RegExp) {
        const left = ppJSON(exp);
        const right = ppJSON(act);
        if (left !== right) {
            return `${left} !== ${right}`;
        }
    } else if (is.array(exp)) {
        if (!is.array(act)) {
            return `${ppJSON(exp)} != ${ppJSON(act)}`;
        }
        if (act.length !== exp.length) {
            return `array length mismatch ${exp.length} != ${act.length}`;
        }
        for (let i = 0; i < act.length; ++i) {
            const mis = misMatch(exp[i], act[i]);
            if (mis) {
                return addPath(mis, i);
            }
        }
    } else if (!exp || !act || typeof exp !== "object" || typeof act !== "object") {
        if (exp !== act && !is.function(exp)) {
            return `${ppJSON(exp)} !== ${ppJSON(act)}`;
        }
    } else {
        for (const prop in exp) {
            const mis = misMatch(exp[prop], act[prop]);
            if (mis) {
                return addPath(mis, prop);
            }
        }

        for (const prop in act) {
            if (is.function(act[prop])) {
                continue;
            }

            if (!(prop in exp) && !is.undefined(act[prop])) {
                return `Did not expect a property '${prop}'`;
            }
        }
    }
};


const runTest = function (test, parseFunction) {
    const opts = test.options;

    if (opts.throws && test.expect.code) {
        throw new Error(
            "File expected.json exists although options specify throws. Remove expected.json.",
        );
    }

    let ast;
    try {
        ast = parseFunction(test.actual.code, opts);
    } catch (err) {
        if (opts.throws) {
            if (err.message === opts.throws) {
                return;
            }
            err.message = `Expected error message: ${opts.throws}. Got error message: ${err.message}`;
            throw err;

        }

        throw err;
    }

    if (ast.comments && !ast.comments.length) {
        delete ast.comments;
    }

    if (!test.expect.code && !opts.throws && !process.env.CI) {
        test.expect.loc += "on";
        return save(test, ast);
    }

    if (opts.throws) {
        throw new Error(
            `Expected error message: ${opts.throws}. But parsing succeeded.`,
        );
    } else {
        const mis = misMatch(JSON.parse(test.expect.code), ast);

        if (mis) {
            throw new Error(mis);
        }
    }
};

const runFixtureTests = function (fixturesPath, parseFunction) {
    const fixtures = getFixtures(fixturesPath);

    Object.keys(fixtures).forEach((name) => {
        fixtures[name].forEach((testSuite) => {
            testSuite.tests.forEach((task) => {
                const testFn = task.disabled ? it.skip : it;

                testFn(`${name}/${testSuite.title}/${task.title}`, () => {
                    try {
                        runTest(task, parseFunction);
                    } catch (err) {
                        if (!task.expect.code && !process.env.CI) {
                            const fn = `${path.dirname(task.expect.loc)}/options.json`;
                            if (!fs.existsSync(fn)) {
                                task.options = task.options || {};
                                task.options.throws = err.message.replace(
                                    /^.*Got error message: /,
                                    "",
                                );
                                fs.writeFileSync(fn, JSON.stringify(task.options, null, "  "));
                            }
                        }

                        err.message = `${name}/${task.actual.filename}: ${err.message}`;
                        throw err;
                    }
                });
            });
        });
    });
};

const runThrowTestsWithEstree = function (fixturesPath, parseFunction) {
    const fixtures = getFixtures(fixturesPath);

    Object.keys(fixtures).forEach((name) => {
        fixtures[name].forEach((testSuite) => {
            testSuite.tests.forEach((task) => {
                if (!task.options.throws) {
                    return;
                }

                task.options.plugins = task.options.plugins || [];
                task.options.plugins.push("estree");

                const testFn = task.disabled ? it.skip : it;

                testFn(`${name}/${testSuite.title}/${task.title}`, () => {
                    try {
                        runTest(task, parseFunction);
                    } catch (err) {
                        err.message =
                            `${name}/${task.actual.filename}: ${err.message}`;
                        throw err;
                    }
                });
            });
        });
    });
};

runFixtureTests(path.join(__dirname, "fixtures"), parse);
runThrowTestsWithEstree(path.join(__dirname, "fixtures"), parse);
runFixtureTests(path.join(__dirname, "expressions"), parseExpression);

// const getParser = function (code, plugins) {
//     return () => parse(code, { plugins, sourceType: "module" });
// };

// describe("js", "compiler", "parser", "plugin options", () => {
//     describe("the first options are used", () => {
//         // NOTE: This test is not specific about decorators, it can be applied
//         // to any plugin with options.

//         it.only("when they aren't specified", () => {
//             const WITHOUT_FLAG = "flow";
//             const WITH_FLAG = ["flow", { all: true }];

//             const CODE = "new Foo<x>(y)";

//             const AST_WITHOUT_FLAG = {
//                 type: "BinaryExpression",
//                 operator: ">",
//                 left: {
//                     type: "BinaryExpression",
//                     operator: "<",
//                     left: { type: "NewExpression" },
//                     right: { type: "Identifier" }
//                 },
//                 right: { type: "Identifier", extra: { parenthesized: true } }
//             };

//             const AST_WITH_FLAG = {
//                 type: "NewExpression",
//                 callee: { type: "Identifier" },
//                 arguments: [{ type: "Identifier" }],
//                 typeArguments: {
//                     type: "TypeParameterInstantiation",
//                     params: [
//                         { type: "GenericTypeAnnotation", id: { type: "Identifier" } }
//                     ]
//                 }
//             };

//             // adone.logTrace(getParser(CODE, [WITHOUT_FLAG, WITH_FLAG])().program.body[0].expression);
//             // adone.logTrace(AST_WITHOUT_FLAG);

//             assert.include(getParser(CODE, [WITHOUT_FLAG, WITH_FLAG])().program.body[0].expression, AST_WITHOUT_FLAG);
//             // expect(
//             //     getParser(CODE, [WITHOUT_FLAG, WITH_FLAG])().program.body[0].expression,
//             // ).to.matchObject(AST_WITHOUT_FLAG);

//             // expect(
//             //     getParser(CODE, [WITHOUT_FLAG])().program.body[0].expression,
//             // ).toMatchObject(AST_WITHOUT_FLAG);

//             // expect(
//             //     getParser(CODE, [WITH_FLAG])().program.body[0].expression,
//             // ).toMatchObject(AST_WITH_FLAG);
//         });

//         it("when they are specified", () => {
//             const NAME = "decorators";
//             const OPT_1 = [NAME, { decoratorsBeforeExport: true }];
//             const OPT_2 = [NAME, { decoratorsBeforeExport: false }];
//             const SYNTAX_1 = "@dec export class C {}";
//             const SYNTAX_2 = "export @dec class C {}";

//             expect(getParser(SYNTAX_1, [OPT_1, OPT_2])).not.toThrow();
//             expect(getParser(SYNTAX_2, [OPT_2, OPT_1])).not.toThrow();
//             expect(getParser(SYNTAX_1, [OPT_2, OPT_1])).toThrow();
//             expect(getParser(SYNTAX_2, [OPT_1, OPT_2])).toThrow();
//         });
//     });
// });
