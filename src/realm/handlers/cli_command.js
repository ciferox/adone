const {
    is,
    realm
} = adone;

export default class CliCommandHandler extends realm.TypeHandler {
    constructor(manager) {
        super(manager, "Adone cli commands", "cli.command");
    }

    async register(adoneConf, destPath) {
        const indexPath = adoneConf.getCliMainPath(destPath);

        // Check startup file
        await this._checkMainFile(indexPath);

        const commandInfo = {
            name: adoneConf.raw.name,
            description: adoneConf.raw.description,
            subsystem: indexPath,
            group: adoneConf.raw.group || "subsystem"
        };

        if (adoneConf.raw.cliAlias && adoneConf.raw.cliAlias.length > 0) {
            commandInfo.aliases = adone.util.arrify(adoneConf.raw.cliAlias);
        }

        const cliConfig = await adone.cli.Configuration.load({
            cwd: this.manager.config.CONFIGS_PATH
        });
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
        const cliConfig = await adone.cli.Configuration.load({
            cwd: this.manager.config.CONFIGS_PATH
        });
        const index = cliConfig.raw.commands.findIndex((x) => adoneConf.raw.name === x.name);
        if (index >= 0) {
            cliConfig.raw.commands.splice(index, 1);
            return cliConfig.save();
        }
    }

    async list() {
        const result = [];
        const cliConfig = await adone.cli.Configuration.load({
            cwd: this.manager.config.CONFIGS_PATH
        });
        const commands = cliConfig.raw.commands;

        for (const command of commands) {
            result.push(command.name);
        }
        return result;
    }

    async checkAndRemove(name) {
        const cliConfig = await adone.cli.Configuration.load({
            cwd: this.manager.config.CONFIGS_PATH
        });
        if (!is.array(cliConfig.raw.commands)) {
            cliConfig.raw.commands = [];
        }
        const commands = cliConfig.raw.commands;

        const shortName = name.startsWith("cli.command.") ? name.substring(12) : name;

        const index = commands.findIndex((x) => x.name === shortName || x.name === name);
        if (index >= 0) {
            cliConfig.raw.commands.splice(index, 1);
            await cliConfig.save();
            return true;
        }
        return false;
    }

    _checkMainFile(path) {
        const modExports = require(path);

        if (!modExports.__esModule) {
            throw new adone.error.NotValid("Startup module should be es6-module");
        }

        const StartupClass = modExports.default;

        if (!is.class(StartupClass)) {
            throw new adone.error.NotValid("Startup script is not valid");
        }

        const instance = new StartupClass();
        if (!is.subsystem(instance)) {
            throw new adone.error.NotValid("Startup script should export class inherited from the class subsystem");
        }
    }
}
