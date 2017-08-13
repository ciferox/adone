
export default class extends adone.application.Subsystem {
    initialize() {
        this.defineCommand({
            name: "{{ name }}",
            group: "subsystem",
            help: "subsystem description",
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
