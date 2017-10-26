import Subsystem from "./subsystem";

const {
    application,
    is,
    text: { pretty },
    util,
    omnitron,
    std
} = adone;

const {
    Command,
    CliSubsystem
} = application.CliApplication;

const { STATUSES } = omnitron;

@CliSubsystem({
    name: "startup",
    description: "Omnitron startup stuff",
    subsystem: std.path.resolve(__dirname, "startup")
})
export default class Omnitron extends Subsystem {
    @Command({
        name: "up",
        help: "Up omnitron"
    })
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

    @Command({
        name: "down",
        help: "Down omnitron"
    })
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

    @Command({
        name: "ping",
        help: "ping the omnitron"
    })
    async pingCommand() {
        this._createProgress("checking");
        try {
            await this._connectToLocal();
        } catch (err) {
            //
        }

        const result = await omnitron.dispatcher.ping();
        this._updateProgress(result ? "done" : "failed", result);
        return 0;
    }

    @Command({
        name: "info",
        help: "the omnitron's information"
    })
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

    @Command({
        name: "enable",
        help: "Enable service",
        arguments: [
            {
                name: "service",
                type: String,
                help: "Name of service"
            }
        ]
    })
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

    @Command({
        name: "disable",
        help: "Disable service",
        arguments: [
            {
                name: "service",
                type: String,
                help: "Name of service"
            }
        ]
    })
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

    @Command({
        name: "start",
        help: "Start service",
        arguments: [
            {
                name: "service",
                type: String,
                help: "Name of service"
            }
        ]
    })
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

    @Command({
        name: "stop",
        help: "Stop service",
        arguments: [
            {
                name: "service",
                type: String,
                help: "Name of service"
            }
        ]
    })
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

    @Command({
        name: "restart",
        help: "Restart service",
        arguments: [
            {
                name: "service",
                type: String,
                default: "",
                help: "Name of service"
            }
        ]
    })
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

    @Command({
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
        ]
    })
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

    @Command({
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
        ]
    })
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
}
