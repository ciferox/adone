const {
    is,
    std
} = adone;

const CONFIG_NAME = "omnitron.json";

export default class OmnitronConfiguration extends adone.configuration.Generic {
    /**
     * Returns absolute path of configuration.
     */
    getPath() {
        return std.path.join(this.getCwd(), CONFIG_NAME);
    }

    load() {
        return super.load(CONFIG_NAME);
    }

    save() {
        return super.save(CONFIG_NAME, null, {
            space: "    "
        });
    }

    static async load({ cwd } = {}) {
        if (!is.string(cwd)) {
            const realmManager = await adone.realm.getManager();
            cwd = realmManager.config.CONFIGS_PATH;
        }

        const config = new OmnitronConfiguration({
            cwd
        });

        if (await adone.fs.exists(config.getPath())) {
            // assign config from home
            await config.load(CONFIG_NAME);
            adone.lodash.defaultsDeep(config.raw, OmnitronConfiguration.default);
        } else {
            config.raw = OmnitronConfiguration.default;
            await config.save();
        }

        return config;
    }

    static configName = CONFIG_NAME;

    static default = {
        netCores: {
        }
    };
}
