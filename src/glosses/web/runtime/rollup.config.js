import { builtinModules } from "module";

const {
    fs,
    rollup: { plugin }
} = adone;

const template = function (kind, external) {
    return {
        input: `src/glosses/web/runtime/${kind}/index.ts`,
        output: {
            file: `lib/glosses/web/runtime/${kind}.mjs`,
            format: "es",
            paths: (id) => id.replace("@adone", ".")
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

const external = (id) => id.startsWith("foundation/");

export default [
    template("app", (id) => /^(@adone\/)/.test(id)),
    template("server", (id) => /^(@adone\/)/.test(id) || builtinModules.includes(id)),

    {
        input: "src/glosses/web/runtime/foundation/index.ts",
        output: [
            {
                file: "lib/glosses/web/runtime/foundation/index.mjs",
                format: "esm",
                paths: (id) => id.startsWith("foundation/") && id.replace("foundation", ".")
            },
            {
                file: "lib/glosses/web/runtime/foundation/index.js",
                format: "cjs",
                paths: (id) => id.startsWith("foundation/") && id.replace("foundation", ".")
            }
        ],
        external,
        plugins: [
            plugin.typescript({
                importHelpers: false,
                target: "es2017",
                lib: ["es6", "es2017", "dom"],
                module: "es6",
                moduleResolution: "node",
                include: "src/glosses/web/runtime/foundation/internal/**"
            })
        ]
    },

    ...fs.readdirSync("src/glosses/web/runtime/foundation")
        .filter((dir) => fs.statSync(`src/glosses/web/runtime/foundation/${dir}`).isDirectory())
        .map((dir) => ({
            input: `src/glosses/web/runtime/foundation/${dir}/index.ts`,
            output: [
                {
                    file: `lib/glosses/web/runtime/foundation/${dir}/index.mjs`,
                    format: "esm",
                    paths: (id) => id.startsWith("foundation/") && `${id.replace("foundation", "..")}`
                },
                {
                    file: `lib/glosses/web/runtime/foundation/${dir}/index.js`,
                    format: "cjs",
                    paths: (id) => id.startsWith("foundation/") && `${id.replace("foundation", "..")}`
                }
            ],
            external,
            plugins: [
                plugin.typescript({
                    importHelpers: false,
                    target: "es2017",
                    lib: ["es6", "es2017", "dom"],
                    include: "src/glosses/web/runtime/foundation/**"
                }),
                dir === "internal" && {
                    generateBundle(options, bundle) {
                        const mod = bundle["index.mjs"];
                        if (mod) {
                            adone.fs.writeFileSync("src/glosses/web/compiler/compile/internal_exports.ts", `// This file is automatically generated\nexport default new Set(${JSON.stringify(mod.exports)});`);
                        }
                    }
                }
            ]
        }))
];
