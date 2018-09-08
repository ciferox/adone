const {
    app: {
        Subsystem,
        DSubsystem,
        DCliCommand
    },
    is,
    cli: { kit },
    pretty,
    omnitron2,
    std
} = adone;

const { STATUSES } = omnitron2;

const subsystemPath = (name) => std.path.resolve(__dirname, "subsystems", name);

export default
@DSubsystem({
    commandsGroups: [
        {
            name: "common",
            description: "Common commands"
        },
        {
            name: "inspect",
            description: "Information, inspection and metrics"
        },
        {
            name: "services",
            description: "Services management"
        },
        {
            name: "subsystems",
            description: "Subsystems management"
        },
        {
            name: "config",
            description: "Configuration"
        }
    ],
    subsystems: [
        {
            name: "startup",
            group: "common",
            description: "Omnitron startup stuff",
            subsystem: subsystemPath("startup")
        },
        {
            name: "config",
            group: "config",
            description: "Generic omnitron configuration",
            subsystem: subsystemPath("config")
        },
        {
            name: ["net", "network"],
            group: "config",
            description: "Networks management",
            subsystem: subsystemPath("network")
        },
        {
            name: "host",
            group: "config",
            description: "Hosts management",
            subsystem: subsystemPath("host")
        }
    ]
})
class Omnitron extends Subsystem {
    @DCliCommand({
        name: "up",
        group: "common",
        help: "Start omnitron"
    })
    async upCommand() {
        try {
            kit.createProgress("starting up omnitron");
            const pid = await omnitron2.dispatcher.startOmnitron();
            if (is.number(pid)) {
                kit.updateProgress({
                    message: `done (pid: ${pid})`,
                    status: true
                });
            } else {
                kit.updateProgress({
                    message: `already running (pid: ${pid.pid})`,
                    status: "info"
                });
            }
            return 0;
        } catch (err) {
            kit.updateProgress({
                message: err.message,
                status: false
            });
            return 1;
        }
    }

    @DCliCommand({
        name: "down",
        group: "common",
        help: "Shutdown omnitron"
    })
    async downCommand() {
        try {
            kit.createProgress("shutting down omnitron");
            const result = await omnitron2.dispatcher.stopOmnitron();
            switch (result) {
                case 0:
                    kit.updateProgress({
                        message: "failed",
                        status: false
                    });
                    break;
                case 1:
                    kit.updateProgress({
                        message: "done",
                        status: true
                    });
                    break;
                case 2:
                    kit.updateProgress({
                        message: "omnitron is not started",
                        status: "info"
                    });
                    break;
            }
            return 0;
        } catch (err) {
            kit.updateProgress({
                message: err.message,
                status: false
            });
            return 1;
        }
    }

    @DCliCommand({
        name: "gc",
        group: "common",
        help: "Force garbage collector"
    })
    async gcCommand() {
        try {
            kit.createProgress("trying");
            await kit.connect();
            const message = await omnitron2.dispatcher.gc();
            kit.updateProgress({
                message,
                result: true
            });
            return 0;
        } catch (err) {
            kit.updateProgress({
                messgae: err.message,
                result: false
            });
            return 1;
        }
    }

    @DCliCommand({
        name: "info",
        group: "inspect",
        help: "The omnitron's information",
        arguments: [
            {
                name: "param",
                action: "set",
                set: "trueOnEmpty",
                choices: ["process", "version", "realm", "env", "netron"],
                help: "Name of parameter(s): env, version, process, realm, eventloop"
            }
        ]
    })
    async infoCommand(args) {
        try {
            kit.createProgress("obtaining");
            await kit.connect();
            const result = await omnitron2.dispatcher.getInfo(args.get("param"));
            kit.updateProgress({
                message: "done",
                status: true,
                clean: true
            });
            adone.log(adone.pretty.json(result));
            return 0;
        } catch (err) {
            kit.updateProgress({
                message: err.message,
                status: false
            });
            return 1;
        }
    }

    @DCliCommand({
        name: "report",
        group: "inspect",
        help: "Report omnitron process statistics"
    })
    async reportCommand() {
        try {
            kit.createProgress("obtaining");
            await kit.connect();
            const result = await omnitron2.dispatcher.getReport();
            kit.updateProgress({
                message: "done",
                result: true,
                clean: true
            });
            adone.log(result);
            return 0;
        } catch (err) {
            kit.updateProgress({
                message: err.message,
                result: false
            });
            return 1;
        }
    }

    @DCliCommand({
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
            kit.createProgress("enabling");
            const name = args.get("service");
            await kit.connect();
            await omnitron2.dispatcher.enableService(name);
            kit.updateProgress({
                message: "done",
                result: true
            });
            return 0;
        } catch (err) {
            kit.updateProgress({
                message: err.message,
                result: false
            });
            return 1;
        }
    }

    @DCliCommand({
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
            kit.createProgress("disabling");
            const name = args.get("service");
            await kit.connect();
            await omnitron2.dispatcher.disableService(name);
            kit.updateProgress({
                message: "done",
                result: true
            });
            return 0;
        } catch (err) {
            kit.updateProgress({
                message: err.message,
                result: false
            });
            return 1;
        }
    }

    @DCliCommand({
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
            kit.createProgress("starting");
            const name = args.get("service");
            await kit.connect();
            await omnitron2.dispatcher.startService(name);
            kit.updateProgress({
                message: "done",
                result: true
            });
            return 0;
        } catch (err) {
            kit.updateProgress({
                message: err.message,
                result: false
            });
            return 1;
        }
    }

    @DCliCommand({
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
            kit.createProgress("stopping");
            const name = args.get("service");
            await kit.connect();
            await omnitron2.dispatcher.stopService(name);
            kit.updateProgress({
                message: "done",
                result: true
            });
            return 0;
        } catch (err) {
            kit.updateProgress({
                message: err.message,
                result: false
            });
            return 1;
        }
    }

    @DCliCommand({
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
            kit.createProgress("restarting");
            const name = args.get("service");
            await kit.connect();
            await omnitron2.dispatcher.restart(name);
            kit.updateProgress({
                message: "done",
                result: true
            });
            return 0;
        } catch (err) {
            kit.updateProgress({
                message: err.message,
                result: false
            });
            return 1;
        }
    }

    @DCliCommand({
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
            kit.createProgress("configuring");
            const name = args.get("service");
            await kit.connect();
            const config = {};
            if (opts.has("group")) {
                config.group = opts.get("group");
            }

            if (Object.keys(config).length > 0) {
                await omnitron2.dispatcher.configureService(name, config);
                kit.updateProgress({
                    message: "done",
                    result: true
                });
            } else {
                kit.updateProgress({
                    schema: " {yellow-fg}!{/yellow-fg} nothing to configure",
                    result: true
                });
            }

            return 0;
        } catch (err) {
            kit.updateProgress({
                message: err.message,
                result: false
            });
            return 1;
        }
    }

    @DCliCommand({
        name: "services",
        group: "inspect",
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
            kit.createProgress("obtaining");
            await kit.connect();
            const services = await omnitron2.dispatcher.enumerate({
                name: opts.get("name"),
                status: opts.get("status")
            });

            kit.updateProgress({
                message: "done",
                result: true,
                clean: true
            });

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
            kit.updateProgress({
                message: err.message,
                result: false
            });
            return 1;
        }
    }

    // @DCliCommand({
    //     name: "peers",
    //     group: "inspect",
    //     help: "Show connected peers"
    // })
    // async peersCommand() {
    //     try {
    //         kit.createProgress("obtaining");
    //         await kit.connect();
    //         const peers = await omnitron2.dispatcher.getPeers();

    //         kit.updateProgress({
    //             message: "done",
    //             result: true,
    //             clean: true
    //         });

    //         adone.log(pretty.table(peers, {
    //             width: "100%",
    //             style: {
    //                 head: ["gray"],
    //                 compact: true
    //             },
    //             model: [
    //                 {
    //                     id: "uid",
    //                     header: "UID",
    //                     handle: (val) => {
    //                         if (adone.runtime.netron.uid === val.uid) {
    //                             return `{green-fg}{bold}${val.uid}{/green-fg}{/bold}`;
    //                         }
    //                         return `{green-fg}${val.uid}{/green-fg}`;
    //                     },
    //                     width: 38
    //                 },
    //                 {
    //                     id: "address",
    //                     header: "Address"
    //                 },
    //                 {
    //                     id: "connectedTime",
    //                     header: "Connected time",
    //                     handle: (val) => {
    //                         return adone.datetime.unix(val.connectedTime / 1000).format("L LTS");
    //                     },
    //                     width: 24
    //                 }
    //             ]
    //         }));
    //         return 0;
    //     } catch (err) {
    //         kit.updateProgress({
    //             message: err.message,
    //             result: false
    //         });
    //         return 1;
    //     }
    // }

    @DCliCommand({
        name: "contexts",
        group: "inspect",
        help: "Show attached contexts"
    })
    async contextsCommand() {
        try {
            kit.createProgress("obtaining");
            await kit.connect();
            const peers = await omnitron2.dispatcher.getContexts();

            kit.updateProgress({
                message: "done",
                result: true,
                clean: true
            });

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
            kit.updateProgress({
                message: err.message,
                result: false
            });
            return 1;
        }
    }

    @DCliCommand({
        name: "subsystems",
        group: "inspect",
        help: "Show omnitron subsystems"
    })
    async subsystemsCommand() {
        try {
            kit.createProgress("obtaining");
            await kit.connect();
            const peers = await omnitron2.dispatcher.getSubsystems();

            kit.updateProgress({
                message: "done",
                result: true,
                clean: true
            });

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
            kit.updateProgress({
                message: err.message,
                result: false
            });
            return 1;
        }
    }

    @DCliCommand({
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
            kit.createProgress("loading");
            let path = args.get("path");
            if (!std.path.isAbsolute(path)) {
                path = std.path.join(process.cwd(), path);
            }

            await kit.connect();
            await omnitron2.dispatcher.loadSubsystem(path, {
                name: opts.has("name") ? opts.get("name") : null,
                group: opts.get("group"),
                description: opts.get("description"),
                transpile: opts.has("transpile")
            });
            kit.updateProgress({
                message: "done",
                result: true
            });
            return 0;
        } catch (err) {
            kit.updateProgress({
                message: err.message,
                result: false
            });
            return 1;
        }
    }

    @DCliCommand({
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
            kit.createProgress("unloading");
            const name = args.get("name");
            await kit.connect();
            await omnitron2.dispatcher.unloadSubsystem(name);
            kit.updateProgress({
                message: "done",
                result: true
            });
            return 0;
        } catch (err) {
            kit.updateProgress({
                message: err.message,
                result: false
            });
            return 1;
        }
    }
}
