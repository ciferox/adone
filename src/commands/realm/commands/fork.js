const {
    app: { Subsystem, mainCommand }
} = adone;


export default class extends Subsystem {
    @mainCommand({
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
            },
            {
                name: ["--tags", "-T"],
                nargs: "*",
                description: "Tags of realm artifact ('file', 'dir', 'common', ...)"
            }
        ]
    })
    async main(args, opts) {
        try {
            const rootRealm = await this.parent.connectRealm();
            await rootRealm.runAndWait("realmFork", {
                realm: process.cwd(),
                name: args.get("name"),
                path: opts.get("path"),
                artifactTags: opts.get("tags")
            });

            return 0;
        } catch (err) {
            // console.log(adone.pretty.error(err));
            return 1;
        }
    }
}
