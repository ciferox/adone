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

        // Check startup file
        await this._checkStartupFile(adoneConf, destPath);

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

        const cliConfig = await adone.realm.cli.getConfig();
        if (!is.array(cliConfig.raw.commands)) {
            cliConfig.raw.commands = [];
        }
        const commands = cliConfig.raw.commands;

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

        return cliConfig.save();
    }

    async unregister(adoneConf) {
        const cliConfig = await adone.realm.cli.getConfig();
        const index = cliConfig.raw.commands.findIndex((x) => adoneConf.raw.name === x.name);
        if (index >= 0) {
            cliConfig.raw.commands.splice(index, 1);
            return cliConfig.save();
        }
    }

    async list() {
        const result = [];
        const cliConfig = await adone.realm.cli.getConfig();
        const commands = cliConfig.raw.commands;

        for (const command of commands) {
            result.push(command.name);
        }
        return result;
    }

    _checkStartupFile(adoneConf, destPath) {
        const modExports = require(std.path.join(destPath, adoneConf.getProjectStartupPath()));

        if (!modExports.__esModule) {
            throw new adone.x.NotValid("Startup module should be es6-module");
        }

        const StartupClass = modExports.default;

        if (!is.class(StartupClass)) {
            throw new adone.x.NotValid("Startup script is not valid");
        }

        const instance = new StartupClass();
        if (!is.subsystem(instance)) {
            throw new adone.x.NotValid("Startup script should export class inherited from the class subsystem");
        }
    }
}
