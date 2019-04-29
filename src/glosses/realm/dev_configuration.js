const {
    error,
    is,
    path,
    util: { arrify, omit }
} = adone;

const addIfNotIncluded = (arr, item, filter = adone.truly) => {
    for (const i of arrify(item)) {
        if (!arr.includes(i) && filter(i)) {
            arr.push(i);
        }
    }
};

export default class DevConfiguration extends adone.configuration.GenericConfig {
    constructor(options) {
        super(options);

        this.#applyDefaults();
    }

    async load(path, options) {
        await super.load(path, options);
        this.#applyDefaults();
    }

    loadSync(path, options) {
        super.loadSync(path, options);
        this.#applyDefaults();
    }

    #applyDefaults() {
        if (!is.string(this.raw.basedir)) {
            this.raw.basedir = this.cwd;
        }
    }

    /**
     * Returns absolute path of configuration.
     */
    getPath() {
        return path.join(this.cwd, DevConfiguration.configName);
    }

    getUnits(path) {
        const units = [];

        if (is.plainObject(this.raw.units)) {
            this._walkUnits("", this.raw.units, units);
        }

        let validator;
        if (is.regexp(path)) {
            validator = (unit) => path.test(unit.id);
        } else if (is.string(path)) {
            validator = path.endsWith(".")
                ? (unit) => unit.id.startsWith(path)
                : (unit) => unit.id === path;
        } else {
            return units;
        }

        return units.filter(validator);
    }

    _walkUnits(prefix, tree, units) {
        const srcs = [];
        for (const [key, val] of Object.entries(tree)) {
            if (is.plainObject(val)) {
                const fullKey = prefix.length > 0
                    ? `${prefix}.${key}`
                    : key;

                const unit = {
                    ...omit(val, ["units"])
                };

                if (unit.id) {
                    throw new error.NotAllowedException(`The 'id' property is special and should not be used explicitly. Got '${val.id}'`);
                }
                unit.id = fullKey;

                if (unit.src) {
                    if (!unit.task) {
                        if (this.raw.defaultTask) {
                            unit.task = this.raw.defaultTask;
                        } else {
                            throw new error.NotValidException(`Unit '${fullKey}' without task`);
                        }
                    }

                    addIfNotIncluded(srcs, unit.src, (i) => !i.startsWith("!"));
                }

                if (is.plainObject(val.units)) {
                    const childSrcs = this._walkUnits(fullKey, val.units, units);
                    if (childSrcs.length > 0) {
                        addIfNotIncluded(srcs, childSrcs);

                        if (unit.src) {
                            let isSrcGlob = false;

                            for (const s of arrify(unit.src)) {
                                if (is.glob(s)) {
                                    isSrcGlob = true;
                                    break;
                                }
                            }

                            if (isSrcGlob) {
                                const excludes = [];
                                for (let childSrc of childSrcs) {
                                    if (!childSrc.startsWith("!")) {
                                        if (!is.glob(childSrc)) {
                                            childSrc = path.join(childSrc, "**", "*");
                                        }
                                        excludes.push(childSrc);
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
                } else if (val.units != null) {
                    throw new error.NotValidException(`Invalid type of nested units: ${adone.typeOf(val.units)}. Should be plain object`);
                }

                // add only units with defined task
                if (unit.task) {
                    units.push(unit);
                }
            }
        }

        return srcs;
    }

    static async load({ cwd } = {}) {
        const config = new DevConfiguration({
            cwd
        });
        await config.load(DevConfiguration.configName, {
            transpile: true
        });
        return config;
    }

    static loadSync({ cwd } = {}) {
        const config = new DevConfiguration({
            cwd
        });
        config.loadSync(DevConfiguration.configName, {
            transpile: true
        });
        return config;
    }

    static configName = path.join(".adone", "dev");
}
