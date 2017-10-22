const {
    fs,
    omnitron: { STATUS },
    std,
    vault,
    x
} = adone;

export default class SystemDB {
    constructor() {
        this.raw = new vault.Vault({
            location: adone.realm.config.omnitron.dbPath
        });
    }

    async open() {
        await fs.mkdirp(adone.realm.config.omnitron.varPath);
        await this.raw.open();
    }

    async close() {
        await this.raw.close();
    }

    getValuable(name) {
        if (!this.raw.has(name)) {
            return this.raw.create(name);
        }
        return this.raw.get(name);
    }

    getServicesValuable() {
        return this.getValuable("$services");
    }

    async registerService(name) {
        const servicesMeta = await this.getServicesValuable();
        const services = vault.slice(servicesMeta, "service");

        if (services.has(name)) {
            throw new x.Exists(`Service '${name}' is already registered`);
        }

        const servicePath = std.path.join(adone.realm.config.omnitron.servicesPath, name);
        const adoneConf = await adone.project.Configuration.load({
            cwd: servicePath
        });

        return services.set(name, Object.assign({
            description: "",
            version: "",
            author: ""
        }, adone.util.pick(adoneConf.raw, ["name", "version", "description", "author"]), {
            group: `group-${adone.text.random(16)}`,
            status: STATUS.DISABLED,
            mainPath: std.path.join(servicePath, adoneConf.getMainPath())
        }));
    }

    async unregisterService(name) {
        const servicesMeta = await this.getServicesValuable();
        const services = vault.slice(servicesMeta, "service");

        if (!services.has(name)) {
            throw new x.NotExists(`Service '${name}' does not exist`);
        }

        return services.delete(name);
    }
}
