require("../..");

const {
    omnitron
} = adone;

adone.application.runCli({
    configure() {
        this.defineArguments({
            commands: [
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
        return omnitron.dispatcher.disconnect();
    },
    async startCommand() {
        try {
            const status = await omnitron.dispatcher.startOmnitron();
            return status;
        } catch (err) {
            adone.logError(err.message);
            return 2;
        }
    },
    async stopCommand() {
        try {
            await omnitron.dispatcher.stopOmnitron();
            return 0;
        } catch (err) {
            adone.logError(err.message);
            return 2;
        }
    },
    async restartCommand() {
        try {
            await omnitron.dispatcher.restartOmnitron();
            return 0;
        } catch (err) {
            adone.logError(err.message);
            return 2;
        }
    }
});
