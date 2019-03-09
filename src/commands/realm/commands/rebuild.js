const {
    app: { Subsystem, MainCommandMeta },
    runtime: { term }
} = adone;


export default class extends Subsystem {
    @MainCommandMeta({
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
            term.print(`{red-fg}${err.message}{/}`);
            return 1;
        }
    }
}
