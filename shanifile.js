const { std: { path }, fs } = adone;

export default {
    options: {
        tests: "tests/{glosses,omnitron,realm,polyfills}/**/*.test.js",
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
            "transform.flowStripTypes",
            "transform.decorators",
            ["transform.classProperties", { loose: true }],
            "transform.es2015ModulesCommonjs",
            "transform.functionBind",
            "transform.objectRestSpread",
            "transform.numericSeparator",
            "transform.exponentiationOperator",
            ["transform.importReplace", {
                old: "adone",
                new: path.resolve(__dirname, "lib")
            }],
            ["transform.importReplace", {
                old: "shani",
                new: path.resolve(__dirname, "lib", "glosses", "shani")
            }],
            ["transform.importReplace", {
                old: "fast",
                new: path.resolve(__dirname, "lib", "glosses", "fast")
            }],
            ["transform.importReplace", {
                old: "omnitron",
                new: path.resolve(__dirname, "lib", "omnitron")
            }]
        ],
        compact: false,
        ignore: [/glosses.vendor/]
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
