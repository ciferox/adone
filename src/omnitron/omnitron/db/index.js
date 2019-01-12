const {
    fs,
    is,
    netron: { meta: { Context, Public } },
    vault,
    error
} = adone;

const configuration = adone.lazify({
    common: "./configurations/common",
    networks: "./configurations/networks",
    services: "./configurations/services",
    registry: "./configurations/registry"
}, null, require);

const _VALUABLES = Symbol();
const _CONFIGS = Symbol();

/**
 * This class implements omnitron database.
 * 
 * Common valuables/configurations:
 *   '$config' - common omnitron configuration
 *   '$networks.<networkName>' - netron network's configurations
 *   '$services.<serviceName>' - service's configurations.
 *   '$registry' - services registry
 */
@Context({
    public: true,
    description: "Omnitron database"
})
class DB extends vault.Vault {
    static instance = null;

    constructor(options) {
        super(options);

        this[_VALUABLES] = new Map();
        this[_CONFIGS] = {
            common: {
                key: "$common",
                instance: null
            },
            networks: {
                key: "$networks",
                instance: null
            },
            services: {
                key: "$services",
                instance: null
            },
            registry: {
                key: "$registry",
                instance: null
            }
        };
    }

    /**
     * Returns list of available configuration names.
     */
    listConfigs() {
        return Object.keys(this[_CONFIGS]);
    }

    /**
     * Returns configuration with specified name.
     */
    @Public()
    async getConfiguration(name) {
        const configMeta = this[_CONFIGS][name];
        if (is.undefined(configMeta)) {
            throw new error.Unknown(`Unknown configuration: '${name}'`);
        }

        if (is.null(configMeta.instance)) {
            const config = await this._getValuable(configMeta.key, {
                Valuable: configuration[name]
            });
            await config.initialize();
            configMeta.instance = config;
        }
        return configMeta.instance;
    }

    async _getValuable(fullName, { Valuable } = {}) {
        const parts = fullName.split(".").filter(adone.identity);
        const name = parts[0];
        let slice;

        if (parts.length > 1) {
            slice = parts.slice(1);
        }

        let val = this[_VALUABLES].get(fullName);
        if (is.undefined(val)) {
            if (!this.has(name)) {
                val = await this.create(name, { Valuable });
            } else {
                val = await this.get(name, { Valuable });
            }
            if (is.string(slice)) {
                val = vault.slice(val, slice);
            }
            this[_VALUABLES].set(fullName, val);
        }
        return val;
    }

    static async open() {
        let db = DB.instance;

        if (is.null(db)) {
            db = new DB({
                location: adone.runtime.config.omnitron.DB_PATH
            });
            await fs.mkdirp(adone.runtime.config.omnitron.VAR_PATH);
            await db.open();
            DB.instance = db;
        }

        return db;
    }

    static async close() {
        if (DB.instance) {
            const db = DB.instance;
            db[_VALUABLES].clear();

            for (const meta of Object.values(db[_CONFIGS])) {
                if (!is.null(meta.instance)) {
                    await meta.instance.uninitialize(); // eslint-disable-line
                    meta.instance = null;
                }
            }
            await db.close();
            DB.instance = null;
        }
    }

    static async destroy(force = false) {
        if (DB.instance) {
            if (force) {
                await DB.close();
            } else {
                throw new error.IllegalState("Cannot destroy opened database");
            }
        }

        await fs.rm(adone.runtime.config.omnitron.DB_PATH);
    }
}

export default DB;
