const {
    fs,
    configuration,
    std,
    util
} = adone;

const PACKAGE_PROPS = [
    "name",
    "description",
    "version",
    "author",
    "bin",
    "main",
    "license",
    "realmType"
];

export const create = async (info) => {
    const configPath = std.path.join(info.cwd, configuration.Npm.configName);
    if (await fs.exists(configPath)) {
        throw new adone.error.ExistsException(`Package file '${configPath}' already exists`);
    }

    const config = new configuration.Npm({
        cwd: info.cwd
    });
    config.merge(util.pick(info, PACKAGE_PROPS));
    return config.save();
};

export const load = async ({ cwd } = {}) => configuration.Npm.load({ cwd });
