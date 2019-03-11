const {
    app: { Subsystem, MainCommandMeta, runtime: { logger } },
    cli
} = adone;


export default class extends Subsystem {
    @MainCommandMeta({
        arguments: [
            {
                name: "part",
                choices: ["major", "minor", "patch", "premajor", "preminor", "prepatch", "prerelease"],
                default: "patch",
                help: "Part of version to bump"
            }
        ],
        options: [
            {
                name: ["--loose", "-l"],
                help: "Interpret version loosely"
            },
            {
                name: ["--preid"],
                help: "Identifier to be used to prefix premajor, preminor, prepatch or prerelease"
            }
        ]
    })
    async incverCommand(args, opts) {
        try {
            logger.start({
                message: "Increase version"
            });

            const manager = await this.parent.getRealm();
            await adone.cli.kit.observe(["log", "logInfo"], manager);
            const observer = await manager.run("increaseVersion", {
                part: args.get("part"),
                preid: (opts.has("preid") ? opts.get("preid") : null),
                loose: opts.has("loose")
            });
            await observer.result;

            logger.success({
                message: `New version is ${adone.package.version}`
            });

            return 0;
        } catch (err) {
            console.error(adone.pretty.error(err));
            return 1;
        }
    }
}
