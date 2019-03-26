const {
    is,
    fs,
    realm,
    std,
    util
} = adone;

export const create = async (info) => {
    const configPath = std.path.join(info.cwd, realm.Configuration.configName);
    if (await fs.exists(configPath)) {
        throw new adone.error.ExistsException(`Configuration '${configPath}' already exists`);
    }

    const config = new realm.Configuration({
        cwd: info.cwd
    });
    config.merge(util.pick(info, ["struct"]));
    return config.save();
};

export const load = async ({ cwd } = {}) => realm.Configuration.load({ cwd });

export const createDev = async ({ superRealm, cwd, mergedAs } = {}) => {
    const configPath = std.path.join(cwd, realm.DevConfiguration.configName);
    if (await fs.exists(configPath)) {
        throw new adone.error.ExistsException(`Configuration '${configPath}' already exists`);
    }

    const config = new realm.DevConfiguration({
        cwd
    });
    config.set("superRealm", superRealm.cwd);
    if (is.string(mergedAs)) {
        config.set("mergedAs", mergedAs);
    }

    return config.save();
};
