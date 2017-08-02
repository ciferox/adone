const adone = require("../..").default;

const { is } = adone;

adone.run({
    initialize() {
        this.defineArguments({
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
                    name: "start",
                    help: "start omnitron",
                    handler: this.startCommand
                },
                {
                    name: "stop",
                    help: "stop omnitron",
                    handler: this.stopCommand
                },
                {
                    name: "restart",
                    help: "restart omnitron",
                    handler: this.restartCommand
                }
            ]
        });
    },
    uninitialize() {
        return this.dispatcher().disconnect();
    },
    dispatcher() {
        if (is.undefined(this._dispatcher)) {
            this._dispatcher = new adone.omnitron.Dispatcher(this.app);
        }
        return this._dispatcher;
    },
    async pingCommand() {
        adone.log(await this.dispatcher().ping());
        return 0;
    },
    async uptimeCommand() {
        adone.log(await this.dispatcher().uptime());
        return 0;
    },
    async startCommand() {
        try {
            const status = await this.dispatcher().start();
            return status;
        } catch (err) {
            adone.log(err.message);
            return 2;
        }
    },
    async stopCommand() {
        try {
            await this.dispatcher().stop();
        } catch (err) {
            adone.error(err.message);
        }
        return 0;
    },
    async restartCommand() {
        try {
            await this.dispatcher().restart();
        } catch (err) {
            adone.log(err.message);
        }
        return 0;
    }
});
