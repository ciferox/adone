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
    async build(args, opts) {
        try {
            cli.updateProgress({
                message: `building ${cli.style.primary(args.has("path") ? args.get("path") : "whole project")}`
            });

            const path = this.parent.resolvePath(args, opts);
            const r = await this.parent.connectRealm({
                cwd: process.cwd(),
                progress: false
            });
            await r.runAndWait("build", { path });

            cli.updateProgress({
                message: "done",
                // clean: true,
                status: true
            });
            return 0;
        } catch (err) {
            cli.updateProgress({
                message: err.message,
                status: false,
                // clean: true
            });
            // console.error(adone.pretty.error(err));
            return 1;
        }
    }
}
