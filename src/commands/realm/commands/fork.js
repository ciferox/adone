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
            }
        ]
    })
    async main(args, opts) {
        try {
            const rootRealm = await this.parent.connectRealm();
            await rootRealm.runAndWait("realmFork", {
                srcRealm: process.cwd(),
                name: args.get("name"),
                destPath: opts.get("path")
            });

            return 0;
        } catch (err) {
            // console.log(adone.pretty.error(err));
            return 1;
        }
    }
}
