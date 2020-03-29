const {
    app: { Subsystem, mainCommand }
} = adone;


export default class extends Subsystem {
    @mainCommand({
        options: [
            {
                name: ["--name", "-N"],
                type: String,
                help: "Realm name (directory name)"
            },
            {
                name: ["--path", "-P"],
                type: String,
                default: adone.path.join(adone.system.env.home(), ".node_modules"),
                help: "Destination path"
            },
            {
                name: ["--tags", "-T"],
                nargs: "*",
                description: "Tags of realm artifact ('file', 'dir', 'common', ...)"
            },
            {
                name: ["--filter", "-F"],
                nargs: "*",
                help: "Filter(s)"
            },
            {
                name: ["--skip-npm"],
                help: "Skip installation of npm packages"

            }
        ]
    })
    async main(args, opts) {
        try {
            const rootRealm = await this.parent.connectRealm();
            await rootRealm.runAndWait("realmFork", {
                ...opts.getAll(),
                realm: process.cwd()
            });

            return 0;
        } catch (err) {
            console.log(adone.pretty.error(err));
            return 1;
        }
    }
}
