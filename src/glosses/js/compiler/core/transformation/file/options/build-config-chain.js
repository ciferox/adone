// @flow

import adone from "adone";
import type Logger from "../logger";
import resolve from "../../../helpers/resolve";
const { std: { path, fs } } = adone;

const existsCache = {};
const jsonCache = {};

const IGNORE_FILENAME = ".acompiler_ignore";
const RC_FILENAME = ".acompiler_rc";
const PACKAGE_FILENAME = "package.json";

function exists(filename) {
    const cached = existsCache[filename];
    if (cached == null) {
        return existsCache[filename] = fs.existsSync(filename);
    } else {
        return cached;
    }
}

export default function buildConfigChain(opts: Object = {}, log?: Logger) {
    const filename = opts.filename;
    const builder = new ConfigChainBuilder(log);

    // resolve all .compiler_rc files
    if (opts.rc !== false) {
        builder.findConfigs(filename);
    }

    builder.mergeConfig({
        options: opts,
        alias: "base",
        dirname: filename && path.dirname(filename)
    });

    return builder.configs;
}

class ConfigChainBuilder {
    constructor(log?: Logger) {
        this.resolvedConfigs = [];
        this.configs = [];
        this.log = log;
    }

    findConfigs(loc) {
        if (!loc) return;

        if (!path.isAbsolute(loc)) {
            loc = path.join(process.cwd(), loc);
        }

        let foundConfig = false;
        let foundIgnore = false;

        while (loc !== (loc = path.dirname(loc))) {
            if (!foundConfig) {
                const configLoc = path.join(loc, RC_FILENAME);
                if (exists(configLoc)) {
                    this.addConfig(configLoc);
                    foundConfig = true;
                }

                const pkgLoc = path.join(loc, PACKAGE_FILENAME);
                if (!foundConfig && exists(pkgLoc)) {
                    foundConfig = this.addConfig(pkgLoc, "acompiler", adone.data.json);
                }
            }

            if (!foundIgnore) {
                const ignoreLoc = path.join(loc, IGNORE_FILENAME);
                if (exists(ignoreLoc)) {
                    this.addIgnoreConfig(ignoreLoc);
                    foundIgnore = true;
                }
            }

            if (foundIgnore && foundConfig) return;
        }
    }

    addIgnoreConfig(loc) {
        const file = fs.readFileSync(loc, "utf8");
        let lines = file.split("\n");

        lines = lines
            .map((line) => line.replace(/#(.*?)$/, "").trim())
            .filter((line) => !!line);

        if (lines.length) {
            this.mergeConfig({
                options: { ignore: lines },
                alias: loc,
                dirname: path.dirname(loc)
            });
        }
    }

    addConfig(loc: string, key?: string, json = adone.data.json5): boolean {
        if (this.resolvedConfigs.indexOf(loc) >= 0) {
            return false;
        }

        this.resolvedConfigs.push(loc);

        const content = fs.readFileSync(loc, "utf8");
        let options;

        try {
            options = jsonCache[content] = jsonCache[content] || json.decode(content);
            if (key) options = options[key];
        } catch (err) {
            err.message = `${loc}: Error while parsing JSON - ${err.message}`;
            throw err;
        }

        this.mergeConfig({
            options,
            alias: loc,
            dirname: path.dirname(loc)
        });

        return !!options;
    }

    mergeConfig({
        options,
        alias,
        loc,
        dirname
    }) {
        if (!options) {
            return false;
        }

        options = Object.assign({}, options);

        dirname = dirname || process.cwd();
        loc = loc || alias;

        // add extends clause
        if (options.extends) {
            const extendsLoc = resolve(options.extends, dirname);
            if (extendsLoc) {
                this.addConfig(extendsLoc);
            } else {
                if (this.log) this.log.error(`Couldn't resolve extends clause of ${options.extends} in ${alias}`);
            }
            delete options.extends;
        }

        this.configs.push({
            options,
            alias,
            loc,
            dirname
        });

        // env
        let envOpts;
        const envKey = process.env.ACOMPILER_ENV || process.env.NODE_ENV || "development";
        if (options.env) {
            envOpts = options.env[envKey];
            delete options.env;
        }

        this.mergeConfig({
            options: envOpts,
            alias: `${alias}.env.${envKey}`,
            dirname
        });
    }
}
