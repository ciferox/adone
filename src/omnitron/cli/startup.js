import Subsystem from "./subsystem";

const {
    application: {
        CliApplication
    }
} = adone;

const {
    Command
} = CliApplication;

const __ = adone.lazify({
    Service: () => {
        const os = process.platform;
        let fileName;
        switch (os) {
            case "win32": fileName = "windows"; break;
            case "linux": fileName = "linux"; break;
            case "darwin": fileName = "macos"; break;
        }
        return require(`../svc/${fileName}`);
    }
});

export default class Startup extends Subsystem {
    @Command({
        name: "enable",
        help: "Enable omnitron startup",
        options: [
            {
                name: "--user",
                type: String,
                required: true,
                help: "User name (omnitron only)"
            },
            {
                name: "--mode",
                type: String,
                choices: ["sysd", "sysv"],
                default: "sysv",
                help: "Service mode (omnitron only)"
            }
        ]
    })
    async enableCommand(args, opts) {
        try {
            this._createProgress("trying to install omnitron service");
            const config = {
                mode: opts.get("mode")
            };

            if (opts.has("user")) {
                config.user = opts.get("user");
            }

            const service = new __.Service(config);
            await service.install();
            this._updateProgress("done", true);
            return 0;
        } catch (err) {
            this._updateProgress(err.message, false);
            return 1;
        }
    }

    @Command({
        name: "disable",
        help: "Disable omnitron startup",
        options: [
            {
                name: "--mode",
                type: String,
                default: "sysv",
                choices: ["sysd", "sysv"],
                help: "Service mode (omnitron only)"
            }
        ]
    })
    async disableCommand(args, opts) {
        try {
            this._createProgress("trying to uninstall omnitron service");
            const config = {
                mode: opts.get("mode")
            };

            const service = new __.Service(config);
            await service.uninstall();
            this._updateProgress("done", true);
            return 0;
        } catch (err) {
            this._updateProgress(err.message, false);
            return 1;
        }
    }
}