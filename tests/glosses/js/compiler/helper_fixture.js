const { path, fs, module: Module } = adone.std;
const { lodash: _ } = adone.vendor;

function resolve(p) {
    try {
        return require.resolve(p);
    } catch (err) {
        return null;
    }
}
let relativeMod;
resolve.relative = function (loc) {
    if (!relativeMod) {
        relativeMod = new Module;
        relativeMod.paths = Module._nodeModulePaths(process.cwd());
    }

    try {
        return Module._resolveFilename(loc, relativeMod);
    } catch (err) {
        return null;
    }
};

function humanize(val, noext) {
    if (noext) {
        val = path.basename(val, path.extname(val));
    }
    return val.replace(/-/g, " ");
}

type TestFile = {
    loc: string;
    code: string;
    filename: string;
};

type Test = {
    title: string;
    disabled: boolean;
    options: Object;
    exec: TestFile;
    actual: TestFile;
    expected: TestFile;
};

type Suite = {
    options: Object;
    tests: Test[];
    title: string;
    filename: string;
};

function assertDirectory(loc) {
    if (!fs.statSync(loc).isDirectory()) {
        throw new Error(`Expected ${loc} to be a directory.`);
    }
}

function shouldIgnore(name, blacklist?: string[]) {
    if (blacklist && blacklist.indexOf(name) >= 0) {
        return true;
    }

    const ext = path.extname(name);
    const base = path.basename(name, ext);

    return name[0] === "." || ext === ".md" || base === "LICENSE" || base === "options";
}

function readFile(filename) {
    if (fs.existsSync(filename)) {
        let file = _.trimEnd(fs.readFileSync(filename, "utf8"));
        file = file.replace(/\r\n/g, "\n");
        return file;
    } else {
        return "";
    }
}

export default function get(entryLoc): Suite[] {
    const suites = [];

    const rootOptsLoc = resolve(entryLoc + "/options");
    const rootOpts = rootOptsLoc ? require(rootOptsLoc) : {};

    for (const suiteName of fs.readdirSync(entryLoc)) {
        const push = (taskName, taskDir) => {
            const actualLocAlias = suiteName + "/" + taskName + "/actual.js";
            let expectLocAlias = suiteName + "/" + taskName + "/expected.js";
            const execLocAlias = suiteName + "/" + taskName + "/exec.js";

            const actualLoc = taskDir + "/actual.js";
            let expectLoc = taskDir + "/expected.js";
            let execLoc = taskDir + "/exec.js";

            if (fs.statSync(taskDir).isFile()) {
                const ext = path.extname(taskDir);
                if (ext !== ".js" && ext !== ".module.js") {
                    return;
                }

                execLoc = taskDir;
            }

            if (resolve.relative(expectLoc + "on")) {
                expectLoc += "on";
                expectLocAlias += "on";
            }

            const taskOpts = _.cloneDeep(suite.options);

            const taskOptsLoc = resolve(taskDir + "/options");
            const extTaskOpts = taskOptsLoc ? require(taskOptsLoc) : {};
            if (taskOptsLoc) {
                _.merge(taskOpts, extTaskOpts);
            }

            const test = {
                optionsDir: taskOptsLoc ? path.dirname(taskOptsLoc) : null,
                title: humanize(taskName, true),
                disabled: taskName[0] === ".",
                options: taskOpts,
                exec: {
                    loc: execLoc,
                    code: readFile(execLoc),
                    filename: execLocAlias
                },
                actual: {
                    loc: actualLoc,
                    code: readFile(actualLoc),
                    filename: actualLocAlias
                },
                expect: {
                    loc: expectLoc,
                    code: readFile(expectLoc),
                    filename: expectLocAlias
                }
            };

            // traceur checks

            if (test.exec.code.indexOf("// Async.") >= 0) {
                return;
            }

            suite.tests.push(test);

            const sourceMappingsLoc = taskDir + "/source-mappings.json";
            if (fs.existsSync(sourceMappingsLoc)) {
                test.sourceMappings = JSON.parse(readFile(sourceMappingsLoc));
            }

            const sourceMapLoc = taskDir + "/source-map.json";
            if (fs.existsSync(sourceMapLoc)) {
                test.sourceMap = JSON.parse(readFile(sourceMapLoc));
            }
        };
        
        if (shouldIgnore(suiteName)) {
            continue;
        }

        const suite = {
            options: _.clone(rootOpts),
            tests: [],
            title: humanize(suiteName),
            filename: entryLoc + "/" + suiteName
        };

        assertDirectory(suite.filename);
        suites.push(suite);

        const suiteOptsLoc = resolve(suite.filename + "/options");

        if (suiteOptsLoc) {
            suite.options = require(suiteOptsLoc);
        }

        for (const taskName of fs.readdirSync(suite.filename)) {
            push(taskName, suite.filename + "/" + taskName);
        }
    }

    return suites;
}

export function multiple(entryLoc, ignore?: string[]) {
    const categories = {};

    for (const name of fs.readdirSync(entryLoc)) {
        if (shouldIgnore(name, ignore)) {
            continue;
        }

        const loc = path.join(entryLoc, name);
        assertDirectory(loc);

        categories[name] = get(loc);
    }

    return categories;
}
