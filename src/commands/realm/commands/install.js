const {
    app: { Subsystem, mainCommand }
} = adone;


export default class extends Subsystem {
    @mainCommand({
        arguments: [
            {
                name: "name",
                type: String,
                required: true,
                help: "Full name or absolute path to local project"
            }
        ],
        options: [
            {
                name: "--symlink",
                help: "Create symlink to project instead of install it (for local projects)"
            },
            {
                name: "--build",
                help: "Rebuild project before install"
            }
        ]
    })
    async installCommand(args, opts) {
        try {
            const realmManager = adone.realm.getManager();
            await realmManager.initialize();
            adone.cli.kit.observe("progress", realmManager);
            const observer = await realmManager.install({
                name: args.get("name"),
                symlink: opts.has("symlink"),
                build: opts.has("build")
            });
            await observer.result;

            return 0;
        } catch (err) {
            // adone.logError(err);
            return 1;
        }
    }
}


