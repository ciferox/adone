const {
    fs,
    is,
    omnitron: { STATUS },
    std,
    vault,
    x
} = adone;

const __ = adone.lazify({
    ServiceValuable: "./service_valuable"
}, null, require);

const VALUABLES_SYMBOL = Symbol();
const SERVICE_VALUABLES_SYMBOL = Symbol();

export default class DB {
    constructor() {
        this.raw = new vault.Vault({
            location: adone.realm.config.omnitron.dbPath
        });
        this[VALUABLES_SYMBOL] = new Map();
        this[SERVICE_VALUABLES_SYMBOL] = new Map();
    }

    async open() {
        await fs.mkdirp(adone.realm.config.omnitron.varPath);
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
     * Returns contextable valuable used by the each service itself to store own runtime configuration.
     */
    async getServiceConfiguration(name) {
        let val = this[SERVICE_VALUABLES_SYMBOL].get(name);
        if (is.undefined(val)) {
            val = await this.getValuable("$service", name);
            const serviceVal = new __.ServiceValuable(val);
            this[SERVICE_VALUABLES_SYMBOL].set(name, serviceVal);
            return serviceVal;
        }
        return val;
    }

    async registerService(name) {
        const services = await this.getMetaValuable("service");

        if (services.has(name)) {
            throw new x.Exists(`Service '${name}' is already registered`);
        }

        const servicePath = std.path.join(adone.realm.config.omnitron.servicesPath, name);
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
            throw new x.NotExists(`Service '${name}' does not exist`);
        }

        return services.delete(name);
    }
}
