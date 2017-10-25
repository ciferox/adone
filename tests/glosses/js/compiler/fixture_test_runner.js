import getFixtures from "./helper_fixtures";

const {
    is,
    js: { compiler: { core, codeFrameColumns } },
    sourcemap,
    std: { vm, path, fs },
    vendor: { lodash: { defaults, includes, extend, merge } }
} = adone;

const { buildExternalHelpers } = core;

const helpers = {
    assertNoOwnProperties: (obj) => {
        assert.equal(Object.getOwnPropertyNames(obj).length, 0);
    },
    assertHasOwnProperty: () => { },
    assertLacksOwnProperty: () => { },
    multiline: (arr) => {
        return arr.join("\n");
    },
    assertArrayEquals: assert.deepEqual
};

const moduleCache = {};
const testContext = vm.createContext({
    ...helpers,
    assert,
    process,
    transform: core.transform,
    setTimeout,
    setImmediate
});
testContext.global = testContext;

/**
 * A basic implementation of CommonJS so we can execute `babel-polyfill` inside our test context.
 * This allows us to run our unittests
 */
const runModuleInTestContext = (id: string, relativeFilename: string) => {
    const filename = adone.js.Module.resolve(id, {
        basedir: path.dirname(relativeFilename)
    });

    // Expose Node-internal modules if the tests want them. Note, this will not execute inside
    // the context's global scope.
    if (filename === id) {
        return require(id);
    }

    if (moduleCache[filename]) {
        return moduleCache[filename].exports;
    }

    const module = (moduleCache[filename] = {
        id: filename,
        exports: {}
    });
    const dirname = path.dirname(filename);
    const req = (id) => runModuleInTestContext(id, filename);

    const src = fs.readFileSync(filename, "utf8");
    const code = `(function (exports, require, module, __filename, __dirname) {${src}\n});`;

    vm
        .runInContext(code, testContext, {
            filename,
            displayErrors: true
        })
        .call(module.exports, module.exports, req, module, filename, dirname);

    return module.exports;
};

/**
 * Run the given snippet of code inside a CommonJS module.
 *
 * Exposed for unit tests, not for use as an API.
 */
export const runCodeInTestContext = (code: string, opts: { filename?: string } = {}) => {
    const filename = opts.filename || null;
    const dirname = filename ? path.dirname(filename) : null;
    const req = filename ? (id) => runModuleInTestContext(id, filename) : null;

    const module = {
        id: filename,
        exports: {}
    };

    // Expose the test options as "opts", but otherwise run the test in a CommonJS-like environment.
    // Note: This isn't doing .call(module.exports, ...) because some of our tests currently
    // rely on 'this === global'.
    const src = `(function(exports, require, module, __filename, __dirname, opts) {${code}\n});`;
    return vm.runInContext(src, testContext, {
        filename,
        displayErrors: true
    })(module.exports, req, module, filename, dirname, opts);
};

// // Add chai's assert to the global context
// // It has to be required inside the testContext as otherwise some assertions do not
// // work as chai would reference globals (RegExp, Array, ...) from this context
// vm.runInContext(
//     "(function(require) { global.assert=require('chai').assert; });",
//     testContext,
//     {
//         displayErrors: true
//     },
// )((id) => runModuleInTestContext(id, __filename));

// Initialize the test context with the polyfill, and then freeze the global to prevent implicit
// global creation in tests, which could cause things to bleed between tests.
runModuleInTestContext("babel-polyfill", __filename);

// Populate the "babelHelpers" global with Babel's helper utilities.
runCodeInTestContext(buildExternalHelpers());


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

const run = (task) => {
    const actual = task.actual;
    const taskExpect = task.expect;
    const exec = task.exec;
    const opts = task.options;
    const optionsDir = task.optionsDir;

    const getOpts = (self) => {
        const newOpts = merge(
            {
                filename: self.loc
            },
            opts,
        );

        newOpts.plugins = wrapPackagesArray("plugin", newOpts.plugins, optionsDir);
        // newOpts.presets = wrapPackagesArray(
        //     "preset",
        //     newOpts.presets,
        //     optionsDir,
        // ).map((val) => {
        //     if (val.length > 2) {
        //         throw new Error(
        //             `Unexpected extra options ${JSON.stringify(val.slice(2))} passed to preset.`,
        //         );
        //     }

        //     return val;
        // });

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
            resultExec = runCodeInTestContext(execCode, execOpts);
        } catch (err) {
            // Pass empty location to include the whole file in the output.
            err.message = `${exec.loc}: ${err.message}\n${codeFrameColumns(execCode, {})}`;
            throw err;
        }
    }

    let actualCode = actual.code;
    const expectCode = taskExpect.code;
    if (!execCode || actualCode) {
        result = core.transform(actualCode, getOpts(actual));
        if (
            !taskExpect.code &&
            result.code &&
            !opts.throws &&
            fs.statSync(path.dirname(taskExpect.loc)).isDirectory() &&
            !process.env.CI
        ) {
            console.log(`New test file created: ${taskExpect.loc}`);
            fs.writeFileSync(taskExpect.loc, `${result.code}\n`);
        } else {
            actualCode = result.code.trim();
            expect(actualCode).to.be.equal(expectCode, `${actual.loc} !== ${taskExpect.loc}`);
        }
    }

    if (task.sourceMap) {
        expect(result.map).to.deep.equal(task.sourceMap);
    }

    if (task.sourceMappings) {
        const consumer = sourcemap.createConsumer(result.map);

        task.sourceMappings.forEach((mapping) => {
            const actual = mapping.original;

            const taskExpect = consumer.originalPositionFor(mapping.generated);
            expect({ line: taskExpect.line, column: taskExpect.column }).to.deep.equal(actual);
        });
    }

    if (execCode && resultExec) {
        return resultExec;
    }
};

export default function (
    fixturesLoc: string,
    name: string,
    suiteOpts = {},
    taskOpts = {},
    dynamicOpts?: Function,
) {
    const suites = getFixtures(fixturesLoc);

    for (const testSuite of suites) {
        const blockName = name.concat(testSuite.title);

        if (includes(suiteOpts.ignoreSuites, testSuite.title)) {
            continue;
        }

        describe(...blockName, () => {
            for (const task of testSuite.tests) {
                if (
                    includes(suiteOpts.ignoreTasks, task.title) ||
                    includes(suiteOpts.ignoreTasks, `${testSuite.title}/${task.title}`)
                ) {
                    continue;
                }

                it(
                    task.title,
                    !task.disabled &&
                    (() => {
                        const runTask = () => {
                            run(task);
                        };

                        defaults(task.options, {
                            filenameRelative: task.expect.filename,
                            sourceFileName: task.actual.filename,
                            sourceMapTarget: task.expect.filename,
                            suppressDeprecationMessages: true,
                            babelrc: false,
                            sourceMap: Boolean(task.sourceMappings || task.sourceMap)
                        });

                        extend(task.options, taskOpts);

                        if (dynamicOpts) {
                            dynamicOpts(task.options, task);
                        }

                        const throwMsg = task.options.throws;
                        if (throwMsg) {
                            // internal api doesn't have this option but it's best not to pollute
                            // the options object with useless options
                            delete task.options.throws;

                            const err = assert.throws(runTask);
                            if (throwMsg !== true) {
                                expect(err.message).to.include(throwMsg);
                            }
                        } else {
                            if (task.exec.code) {
                                const result = run(task);
                                if (result && is.function(result.then)) {
                                    return result;
                                }
                            } else {
                                runTask();
                            }
                        }
                    }),
                );
            }
        });
    }
}
