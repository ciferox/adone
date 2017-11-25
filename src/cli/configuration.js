const {
    is
} = adone;

const CONFIG_NAME = "cli.json";

export default class Configuration extends adone.configuration.Generic {
    constructor(options) {
        super(options);

        this.raw = {
            groups: [
                {
                    name: "common",
                    description: "Common commands"
                },
                {
                    name: "subsystem",
                    description: "Subsystems"
                }
            ]
        };
    }

    hasCommand(name) {
        return is.array(this.raw.commands) && this.raw.commands.findIndex((x) => x.name === name) >= 0;
    }

    getCommand(name) {
        if (!this.hasCommand(name)) {
            throw new adone.x.Unknown(`Unknown command: ${name}`);
        }
        return this.raw.commands.find((x) => x.name === name);
    }

    updateCommand(name, props) {
        if (!this.hasCommand(name)) {
            throw new adone.x.Unknown(`Unknown command: ${name}`);
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
        const index = this.raw.commands.findIndex((x) => x.name === name);
        if (index >= 0) {
            this.raw.commands.splice(index, 1);
            return this.save();
        }
    }

    hasLink(linkName) {
        return is.array(this.raw.links) && this.raw.links.findIndex((x) => x.name === linkName) >= 0;
    }

    getLink(name) {
        if (!this.hasLink(name)) {
            throw new adone.x.Unknown(`Unknown link name: ${name}`);
        }
        return this.raw.links.find((x) => x.name === name);
    }

    addLink(linkInfo, updateIfExists) {
        const isExists = this.hasLink(linkInfo.name);
        if (isExists && !updateIfExists) {
            throw new adone.x.Exists(`Link '${linkInfo.name}' already exists`);
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
            cwd: adone.realm.config.configsPath
        });

        if (await adone.fs.exists(adone.std.path.join(adone.realm.config.configsPath, CONFIG_NAME))) {
            // assign config from home
            await config.load(CONFIG_NAME);
        } else {
            await config.save();
        }
    
        return config;
    }

    static get name() {
        return CONFIG_NAME;
    }
}
