const {
    std: { path },
    fs
} = adone;

export default {
    options: {
        tests: "tests/{app,glosses}/**/*.test.js",
        first: false,
        timeout: 30000,
        showHandles: false,
        dontUseConfig: false,
        dontUseMap: false,
        itself: false,
        allTimings: false,
        timers: false,
        showHooks: false,
        keepHooks: false,
        simple: false,
        minimal: false,
        callGc: true
    },
    transpiler: {
        plugins: adone.module.COMPILER_PLUGINS,
        compact: false
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
