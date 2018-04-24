const {
    app: {
        Subsystem,
        DCliCommand
    },
    is,
    cli: { kit },
    omnitron2
} = adone;

export default class Host extends Subsystem {
    @DCliCommand({
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
                adone.log(adone.pretty.json(hosts));
            } else {
                adone.runtime.term.print("{white-fg}No hosts{/}\n");
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
