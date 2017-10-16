const {
    is,
    std
} = adone;

const __ = adone.private(adone.realm);

export default class CliCommandHandler extends __.AbstractHandler {
    constructor(pkg) {
        super(pkg, "Adone cli commands", "cli.command");
    }

    async register(adoneConf, destPath) {
        let indexPath;
        if (is.string(adoneConf.raw.main)) {
            indexPath = std.path.join(destPath, adoneConf.raw.main);
        } else {
            indexPath = destPath;
        }

        const commandInfo = {
            name: adoneConf.raw.name,
            description: adoneConf.raw.description,
            subsystem: indexPath
        };
        if (!is.array(adone.runtime.app.config.raw.cli.commands)) {
            adone.runtime.app.config.raw.cli.commands = [];
        }
        const commands = adone.runtime.app.config.raw.cli.commands;

        let i;
        for (i = 0; i < commands.length; i++) {
            if (commands[i].name === adoneConf.raw.name) {
                break;
            }
        }

        if (i < commands.length) {
            commands[i] = commandInfo;
        } else {
            commands.push(commandInfo);
        }

        commands.sort((a, b) => a.name > b.name);

        return adone.runtime.app.config.save(std.path.join(adone.config.configsPath, "cli.json"), "cli", {
            space: "    "
        });
    }

    unregister(adoneConf) {
        const index = adone.runtime.app.config.raw.cli.commands.findIndex((x) => adoneConf.raw.name === x.name);
        if (index >= 0) {
            adone.runtime.app.config.raw.cli.commands.splice(index, 1);
            return adone.runtime.app.config.save(std.path.join(adone.config.configsPath, "cli.json"), "cli", {
                space: "    "
            });
        }
    }

    list() {
        const result = [];
        const commands = adone.runtime.app.config.raw.cli.commands;

        for (const command of commands) {
            result.push(command.name);
        }
        return result;
    }
}
