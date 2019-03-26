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
        ]
    })
    async uninstallCommand(args) {
        try {
            const realmManager = adone.realm.getManager();
            await realmManager.initialize();
            adone.cli.kit.observe("progress", realmManager);
            const observer = await realmManager.uninstall({
                name: args.get("name")
            });
            await observer.result;

            return 0;
        } catch (err) {
            // adone.logError(err);
            return 1;
        }
    }
}
