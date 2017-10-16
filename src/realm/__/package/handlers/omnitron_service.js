const {
    is,
    fs,
    std
} = adone;

const __ = adone.private(adone.realm);

export default class OmnitronServiceHandler extends __.AbstractHandler {
    constructor(pkg) {
        super(pkg, "Omnitron services", "omnitron.service");
    }

    async register(adoneConf, destPath) {
        await fs.mkdirp(adone.config.omnitron.servicesPath);
        
        const servicePath = std.path.join(adone.config.omnitron.servicesPath, adoneConf.raw.name);
        if (await fs.exists(servicePath)) {
            await fs.rm(servicePath);
        }

        if (is.windows) {
            await fs.symlink(destPath, servicePath, "junction");
        } else {
            await fs.symlink(destPath, servicePath);
        }
    }

    unregister(adoneConf) {
        return fs.rm(std.path.join(adone.config.omnitron.servicesPath, adoneConf.raw.name));
    }

    list() {
        return fs.readdir(adone.config.omnitron.servicesPath);
    }
}
