// @flow

import { getEnv } from "../../helpers/environment";
import { makeStrongCache } from "../../caching";

const {
    is,
    std: { fs, path }
} = adone;

export type ConfigFile = {
    filepath: string,
    dirname: string,
    options: {},
};

const BABELRC_FILENAME = ".babelrc";
const BABELRC_JS_FILENAME = ".babelrc.js";
const PACKAGE_FILENAME = "package.json";
const BABELIGNORE_FILENAME = ".babelignore";

const LOADING_CONFIGS = new Set();
const readConfigJS = makeStrongCache((filepath, cache) => {
    if (!fs.existsSync(filepath)) {
        cache.forever();
        return null;
    }

    // The `require()` call below can make this code reentrant if a require hook like babel-register has been
    // loaded into the system. That would cause Babel to attempt to compile the `.babelrc.js` file as it loads
    // below. To cover this case, we auto-ignore re-entrant config processing.
    if (LOADING_CONFIGS.has(filepath)) {
        cache.never();

        return {
            filepath,
            dirname: path.dirname(filepath),
            options: {}
        };
    }

    let options;
    try {
        LOADING_CONFIGS.add(filepath);

        // $FlowIssue
        const configModule = (require(filepath): mixed);
        options =
    configModule && configModule.__esModule
        ? configModule.default || undefined
        : configModule;
    } catch (err) {
        err.message = `${filepath}: Error while loading config - ${err.message}`;
        throw err;
    } finally {
        LOADING_CONFIGS.delete(filepath);
    }

    if (is.function(options)) {
        options = options({
            cache,
            // Expose ".env()" so people can easily get the same env that we expose using the "env" key.
            env: () => cache.using(() => getEnv())
        });
    } else {
        cache.forever();
    }

    if (!options || typeof options !== "object" || is.array(options)) {
        throw new Error(
            `${filepath}: Configuration should be an exported JavaScript object.`,
        );
    }

    return {
        filepath,
        dirname: path.dirname(filepath),
        options
    };
}, false /* autoPermacache */);

const makeStaticFileCache = function <T> (fn: (string, string) => T): string => T | null {
    return makeStrongCache((filepath, cache) => {
        if (is.null(cache.invalidate(() => fileMtime(filepath)))) {
            cache.forever();
            return null;
        }

        return fn(filepath, fs.readFileSync(filepath, "utf8"));
    });
};

const readConfigFile = makeStaticFileCache((filepath, content) => {
    let options;
    if (path.basename(filepath) === PACKAGE_FILENAME) {
        try {
            options = JSON.parse(content).babel;
        } catch (err) {
            err.message = `${filepath}: Error while parsing JSON - ${err.message}`;
            throw err;
        }
        if (!options) {
            return null;
        }
    } else {
        try {
            options = adone.data.json5.decode(content);
        } catch (err) {
            err.message = `${filepath}: Error while parsing config - ${err.message}`;
            throw err;
        }

        if (!options) {
            throw new Error(`${filepath}: No config detected`);
        }
    }

    if (typeof options !== "object") {
        throw new Error(`${filepath}: Config returned typeof ${typeof options}`);
    }
    if (is.array(options)) {
        throw new Error(`${filepath}: Expected config object but found array`);
    }

    return {
        filepath,
        dirname: path.dirname(filepath),
        options
    };
});

const readIgnoreConfig = makeStaticFileCache((filepath, content) => {
    const ignore = content
        .split("\n")
        .map((line) => line.replace(/#(.*?)$/, "").trim())
        .filter((line) => Boolean(line));

    return {
        filepath,
        dirname: path.dirname(filepath),
        options: { ignore }
    };
});

/**
 * Read the given config file, returning the result. Returns null if no config was found, but will
 * throw if there are parsing errors while loading a config.
 */
const readConfig = (filepath) => {
    return path.extname(filepath) === ".js" ? readConfigJS(filepath) : readConfigFile(filepath);
};

export const loadConfig = (name: string, dirname: string): ConfigFile => {
    const filepath = adone.js.Module.resolve(name, { basedir: dirname });

    const conf = readConfig(filepath);
    if (!conf) {
        throw new Error(`Config file ${filepath} contains no configuration data`);
    }

    return conf;
};

export const findConfigs = (dirname: string): Array<ConfigFile> => {
    let foundConfig = false;
    let foundIgnore = false;

    const confs = [];

    let loc = dirname;
    // eslint-disable-next-line
    while (true) {
        if (!foundIgnore) {
            const ignoreLoc = path.join(loc, BABELIGNORE_FILENAME);
            const ignore = readIgnoreConfig(ignoreLoc);

            if (ignore) {
                confs.push(ignore);
                foundIgnore = true;
            }
        }

        if (!foundConfig) {
            const conf = [
                BABELRC_FILENAME,
                BABELRC_JS_FILENAME,
                PACKAGE_FILENAME
            ].reduce((previousConfig: ConfigFile | null, name) => { // eslint-disable-line
                const filepath = path.join(loc, name);
                const config = readConfig(filepath);

                if (config && previousConfig) {
                    throw new Error(
                        `Multiple configuration files found. Please remove one:\n- ${path.basename(
                            previousConfig.filepath,
                        )}\n- ${name}\nfrom ${loc}`,
                    );
                }

                return config || previousConfig;
            }, null);

            if (conf) {
                confs.push(conf);
                foundConfig = true;
            }
        }

        if (foundIgnore && foundConfig) {
            break;
        }

        if (loc === path.dirname(loc)) {
            break;
        }

        loc = path.dirname(loc);
    }

    return confs;
};

const fileMtime = (filepath: string): number | null => {
    try {
        return Number(fs.statSync(filepath).mtime);
    } catch (e) {
        if (e.code !== "ENOENT") {
            throw e;
        }
    }

    return null;
};

