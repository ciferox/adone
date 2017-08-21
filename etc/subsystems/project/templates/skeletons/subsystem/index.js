const {
    application
} = adone;

export default class extends application.Subsystem {
    initialize() {
        this.defineCommand({
            arguments: [
            ],
            options: [
            ],
            commands: [
                {
                    name: "test",
                    help: "Test command",
                    handler: this.testCommand
                },
            ]
        });
    }

    async testCommand(args, opts) {
        adone.log("test command");
        return 0; // exit status
    }
}
