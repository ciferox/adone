const {
    is,
    fs,
    std,
    omnitron,
    realm
} = adone;

export default class OmnitronServiceHandler extends realm.TypeHandler {
    constructor(pkg) {
        super(pkg, "Omnitron services", "omnitron.service");
    }

    async register(adoneConf, destPath) {
        await fs.mkdirp(this.manager.config.omnitron.SERVICES_PATH);

        const servicePath = std.path.join(this.manager.config.omnitron.SERVICES_PATH, adoneConf.raw.name);
        if (await fs.exists(servicePath)) {
            await fs.remove(servicePath);
        }

        await fs.symlink(destPath, servicePath, is.windows ? "junction" : undefined);

        await omnitron.dispatcher.registerService(adoneConf.raw.name);
    }

    async unregister(adoneConf) {
        await omnitron.dispatcher.unregisterService(adoneConf.raw.name);
        return fs.remove(std.path.join(this.manager.config.omnitron.SERVICES_PATH, adoneConf.raw.name));
    }

    list() {
        return fs.readdir(this.manager.config.omnitron.SERVICES_PATH);
    }

    checkAndRemove(name) {
        return false;
    }
}
