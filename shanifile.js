const {
    std: { path },
    fs
} = adone;

export default {
    options: {
        tests: "tests/{cli,glosses,project,shani,fast,omnitron,realm,cmake,gyp}/**/*.test.js",
        first: false,
        timeout: 30000,
        showHandles: false,
        dontUseConfig: false,
        dontUseMap: false,
        itself: false,
        allTimings: false,
        skip: "glosses.databases.mongo,glosses.databases.mysql",
        timers: false,
        showHooks: false,
        keepHooks: false,
        simple: false,
        minimal: false,
        callGc: true
    },
    transpiler: {
        plugins: [
            // "transform.flowStripTypes",
            // ["transform.decorators", {
            //     legacy: true
            // }],
            // ["transform.classProperties", { loose: true }],
            // "transform.asyncGeneratorFunctions",
            // "transform.modulesCommonjs",
            // "transform.functionBind",
            // "transform.objectRestSpread",
            // "transform.numericSeparator",
            // "transform.exponentiationOperator",
            // ["transform.importReplace", {
            //     old: "adone",
            //     new: path.resolve(__dirname, "lib")
            // }, "adone"],
            // ["transform.importReplace", {
            //     old: "shani",
            //     new: path.resolve(__dirname, "lib", "glosses", "shani")
            // }, "shani"],
            // ["transform.importReplace", {
            //     old: "fast",
            //     new: path.resolve(__dirname, "lib", "glosses", "fast")
            // }, "fast"],
            // ["transform.importReplace", {
            //     old: "omnitron",
            //     new: path.resolve(__dirname, "lib", "omnitron")
            // }, "omnitron"]
        ],
        compact: false,
        ignore: [/vendor/]
    },
    mapping: async (p) => {
        if (await fs.exists(p)) {
            return p;
        }

        const parts = p.split(".");
        const prefix = path.resolve(__dirname, "tests", ...parts);

        if (await fs.exists(`${prefix}.test.js`)) {
            return `${prefix}.test.js`;
        }

        if (await fs.exists(prefix)) {
            return path.join(prefix, "**", "*.test.js");
        }

        return [
            path.join(`${prefix}*.test.js`),
            path.join(`${prefix}*`, "**", "*.test.js")
        ];
    }
};
