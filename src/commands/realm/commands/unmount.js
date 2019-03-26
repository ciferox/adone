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
                help: "Namespace name"
            }
        ]
    })
    async unmountCommand(args) {
        try {
            const realmManager = adone.realm.getManager();
            await realmManager.initialize();
            adone.cli.kit.observe("progress", realmManager);
            const observer = await realmManager.unmount({
                name: args.get("name")
            });
            await observer.result;

            return 0;
        } catch (err) {
            // term.print(`{red-fg}${err.message}{/}`);
            return 1;
        }
    }
}
