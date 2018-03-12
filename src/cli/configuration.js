const {
    is
} = adone;

const CONFIG_NAME = "cli.json";

export default class Configuration extends adone.configuration.Generic {
    getGroups() {
        return adone.util.arrify(this.raw.groups);
    }

    hasCommand(name) {
        return is.array(this.raw.commands) && this.raw.commands.findIndex((x) => x.name === name) >= 0;
    }

    getCommand(name) {
        if (!this.hasCommand(name)) {
            throw new adone.error.Unknown(`Unknown command: ${name}`);
        }
        return this.raw.commands.find((x) => x.name === name);
    }

    updateCommand(name, props) {
        if (!this.hasCommand(name)) {
            throw new adone.error.Unknown(`Unknown command: ${name}`);
        }
        const cmdInfo = this.raw.commands.find((x) => x.name === name);

        for (const [key, val] of Object.entries(props)) {
            if (is.undefined(val)) {
                delete cmdInfo[key];
            } else {
                cmdInfo[key] = val;
            }
        }
        return this.save();
    }

    deleteCommand(name) {
        if (is.array(this.raw.commands)) {
            const index = this.raw.commands.findIndex((x) => x.name === name);
            if (index >= 0) {
                this.raw.commands.splice(index, 1);
                return this.save();
            }
        }
    }

    getCommands() {
        return adone.util.arrify(this.raw.commands);
    }

    hasLink(linkName) {
        return is.array(this.raw.links) && this.raw.links.findIndex((x) => x.name === linkName) >= 0;
    }

    getLink(name) {
        if (!this.hasLink(name)) {
            throw new adone.error.Unknown(`Unknown link name: ${name}`);
        }
        return this.raw.links.find((x) => x.name === name);
    }

    addLink(linkInfo, updateIfExists = false) {
        const isExists = this.hasLink(linkInfo.name);
        if (isExists && !updateIfExists) {
            throw new adone.error.Exists(`Link '${linkInfo.name}' already exists`);
        }

        if (!is.array(this.raw.links)) {
            this.raw.links = [];
        }

        if (isExists) {
            const li = this.raw.links.find((x) => x.name === linkInfo.name);
            Object.assign(li, linkInfo);
        } else {
            this.raw.links.push(linkInfo);
        }

        return this.save();
    }

    deleteLink(name) {
        const index = this.raw.links.findIndex((x) => x.name === name);
        if (index >= 0) {
            this.raw.links.splice(index, 1);
            return this.save();
        }
    }

    getLinks() {
        return adone.util.arrify(this.raw.links);
    }

    load() {
        return super.load(CONFIG_NAME);
    }

    save() {
        return super.save(CONFIG_NAME, null, {
            space: "    "
        });
    }

    static async load() {
        const config = new Configuration({
            cwd: adone.realm.config.CONFIGS_PATH
        });

        if (await adone.fs.exists(Configuration.path)) {
            // assign config from home
            await config.load(CONFIG_NAME);
            adone.lodash.defaultsDeep(config.raw, Configuration.default);
        } else {
            config.raw = Configuration.default;
            await config.save();
        }
    
        return config;
    }

    static configName = CONFIG_NAME;

    static path = adone.std.path.join(adone.realm.config.CONFIGS_PATH, CONFIG_NAME);

    static default = {
        groups: [
            {
                name: "subsystem",
                description: "Subsystems"
            },
            {
                name: "cli",
                description: "Adone cli specific"
            },
            {
                name: "realm",
                description: "Code, packages and realm management"
            },
            {
                name: "dev",
                description: "Development and inspection stuff"
            }
        ]
    };
}
