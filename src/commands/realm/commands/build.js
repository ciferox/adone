const {
    app: { Subsystem, mainCommand, runtime: { logger } }
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
            logger.start({
                message: `Build ${args.has("path") ? args.get("path") : "whole project"}`
            });

            const path = this.parent.resolvePath(args, opts);
            const r = await this.parent.connectRealm({
                cwd: process.cwd(),
                progress: false
            });
            await r.runAndWait("build", { path });

            logger.success({
                message: "Successfully builded"
            });

            return 0;
        } catch (err) {
            logger.error(err);
            return 1;
        }
    }
}
