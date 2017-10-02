import File from "./transformation/file";
import buildExternalHelpers from "./tools/build_external_helpers";

import { getEnv } from "./config/helpers/environment";
import Plugin from "./config/plugin";
import { makeStrongCache, makeWeakCache } from "./config/caching";
import buildConfigChain from "./config/build_config_chain";
import manageOptions from "./config/option_manager";

const {
    js: { compiler: { types, template } }
} = adone;

export {
    File,
    Plugin,
    buildExternalHelpers,
    getEnv,
    types,
    template,
    makeStrongCache,
    makeWeakCache,
    buildConfigChain,
    manageOptions
};

import loadConfig from "./config";

export const loadOptions = (opts): Object | null => {
    const config = loadConfig(opts);

    return config ? config.options : null;
};

// For easier backward-compatibility, provide an API like the one we exposed in Babel 6.
export class OptionManager {
    init(opts) {
        return loadOptions(opts);
    }
}

// export function Plugin(alias) {
//     throw new Error(`The (${alias}) Babel 5 plugin is being run with Babel 6.`);
// }

export {
    transform,
    transformFromAst,
    transformFile,
    transformFileSync
} from "./transformation";

/**
 * Recommended set of compilable extensions. Not used in babel-core directly, but meant as
 * as an easy source for tooling making use of babel-core.
 */
export const DEFAULT_EXTENSIONS = Object.freeze([
    ".js",
    ".jsx",
    ".es6",
    ".es",
    ".mjs"
]);
