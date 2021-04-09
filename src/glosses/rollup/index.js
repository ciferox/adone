const {
    lazify
} = adone;

exports = module.exports = adone.asNamespace(require("rollup"));

lazify({
    pluginutils: "rollup-pluginutils",
    plugin: () => lazify({
        babel: "@rollup/plugin-babel",
        cleanup: "rollup-plugin-cleanup",
        commonjs: "@rollup/plugin-commonjs",
        json: "@rollup/plugin-json",
        replace: "@rollup/plugin-replace",
        resolve: "@rollup/plugin-node-resolve",
        string: ["rollup-plugin-string", "string"],
        typescript: "@rollup/plugin-typescript"
        // postcss: "./postcss",
    }),
    run: "./run"
}, exports, require);
