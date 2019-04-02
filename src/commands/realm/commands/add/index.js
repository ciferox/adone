const {
    app: { Subsystem, mainCommand },
    project
} = adone;


export default class extends Subsystem {
    @mainCommand({
        arguments: [
            {
                name: "name",
                type: String,
                help: "Realm "
            }
        ],
        options: [
            {
                name: ["-t", "--type"],
                type: String,
                default: "application",
                choices: ["application", "cli.command", "omnitron.service"],
                help: "Type of file"
            },
            {
                name: ["-f", "--filename"],
                type: String,
                help: "Type of file"
            },
            {
                name: ["--editor", "-e"],
                type: String,
                nargs: "?",
                help: "open file immediately in the editor"
            }
        ]
    })
    async createfileCommand(args, opts) {
        const name = args.get("name");
        const manager = new project.Manager();

        const path = await manager.createFile({
            name,
            type: opts.get("type"),
            fileName: opts.has("filename") ? opts.get("filename") : undefined
        });

        if (opts.has("editor")) {
            await (new adone.util.Editor({
                path,
                editor: opts.get("editor")
            })).spawn({
                detached: true
            });
        }
    }
}
