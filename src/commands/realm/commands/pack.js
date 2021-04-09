const {
    app: { Subsystem, mainCommand },
    is
} = adone;


export default class extends Subsystem {
    @mainCommand({
        options: [
            {
                name: ["--name", "-N"],
                type: String,
                help: "Archive name"
            },
            {
                name: ["--type"],
                type: String,
                default: adone.nodejs.DEFAULT_EXT,
                help: "Archive type"
            },
            {
                name: ["--path", "-P"],
                type: String,
                default: adone.system.env.tmpdir(),
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
            }
        ]
    })
    async main(args, opts) {
        try {
            const rootRealm = await this.parent.connectRealm();
            const realm = new adone.realm.RealmManager({ cwd: process.cwd() });
            await realm.connect({
                transpile: true
            });
            const packOptions = (is.object(realm.devConfig) && is.plainObject(realm.devConfig.raw.tasks))
                ? realm.devConfig.raw.tasks.pack
                : {};

            await rootRealm.runAndWait("realmPack", {
                name: packOptions.name
                    ? packOptions.name
                    : opts.has("name")
                        ? opts.get("name")
                        : undefined,
                type: packOptions.type
                    ? packOptions.type
                    : opts.get("type"),
                path: packOptions.path
                    ? packOptions.path
                    : opts.get("path"),
                tags: opts.get("tags").length > 0
                    ? opts.get("tags")
                    : packOptions.tags,
                filter: opts.get("filter").length > 0
                    ? opts.get("filter")
                    : packOptions.filter,
                realm
            });

            return 0;
        } catch (err) {
            console.error(adone.pretty.error(err));
            return 1;
        }
    }
}
