const {
    app: { Subsystem, mainCommand }
} = adone;


export default class extends Subsystem {
    @mainCommand({
        arguments: [
            {
                name: "path",
                nargs: "?",
                help: "Project entry path"
            }
        ],
        options: [
            {
                name: ["-re", "--re"],
                help: "Interpret 'path' as regular expression"
            }
        ]
    })
    async rebuildCommand(args, opts) {
        try {
            await this.cleanCommand(args, opts);
            return this.buildCommand(args, opts);
        } catch (err) {
            console.err(adone.pretty.error(err));
            return 1;
        }
    }
}
