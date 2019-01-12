const {
    error,
    netron: { meta: { Context } },
    omnitron: { STATUS },
    std,
    vault
} = adone;

const SERVICES_VALUABLE = Symbol();

@Context({
    public: true,
    private: ["initialize", "uninitialize"],
    description: "Services configurations"
})
export default class Services extends vault.Valuable {
    async registerService(name) {
        if (this[SERVICES_VALUABLE].has(name)) {
            throw new error.Exists(`Service '${name}' is already registered`);
        }

        const servicePath = std.path.join(adone.runtime.config.omnitron.SERVICES_PATH, name);
        const adoneConf = await adone.configuration.Adone.load({
            cwd: servicePath
        });

        await this[SERVICES_VALUABLE].set(name, {
            description: "",
            version: "",
            author: "",
            ...adone.util.pick(adoneConf.raw, ["name", "version", "description", "author"]),
            group: `group-${adone.text.random(16)}`,
            status: STATUS.DISABLED,
            mainPath: std.path.join(servicePath, adoneConf.getMainPath())
        });
    }

    async unregisterService(name) {
        if (!this[SERVICES_VALUABLE].has(name)) {
            throw new error.NotExists(`Service '${name}' does not exist`);
        }

        await this[SERVICES_VALUABLE].delete(name);
    }

    initialize() {
        this[SERVICES_VALUABLE] = this.slice("services");
    }

    uninitialize() {
    }
}    
