const {
    is,
    fs,
    std
} = adone;

const CONFIG_NAME = "adone.json";

const SUB_CONFIGS = Symbol();

export default class AdoneConfiguration extends adone.configuration.Generic {
    constructor({ cwd } = {}) {
        super({ cwd });

        this[SUB_CONFIGS] = new Map();
    }

    /**
     * Returns absolute path of configuration.
     */
    getPath() {
        return std.path.join(this.cwd, CONFIG_NAME);
    }

    /**
     * Returns sub configurations.
     */
    getSubConfigs() {
        return [...this[SUB_CONFIGS].values()];
    }

    /**
     * Returns subconfiguration by name.
     * 
     * @param {*} name entry name
     */
    getSubConfig(name) {
        return this[SUB_CONFIGS].get(name);
    }

    /**
     * Loads configuration.
     */
    async load() {
        await super.load(CONFIG_NAME);
        await this._loadSubConfigs("", this.raw.structure);
    }

    /**
     * Saves configuration.
     * 
     * @param {*} cwd path where config should be saved
     */
    async save({ cwd = this.getCwd(), subConfigs = false } = {}) {
        if (subConfigs) {
            for (const config of this[SUB_CONFIGS].values()) {
                await config.save({ cwd }); // eslint-disable-line
            }
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

    getEntries(path = null) {
        let result = this._getEntries();

        for (const [key, sub] of this[SUB_CONFIGS].entries()) {
            result = result.concat(sub.config._getEntries(key, sub.dirName));
        }

        return (is.string(path) ? result.filter((entry) => entry.$id.startsWith(path)) : result);
    }

    _getEntries(prefix = "", dirName = "") {
        const units = {};
        const entries = [];

        if (is.plainObject(this.raw.structure)) {
            this._parseStructure(prefix, dirName, this.raw.structure, units);

            // Convert object to array
            const keys = Object.keys(units);
            for (const key of keys) {
                entries.push({
                    $id: key,
                    ...units[key]
                });
            }
        }

        return entries;
    }

    _parseStructure(prefix, dirName, schema, units) {
        for (const [key, val] of Object.entries(schema)) {
            const fullKey = (prefix.length > 0 ? `${prefix}.${key}` : key);
            if (is.string(key) && key.startsWith("$")) {
                if (!is.propertyOwned(units, prefix)) {
                    units[prefix] = {};
                }
                switch (key) {
                    case "$src":
                    case "$dst": {
                        if (is.array(val)) {
                            const vals = [];
                            for (let i = 0; i < val.length; i++) {
                                vals.push(val[i].startsWith("!") ? `!${std.path.join(dirName, val[i].substr(1))}` : std.path.join(dirName, val[i]));
                            }
                            units[prefix][key] = vals;
                        } else {
                            units[prefix][key] = std.path.join(dirName, val);
                        }
                        break;
                    }
                    default:
                        units[prefix][key] = val;
                }
            } else if (is.plainObject(val)) {
                this._parseStructure(fullKey, dirName, val, units); // eslint-disable-line
            }
        }
    }

    async _loadSubConfigs(prefix, schema) {
        if (is.plainObject(schema)) {
            for (const [key, val] of Object.entries(schema)) {
                const fullKey = (prefix.length > 0 ? `${prefix}.${key}` : key);
                if (is.string(val) && !key.startsWith("$")) {
                    const subCwd = std.path.join(this.getCwd(), val);

                    const subConfigPath = std.path.join(subCwd, CONFIG_NAME);
                    // eslint-disable-next-line
                    if (!(await fs.exists(subConfigPath))) {
                        throw new adone.x.NotExists(`Configuration '${subConfigPath}' not exists`);
                    }

                    this[SUB_CONFIGS].set(fullKey, {
                        dirName: val,
                        // eslint-disable-next-line
                        config: await AdoneConfiguration.load({
                            cwd: subCwd
                        })
                    });
                } else if (is.plainObject(val)) {
                    await this._loadSubConfigs(fullKey, val); // eslint-disable-line
                }
            }
        }
    }

    static async load({ cwd } = {}) {
        const config = new AdoneConfiguration({
            cwd
        });
        await config.load();
        return config;
    }

    /**
     * Returns name of configuration file.
     */
    static get name() {
        return CONFIG_NAME;
    }
}
