import { builtinModules } from "module";

const {
    rollup: { plugin }
} = adone;

const template = function (kind, external) {
    return {
        input: `src/glosses/web/runtime/${kind}/index.ts`,
        output: {
            file: `lib/glosses/web/runtime/${kind}.mjs`,
            format: "es",
            paths: (id) => {
                if (id.startsWith("@sapper")) {
                    return id.replace("@sapper", ".");
                } else if (id.startsWith("foundation")) {
                    return id.replace("foundation", "./foundation");
                }
                return id;
            }
        },
        external,
        plugins: [
            plugin.resolve({
                extensions: [".mjs", ".js", ".ts"]
            }),
            plugin.commonjs(),
            plugin.string({
                include: "**/*.md"
            }),
            plugin.typescript({
                importHelpers: false,
                target: "es2017",
                lib: ["es6", "es2017", "dom"]
            })
        ]
    };
};

export default [
    template("app", (id) => /^(foundation\/?|@sapper\/)/.test(id)),
    template("server", (id) => /^(foundation\/?|@sapper\/)/.test(id) || builtinModules.includes(id)),

    {
        input: "src/glosses/web/runtime/foundation/core/index.js",
        output: [
            {
                file: "lib/glosses/web/runtime/foundation/core.mjs",
                format: "esm",
                paths: (id) => id.startsWith("foundation/") && id.replace("foundation", ".")
            },
            {
                file: "lib/glosses/web/runtime/foundation/core.js",
                format: "cjs",
                paths: (id) => id.startsWith("foundation/") && id.replace("foundation", ".")
            }
        ],
        external: (id) => id.startsWith("foundation/"),
        plugins: [{
            generateBundle(options, bundle) {
                const mod = bundle["core.mjs"];
                if (mod) {
                    adone.fs.writeFileSync("src/glosses/web/compiler/compile/internal_exports.ts", `// This file is automatically generated\nexport default new Set(${JSON.stringify(mod.exports)});`);
                }
            }
        }]
    },
    {
        input: "src/glosses/web/runtime/foundation/store/index.ts",
        output: [
            {
                file: "lib/glosses/web/runtime/foundation/store.mjs",
                format: "esm",
                paths: (id) => id.startsWith("foundation/") && id.replace("foundation", ".")
            },
            {
                file: "lib/glosses/web/runtime/foundation/store.js",
                format: "cjs",
                paths: (id) => id.startsWith("foundation/") && id.replace("foundation", ".")
            }
        ],
        plugins: [
            plugin.typescript({
                importHelpers: false,
                target: "es2017",
                lib: ["es6", "es2017", "dom"],
                include: "src/glosses/web/runtime/foundation/store/**",
                exclude: "src/glosses/web/runtime/foundation/core/**"
            })
        ],
        external: (id) => id.startsWith("foundation/")
    },
    {
        input: "src/glosses/web/runtime/foundation/motion/index.js",
        output: [
            {
                file: "lib/glosses/web/runtime/foundation/motion.mjs",
                format: "esm",
                paths: (id) => id.startsWith("foundation/") && id.replace("foundation", ".")
            },
            {
                file: "lib/glosses/web/runtime/foundation/motion.js",
                format: "cjs",
                paths: (id) => id.startsWith("foundation/") && id.replace("foundation", ".")
            }
        ],
        external: (id) => id.startsWith("foundation/")
    },
    ...["easing", "transition", "animate"].map((name) => ({
        input: `src/glosses/web/runtime/foundation/${name}.mjs`,
        output: {
            file: `lib/glosses/web/runtime/foundation/${name}.js`,
            format: "cjs",
            paths: (id) => id.startsWith("foundation/") && id.replace("foundation", ".")
        },
        external: (id) => id !== `${name}.mjs`
    }))
];
