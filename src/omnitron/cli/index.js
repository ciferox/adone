const {
    is,
    text: { pretty },
    std,
    util
} = adone;
const { STATUSES } = adone.omnitron.const;

const runtime = adone.lazify({
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

export default class extends adone.application.Subsystem {
    configure() {
        this.defineCommand({
            options: [
                {
                    name: "--version",
                    help: "show version of omnitron",
                    handler: this.versionOption
                }
            ],
            commands: [
                {
                    name: "ping",
                    help: "ping the omnitron",
                    handler: this.pingCommand
                },
                {
                    name: "uptime",
                    help: "the omnitron's uptime",
                    handler: this.uptimeCommand
                },
                {
                    name: "env",
                    help: "the omnitron's environment",
                    handler: this.environmentCommand
                },
                {
                    name: "envs",
                    help: "the omnitron's environment variables",
                    handler: this.envsCommand
                },
                {
                    name: "status",
                    help: "show status of service(s)",
                    arguments: [
                        {
                            name: "service",
                            type: String,
                            nargs: "*",
                            default: "",
                            help: "Name of service"
                        }
                    ],
                    handler: this.statusCommand
                },
                {
                    name: "enable",
                    help: "enable service or omnitron (autostart)",
                    arguments: [
                        {
                            name: "service",
                            type: String,
                            default: "omnitron",
                            help: "Name of service"
                        }
                    ],
                    options: [
                        {
                            name: "--deps",
                            help: "Enable dependent services"
                        },
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
                            default: "sysd",
                            help: "Service mode (omnitron only)"
                        }
                    ],
                    handler: this.enableCommand
                },
                {
                    name: "disable",
                    help: "disable service or omnitron (autostart)",
                    arguments: [
                        {
                            name: "service",
                            type: String,
                            default: "omnitron",
                            help: "Name of service"
                        }
                    ],
                    options: [
                        {
                            name: "--mode",
                            type: String,
                            default: "sysv",
                            choices: ["sysd", "sysv"],
                            help: "Service mode (omnitron only)"
                        }
                    ],
                    handler: this.disableCommand
                },
                {
                    name: "start",
                    help: "start omnitron or service",
                    arguments: [
                        {
                            name: "service",
                            type: String,
                            default: "",
                            help: "Name of service"
                        }
                    ],
                    handler: this.startCommand
                },
                {
                    name: "stop",
                    help: "stop omnitron or service",
                    arguments: [
                        {
                            name: "service",
                            type: String,
                            default: "",
                            help: "Name of service"
                        }
                    ],
                    handler: this.stopCommand
                },
                {
                    name: "restart",
                    help: "restart omnitron or service",
                    arguments: [
                        {
                            name: "service",
                            type: String,
                            default: "",
                            help: "Name of service"
                        }
                    ],
                    handler: this.restartCommand
                },
                {
                    name: "list",
                    help: "show services",
                    options: [
                        {
                            name: "--status",
                            help: "status of services",
                            type: String,
                            choices: STATUSES,
                            default: STATUSES[STATUSES.length - 1]
                        },
                        {
                            name: "--full",
                            help: "show full service data"
                        }
                    ],
                    handler: this.listCommand
                },
                {
                    name: "gates",
                    help: "show gates",
                    handler: this.gatesCommand
                }
            ]
        });
    }

    uninitialize() {
        return this.dispatcher.disconnect();
    }

    get dispatcher() {
        if (is.undefined(this._dispatcher)) {
            this._dispatcher = new adone.omnitron.Dispatcher();
        }
        return this._dispatcher;
    }

    async versionOption() {
        adone.log(await this.dispatcher.getVersion());
        return 0;
    }

    async pingCommand() {
        if (await this.dispatcher.ping()) {
            adone.log(adone.ok);
        } else {
            adone.log(adone.bad);
        }
        return 0;
    }

    async uptimeCommand() {
        adone.log(util.humanizeTime(1000 * await this.dispatcher.uptime()));
        return 0;
    }

    async environmentCommand() {
        adone.log(await this.dispatcher.environment());
        return 0;
    }

    async envsCommand() {
        adone.log(adone.text.pretty.json(await this.dispatcher.envs()));
        return 0;
    }

    async statusCommand(args) {
        try {
            adone.log(pretty.table(await this.dispatcher.status(args.get("service")), {
                noHeader: true,
                style: {
                    compact: true
                },
                model: [
                    {
                        id: "name",
                        header: "Name",
                        style: "{green-fg}"
                    },
                    {
                        id: "status",
                        header: "Status",
                        style: (val) => {
                            switch (val) {
                                case "disabled": return "{red-bg}{white-fg}";
                                case "enabled": return "{yellow-bg}{black-fg}";
                                case "active": return "{green-bg}{black-fg}";
                                default: return "";
                            }
                        },
                        format: " %s ",
                        align: "right"
                    }
                ]
            }));
        } catch (err) {
            adone.log(err.message);
        }
        return 0;
    }

    async enableCommand(args, opts) {
        try {
            const name = args.get("service");
            if (name === "omnitron") {
                const config = {
                    mode: opts.get("mode")
                };

                if (opts.has("user")) {
                    config.user = opts.get("user");
                }

                const service = new runtime.Service(config);
                await service.install();
            } else {
                await this.dispatcher.enable(name, { enableDeps: opts.has("deps") });
                adone.log(adone.ok);
            }
        } catch (err) {
            adone.log(err.message);
            return 1;
        }
        return 0;
    }

    async disableCommand(args, opts) {
        try {
            const name = args.get("service");
            if (name === "omnitron") {
                const config = {
                    mode: opts.get("mode")
                };

                const service = new runtime.Service(config);
                await service.uninstall();
            } else {
                await this.dispatcher.disable(name);
                adone.log(adone.ok);
            }
        } catch (err) {
            adone.log(err.message);
        }
        return 0;
    }

    async startCommand(args) {
        const serviceName = args.get("service");
        try {
            await this.dispatcher.start(serviceName);
            (serviceName !== "") && adone.log(adone.ok);
        } catch (err) {
            adone.log(err.message);
        }
        return 0;
    }

    async stopCommand(args) {
        const serviceName = args.get("service");
        try {
            await this.dispatcher.stop(serviceName);
            (serviceName !== "") && adone.log(adone.ok);
        } catch (err) {
            adone.error(err.message);
        }
        return 0;
    }

    async restartCommand(args) {
        const serviceName = args.get("service");
        try {
            await this.dispatcher.restart(serviceName);
            (serviceName !== "") && adone.log(adone.ok);
        } catch (err) {
            adone.log(err.message);
        }
        return 0;
    }

    async listCommand(args, opts) {
        const status = opts.get("status");
        try {
            const services = await this.dispatcher.list(status);

            let model;
            if (opts.has("full")) {
                model = [
                    {
                        id: "name",
                        header: "Name",
                        style: "{green-fg}"
                    },
                    {
                        id: "description",
                        header: "Description"
                    },
                    {
                        id: "author",
                        header: "Author"
                    },
                    {
                        id: "status",
                        header: "Status",
                        style: (val) => {
                            switch (val) {
                                case "disabled": return "{red-bg}{white-fg}";
                                case "enabled": return "{yellow-bg}{black-fg}";
                                case "active": return "{green-bg}{black-fg}";
                                default: return "";
                            }
                        },
                        format: " %s ",
                        align: "right"
                    },
                    {
                        id: "path",
                        header: "Path"
                    }
                ];
            } else {
                model = [
                    {
                        id: "name",
                        header: "Name",
                        style: "{green-fg}"
                    },
                    {
                        id: "status",
                        header: "Status",
                        style: (val) => {
                            switch (val) {
                                case "disabled": return "{red-bg}{white-fg}";
                                case "enabled": return "{yellow-bg}{black-fg}";
                                case "active": return "{green-bg}{black-fg}";
                                default: return "";
                            }
                        },
                        format: " %s ",
                        align: "right"
                    }
                ];
            }

            adone.log(pretty.table(services, {
                style: {
                    head: ["gray"],
                    compact: true
                },
                model
            }));
        } catch (err) {
            adone.error(err.message);
        }
        return 0;
    }

    async gatesCommand() {
        try {
            adone.log(pretty.table(await this.dispatcher.gates(), {
                style: {
                    head: ["gray"],
                    compact: true
                },
                model: [
                    {
                        id: "id",
                        header: "ID",
                        style: "{green-fg}"
                    },
                    {
                        id: "port",
                        header: "Address",
                        style: "{bold}"
                    },
                    {
                        id: "type",
                        header: "Type"
                    },
                    {
                        id: "status",
                        header: "Status",
                        style: (val) => {
                            switch (val) {
                                case "disabled": return "{red-bg}{white-bg}";
                                case "enabled": return "{yellow-bg}{black-fg}";
                                case "active": return "{green-bg}{black-fg}";
                                default: return "";
                            }
                        },
                        format: " %s ",
                        align: "right"
                    }
                ]
            }));
        } catch (err) {
            adone.log(err.message);
        }
        return 0;
    }
}
