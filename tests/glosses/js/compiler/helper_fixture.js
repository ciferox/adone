const {
    std: {
        path,
        fs,
        module:
        Module
    },
    vendor: {
        lodash
    }
} = adone;

const resolve = (p) => {
    try {
        return require.resolve(p);
    } catch (err) {
        return null;
    }
};

let relativeMod;
resolve.relative = function (loc) {
    if (!relativeMod) {
        relativeMod = new Module();
        relativeMod.paths = Module._nodeModulePaths(process.cwd());
    }

    try {
        return Module._resolveFilename(loc, relativeMod);
    } catch (err) {
        return null;
    }
};

const humanize = (val, noext) => {
    if (noext) {
        val = path.basename(val, path.extname(val));
    }
    return val.replace(/-/g, " ");
};

const assertDirectory = (loc) => {
    if (!fs.statSync(loc).isDirectory()) {
        throw new Error(`Expected ${loc} to be a directory.`);
    }
};

const shouldIgnore = (name, blacklist) => {
    if (blacklist && blacklist.indexOf(name) >= 0) {
        return true;
    }

    const ext = path.extname(name);
    const base = path.basename(name, ext);

    return name[0] === "." || ext === ".md" || base === "LICENSE" || base === "options";
};

const readFile = (filename) => {
    if (fs.existsSync(filename)) {
        let file = lodash.trimEnd(fs.readFileSync(filename, "utf8"));
        file = file.replace(/\r\n/g, "\n");
        return file;
    }
    return "";
};

export default function get(entryLoc) {
    const suites = [];

    const rootOptsLoc = resolve(`${entryLoc}/options`);
    const rootOpts = rootOptsLoc ? require(rootOptsLoc) : {};

    for (const suiteName of fs.readdirSync(entryLoc)) {
        if (shouldIgnore(suiteName)) {
            continue;
        }

        const suite = {
            options: lodash.clone(rootOpts),
            tests: [],
            title: humanize(suiteName),
            filename: `${entryLoc}/${suiteName}`
        };

        assertDirectory(suite.filename);
        suites.push(suite);

        const suiteOptsLoc = resolve(`${suite.filename}/options`);

        if (suiteOptsLoc) {
            suite.options = require(suiteOptsLoc);
        }

        for (const taskName of fs.readdirSync(suite.filename)) {
            const taskDir = `${suite.filename}/${taskName}`;

            const actualLocAlias = `${suiteName}/${taskName}/actual.js`;
            let expectLocAlias = `${suiteName}/${taskName}/expected.js`;
            const execLocAlias = `${suiteName}/${taskName}/exec.js`;

            const actualLoc = `${taskDir}/actual.js`;
            let expectLoc = `${taskDir}/expected.js`;
            let execLoc = `${taskDir}/exec.js`;

            if (fs.statSync(taskDir).isFile()) {
                const ext = path.extname(taskDir);
                if (ext !== ".js" && ext !== ".module.js") {
                    continue;
                }

                execLoc = taskDir;
            }

            if (resolve.relative(`${expectLoc}on`)) {
                expectLoc += "on";
                expectLocAlias += "on";
            }

            const taskOpts = lodash.cloneDeep(suite.options);

            const taskOptsLoc = resolve(`${taskDir}/options`);
            const extTaskOpts = taskOptsLoc ? require(taskOptsLoc) : {};
            if (taskOptsLoc) {
                lodash.merge(taskOpts, extTaskOpts);
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
                continue;
            }

            suite.tests.push(test);

            const sourceMappingsLoc = `${taskDir}/source-mappings.json`;
            if (fs.existsSync(sourceMappingsLoc)) {
                test.sourceMappings = JSON.parse(readFile(sourceMappingsLoc));
            }

            const sourceMapLoc = `${taskDir}/source-map.json`;
            if (fs.existsSync(sourceMapLoc)) {
                test.sourceMap = JSON.parse(readFile(sourceMapLoc));
            }
        }
    }

    return suites;
}

export const multiple = (entryLoc, ignore?: string[]) => {
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
};
