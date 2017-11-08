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
                        schema: " {yellow-fg}!{/yellow-fg} omnitron is not started"
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
        help: "the omnitron's information",
        arguments: [
            {
                name: "param",
                nargs: "*",
                type: String,
                help: "Name of parameter(s): env, version, process, realm, eventloop"
            }
        ]
    })
    async infoCommand(args) {
        try {
            const params = args.get("param");
            let options;
            if (params.length === 0) {
                options = {
                    process: true,
                    version: true,
                    realm: true,
                    eventloop: true,
                    env: true
                };
            } else {
                options = {};
                for (const param of params) {
                    options[param] = true;
                }    
            }
            
            this._createProgress("obtaining");
            await this._connectToLocal();
            const result = await omnitron.dispatcher.getInfo(options);
            if (options.process) {
                result.process.uptime = util.humanizeTime(1000 * result.process.uptime);
                result.process.cpuUsage.user = util.humanizeTime(result.process.cpuUsage.user);
                result.process.cpuUsage.system = util.humanizeTime(result.process.cpuUsage.system);
            }
            this._updateProgress("done", true, true);
            adone.log(adone.text.pretty.json(result));
            return 0;
        } catch (err) {
            this._updateProgress(err.message, false);
            return 1;
        }
    }

    @Command({
        name: "report",
        help: "report omnitron process statistics"
    })
    async reportCommand() {
        try {
            this._createProgress("obtaining");
            await this._connectToLocal();
            const result = await omnitron.dispatcher.getReport();
            this._updateProgress("done", true, true);
            adone.log(result);
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

    @Command({
        name: "peers",
        help: "Show connected peers"
    })
    async peersCommand() {
        try {
            this._createProgress("obtaining");
            await this._connectToLocal();
            const peers = await omnitron.dispatcher.getPeers();

            this._updateProgress("done", true, true);

            adone.log(pretty.table(peers, {
                width: "100%",
                style: {
                    head: ["gray"],
                    compact: true
                },
                model: [
                    {
                        id: "uid",
                        header: "UID",
                        handle: (val) => {
                            if (adone.runtime.netron.uid === val.uid) {
                                return `{green-fg}{bold}${val.uid}{/green-fg}{/bold}`;
                            }
                            return `{green-fg}${val.uid}{/green-fg}`;
                        },
                        width: 38
                    },
                    {
                        id: "address",
                        header: "Address"
                    },
                    {
                        id: "connectedTime",
                        header: "Connected time",
                        handle: (val) => {
                            return adone.datetime.unix(val.connectedTime / 1000).format("L LTS");
                        },
                        width: 23
                    }
                ]
            }));
            return 0;
        } catch (err) {
            this._updateProgress(err.message, false);
            return 1;
        }
    }

    @Command({
        name: "contexts",
        help: "Show attached contexts"
    })
    async contextsCommand() {
        try {
            this._createProgress("obtaining");
            await this._connectToLocal();
            const peers = await omnitron.dispatcher.getContexts();

            this._updateProgress("done", true, true);

            adone.log(pretty.table(peers, {
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
