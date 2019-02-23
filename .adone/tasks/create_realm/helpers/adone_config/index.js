const {
    configuration,
    fs,
    std,
    util
} = adone;

export const create = async (info) => {
    const configPath = std.path.join(info.cwd, "adone.json");
    if (await fs.exists(configPath)) {
        throw new adone.error.ExistsException(`Configuration '${configPath}' already exists`);
    }

    const config = new configuration.Adone({
        cwd: info.cwd
    });
    config.merge(util.pick(info, ["name", "description", "version", "author", "bin", "main", "struct"]));
    return config.save();
};

export const load = async ({ cwd } = {}) => configuration.Adone.load({ cwd });
