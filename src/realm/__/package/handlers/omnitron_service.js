const {
    is,
    fs,
    std,
    omnitron: { dispatcher }
} = adone;

const __ = adone.private(adone.realm);

export default class OmnitronServiceHandler extends __.AbstractHandler {
    constructor(pkg) {
        super(pkg, "Omnitron services", "omnitron.service");
    }

    async register(adoneConf, destPath) {
        await fs.mkdirp(adone.realm.config.omnitron.servicesPath);
        
        const servicePath = std.path.join(adone.realm.config.omnitron.servicesPath, adoneConf.raw.name);
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
        return fs.rm(std.path.join(adone.realm.config.omnitron.servicesPath, adoneConf.raw.name));
    }

    list() {
        return fs.readdir(adone.realm.config.omnitron.servicesPath);
    }
}
