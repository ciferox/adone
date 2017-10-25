const {
    is,
    text: { pretty },
    util,
    omnitron
} = adone;

const {
    Command,
    MainCommand,
    CliSubsystem,
    CommandsGroup
} = application.CliApplication;

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
        this._bar = null;
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
                    name: "up",
                    help: "Up omnitron",
                    handler: this.upCommand
                },
                {
                    name: "down",
                    help: "Down omnitron",
                    handler: this.downCommand
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
                    help: "Restart service",
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
                    name: "configure",
                    help: "Configure service",
                    arguments: [
                        {
                            name: "service",
                            type: String,
                            default: "",
                            help: "Name of service"
                        }
                    ],
                    options: [
                        {
                            name: "--group",
                            type: String,
                            help: "Group name"
                        }
                    ],
                    handler: this.configureCommand
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

    async upCommand() {
        try {
            this._createProgress("starting up omnitron");
            const pid = await omnitron.dispatcher.startOmnitron();
            if (is.number(pid)) {
                this._updateProgress(`done (pid: ${pid})`, true);
            } else {
                this._updateProgress({
                    schema: ` {yellow-fg}!{/yellow-fg} already running (pid: ${pid.pid})`
                }, true);
            }
            return 0;
        } catch (err) {
            this._updateProgress(err.message, false);
            return 1;
        }
    }

    async downCommand() {
        try {
            this._createProgress("shutting down omnitron");
            const result = await omnitron.dispatcher.stopOmnitron();
            switch (result) {
                case 0:
                    this._updateProgress("failed", false);
                    break;
                case 1:
                    this._updateProgress("done", true);
                    break;
                case 2:
                    this._updateProgress({
                        schema: " {yellow-fg}!{/yellow-fg} omnitrone is not started"
                    }, true);
                    break;
            }
            return 0;
        } catch (err) {
            this._updateProgress(err.message, false);
            return 1;
        }
    }

    async startupEnableCommand(args, opts) {
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

    async startupDisableCommand(args, opts) {
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

    async pingCommand() {
        this._createProgress("checking");
        try {
            await this._connectToLocal();
        } catch (err) {
            //
        }

        const result = await omnitron.dispatcher.ping();
        this._updateProgress(result ? "done" : "failed", result);
        return result;
    }

    async infoCommand() {
        try {
            this._createProgress("obtaining");
            await this._connectToLocal();
            const result = await omnitron.dispatcher.getInfo();
            result.uptime = util.humanizeTime(1000 * result.uptime);
            this._updateProgress("done", true, true);
            adone.log(adone.text.pretty.json(result));
            return 0;
        } catch (err) {
            this._updateProgress(err.message, false);
            return 1;
        }
    }

    async enableCommand(args, opts) {
        try {
            this._createProgress("enabling");
            const name = args.get("service");
            await this._connectToLocal();
            await omnitron.dispatcher.enableService(name);
            this._updateProgress("done", true);
            return 0;
        } catch (err) {
            this._updateProgress(err.message, false);
            return 1;
        }
    }

    async disableCommand(args, opts) {
        try {
            this._createProgress("disabling");
            const name = args.get("service");
            await this._connectToLocal();
            await omnitron.dispatcher.disableService(name);
            this._updateProgress("done", true);
            return 0;
        } catch (err) {
            this._updateProgress(err.message, false);
            return 1;
        }
    }

    async startServiceCommand(args) {
        try {
            this._createProgress("starting");
            const name = args.get("service");
            await this._connectToLocal();
            await omnitron.dispatcher.startService(name);
            this._updateProgress("done", true);
            return 0;
        } catch (err) {
            this._updateProgress(err.message, false);
            return 1;
        }
    }

    async stopServiceCommand(args) {
        try {
            this._createProgress("dtopping");
            const name = args.get("service");
            await this._connectToLocal();
            await omnitron.dispatcher.stopService(name);
            this._updateProgress("done", true);
            return 0;
        } catch (err) {
            this._updateProgress(err.message, false);
            return 1;
        }
    }

    async restartCommand(args) {
        try {
            this._createProgress("restarting");
            const name = args.get("service");
            await this._connectToLocal();
            await omnitron.dispatcher.restart(name);
            this._updateProgress("done", true);
            return 0;
        } catch (err) {
            this._updateProgress(err.message, false);
            return 1;
        }
    }

    async configureCommand(args, opts) {
        try {
            this._createProgress("configuring");
            const name = args.get("service");
            await this._connectToLocal();
            const config = {};
            if (opts.has("group")) {
                config.group = opts.get("group");
            }

            if (Object.keys(config).length > 0) {
                await omnitron.dispatcher.configureService(name, config);
                this._updateProgress("done", true);
            } else {
                this._updateProgress({
                    schema: " {yellow-fg}!{/yellow-fg} nothing to configure"
                }, true);
            }
            
            return 0;
        } catch (err) {
            this._updateProgress(err.message, false);
            return 1;
        }
    }

    async servicesCommand(args, opts) {
        try {
            this._createProgress("obtaining");
            await this._connectToLocal();
            const services = await omnitron.dispatcher.enumerate({
                name: opts.get("name"),
                status: opts.get("status")
            });

            this._updateProgress("done", true, true);

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
                        id: "group",
                        header: "Group"
                    },
                    {
                        id: "description",
                        header: "Description"
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
            return 0;
        } catch (err) {
            this._updateProgress(err.message, false);
            return 1;
        }
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
    //         adone.log(err);
    //     }
    //     return 0;
    // }

    _createProgress(message) {
        if (!this.silent) {
            this.bar = adone.runtime.term.progress({
                schema: ` :spinner ${message}`
            });
            this.bar.update(0);
        }
    }

    _updateProgress(message, result = null, clean = false) {
        if (!is.null(this.bar) && !this.silent) {
            if (is.plainObject(message)) {
                this.bar.setSchema(message.schema);
            } else {
                this.bar.setSchema(` :spinner ${message}`);
            }

            if (is.boolean(result)) {
                if (clean) {
                    this.bar.clean = true;
                }
                this.bar.complete(result);
            }

        }
    }
}
