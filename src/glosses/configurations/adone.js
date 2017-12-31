const {
    is,
    fs,
    std
} = adone;

const SUB_CONFIGS = Symbol();

const normalizeValue = (dirName, parent, item, name) => {
    const val = item[name];
    if (is.array(val)) {
        const vals = [];
        for (let i = 0; i < val.length; i++) {
            vals.push(val[i].startsWith("!") ? `!${std.path.join(dirName, val[i].substr(1))}` : std.path.join(dirName, val[i]));
        }
        return vals;
    } else if (is.string(val)) {
        return std.path.join(dirName, val);
    }

    if (is.plainObject(parent)) {
        return normalizeValue(dirName, null, parent, name);
    }
    return val;
};

export default class Configuration extends adone.configuration.Generic {
    constructor({ cwd } = {}) {
        super({ cwd });

        this[SUB_CONFIGS] = new Map();
    }

    /**
     * Returns full name.
     */
    getFullName() {
        return is.string(this.raw.type) ? `${this.raw.type}.${this.raw.name}` : this.raw.name;
    }

    /**
     * Returns absolute path of configuration.
     */
    getPath() {
        return std.path.join(this.cwd, Configuration.configName);
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
        await super.load(Configuration.configName);
        await this._loadSubConfigs("", this.raw.struct);

        // validate
        this.getNamespaceTopology();
    }

    async loadSync() {
        super.loadSync(Configuration.configName);
        // await this._loadSubConfigs("", this.raw.struct);

        // validate
        this.getNamespaceTopology();
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

        return super.save(is.string(cwd) ? std.path.join(cwd, Configuration.configName) : Configuration.configName, null, {
            space: "    "
        });
    }

    getMainPath() {
        if (is.string(this.raw.main)) {
            return this.raw.main;
        }
        return "index.js";
    }

    getEntries(path) {
        let result = this._getEntries();

        for (const [key, sub] of this[SUB_CONFIGS].entries()) {
            result = result.concat(sub.config._getEntries(key, sub.dirName));
        }

        return is.string(path) ? result.filter((entry) => entry.id.startsWith(path)) : result;
    }

    getNamespaceTopology() {
        const topo = {};

        if (is.plainObject(this.raw.struct)) {
            let count = 0;
            let exposedNode;
            // Validate
            for (const [, val] of Object.entries(this.raw.struct)) {
                if (is.string(val.namespace)) {
                    count++;
                    exposedNode = val;
                }
            }

            if (count > 1) {
                throw new adone.x.NotAllowed("It is not allowed to expose multiple root namespaces");
            } else if (count === 1) {
                const iterateDeep = (struct, nsTopo) => {
                    if (!is.plainObject(struct)) {
                        return;
                    }
                    const namespaces = {};
                    for (const item of Object.values(struct)) {
                        if (is.string(item.namespace)) {
                            const ns = {
                                ...adone.util.pick(item, ["index", "description"])
                            };

                            if (is.plainObject(item.struct)) {
                                iterateDeep(item.struct, ns);
                            }
                            namespaces[item.namespace] = ns;
                        }
                    }

                    if (Object.keys(namespaces).length > 0) {
                        nsTopo.namespace = namespaces;
                    }
                };

                topo[exposedNode.namespace] = {
                    ...adone.util.pick(exposedNode, ["index", "description"])
                };

                iterateDeep(exposedNode.struct, topo[exposedNode.namespace]);
            }
        }

        return topo;
    }

    _getEntries(prefix = "", dirName = "") {
        const units = {};
        const entries = [];

        if (is.plainObject(this.raw.struct)) {
            this._parseStructure(prefix, dirName, this.raw, this.raw.struct, units);

            // Convert object to array
            const keys = Object.keys(units);
            for (const key of keys) {
                entries.push({
                    id: key,
                    ...units[key]
                });
            }
        }

        return entries;
    }

    _parseStructure(prefix, dirName, parent, struct, units) {
        for (const [key, val] of Object.entries(struct)) {
            if (is.plainObject(val)) {
                const fullKey = prefix.length > 0 ? `${prefix}.${key}` : key;
                if (is.plainObject(val.struct)) {
                    this._parseStructure(fullKey, dirName, val, val.struct, units);
                } else {
                    const unit = units[fullKey] = {
                        ...adone.util.omit(val, ["struct", "src", "dst", "task"])
                    };
    
                    const src = normalizeValue(dirName, parent, val, "src");
                    if (src) {
                        unit.src = src;
                    }
    
                    const dst = normalizeValue(dirName, parent, val, "dst");
                    if (dst) {
                        unit.dst = dst;
                    }
    
                    const task = normalizeValue(dirName, parent, val, "task");
                    if (task) {
                        unit.task = task;
                    }
    
                }
            }
        }
    }

    async _loadSubConfigs(prefix, struct) {
        this[SUB_CONFIGS].clear();
        if (is.plainObject(struct)) {
            for (const [key, val] of Object.entries(struct)) {
                const fullKey = prefix.length > 0 ? `${prefix}.${key}` : key;
                if (is.string(val)) {
                    const subCwd = std.path.join(this.getCwd(), val);

                    const subConfigPath = std.path.join(subCwd, Configuration.configName);
                    // eslint-disable-next-line
                    if (!(await fs.exists(subConfigPath))) {
                        throw new adone.x.NotExists(`Configuration '${subConfigPath}' is not exist`);
                    }

                    this[SUB_CONFIGS].set(fullKey, {
                        dirName: val,
                        // eslint-disable-next-line
                        config: await Configuration.load({
                            cwd: subCwd
                        })
                    });
                } else if (is.plainObject(val.struct)) {
                    await this._loadSubConfigs(fullKey, val.struct); // eslint-disable-line
                }
            }
        }
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

    static configName = "adone.json";
}
