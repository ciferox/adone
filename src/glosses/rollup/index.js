const {
    lazify
} = adone;

exports = module.exports = adone.asNamespace(require("rollup"));

lazify({
    pluginutils: "rollup-pluginutils",
    plugin: () => lazify({
        babel: "rollup-plugin-babel",
        cleanup: "rollup-plugin-cleanup",
        commonjs: "rollup-plugin-commonjs",
        json: "rollup-plugin-json",
        // postcss: "./postcss",
        replace: "rollup-plugin-replace",
        resolve: "rollup-plugin-node-resolve",
        string: ["rollup-plugin-string", "string"],
        svelte: "rollup-plugin-svelte",
        typescript: "rollup-plugin-typescript"
    }),
    run: "./run"
}, exports, require);
