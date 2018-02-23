const {
    is,
    fs,
    std,
    omnitron: { dispatcher },
    realm
} = adone;

export default class OmnitronServiceHandler extends realm.TypeHandler {
    constructor(pkg) {
        super(pkg, "Omnitron services", "omnitron.service");
    }

    async register(adoneConf, destPath) {
        await fs.mkdirp(adone.realm.config.omnitron.SERVICES_PATH);
        
        const servicePath = std.path.join(adone.realm.config.omnitron.SERVICES_PATH, adoneConf.raw.name);
        if (await fs.exists(servicePath)) {
            await fs.rm(servicePath);
        }

        if (is.windows) {
            await fs.symlink(destPath, servicePath, "junction");
        } else {
            await fs.symlink(destPath, servicePath);
        }

        await dispatcher.registerService(adoneConf.raw.name);
    }

    async unregister(adoneConf) {
        await dispatcher.unregisterService(adoneConf.raw.name);
        return fs.rm(std.path.join(adone.realm.config.omnitron.SERVICES_PATH, adoneConf.raw.name));
    }

    list() {
        return fs.readdir(adone.realm.config.omnitron.SERVICES_PATH);
    }

    checkAndRemove(name) {
        return false;
    }
}
