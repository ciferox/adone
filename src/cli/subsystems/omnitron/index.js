import adone from "adone";
const { is } = adone;
const { STATUSES } = adone.omnitron.const;

export default class extends adone.application.Subsystem {
    initialize() {
        this.defineCommand({
            name: "omnitron",
            help: "cli interface of omnitron",
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
                    name: "status",
                    help: "show status of service(s)",
                    arguments: [
                        {
                            name: "service",
                            type: String,
                            default: "",
                            help: "Name of service"
                        }
                    ],
                    handler: this.statusCommand
                },
                {
                    name: "enable",
                    help: "enable service",
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
                    help: "disable service",
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
                        }
                    ],
                    handler: this.listCommand
                },
                {
                    name: "gates",
                    help: "Show gates",
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
            this._dispatcher = new adone.omnitron.Dispatcher(this.app);
        }
        return this._dispatcher;
    }

    async versionOption() {
        adone.log(await this.dispatcher.getVersion());
        return 0;
    }

    async pingCommand() {
        adone.log(await this.dispatcher.ping());
        return 0;
    }

    async uptimeCommand() {
        adone.log(await this.dispatcher.uptime());
        return 0;
    }

    async statusCommand(args) {        
        try {
            adone.log(adone.text.pretty.json(await this.dispatcher.status(args.get("service"))));
        } catch (err) {
            adone.log(err.message);
        }
        return 0;
    }

    async enableCommand(args) {
        try {
            await this.dispatcher.enable(args.get("service"));
            adone.log(adone.ok);
        } catch (err) {
            adone.log(err.message);
        }
        return 0;
    }

    async disableCommand(args) {
        try {
            await this.dispatcher.disable(args.get("service"));
            adone.log(adone.ok);
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
            adone.log(adone.text.pretty.json(await this.dispatcher.list(status)));    
        } catch (err) {
            adone.error(err.message);
        }
        return 0;
    }

    async gatesCommand() {
        try {
            adone.log(adone.text.pretty.json(await this.dispatcher.gates()));
        } catch (err) {
            adone.log(err.message);
        }
        return 0;
    }
}
