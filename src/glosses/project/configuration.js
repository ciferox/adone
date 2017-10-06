const {
    is,
    fs,
    std
} = adone;

const CONFIG_NAME = "adone.json";

const RELATIVE_DIR = Symbol();
const SUB_CONFIGS = Symbol();
const ENTRIES = Symbol();

export default class ProjectConfiguration extends adone.configuration.FileConfiguration {
    constructor({ cwd, relativeDir } = {}) {
        super({ cwd });

        this[RELATIVE_DIR] = is.string(relativeDir) ? relativeDir : "";
        this[SUB_CONFIGS] = new Map();
        this[ENTRIES] = null;
    }

    getSubConfigs() {
        return this[SUB_CONFIGS];
    }

    getSubConfig(name) {
        return this[SUB_CONFIGS].get(name);
    }

    async load() {
        await super.load(std.path.join(this[RELATIVE_DIR], CONFIG_NAME), null);

        const units = {};

        await this._parseProjectStructure("", this.project.structure, units);

        // Convert object to array
        const keys = Object.keys(units);
        const entries = [];

        for (const key of keys) {
            entries.push(Object.assign({
                $id: key
            }, units[key]));
        }

        this[ENTRIES] = entries;
    }

    async save() {
        for (const config of this[SUB_CONFIGS].values()) {
            await config.save(); // eslint-disable-line
        }
        return super.save(CONFIG_NAME, null);
    }

    getProjectEntries(path) {
        const result = this[ENTRIES].slice();

        for (const [key, subConfig] of this[SUB_CONFIGS].entries()) {
            const subEntries = subConfig.getProjectEntries();
            for (const entry of subEntries) {
                result.push(Object.assign({}, entry, {
                    $id: `${key}.${entry.$id}`
                }));
            }
        }

        if (is.string(path)) {
            return result.filter((entry) => entry.$id.startsWith(path));
        }
        return result;
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
                            val[i] = val[i].startsWith("!") ? `!${std.path.join(this[RELATIVE_DIR], val[i].substr(1))}` : std.path.join(this[RELATIVE_DIR], val[i]);
                        }
                        units[prefix][key] = val;
                    } else {
                        units[prefix][key] = std.path.join(this[RELATIVE_DIR], val);
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

                // eslint-disable-next-line
                const subConfig = await ProjectConfiguration.load({
                    cwd: this.getCwd(),
                    relativeDir: val
                });

                adone.vendor.lodash.defaults(subConfig, adone.vendor.lodash.omit(this, ["project"]));

                this[SUB_CONFIGS].set(fullKey, subConfig);
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
