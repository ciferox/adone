const {
    app: { Subsystem, mainCommand }
} = adone;

export default class extends Subsystem {
    onConfigure() {
        this.log = this.root.log;
    }

    @mainCommand({
        options: [
            {
                name: "--auth",
                type: String,
                required: true,
                description: "Auth value like `username:password`, `token`, etc."
            },
            {
                name: ["--tag", "-T"],
                type: String,
                required: true,
                description: "The name of the release tag"
            },
        ]
    })
    async main(args, opts) {
        try {
            const { auth, tag } = opts.getAll();
            const rootRealm = await this.parent.connectRealm();

            await rootRealm.runAndWait("realmPublish", {
                realm: process.cwd(),
                auth,
                tag
            });

            return 0;
        } catch (err) {
            console.error(adone.pretty.error(err));
            return 1;
        }
    }
}
