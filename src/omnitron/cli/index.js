import Subsystem from "./subsystem";

const {
    application,
    is,
    text: { pretty },
    omnitron,
    std
} = adone;

const {
    Cli,
    Command
} = application.CliApplication;

const { STATUSES } = omnitron;

const subsystemPath = (name) => std.path.resolve(__dirname, "subsystems", name);

@Cli({
    commandsGroups: [
        {
            name: "common",
            description: "Common commands"
        },
        {
            name: "inspect",
            description: "Inspection and metrics"
        },
        {
            name: "services",
            description: "Services management"
        },
        {
            name: "subsystems",
            description: "Subsystems management"
        }
    ],
    subsystems: [
        {
            name: "config",
            group: "common",
            description: "Omnitron configuration",
            subsystem: subsystemPath("config")
        },
        {
            name: "startup",
            group: "common",
            description: "Omnitron startup stuff",
            subsystem: subsystemPath("startup")
        },
        {
            name: "gate",
            group: "common",
            description: "Gates management",
            subsystem: subsystemPath("gate")
        }
    ]
})
export default class Omnitron extends Subsystem {
    @Command({
        name: "up",
        group: "common",
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
        group: "common",
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
        group: "common",
        help: "Ping the omnitron"
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
        name: "gc",
        group: "common",
        help: "Force garbage collector"
    })
    async gcCommand() {
        try {
            this._createProgress("trying");
            await this._connectToLocal();
            const result = await omnitron.dispatcher.gc();
            this._updateProgress(result, true);
            return 0;
        } catch (err) {
            this._updateProgress(err.message, false);
            return 1;
        }
    }

    @Command({
        name: "info",
        group: "inspect",
        help: "The omnitron's information",
        arguments: [
            {
                name: "param",
                action: "set",
                set: "trueOnEmpty",
                choices: ["process", "version", "realm", "env"],
                help: "Name of parameter(s): env, version, process, realm, eventloop"
            }
        ]
    })
    async infoCommand(args) {
        try {
            this._createProgress("obtaining");
            await this._connectToLocal();
            const result = await omnitron.dispatcher.getInfo(args.get("param"));
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
        group: "inspect",
        help: "Report omnitron process statistics"
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
        group: "services",
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
        group: "services",
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
        group: "services",
        help: "Start service",
        arguments: [
            {
                name: "service",
                type: String,
                help: "Name of service"
            }
        ]
    })
    async startCommand(args) {
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
        group: "services",
        help: "Stop service",
        arguments: [
            {
                name: "service",
                type: String,
                help: "Name of service"
            }
        ]
    })
    async stopCommand(args) {
        try {
            this._createProgress("stopping");
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
        group: "services",
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
        group: "services",
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
        group: "services",
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

            if (services.length > 0) {
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
                            id: "pid",
                            header: "PID"
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
            } else {
                adone.runtime.term.print("{white-fg}No services{/}\n");
            }
            return 0;
        } catch (err) {
            this._updateProgress(err.message, false);
            return 1;
        }
    }

    @Command({
        name: "peers",
        group: "inspect",
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
                        width: 24
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
        group: "inspect",
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

    @Command({
        name: ["subsystems", "ss"],
        group: "subsystems",
        help: "Show omnitron subsystems"
    })
    async subsystemsCommand() {
        try {
            this._createProgress("obtaining");
            await this._connectToLocal();
            const peers = await omnitron.dispatcher.getSubsystems();

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
                        id: "group",
                        header: "Group"
                    },
                    {
                        id: "path",
                        header: "Path"
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

    @Command({
        name: "load",
        group: "subsystems",
        help: "Load subsystem",
        arguments: [
            {
                name: "path",
                type: String,
                help: "Path to subsystem"
            }
        ],
        options: [
            {
                name: "--name",
                type: String,
                help: "Name of subsystem"
            },
            {
                name: "--group",
                type: String,
                default: "subsystem",
                help: "Group of subsystem"
            },
            {
                name: "--description",
                type: String,
                default: "",
                help: "Description of subsystem"
            },
            {
                name: "--transpile",
                help: "Should transpile or not"
            }
        ]
    })
    async loadCommand(args, opts) {
        try {
            this._createProgress("loading");
            let path = args.get("path");
            if (!std.path.isAbsolute(path)) {
                path = std.path.join(process.cwd(), path);
            }

            await this._connectToLocal();
            await omnitron.dispatcher.loadSubsystem(path, {
                name: opts.has("name") ? opts.get("name") : null,
                group: opts.get("group"),
                description: opts.get("description"),
                transpile: opts.has("transpile")
            });
            this._updateProgress("done", true);
            return 0;
        } catch (err) {
            this._updateProgress(err.message, false);
            return 1;
        }
    }

    @Command({
        name: "unload",
        group: "subsystems",
        help: "Unload subsystem",
        arguments: [
            {
                name: "name",
                type: String,
                help: "Name of subsystem"
            }
        ]
    })
    async unloadCommand(args) {
        try {
            this._createProgress("unloading");
            const name = args.get("name");
            await this._connectToLocal();
            await omnitron.dispatcher.unloadSubsystem(name);
            this._updateProgress("done", true);
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
