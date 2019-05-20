export { default as rollup } from './rollup/index';
export { default as watch } from './watch/index';
// export { version as VERSION } from 'package.json';
export const VERSION = "1.12.3";

adone.lazify({
    plugin: "./plugins",
    pluginutils: "./pluginutils",
    run: "./run",

    isReference: "./is_reference"
}, exports, require);
