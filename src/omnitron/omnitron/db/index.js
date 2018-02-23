import Valuable from "./valuable";
import Configuration from "./configuration";

const {
    fs,
    is,
    omnitron: { STATUS },
    std,
    vault,
    error
} = adone;

const VALUABLES_SYMBOL = Symbol();
const SERVICE_VALUABLES_SYMBOL = Symbol();
const CONFIGURATION_SYMBOL = Symbol();

export default class DB {
    constructor() {
        this.raw = new vault.Vault({
            location: adone.realm.config.omnitron.DB_PATH
        });
        this[VALUABLES_SYMBOL] = new Map();
        this[SERVICE_VALUABLES_SYMBOL] = new Map();
        this[CONFIGURATION_SYMBOL] = undefined;
    }

    async open() {
        await fs.mkdirp(adone.realm.config.omnitron.VAR_PATH);
        await this.raw.open();
    }

    async close() {
        this[VALUABLES_SYMBOL].clear();
        this[SERVICE_VALUABLES_SYMBOL].clear();
        await this.raw.close();
    }

    async getValuable(name, slice) {
        let fullName;
        if (is.string(slice)) {
            fullName += `${name}.${slice}`;
        } else {
            fullName = name;
        }

        let val = this[VALUABLES_SYMBOL].get(fullName);
        if (is.undefined(val)) {
            if (!this.raw.has(name)) {
                val = await this.raw.create(name);
            } else {
                val = await this.raw.get(name);
            }
            if (is.string(slice)) {
                val = vault.slice(val, slice);
            }
            this[VALUABLES_SYMBOL].set(fullName, val);
        }
        return val;
    }

    /**
     * Returns meta valuable used for storing omnitron internal data.
     * 
     * Reserved key prefixes:
     * - 'service.' - used for storing runtime service configurations
     * 
     * @param {string?} slice name of sliced valuable
     */
    getMetaValuable(slice) {
        return this.getValuable("$meta", slice);
    }

    /**
     * Returns omnitron configuration valuable
     */
    async getConfiguration() {
        if (is.undefined(this[CONFIGURATION_SYMBOL])) {            
            this[CONFIGURATION_SYMBOL] = await Configuration.load(await this.getValuable("$config"));
        }
        return this[CONFIGURATION_SYMBOL];
    }

    /**
     * Returns contextable valuable used by the each service itself to store own runtime configuration.
     */
    async getServiceConfiguration(name) {
        let val = this[SERVICE_VALUABLES_SYMBOL].get(name);
        if (is.undefined(val)) {
            val = await this.getValuable("$service", name);
            const serviceVal = new Valuable(val);
            this[SERVICE_VALUABLES_SYMBOL].set(name, serviceVal);
            return serviceVal;
        }
        return val;
    }

    async registerService(name) {
        const services = await this.getMetaValuable("service");

        if (services.has(name)) {
            throw new error.Exists(`Service '${name}' is already registered`);
        }

        const servicePath = std.path.join(adone.realm.config.omnitron.SERVICES_PATH, name);
        const adoneConf = await adone.configuration.Adone.load({
            cwd: servicePath
        });

        return services.set(name, Object.assign(
            {
                description: "",
                version: "",
                author: ""
            }, adone.util.pick(adoneConf.raw, ["name", "version", "description", "author"]),
            {
                group: `group-${adone.text.random(16)}`,
                status: STATUS.DISABLED,
                mainPath: std.path.join(servicePath, adoneConf.getMainPath())
            }
        ));
    }

    async unregisterService(name) {
        const services = await this.getMetaValuable("service");

        if (!services.has(name)) {
            throw new error.NotExists(`Service '${name}' does not exist`);
        }

        return services.delete(name);
    }

    static async open() {
        const db = new DB();
        await db.open();
        return db;
    }
}
