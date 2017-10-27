const {
    is,
    fs,
    std
} = adone;

const CONFIG_NAME = "adone.json";

const RELATIVE_PATH = Symbol();
const SUB_CONFIGS = Symbol();
const ENTRIES = Symbol();

export default class ProjectConfiguration extends adone.configuration.FileConfiguration {
    constructor({ cwd, relativeDir } = {}) {
        super({ cwd });

        this[RELATIVE_PATH] = is.string(relativeDir) ? relativeDir : "";
        this[SUB_CONFIGS] = new Map();
        this[ENTRIES] = null;
    }

    getName() {
        return CONFIG_NAME;
    }

    getPath() {
        return std.path.join(this.cwd, CONFIG_NAME);
    }

    getRelativePath() {
        return this[RELATIVE_PATH];
    }

    /**
     * Returns array of sub configurations by type
     * @param {*} type configuration type: 'rel', 'orig', 'origFull'.
     */
    getSubConfigs(type) {
        if (is.string(type)) {
            return [...this[SUB_CONFIGS].values()].map((cfg) => cfg[type]);
        }
        return [...this[SUB_CONFIGS].values()];
    }

    getSubConfig(name, type = "rel") {
        return this[SUB_CONFIGS].get(name)[type];
    }

    async load() {
        await super.load(std.path.join(this[RELATIVE_PATH], CONFIG_NAME), null);

        const units = {};

        const entries = [];
        if (is.plainObject(this.raw.structure)) {
            await this._parseProjectStructure("", this.raw.structure, units);

            // Convert object to array
            const keys = Object.keys(units);

            for (const key of keys) {
                entries.push(Object.assign({
                    $id: key
                }, units[key]));
            }
        }

        this[ENTRIES] = entries;
    }

    async save(cwd) {
        for (const config of this[SUB_CONFIGS].values()) {
            await config.save(cwd); // eslint-disable-line
        }
        return super.save(is.string(cwd) ? std.path.join(cwd, CONFIG_NAME) : CONFIG_NAME, null, {
            space: "    "
        });
    }

    getMainPath() {
        if (is.string(this.raw.main)) {
            return this.raw.main;
        }
        return "index.js";
    }

    getProjectEntries({ path = null, type = "rel" } = {}) {
        let result = this[ENTRIES].slice();
        const isRel = type === "rel";

        for (const [key, subConfig] of this[SUB_CONFIGS].entries()) {
            const subEntries = subConfig[type].getProjectEntries({
                path,
                type
            });
            for (const entry of subEntries) {
                const $fullId = `${key}.${entry.$id}`;
                result.push(Object.assign({}, entry, {
                    $fullId,
                    $id: isRel ? `${key}.${entry.$id}` : entry.$id
                }));
            }
        }

        if (is.string(path)) {
            result = result.filter((entry) => {
                if (is.string(entry.$fullId)) {
                    return entry.$fullId.startsWith(path);
                }
                return entry.$id.startsWith(path);
            });
        }
        return result.map((x) => {
            delete x.$fullId;
            return x;
        });
    }

    async _parseProjectStructure(prefix, schema, units) {
        for (const [key, val] of Object.entries(schema)) {
            const fullKey = (prefix.length > 0 ? `${prefix}.${key}` : key);
            if (key.startsWith("$")) {
                if (!is.propertyOwned(units, prefix)) {
                    units[prefix] = {};
                }
                if (["$src", "$dst"].includes(key)) {
                    if (is.array(val)) {
                        for (let i = 0; i < val.length; i++) {
                            val[i] = val[i].startsWith("!") ? `!${std.path.join(this[RELATIVE_PATH], val[i].substr(1))}` : std.path.join(this[RELATIVE_PATH], val[i]);
                        }
                        units[prefix][key] = val;
                    } else {
                        units[prefix][key] = std.path.join(this[RELATIVE_PATH], val);
                    }
                } else {
                    units[prefix][key] = val;
                }
            } else if (is.plainObject(val)) {
                await this._parseProjectStructure(fullKey, val, units); // eslint-disable-line
            } else if (is.string(val)) {
                const subConfigPath = std.path.join(this.getCwd(), val);
                // eslint-disable-next-line
                if (!(await fs.exists(std.path.join(subConfigPath, CONFIG_NAME)))) {
                    throw new adone.x.NotExists(`Sub configuration '${fullKey}' not exists`);
                }

                const rootRaw = adone.vendor.lodash.omit(this.raw, ["structure"]);

                // eslint-disable-next-line
                const subConfigRel = await ProjectConfiguration.load({
                    cwd: this.getCwd(),
                    relativeDir: val
                });
                adone.vendor.lodash.defaults(subConfigRel.raw, rootRaw);

                const relCwd = std.path.join(this.getCwd(), val);

                // eslint-disable-next-line
                const subConfigOrig = await ProjectConfiguration.load({
                    cwd: relCwd
                });

                // eslint-disable-next-line
                const subConfigOrigFull = await ProjectConfiguration.load({
                    cwd: relCwd
                });
                adone.vendor.lodash.defaults(subConfigOrigFull.raw, rootRaw);

                this[SUB_CONFIGS].set(fullKey, {
                    orig: subConfigOrig,
                    origFull: subConfigOrigFull,
                    rel: subConfigRel
                });
            }
        }
    }

    static async load({ cwd, relativeDir } = {}) {
        const config = new ProjectConfiguration({
            cwd,
            relativeDir
        });
        await config.load();
        return config;
    }
}
