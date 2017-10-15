const {
    is,
    std
} = adone;

const __ = adone.private(adone.realm);

export default class CliCommandHandler extends __.AbstractHandler {
    async register() {
        let indexPath;
        if (is.string(this.adoneConf.main)) {
            indexPath = std.path.join(this.package.destPath, this.adoneConf.main);
        } else {
            indexPath = this.destPath;
        }

        const commandInfo = {
            name: this.adoneConf.name,
            description: this.adoneConf.description,
            subsystem: indexPath
        };
        const commands = adone.runtime.app.config.cli.commands;

        let i;
        for (i = 0; i < commands.length; i++) {
            if (commands[i].name === this.adoneConf.name) {
                break;
            }
        }

        if (i < commands.length) {
            commands[i] = commandInfo;
        } else {
            commands.push(commandInfo);
        }

        commands.sort((a, b) => a.name > b.name);

        await adone.runtime.app.config.save(std.path.join(adone.config.configsPath, "cli.json"), "cli", {
            space: "    "
        });
    }

    unregister() {

    }
}
