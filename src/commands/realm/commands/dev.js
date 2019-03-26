const {
    app: { Subsystem, mainCommand },
    cli
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
    async devCommand(args, opts) {
        try {
            adone.app.runtime.logger.watching({
                message: `${args.has("path") ? args.get("path") : "whole project"}`
            });

            const path = this.parent.resolvePath(args, opts);
            const manager = await this.parent.connectRealm({
                cwd: process.cwd(),
                progress: false
            });
            await manager.runAndWait("watch", path);
        } catch (err) {
            console.error(adone.pretty.error(err));
            return 1;
        }
    }
}
