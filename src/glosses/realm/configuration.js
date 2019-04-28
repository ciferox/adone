const {
    is,
    path: aPath,
    util: { omit, arrify }
} = adone;

const normalizeValue = (dirName, parent, item, name) => {
    const val = item[name];
    if (is.array(val)) {
        const result = [];
        for (const v of val) {
            result.push(v.startsWith("!")
                ? `!${aPath.join(dirName, v.slice(1))}`
                : aPath.join(dirName, v)
            );
        }
        return result;
    } else if (is.string(val)) {
        return (is.string(dirName))
            ? aPath.join(dirName, val)
            : val;
    }

    if (is.plainObject(parent)) {
        return normalizeValue(dirName, null, parent, name);
    }
    return val;
};

const addIfNotIncluded = (arr, item) => {
    for (const i of arrify(item)) {
        if (!arr.includes(i)) {
            arr.push(i);
        }
    }
};

export default class Configuration extends adone.configuration.GenericConfig {
    /**
     * Returns absolute path of configuration.
     */
    getPath() {
        return aPath.join(this.cwd, Configuration.configName);
    }

    /**
     * Loads configuration.
     */
    async load() {
        await super.load(Configuration.configName);
    }

    loadSync() {
        super.loadSync(Configuration.configName);
    }

    /**
     * Saves configuration.
     * 
     * @param {*} cwd path where config should be saved
     */
    async save({ cwd = this.cwd } = {}) {
        return super.save(is.string(cwd) ? aPath.join(cwd, Configuration.configName) : Configuration.configName, {
            space: "    "
        });
    }

    getEntries(path) {
        const units = {};
        const entries = [];

        if (is.plainObject(this.raw.scheme)) {
            this._parseScheme("", "", this.raw, this.raw.scheme, units);

            // Convert object to array
            const keys = Object.keys(units);
            for (const key of keys) {
                entries.push({
                    id: key,
                    ...units[key]
                });
            }
        }

        let validator;
        if (is.regexp(path)) {
            validator = (entry) => path.test(entry.id);
        } else {
            validator = (entry) => entry.id.startsWith(path);
        }

        return !is.nil(path) ? entries.filter(validator) : entries;
    }

    _parseScheme(prefix, dirName, parent, scheme, units) {
        const srcs = [];
        for (const [key, val] of Object.entries(scheme)) {
            if (is.plainObject(val)) {
                const fullKey = prefix.length > 0
                    ? `${prefix}.${key}`
                    : key;

                const unit = units[fullKey] = {
                    ...omit(val, ["scheme", "src", "dst", "task"])
                };

                const src = normalizeValue(dirName, null, val, "src");
                if (src) {
                    unit.src = (is.string(src) && src.endsWith("/"))
                        ? aPath.join(src, "**", "*")
                        : src;

                    addIfNotIncluded(srcs, src);
                }

                const dst = normalizeValue(dirName, parent, val, "dst");
                if (dst) {
                    unit.dst = dst;
                }

                const task = normalizeValue(null, null, val, "task");
                if (task) {
                    unit.task = task;
                }

                if (is.exist(val.native)) {
                    const nativeGlob = adone.glob.globize(val.native.src, { recursive: true });
                    addIfNotIncluded(srcs, nativeGlob);

                    if (is.string(unit.src)) {
                        unit.src = [unit.src];
                    }
                    if (is.array(unit.src)) {
                        addIfNotIncluded(unit.src, `!${nativeGlob}`);
                    }
                }

                if (is.plainObject(val.scheme)) {
                    const childSrcs = this._parseScheme(fullKey, dirName, val, val.scheme, units);
                    if (childSrcs.length > 0) {
                        addIfNotIncluded(srcs, childSrcs);

                        let isParentGlob = true;

                        if (is.string(unit.src) && !is.glob(unit.src)) {
                            isParentGlob = false;
                        } else if (is.array(unit.src)) {
                            isParentGlob = false;
                            for (const s of unit.src) {
                                if (is.glob(s)) {
                                    isParentGlob = true;
                                    break;
                                }
                            }
                        }

                        if (is.exist(unit.src) && isParentGlob) {
                            const excludes = [];
                            for (const src of childSrcs) {
                                if (is.string(src)) {
                                    if (!src.startsWith("!")) {
                                        excludes.push(src);
                                    }
                                } else { // array
                                    for (const s of src) {
                                        if (!s.startsWith("!")) {
                                            excludes.push(s);
                                        }
                                    }
                                }
                            }

                            const parents = excludes.map((x) => adone.glob.parent(x));
                            const prefix = adone.text.longestCommonPrefix(parents);
                            if (prefix === "") {
                                throw new adone.error.NotValidException(`No common glob prefix in '${fullKey}' block`);
                            }

                            unit.src = arrify(unit.src);
                            addIfNotIncluded(unit.src, excludes.map((x) => `!${x}`));
                        }
                    }
                }

                if (is.string(unit.task)) {
                    if (!is.exist(unit.src)) {
                        throw new adone.error.NotValidException(`No 'src' property needed by 'task' in '${fullKey}'`);
                    }

                    if (!is.exist(unit.dst)) {
                        unit.dst = ".";
                    }
                }

                if (!is.string(unit.index) && (is.exist(unit.src) || is.plainObject(val.scheme))) {
                    unit.index = "index.js";
                }
            }
        }

        return srcs;
    }

    static async load({ cwd } = {}) {
        const config = new Configuration({
            cwd
        });
        await config.load();
        return config;
    }

    static loadSync({ cwd } = {}) {
        const config = new Configuration({
            cwd
        });
        config.loadSync();
        return config;
    }

    static configName = aPath.join(".adone", "config.json");

    static default = {};
}
