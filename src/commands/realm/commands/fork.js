const {
    app: { Subsystem, MainCommandMeta },
    cli,
    realm
} = adone;


export default class extends Subsystem {
    @MainCommandMeta({
        arguments: [
            {
                name: "name",
                type: String,
                help: "Realm name (directory name)"
            }
        ],
        options: [
            {
                name: ["--path", "-P"],
                type: String,
                required: true,
                help: "Destination path"
            }
        ]
    })
    async main(args, opts) {
        try {
            const manager = realm.rootRealm;
            await manager.connect();
            await cli.observe("progress", manager);
            await manager.runAndWait("forkRealm", {
                srcRealm: process.cwd(),
                name: args.get("name"),
                basePath: opts.get("path")
            });

            return 0;
        } catch (err) {
            console.log(adone.pretty.error(err));
            return 1;
        }
    }
}
