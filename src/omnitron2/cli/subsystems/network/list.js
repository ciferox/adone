const {
    cli: { kit },
    app: { Subsystem, DMainCliCommand },
    omnitron2
} = adone;


export default class extends Subsystem {
    @DMainCliCommand({
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
            const isOmnitronActive = await omnitron2.dispatcher.isOmnitronActive();

            if (!isOmnitronActive && options.active) {
                networks = [];
            } else {
                const db = await omnitron2.dispatcher.getDB();
                networks = await db.getConfiguration("networks");
            }

            if (networks.length > 0) {
                kit.updateProgress({
                    message: "done",
                    status: true,
                    clean: true
                });
                adone.log(adone.pretty.json(networks));
            } else {
                kit.updateProgress({
                    message: "no networks",
                    status: "notice"
                });
                // adone.runtime.term.print("{white-fg}No networks{/}\n");
            }
            return 0;
        } catch (err) {
            adone.log(err);
            kit.updateProgress({
                message: err.message,
                status: false
            });
            return 1;
        }
    }
}