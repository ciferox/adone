const { is, std: { path } } = adone;

export default class extends adone.application.Subsystem {
    initialize() {
        this.defineCommand({
            name: "app",
            group: "subsystem",
            help: "cli interface for adone application management",
            arguments: [
            ],
            options: [
            ],
            commands: [
                {
                    name: "new",
                    help: "Create new directory and initialize adone application",
                    arguments: [
                        {
                            name: "name",
                            type: String,
                            required: true,
                            help: "Name of project/directory"
                        }
                    ],
                    handler: this.newCommand
                }
            ]
        });
    }

    async newCommand(args, opts) {
        const name = args.get("name");
        const appPath = path.join(process.pwd(), name);
        
        if ((await adone.fs.exists(appPath))) {
            throw new adone.x.Exists(`Directory ${name} already exists`);
        }

        await adone.fs.mkdir(appPath);
    }
}
