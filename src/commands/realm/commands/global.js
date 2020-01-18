const {
    app: { Subsystem, mainCommand }
} = adone;

export default class extends Subsystem {
    @mainCommand({
        options: [
            {
                name: "--unregister",
                help: "Delete global link(s) to realm"
            },
            {
                name: "--no-bin",
                help: "Skip creation of global link to realm executables"
            },
            {
                name: "--bin-link-name",
                type: String,
                holder: "NAME",
                help: "Name of bin-link"
            },
            {
                name: "--no-lib",
                help: "Skip creation global link to realm library code"
            },
            {
                name: "--lib-link-name",
                type: String,
                holder: "NAME",
                help: "Name of lib-link"
            },
        ]
    })
    async main(args, opts) {
        try {
            const realm = new adone.realm.RealmManager({
                cwd: process.cwd()
            });
            await realm.connect({
                transpile: true
            });

            await realm.runAndWait("realmGlobal", {
                ...opts.getAll(),
                realm
            });

            return 0;
        } catch (err) {
            console.log(adone.pretty.error(err));
            return 1;
        }
    }
}
