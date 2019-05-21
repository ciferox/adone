import { builtinModules } from "module";

const {
    rollup: { plugin }
} = adone;

const template = function (kind, external) {
    return {
        input: `src/glosses/web/sapper/runtime/${kind}/index.ts`,
        output: {
            file: `lib/glosses/web/sapper/runtime/${kind}.mjs`,
            format: "es",
            paths: (id) => {
                if (id.startsWith("@sapper")) {
                    return id.replace("@sapper", ".");
                } else if (id.startsWith("adoneweb")) {
                    return id.replace("adoneweb", adone.getPath("lib", "glosses", "web", "browser"));
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
}

export default [
    template("app", (id) => /^(adoneweb\/?|@sapper\/)/.test(id)),
    template("server", (id) => /^(adoneweb\/?|@sapper\/)/.test(id) || builtinModules.includes(id))
];
