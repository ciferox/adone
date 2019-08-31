export { default as rollup } from './rollup/index';
export { default as watch } from './watch/index';
export const VERSION = "1.20.3";

adone.lazify({
    plugin: "./plugins",
    pluginutils: "./pluginutils",
    run: "./run",
}, exports, require);
