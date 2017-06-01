const path = require("path");
const fs = require("fs");

module.exports = {
    options: {
        tests: "tests/{glosses,omnitron,polyfills}/**/*.test.js",
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
        keepHooks: false
    },
    transpiler: {
        plugins: [
            "transform.flowStripTypes",
            "transform.decoratorsLegacy",
            "transform.classProperties",
            "transform.ESModules",
            "transform.functionBind",
            "transform.objectRestSpread",
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
        ignore: /glosses.vendor/
    },
    mapping: (p) => {
        const parts = p.split(".");
        const prefix = path.join("tests", ...parts);
        return new Promise((resolve) => {
            fs.stat(`${prefix}.test.js`, (err) => {
                let res;
                if (err) {
                    res = [
                        `${prefix}*.test.js`,
                        path.join(`${prefix}*`, "**", "*.test.js")
                    ];
                } else {
                    res = `${prefix}.test.js`;
                }
                resolve(res);
            });
        });
    }
};
