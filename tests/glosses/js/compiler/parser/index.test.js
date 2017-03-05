import adone from "adone";
import { multiple as getFixtures } from "../helper_fixture";

const { is, std: { fs, path } } = adone;

describe("js", () => {
    describe("compiler", () => {
        describe("parser", () => {
            describe("fixtures", () => {
                const fixtures = getFixtures(path.join(__dirname, "fixtures"));
                runFixtureTests(fixtures, adone.js.compiler.parse);
            });

            describe("expressions", () => {
                const fixtures = getFixtures(path.join(__dirname, "expressions"));
                runFixtureTests(fixtures, adone.js.compiler.parseExpression);
            });
        });
    });
});

function runFixtureTests(fixtures, parseFunction) {
    for (const [name, suites] of adone.util.entries(fixtures)) {
        for (const suite of suites) {
            for (const task of suite.tests) {
                const test = specify(`${name}/${suite.title}/${task.title}`, () => {
                    try {
                        runTest(task, parseFunction);
                    } catch (err) {
                        err.message = `${name}/${task.actual.filename}:${err.message}`;
                        throw err;
                    }
                });
                if (task.disabled) {
                    test.skip();
                }
            }
        }
    }
}

function runTest(test, parseFunction) {
    const opts = test.options;
    opts.locations = true;
    opts.ranges = true;

    if (opts.throws && test.expect.code) {
        throw new Error("File expected.json exists although options specify throws. Remove expected.json.");
    }
    let ast;
    try {
        ast = parseFunction(test.actual.code, opts);
    } catch (err) {
        if (opts.throws) {
            if (err.message === opts.throws) {
                return;
            } else {
                err.message = "Expected error message: " + opts.throws + ". Got error message: " + err.message;
                throw err;
            }
        }

        throw err;
    }

    if (!test.expect.code && !opts.throws && !process.env.CI) {
        test.expect.loc += "on";
        return save(test, ast);
    }

    if (opts.throws) {
        throw new Error("Expected error message: " + opts.throws + ". But parsing succeeded.");
    } else {
        const mis = misMatch(JSON.parse(test.expect.code), ast);
        if (mis) {
            //save(test, ast);
            throw new Error(mis);
        }
    }
}

function save(test, ast) {
    delete ast.tokens;
    if (ast.comments && !ast.comments.length) {
        delete ast.comments;
    }
    fs.writeFileSync(test.expect.loc, JSON.stringify(ast, null, "  "));
}

function misMatch(exp, act) {
    if (!exp || !act || (!is.object(exp)) || (!is.object(act))) {
        if (exp !== act && !is.function(exp)) {
            return ppJSON(exp) + " !== " + ppJSON(act);
        }
    } else if (is.regexp(exp) || is.regexp(exp)) {
        const left = ppJSON(exp);
        const right = ppJSON(act);
        if (left !== right) {
            return left + " !== " + right;
        }
    } else if (exp.splice) {
        if (!act.slice) {
            return ppJSON(exp) + " != " + ppJSON(act);
        }
        if (act.length !== exp.length) {
            return "array length mismatch " + exp.length + " != " + act.length;
        }
        for (let i = 0; i < act.length; ++i) {
            const mis = misMatch(exp[i], act[i]);
            if (mis) {
                return addPath(mis, i);
            }
        }
    } else {
        for (const prop in exp) {
            const mis = misMatch(exp[prop], act[prop]);
            if (mis) {
                return addPath(mis, prop);
            }
        }
    }
}

function ppJSON(v) {
    return v instanceof RegExp ? v.toString() : JSON.stringify(v, null, 2);
}

function addPath(str, pt) {
    if (str[str.length - 1] === ")") {
        return str.slice(0, str.length - 1) + "/" + pt + ")";
    } else {
        return str + " (" + pt + ")";
    }
}
