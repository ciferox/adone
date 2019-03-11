const {
    app: {
        Subsystem,
        CommandMeta
    },
    is,
    cli: { kit },
    omnitron
} = adone;

export default class Host extends Subsystem {
    @CommandMeta({
        name: "list",
        help: "Show hosts"
    })
    async listCommand(args, opts) {
        try {
            kit.createProgress("obtaining");
            const options = opts.getAll();
            let hosts;

            // ...

            kit.updateProgress({
                message: "done",
                result: true,
                clean: true
            });
            if (hosts.length > 0) {
                console.log(adone.pretty.json(hosts));
            } else {
                adone.cli.print("{white-fg}No hosts{/}\n");
            }
            return 0;
        } catch (err) {
            kit.updateProgress({
                message: err.message,
                result: false
            });
            return 1;
        }
    }
}
