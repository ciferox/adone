const {
    error,
    is,
    std,
    util: { arrify }
} = adone;

const CONFIG_NAME = "cli.json";

export default class Configuration extends adone.configuration.GenericConfig {
    /**
     * Returns absolute path of configuration.
     */
    getPath() {
        return std.path.join(this.cwd, CONFIG_NAME);
    }

    getGroups() {
        return arrify(this.raw.groups);
    }

    hasGroup(name) {
        return is.array(this.raw.groups) && this.raw.groups.findIndex((group) => group.name === name) !== -1;
    }

    addGroup(group, shouldThronOnExists = false) {
        if (!is.object(group) || !is.string(group.name)) {
            throw new error.NotValidException(`Invalid type of group: ${adone.typeOf(group)}`);
        }

        if (this.hasGroup(group.name)) {
            if (shouldThronOnExists) {
                throw new error.ExistsException(`Group '${group.name}' already exists`);
            }
            return;
        }

        this.raw.groups.push(group);
    }

    hasCommand(name) {
        return is.array(this.raw.commands) && this.raw.commands.findIndex((x) => x.name === name) >= 0;
    }

    getCommand(name) {
        if (!this.hasCommand(name)) {
            throw new error.UnknownException(`Unknown command: ${name}`);
        }
        return this.raw.commands.find((x) => x.name === name);
    }

    setCommand(cmd) {
        const commands = this.raw.commands = arrify(this.raw.commands);
        let i;
        for (i = 0; i < commands.length; i++) {
            if (commands[i].name === cmd.name) {
                break;
            }
        }

        if (i < commands.length) {
            commands[i] = cmd;
        } else {
            commands.push(cmd);
        }
    }

    deleteCommand(name) {
        if (is.array(this.raw.commands)) {
            const index = this.raw.commands.findIndex((x) => x.name === name);
            if (index >= 0) {
                this.raw.commands.splice(index, 1);
            }
        }
    }

    getCommands() {
        return arrify(this.raw.commands);
    }

    hasLink(linkName) {
        return is.array(this.raw.links) && this.raw.links.findIndex((x) => x.name === linkName) >= 0;
    }

    getLink(name) {
        if (!this.hasLink(name)) {
            throw new error.UnknownException(`Unknown link name: ${name}`);
        }
        return this.raw.links.find((x) => x.name === name);
    }

    addLink(linkInfo, updateIfExists = false) {
        const isExists = this.hasLink(linkInfo.name);
        if (isExists && !updateIfExists) {
            throw new error.ExistsException(`Link '${linkInfo.name}' already exists`);
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
        return arrify(this.raw.links);
    }

    load() {
        return super.load(CONFIG_NAME);
    }

    save() {
        arrify(this.raw.commands).sort((a, b) => a.name > b.name);
        arrify(this.raw.groups).sort((a, b) => a.name > b.name);

        return super.save(CONFIG_NAME, {
            space: "    "
        });
    }

    static async load({ cwd } = {}) {
        const config = new Configuration({
            cwd
        });

        try {
            await config.load(CONFIG_NAME);
            adone.lodash.defaultsDeep(config.raw, Configuration.default);
        } catch (err) {
            if (err.code !== "ENOENT") {
                throw err;
            }
            config.raw = Configuration.default;
            await config.save();
        }

        return config;
    }

    static configName = CONFIG_NAME;

    static default = {
        groups: [
            {
                name: "common",
                description: "Common"
            },
            {
                name: "subsystem",
                description: "Third party commands"
            }
        ]
    };
}
