// @flow
const { codeFrame, core, helpers } = adone.js.compiler;
const { sourcemap } = adone;
const { buildExternalHelpers } = core;
const { lodash } = adone.vendor;
const { fs, path } = adone.std;
import helperFixture from "./helper_fixture";

const babelHelpers = eval(buildExternalHelpers(null, "var"));

const wrapPackagesArray = (type, names, optionsDir) => {
    return (names || []).map((val) => {
        if (adone.is.string(val)) {
            val = [val];
        }

        // relative path (outside of monorepo)
        if (val[0][0] === ".") {

            if (!optionsDir) {
                throw new Error("Please provide an options.json in test dir when using a relative plugin path.");
            }

            val[0] = path.resolve(optionsDir, val[0]);
        } else {
            return val;
        }

        return val;
    });
};

const runExec = (opts, execCode) => {
    const sandbox = {
        ...helpers,
        babelHelpers,
        assert,
        transform: core.transform,
        opts,
        exports: {}
    };

    return adone.std.vm.runInNewContext(execCode, sandbox);
};

const run = (task) => {
    const actual = task.actual;
    const expect = task.expect;
    const exec = task.exec;
    const opts = task.options;
    const optionsDir = task.optionsDir;

    const getOpts = (self) => {
        const newOpts = lodash.merge({
            filename: self.loc
        }, opts);

        newOpts.plugins = wrapPackagesArray("plugin", newOpts.plugins, optionsDir);

        return newOpts;
    };

    let execCode = exec.code;
    let result;
    let resultExec;

    if (execCode) {
        const execOpts = getOpts(exec);
        result = core.transform(execCode, execOpts);
        execCode = result.code;

        try {
            resultExec = runExec(execOpts, execCode);
        } catch (err) {
            err.message = `${exec.log}: ${err.message}`;
            err.message += codeFrame(execCode);
            throw err;
        }
    }

    let actualCode = actual.code;
    const expectCode = expect.code;
    if (!execCode || actualCode) {
        result = core.transform(actualCode, getOpts(actual));
        if (!expect.code && result.code && !opts.throws &&
            fs.statSync(path.dirname(expect.loc)).isDirectory() &&
            !process.env.CI) {
            fs.writeFileSync(expect.loc, result.code);
        } else {
            actualCode = result.code.trim();
            assert.equal(actualCode, expectCode, `${actual.loc} !== ${expect.loc}`);
        }
    }

    if (task.sourceMap) {
        assert.deepEqual(result.map, task.sourceMap);
    }

    if (task.sourceMappings) {
        const consumer = new sourcemap.Consumer(result.map);

        lodash.each(task.sourceMappings, (mapping) => {
            const actual = mapping.original;

            const expect = consumer.originalPositionFor(mapping.generated);
            assert.deepEqual({ line: expect.line, column: expect.column }, actual);
        });
    }

    if (execCode && resultExec) {
        return resultExec;
    }
};

export default function (
    fixturesLoc: string,
    name: string | Array<string>,
    suiteOpts = {},
    taskOpts = {},
    dynamicOpts?: Function,
) {
    if (!adone.is.array(name)) {
        name = adone.util.arrify(name);
    }

    const suites = helperFixture(fixturesLoc);

    for (const testSuite of suites) {
        const blockName = name.concat(testSuite.title);

        if (suiteOpts.ignoreSuites && suiteOpts.ignoreSuites.includes(testSuite.title)) {
            continue;
        }

        describe(...blockName, () => {
            for (const task of testSuite.tests) {
                if (suiteOpts.ignoreTasks && suiteOpts.ignoreTasks.includes(task.title)) {
                    continue;
                }

                const k = it(task.title, () => {
                    const runTask = () => {
                        run(task);
                    };

                    lodash.defaults(task.options, {
                        filenameRelative: task.expect.filename,
                        sourceFileName: task.actual.filename,
                        sourceMapTarget: task.expect.filename,
                        suppressDeprecationMessages: true,
                        rc: false,
                        sourceMap: Boolean(task.sourceMappings || task.sourceMap)
                    });

                    lodash.extend(task.options, taskOpts);

                    if (dynamicOpts) {
                        dynamicOpts(task.options, task);
                    }

                    const throwMsg = task.options.throws;
                    if (throwMsg) {
                        // internal api doesn't have this option but it's best not to pollute
                        // the options object with useless options
                        delete task.options.throws;

                        assert.throws(runTask, throwMsg);
                    } else {
                        if (task.exec.code) {
                            const result = run(task);
                            if (result && typeof result.then === "function") {
                                return result;
                            }
                        } else {
                            runTask();
                        }
                    }
                });

                if (task.disabled) {
                    k.skip();
                }
            }
        });
    }
}
