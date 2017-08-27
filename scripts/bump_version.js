const {
    std: { path },
    semver,
    configuration,
    terminal
} = adone;

adone.application.run({
    configure() {
        this.defineArguments({
            arguments: [
                {
                    name: "type",
                    choices: ["major", "minor", "patch", "premajor", "preminor", "prepatch", "prerelease"],
                    default: "patch",
                    help: "part of version to bump"
                }
            ],
            options: [
                {
                    name: ["--loose", "-l"],
                    help: "interpret version loosely"
                },
                {
                    name: ["--preid"],
                    help: "identifier to be used to prefix premajor, preminor, prepatch or prerelease"
                }
            ]
        });
    },
    async main(args, opts) {
        try {
            const packageJsonPath = path.join(adone.rootPath, "package.json");
            const type = args.get("type");
            const identifier = opts.get("preid");
            const packageJson = await configuration.load(packageJsonPath);
            const loose = opts.has("loose");
            const version = packageJson.version;

            if (!semver.valid(version, loose)) {
                throw new adone.x.NotValid(`Version is not valid: ${version}`);
            }

            packageJson.version = semver.inc(semver.clean(version, loose), type, loose, identifier);

            // Fix version in subsystems.json
            const cliJsonPath = path.join(adone.etcPath, "configs", "cli.json");
            const cliJson = await configuration.load(cliJsonPath);
            if (cliJson.subsystems.length > 0) {
                for (const ss of cliJson.subsystems) {
                    ss.version = packageJson.version;
                }
                await cliJson.save(cliJsonPath, null, { space: "    " });
            }

            await packageJson.save(packageJsonPath, null, { space: "  " });

            terminal.print(`{green-fg}Original: {/green-fg}{bold}${version}{/}\n`);
            terminal.print(`{green-fg}Incremented: {/green-fg}{bold}${packageJson.version}{/}\n`);
        } catch (err) {
            terminal.print(`{red-fg}${err.message}{/}\n`);
        }
    }
});
