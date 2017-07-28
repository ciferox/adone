const { is, std: { path } } = adone;

export default class extends adone.application.Subsystem {
    initialize() {
        this.defineCommand({
            name: "app",
            group: "subsystem",
            help: "cli interface for adone project management",
            arguments: [
            ],
            options: [
            ],
            commands: [
                {
                    name: "new",
                    help: "Create new directory and initialize project",
                    arguments: [
                        {
                            name: "name",
                            type: String,
                            required: true,
                            help: "Name of project"
                        }
                    ],
                    options: [
                        {
                            name: ["--type", "-t"],
                            choices: ["app", "subsystem", "service"],
                            default: "app",
                            help: "Type of adone project"
                        }
                    ],
                    handler: this.newCommand
                },
                {
                    name: "build",
                    help: "Build project",
                    options: [
                        {
                            name: "--watch",
                            help: "Watch files changes"
                        }
                    ],
                    handler: this.buildCommand
                },
                {
                    name: "clean",
                    help: "Clean project",
                    handler: this.cleanCommand
                }
            ]
        });
    }

    async newCommand(args, opts) {
        const name = args.get("name");
        const appPath = path.join(process.cwd(), name);
        
        if ((await adone.fs.exists(appPath))) {
            throw new adone.x.Exists(`Directory ${name} already exists`);
        }

        await adone.fs.mkdir(appPath);

        adone.info(`Project '${name}' successfully created.`);
    }

    async buildCommand() {

    }

    async cleanCommand() {

    }
}
