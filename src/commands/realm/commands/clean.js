const {
    app: { Subsystem, MainCommandMeta, runtime: { logger } }
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
    async cleanCommand(args, opts) {
        try {
            logger.start({
                message: `Clean ${args.has("path") ? args.get("path") : "whole project"}`
            });

            const path = this.parent.resolvePath(args, opts);
            const r = await this.parent.connectRealm({ cwd: process.cwd() });
            // await adone.cli.kit.observe("logInfo", r);
            await r.runAndWait("clean", { path });

            logger.success({
                message: "Successfully cleaned"
            });

            return 0;
        } catch (err) {
            console.error(err);
            return 1;
        }
    }
}
