const {
    app: {
        Subsystem,
        SubsystemMeta,
        CommandMeta
    },
    is,
    cli: { kit },
    omnitron2,
    std
} = adone;

const baseSubsystem = (name) => std.path.join(__dirname, name);

export default 
@SubsystemMeta({
    subsystems: [
        {
            name: "add",
            description: "Add new network",
            subsystem: baseSubsystem("add")
        },
        {
            name: "list",
            description: "List networks",
            subsystem: baseSubsystem("list")
        }
    ]
})
class extends Subsystem {
    @CommandMeta({
        name: ["delete", "del"],
        help: "Delete gate",
        arguments: [
            {
                name: "name",
                type: String,
                help: "Gate name"
            }
        ]
    })
    async deleteCommand(args) {
        try {
            kit.createProgress("deleting");

            const name = args.get("name");
            if (await omnitron2.dispatcher.isOmnitronActive()) {
                await kit.connect();
                await omnitron2.dispatcher.deleteGate(name);
            } else {
                const config = await omnitron2.dispatcher.getConfiguration();
                await config.deleteGate(name);
            }

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

    @CommandMeta({
        name: "up",
        help: "Up gate",
        arguments: [
            {
                name: "name",
                type: String,
                help: "Gate name"
            }
        ]
    })
    async upCommand(args) {
        try {
            const name = args.get("name");
            kit.createProgress(`activating gate {green-fg}${name}{/green-fg}`);

            await kit.connect();
            await omnitron2.dispatcher.upGate(name);

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

    @CommandMeta({
        name: "down",
        help: "Down gate",
        arguments: [
            {
                name: "name",
                type: String,
                help: "Gate name"
            }
        ]
    })
    async downCommand(args) {
        try {
            const name = args.get("name");
            kit.createProgress(`deactivating gate {green-fg}${name}{/green-fg}`);

            await kit.connect();
            await omnitron2.dispatcher.downGate(name);

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

    @CommandMeta({
        name: "configure",
        help: "Configure gate",
        arguments: [
            {
                name: "name",
                type: String,
                help: "Gate name"
            }
        ],
        options: [
            {
                name: "--port",
                nargs: 1,
                type(val) {
                    if (is.numeral(val)) {
                        return Number.parseInt(val);
                    }
                    return val;
                },
                help: "Port number, path to unix socket or pipe name (windows)"
            },
            {
                name: "--startup",
                nargs: "?",
                type: Number,
                choices: [0, 1],
                default: 1,
                help: "Startup flag"
            }
        ]
    })
    async configureCommand(args, opts) {
        try {
            kit.createProgress("configuring");

            const config = await omnitron2.dispatcher.getConfiguration();
            if (!opts.hasSomething()) {
                kit.updateProgress({
                    message: "done",
                    result: true,
                    clean: true
                });
                console.log(adone.pretty.json(await config.configureGate(args.get("name"))));
            } else {
                await config.configureGate(args.get("name"), opts.getAll(true));
                kit.updateProgress({
                    message: "done",
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
}
