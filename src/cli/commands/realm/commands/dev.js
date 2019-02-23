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
    async devCommand(args, opts) {
        try {
            adone.runtime.logger.watching({
                message: `${args.has("path") ? args.get("path") : "whole project"}`
            });

            const path = this.parent.resolvePath(args, opts);
            const manager = await this.parent.getRealm();
            await manager.runAndWait("watch", path);
        } catch (err) {
            term.print(`{red-fg}${err.message}{/}`);
            return 1;
        }
    }
}
