const {
    cli: { kit },
    app: { Subsystem, MainCommandMeta },
    omnitron
} = adone;


export default class extends Subsystem {
    @MainCommandMeta({
        options: [
            {
                name: "--active",
                help: "Only active natworks"
            }
        ]
    })
    async listCommand(args, opts) {
        try {
            kit.createProgress("obtaining");
            const options = opts.getAll();
            let networks;
            const isOmnitronActive = await omnitron.dispatcher.isOmnitronActive();

            if (!isOmnitronActive && options.active) {
                networks = [];
            } else {
                const db = await omnitron.dispatcher.getDB();
                networks = await db.getConfiguration("networks");
            }

            if (networks.length > 0) {
                kit.updateProgress({
                    message: "done",
                    status: true,
                    clean: true
                });
                console.log(adone.pretty.json(networks));
            } else {
                kit.updateProgress({
                    message: "no networks",
                    status: "notice"
                });
                // adone.runtime.term.print("{white-fg}No networks{/}\n");
            }
            return 0;
        } catch (err) {
            console.error(err);
            kit.updateProgress({
                message: err.message,
                status: false
            });
            return 1;
        }
    }
}
