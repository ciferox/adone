const { is } = adone;

const runtime = adone.lazify({
    Service: () => {
        const os = process.platform;
        let fileName;
        switch (os) {
            case "win32": fileName = "windows"; break;
            case "linux": fileName = "linux"; break;
            case "darwin": fileName = "macos"; break;
        }
        return require(`./${fileName}`);
    }
});

export default class extends adone.application.Subsystem {
    initialize() {
        this.defineCommand({
            name: "service",
            group: "subsystem",
            help: "system's service management",
            commands: [
                {
                    name: "install",
                    help: "install service",
                    arguments: [
                        {
                            name: "path",
                            type: String,
                            help: "Script path"
                        }
                    ],
                    options: [
                        {
                            name: "--name",
                            type: String,
                            required: true,
                            help: "Service name"
                        },
                        {
                            name: "--user",
                            type: String,
                            help: "User name"
                        },
                        {
                            name: "--mode",
                            type: String,
                            default: "systemv",
                            choices: ["systemd", "systemv"],
                            help: "Service mode"
                        }
                    ],
                    handler: this.installCommand
                }
            ]
        });
    }

    async installCommand(args, opts) {
        try {
            const path = args.get("path");
            if (!adone.fs.exists(path)) {
                throw new adone.x.NotExists(`Script not exists: ${path}`);
            }

            const config = {
                name: opts.get("name"),
                mode: opts.get("mode"),
                path
            };

            if (opts.has("user")) {
                config.user = opts.get("user");
            }

            const service = new runtime.Service(config);

            await service.install();
            adone.log(adone.ok);
        } catch (err) {
            adone.error(err.message);
            return 1;
        }
        return 0;
    }
}
