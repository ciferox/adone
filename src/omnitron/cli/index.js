const {
    is,
    text: { pretty },
    util,
    omnitron
} = adone;

const { STATUSES } = omnitron;

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

export default class extends adone.application.Subsystem {
    async configure() {
        await adone.runtime.netron.getInterface("cli").defineCommand(this, {
            commands: [
                {
                    name: "ping",
                    help: "ping the omnitron",
                    handler: this.pingCommand
                },
                {
                    name: "info",
                    help: "the omnitron's information",
                    handler: this.infoCommand
                },
                {
                    name: "startup",
                    help: "Omnitron startup stuff",
                    commands: [
                        {
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
                            ],
                            handler: this.startupEnableCommand
                        },
                        {
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
                            ],
                            handler: this.startupDisableCommand
                        }
                    ]
                },
                {
                    name: "enable",
                    help: "Enable service",
                    arguments: [
                        {
                            name: "service",
                            type: String,
                            help: "Name of service"
                        }
                    ],
                    handler: this.enableCommand
                },
                {
                    name: "disable",
                    help: "Disable service",
                    arguments: [
                        {
                            name: "service",
                            type: String,
                            help: "Name of service"
                        }
                    ],
                    handler: this.disableCommand
                },
                {
                    name: "start",
                    help: "Start service",
                    arguments: [
                        {
                            name: "service",
                            type: String,
                            help: "Name of service"
                        }
                    ],
                    handler: this.startServiceCommand
                },
                {
                    name: "stop",
                    help: "Stop service",
                    arguments: [
                        {
                            name: "service",
                            type: String,
                            help: "Name of service"
                        }
                    ],
                    handler: this.stopServiceCommand
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
                    name: "services",
                    help: "Show services",
                    options: [
                        {
                            name: "--name",
                            help: "service name(s)",
                            type: String,
                            nargs: "*"
                        },
                        {
                            name: "--status",
                            help: "status of service",
                            type: String,
                            choices: STATUSES,
                            default: null
                        }
                    ],
                    handler: this.servicesCommand
                },
                // {
                //     name: "gates",
                //     help: "show gates",
                //     handler: this.gatesCommand
                // }
            ]
        });
    }

    async _connectToLocal() {
        await omnitron.dispatcher.connectLocal({
            forceStart: false
        });
    }

    uninitialize() {
        return omnitron.dispatcher.disconnect();
    }

    async startupEnableCommand(args, opts) {
        try {
            const config = {
                mode: opts.get("mode")
            };

            if (opts.has("user")) {
                config.user = opts.get("user");
            }

            const service = new __.Service(config);
            await service.install();
            return 0;
        } catch (err) {
            adone.log(err.message);
            return 1;
        }
    }

    async startupDisableCommand(args, opts) {
        try {
            const config = {
                mode: opts.get("mode")
            };

            const service = new __.Service(config);
            await service.uninstall();
            return 0;
        } catch (err) {
            adone.log(err.message);
            return 1;
        }
    }

    async pingCommand() {
        if (await omnitron.dispatcher.ping()) {
            adone.log(adone.ok);
        } else {
            adone.log(adone.bad);
        }
        return 0;
    }

    async infoCommand() {
        await this._connectToLocal();
        const result = await omnitron.dispatcher.getInfo();
        result.uptime = util.humanizeTime(1000 * result.uptime);
        adone.log(adone.text.pretty.json(result));
        return 0;
    }

    async enableCommand(args, opts) {
        try {
            const name = args.get("service");
            await this._connectToLocal();
            await omnitron.dispatcher.enableService(name);
            adone.log(adone.ok);
            return 0;
        } catch (err) {
            adone.log(err.message);
            return 1;
        }
    }

    async disableCommand(args, opts) {
        try {
            const name = args.get("service");
            await this._connectToLocal();
            await omnitron.dispatcher.disableService(name);
            adone.log(adone.ok);
            return 0;
        } catch (err) {
            adone.log(err.message);
            return 1;
        }
    }

    async startServiceCommand(args) {
        const serviceName = args.get("service");
        try {
            await this._connectToLocal();
            await omnitron.dispatcher.startService(serviceName);
            (serviceName !== "") && adone.log(adone.ok);
        } catch (err) {
            adone.log(err.message);
        }
        return 0;
    }

    async stopServiceCommand(args) {
        const serviceName = args.get("service");
        try {
            await this._connectToLocal();
            await omnitron.dispatcher.stopService(serviceName);
            (serviceName !== "") && adone.log(adone.ok);
        } catch (err) {
            adone.error(err.message);
        }
        return 0;
    }

    async restartCommand(args) {
        const serviceName = args.get("service");
        try {
            await this._connectToLocal();
            await omnitron.dispatcher.restart(serviceName);
            (serviceName !== "") && adone.log(adone.ok);
        } catch (err) {
            adone.log(err.message);
        }
        return 0;
    }

    async servicesCommand(args, opts) {
        try {
            await this._connectToLocal();
            const services = await omnitron.dispatcher.enumerate({
                name: opts.get("name"),
                status: opts.get("status")
            });

            adone.log(pretty.table(services, {
                style: {
                    head: ["gray"],
                    compact: true
                },
                model: [
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
                                case "inactive": return "{yellow-bg}{black-fg}";
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
            adone.error(err.message);
        }
        return 0;
    }

    // async gatesCommand() {
    //     try {
    //         adone.log(pretty.table(await omnitron.dispatcher.gates(), {
    //             style: {
    //                 head: ["gray"],
    //                 compact: true
    //             },
    //             model: [
    //                 {
    //                     id: "id",
    //                     header: "ID",
    //                     style: "{green-fg}"
    //                 },
    //                 {
    //                     id: "port",
    //                     header: "Address",
    //                     style: "{bold}"
    //                 },
    //                 {
    //                     id: "type",
    //                     header: "Type"
    //                 },
    //                 {
    //                     id: "status",
    //                     header: "Status",
    //                     style: (val) => {
    //                         switch (val) {
    //                             case "disabled": return "{red-bg}{white-bg}";
    //                             case "enabled": return "{yellow-bg}{black-fg}";
    //                             case "active": return "{green-bg}{black-fg}";
    //                             default: return "";
    //                         }
    //                     },
    //                     format: " %s ",
    //                     align: "right"
    //                 }
    //             ]
    //         }));
    //     } catch (err) {
    //         adone.log(err.message);
    //     }
    //     return 0;
    // }
}
