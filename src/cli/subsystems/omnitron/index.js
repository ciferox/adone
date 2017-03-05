import adone from "adone";
const { is } = adone;
const { STATUSES } = adone.omnitron.const;

const OK = "OK";

export default class extends adone.application.Subsystem {
    initialize() {
        this._netron = null;
        
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
                    handler: this.startCommand
                },
                {
                    name: "stop",
                    help: "stop omnitron or service",
                    handler: this.stopCommand
                },
                {
                    name: "restart",
                    help: "restart omnitron or service",
                    handler: this.restartCommand
                },
                {
                    name: "list",
                    help: "show omnitron's services",
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
                }
            ]
        });
    }

    uninitialize() {
        return this.disconnect();
    }

    async connect() {
        const { netron, peer } = await adone.omnitron.helper.connectLocal();
        this._netron = netron;
        this._peer = peer;
    }

    disconnect() {
        if (is.nil(this._netron)) {
            return Promise.resolve();
        }
        return this._netron.disconnect();
    }

    async getService(id) {
        if (is.null(this._netron)) {
            await this.connect();
        }
        return this._peer.getInterfaceByName(id);
    }

    async versionOption() {
        const iOmnitron = await this.getService("omnitron");
        adone.log(await iOmnitron.version());
        return 0;
    }

    async pingCommand() {
        await this.connect();
        adone.log(await this._netron.ping());
        return 0;
    }

    async uptimeCommand() {
        const iOmnitron = await this.getService("omnitron");
        adone.log(await iOmnitron.uptime());
        return 0;
    }

    async enableCommand(args) {
        const iOmnitron = await this.getService("omnitron");
        try {
            await iOmnitron.enable(args.get("service"), true);
            adone.log(OK);
        } catch (err) {
            adone.log(err.message);
        }
        return 0;
    }

    async disableCommand(args) {
        const iOmnitron = await this.getService("omnitron");
        try {
            await iOmnitron.enable(args.get("service"), false);
            adone.log(OK);
        } catch (err) {
            adone.log(err.message);
        }
        return 0;
    }

    async startCommand() {
        // const isOnline = await adone.omnitron.helper.isOmnitronAvailable();
        // if (isOnline) {
        //     try {
        //         const omnitronConfig = await adone.omnitron.helper.loadOmnitronConfig();
        //         const pid = parseInt(adone.std.fs.readFileSync(omnitronConfig.pidFilePath).toString());
        //         process.kill(pid);
        //         adone.log(`sent SIGTERM to omnitron's process (PID: ${pid})`);
        //     } catch (err) {
        //         adone.log("omnitron is offline");
        //     }
        // } else {
        //     adone.log("omnitron is offline");
        // }
        return 0;
    }

    async stopCommand() {
        const isOnline = await adone.omnitron.helper.isOmnitronAvailable();
        if (isOnline) {
            try {
                const omnitronConfig = await adone.omnitron.helper.loadOmnitronConfig();
                const pid = parseInt(adone.std.fs.readFileSync(omnitronConfig.pidFilePath).toString());
                process.kill(pid);
                adone.log(`Sent SIGTERM to omnitron's process (PID: ${pid})`);
            } catch (err) {
                adone.log("Omnitron is offline");
            }
        } else {
            adone.log("Omnitron is offline");
        }
        return 0;
    }

    async restartCommand() {
        const isOnline = await adone.omnitron.helper.isOmnitronAvailable();
        if (isOnline) {
            const omnitronConfig = await adone.omnitron.helper.loadOmnitronConfig();
            const pid = parseInt(adone.std.fs.readFileSync(omnitronConfig.pidFilePath).toString());
            let exists = true;
            process.kill(pid);
            adone.log(`Sent SIGTERM to omnitron's process (PID: ${pid})`);
            for (let i = 0; i < 100 && exists; ++i) { // awaiting 10 sec...
                await adone.promise.delay(100);
                try {
                    process.kill(pid, 0); // check the existence
                } catch (err) {
                    exists = false;
                }
            }
            if (exists) {
                adone.log(`Sent SIGKILL to omnitron's process (PID: ${pid})`);
                process.kill(pid, "SIGKILL"); // SIGKILL
            }
        }
        await this.connect();
        return 0;
    }

    async listCommand(args, opts) {
        const status = opts.get("status");

        if (!STATUSES.includes(status)) {
            adone.log(`Not valid status: ${status}`);
            return 1;
        }

        const iOmnitron = await this.getService("omnitron");
        const result = await iOmnitron.list({
            status
        });
        adone.log(adone.inspect(result, { style: "color", depth: 4, noDescriptor: true, noType: true }));
        return 0;
    }
}
