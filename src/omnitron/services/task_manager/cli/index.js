export default class extends adone.application.Subsystem {
    initialize() {
        this.defineCommand({
            name: "tm",
            group: "service_cli",
            help: "Task manager service",
            arguments: [
                {
                    name: "path",
                    type: String,
                    help: "Path to directory",
                    default: ["./public", "./"]
                }
            ],
            options: [

            ],
            handler: this.serveCommand
        });
    }

    async serveCommand(args, opts) {
        
    }
}
