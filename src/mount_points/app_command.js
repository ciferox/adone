import AppConfiguration from "../app/configuration";

const {
    is,
    realm,
    std,
    util
} = adone;

export default class extends realm.MountPoint {
    async register({ superRealm, subRealm, realmExport } = {}) {
        const group = is.object(realmExport.group)
            ? realmExport.group
            : is.string(realmExport.group)
                ? { name: realmExport.group }
                : { name: "subsystem", description: "Third party commands" };
            
        realmExport.group = group.name;

        const cliConfig = await AppConfiguration.load({
            cwd: std.path.join(superRealm.ETC_PATH, "adone")
        });

        if (cliConfig.hasCommand(realmExport.name)) {
            throw new adone.error.ExistsException(`Command '${realmExport.name}' already exists`);
        }

        realmExport.subsystem = std.path.join(subRealm.cwd, realmExport.subsystem);

        cliConfig.setCommand(realmExport);

        if (!cliConfig.hasGroup(realmExport.group.name)) {
            cliConfig.addGroup(group);
        }

        return cliConfig.save();
    }

    async unregister({ superRealm, subRealm, realmExport } = {}) {
        const cliConfig = await AppConfiguration.load({
            cwd: superRealm.cwd
        });
        cliConfig.deleteCommand(realmExport.name);
    }

    // async list() {
    //     const result = [];
    //     const cliConfig = await adone.cli.Configuration.load({
    //         cwd: adone.ETC_ADONE_PATH
    //     });
    //     const commands = cliConfig.raw.commands;

    //     for (const command of commands) {
    //         result.push(command.name);
    //     }
    //     return result;
    // }

    // async checkAndRemove(name) {
    //     const cliConfig = await adone.cli.Configuration.load({
    //         cwd: adone.ETC_ADONE_PATH
    //     });
    //     if (!is.array(cliConfig.raw.commands)) {
    //         cliConfig.raw.commands = [];
    //     }
    //     const commands = cliConfig.raw.commands;

    //     const shortName = name.startsWith("cli.command.") ? name.substring(12) : name;

    //     const index = commands.findIndex((x) => x.name === shortName || x.name === name);
    //     if (index >= 0) {
    //         cliConfig.raw.commands.splice(index, 1);
    //         await cliConfig.save();
    //         return true;
    //     }
    //     return false;
    // }

    // _checkMainFile(path) {
    //     const modExports = require(path);

    //     if (!modExports.__esModule) {
    //         throw new adone.error.NotValidException("Startup module should be es6-module");
    //     }

    //     const StartupClass = modExports.default;

    //     if (!is.class(StartupClass)) {
    //         throw new adone.error.NotValidException("Startup script is not valid");
    //     }

    //     const instance = new StartupClass();
    //     if (!is.subsystem(instance)) {
    //         throw new adone.error.NotValidException("Startup script should export class inherited from the class subsystem");
    //     }
    // }
}