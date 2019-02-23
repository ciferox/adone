const {
    app: { Subsystem, MainCommandMeta }
} = adone;


export default class extends Subsystem {
    @MainCommandMeta({
        arguments: [
            {
                name: "name",
                type: String,
                required: true,
                help: "Namespace name"
            },
            {
                name: "path",
                type: String,
                required: true,
                help: "Path to namespace implementation"
            }
        ]
    })
    async mountCommand(args) {
        try {
            const realmManager = adone.realm.getManager();
            await realmManager.initialize();
            adone.cli.kit.observe("progress", realmManager);
            const observer = await realmManager.mount({
                name: args.get("name"),
                path: args.get("path")
            });
            await observer.result;

            return 0;
        } catch (err) {
            // term.print(`{red-fg}${err.message}{/}`);
            return 1;
        }
    }
}
