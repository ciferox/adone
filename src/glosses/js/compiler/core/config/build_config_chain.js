// @flow

import { getEnv } from "./helpers/environment";

import { findConfigs, loadConfig } from "./loading/files";

const {
    is,
    std: { path }
} = adone;

type ConfigItem = {
    type: "options" | "arguments",
    options: {},
    dirname: string,
    alias: string,
    loc: string,
};

class ConfigChainBuilder {
    filename: string | null;
    configs: Array<ConfigItem>;
    possibleDirs: null | Array<string>;

    constructor(filename) {
        this.configs = [];
        this.filename = filename;
        this.possibleDirs = null;
    }

    /**
     * Tests if a filename should be ignored based on "ignore" and "only" options.
     */
    shouldIgnore(ignore: mixed, only: mixed, dirname: string): boolean {
        if (!this.filename) {
            return false;
        }

        if (ignore) {
            if (!is.array(ignore)) {
                throw new Error(`.ignore should be an array, ${JSON.stringify(ignore)} given`);
            }

            if (this.matchesPatterns(ignore, dirname)) {
                return true;
            }
        }

        if (only) {
            if (!is.array(only)) {
                throw new Error(`.only should be an array, ${JSON.stringify(only)} given`);
            }

            if (!this.matchesPatterns(only, dirname)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Returns result of calling function with filename if pattern is a function.
     * Otherwise returns result of matching pattern Regex with filename.
     */
    matchesPatterns(patterns: Array<mixed>, dirname: string) {
        const filename = this.filename;
        if (!filename) {
            throw new Error("Assertion failure: .filename should always exist here");
        }

        const res = [];
        const strings = [];
        const fns = [];

        patterns.forEach((pattern) => {
            if (is.string(pattern)) {
                strings.push(pattern);
            } else if (is.function(pattern)) {
                fns.push(pattern);
            } else if (pattern instanceof RegExp) {
                res.push(pattern);
            } else {
                throw new Error(
                    "Patterns must be a string, function, or regular expression",
                );
            }
        });

        if (res.some((re) => re.test(filename))) {
            return true;
        }
        if (fns.some((fn) => fn(filename))) {
            return true;
        }

        if (strings.length > 0) {
            let possibleDirs = this.possibleDirs;
            // Lazy-init so we don't initialize this for files that have no glob patterns.
            if (!possibleDirs) {
                possibleDirs = this.possibleDirs = [];

                possibleDirs.push(filename);

                let current = filename;
                while (true) {
                    const previous = current;
                    current = path.dirname(current);
                    if (previous === current) {
                        break;
                    }

                    possibleDirs.push(current);
                }
            }

            const absolutePatterns = strings.map((pattern) => {
                // Preserve the "!" prefix so that micromatch can use it for negation.
                const negate = pattern[0] === "!";
                if (negate) {
                    pattern = pattern.slice(1);
                }

                return (negate ? "!" : "") + path.resolve(dirname, pattern);
            });

            // if (
            //     micromatch(possibleDirs, absolutePatterns, { nocase: true }).length > 0
            // ) {
            //     return true;
            // }
            const matcher = adone.util.matchPath(absolutePatterns);

            for (const dir of possibleDirs) {
                if (matcher(dir)) {
                    return true;
                }
            }
        }

        return false;
    }

    findConfigs(loc: string) {
        findConfigs(path.dirname(loc)).forEach(({ filepath, dirname, options }) => {
            this.mergeConfig({
                type: "options",
                options,
                alias: filepath,
                dirname
            });
        });
    }

    mergeConfig({ type, options: rawOpts, alias, dirname }) {
        // Bail out ASAP if this file is ignored so that we run as little logic as possible on ignored files.
        if (this.filename && this.shouldIgnore(rawOpts.ignore || null, rawOpts.only || null, dirname)) {
            // TODO(logan): This is a really cross way to bail out. Avoid this in rewrite.
            throw Object.assign((new Error("This file has been ignored."): any), {
                code: "BABEL_IGNORED_FILE"
            });
        }

        const options = Object.assign({}, rawOpts);
        delete options.env;
        delete options.extends;

        const envKey = getEnv();

        if (!is.nil(rawOpts.env) && (typeof rawOpts.env !== "object" || is.array(rawOpts.env))) {
            throw new Error(".env block must be an object, null, or undefined");
        }

        const envOpts = rawOpts.env && rawOpts.env[envKey];

        if (!is.nil(envOpts) && (typeof envOpts !== "object" || is.array(envOpts))) {
            throw new Error(".env[...] block must be an object, null, or undefined");
        }

        if (envOpts) {
            this.mergeConfig({
                type,
                options: envOpts,
                alias: `${alias}.env.${envKey}`,
                dirname
            });
        }

        this.configs.push({
            type,
            options,
            alias,
            loc: alias,
            dirname
        });

        if (rawOpts.extends) {
            if (!is.string(rawOpts.extends)) {
                throw new Error(".extends must be a string");
            }

            const extendsConfig = loadConfig(rawOpts.extends, dirname);

            const existingConfig = this.configs.some((config) => {
                return config.alias === extendsConfig.filepath;
            });
            if (!existingConfig) {
                this.mergeConfig({
                    type: "options",
                    alias: extendsConfig.filepath,
                    options: extendsConfig.options,
                    dirname: extendsConfig.dirname
                });
            }
        }
    }
}

export default function buildConfigChain(opts: {}): Array<ConfigItem> | null {
    if (!is.string(opts.filename) && !is.nil(opts.filename)) {
        throw new Error(".filename must be a string, null, or undefined");
    }

    const filename = opts.filename ? path.resolve(opts.filename) : null;
    const builder = new ConfigChainBuilder(filename);

    try {
        builder.mergeConfig({
            type: "arguments",
            options: opts,
            alias: "base",
            dirname: process.cwd()
        });

        // resolve all .babelrc files
        if (opts.babelrc !== false && filename) {
            builder.findConfigs(filename);
        }
    } catch (e) {
        if (e.code !== "BABEL_IGNORED_FILE") {
            throw e;
        }

        return null;
    }

    return builder.configs.reverse();
}
