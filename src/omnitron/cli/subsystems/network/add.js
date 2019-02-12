const {
    is,
    app: { MainCommandMeta, Subsystem },
    cli: { kit },
    omnitron
} = adone;

export default class extends Subsystem {
    @MainCommandMeta({
        options: [
            {
                name: "--name",
                type: String,
                help: "Network name/net id"
            },
            {
                name: "--address",
                nargs: "+",
                type(val) {
                    if (!is.multiAddress(val) && ! is.string(val)) {
                        throw new adone.error.NotValidException(`Value '${val}' it not a valid address`);
                    }
                    return adone.multi.address.create(val);
                },
                required: true,
                help: "Network address(es)"
            },
            {
                name: "--autostart",
                help: "Start network during the omnitron startup"
            }
        ]
    })
    async command(args, opts) {
        try {
            kit.createProgress("adding");

            const db = await omnitron.dispatcher.getDB();
            const networks = await db.getConfiguration("networks");
            await networks.add(opts.get("name"), {
                ...adone.util.omit(opts.getAll(), "name")
            });

            kit.updateProgress({
                message: "done",
                status: true
            });
            return 0;
        } catch (err) {
            kit.updateProgress({
                message: err.message,
                status: false
            });
            return 1;
        }
    }
}
