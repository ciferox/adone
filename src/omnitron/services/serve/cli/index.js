export default class extends adone.application.Subsystem {
    initialize() {
        this.defineCommand({
            name: "serve",
            group: "service_cli",
            help: "service for managing zero-configuration static http servers",
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
