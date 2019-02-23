const {
    app: { Subsystem, MainCommandMeta },
    runtime: { logger }
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
    async buildCommand(args, opts) {
        try {
            logger.start({
                message: `Build ${args.has("path") ? args.get("path") : "whole project"}`
            });

            const path = this.parent.resolvePath(args, opts);
            const manager = await this.parent.getRealm();

            await manager.runAndWait("build", path);

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
