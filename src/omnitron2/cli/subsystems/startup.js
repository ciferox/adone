const {
    app: {
        Subsystem,
        CommandMeta
    },
    cli: { kit }
} = adone;

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
    @CommandMeta({
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
            kit.createProgress("trying to install omnitron service");
            const config = {
                mode: opts.get("mode")
            };

            if (opts.has("user")) {
                config.user = opts.get("user");
            }

            const service = new __.Service(config);
            await service.install();
            kit.updateProgress("done", true);
            return 0;
        } catch (err) {
            kit.updateProgress(err.message, false);
            return 1;
        }
    }

    @CommandMeta({
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
            kit.createProgress("trying to uninstall omnitron service");
            const config = {
                mode: opts.get("mode")
            };

            const service = new __.Service(config);
            await service.uninstall();
            kit.updateProgress("done", true);
            return 0;
        } catch (err) {
            kit.updateProgress(err.message, false);
            return 1;
        }
    }
}
