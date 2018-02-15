const {
    application: {
        Subsystem,
        DCliCommand
    },
    is,
    cli: { kit },
    omnitron
} = adone;

export default class Gate extends Subsystem {
    @DCliCommand({
        name: "list",
        help: "Show gates",
        options: [
            {
                name: "--active",
                help: "Only active gates"
            }
        ]
    })
    async listCommand(args, opts) {
        try {
            kit.createProgress("obtaining");
            const options = opts.getAll();
            let gates;
            if (await omnitron.dispatcher.isOmnitronActive()) {
                await kit.connect();
                gates = await omnitron.dispatcher.getGates(options);
            } else {
                if (options.active) {
                    gates = [];
                } else {
                    const config = await omnitron.dispatcher.getConfiguration();
                    gates = await config.getGates();
                }
            }

            kit.updateProgress({
                message: "done",
                result: true,
                clean: true
            });
            if (gates.length > 0) {
                adone.log(adone.pretty.json(gates));
            } else {
                adone.runtime.term.print("{white-fg}No gates{/}\n");
            }
            return 0;
        } catch (err) {
            adone.log(err);
            kit.updateProgress({
                message: err.message,
                result: false
            });
            return 1;
        }
    }

    @DCliCommand({
        name: "add",
        help: "Add new gate",
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
                required: true,
                help: "Port number, path to unix socket or pipe name (windows)"
            }
        ]
    })
    async addCommand(args, opts) {
        try {
            kit.createProgress("adding");

            const config = await omnitron.dispatcher.getConfiguration();
            await config.addGate({
                name: args.get("name"),
                ...opts.getAll()
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
            if (await omnitron.dispatcher.isOmnitronActive()) {
                await kit.connect();
                await omnitron.dispatcher.deleteGate(name);
            } else {
                const config = await omnitron.dispatcher.getConfiguration();
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

    @DCliCommand({
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
            await omnitron.dispatcher.upGate(name);

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
            await omnitron.dispatcher.downGate(name);

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

            const config = await omnitron.dispatcher.getConfiguration();
            if (!opts.hasSomething()) {
                kit.updateProgress({
                    message: "done",
                    result: true,
                    clean: true
                });
                adone.log(adone.pretty.json(await config.configureGate(args.get("name"))));
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
