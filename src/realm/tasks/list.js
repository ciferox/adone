const {
    cli: { kit },
    fs,
    std,
    task,
    text
} = adone;

export default class ListTask extends task.Task {
    async run({ keyword = "", threshold = 0.2 } = {}) {
        kit.createProgress("obtaining");

        await fs.mkdirp(adone.realm.config.packagesPath);
        const packages = await fs.readdir(adone.realm.config.packagesPath);

        const result = [];
        for (const name of packages) {
            let isValid = true;
            let errInfo = "not valid";
            const packagePath = std.path.join(adone.realm.config.packagesPath, name);
            const lstat = await fs.lstat(packagePath); // eslint-disable-line

            if (lstat.isSymbolicLink()) {
                try {
                    const stat = await fs.stat(packagePath); // eslint-disable-line
                } catch (err) {
                    if (err.code === "ENOENT") {
                        isValid = false;
                        errInfo = "broken link";
                    }
                }
            }

            const packageInfo = {
                name,
                isValid,
                errInfo,
                isSymlink: lstat.isSymbolicLink()
            };

            // eslint-disable-next-line
            if (isValid && await fs.exists(std.path.join(packagePath, adone.configuration.Adone.configName))) {
                // eslint-disable-next-line
                const adoneConf = await adone.configuration.Adone.load({
                    cwd: packagePath
                });

                packageInfo.version = adoneConf.raw.version;
                packageInfo.description = adoneConf.raw.description || "";
            }

            result.push(packageInfo);
        }

        // Reading commands from cli configuration and check
        const cliConfig = await adone.cli.Configuration.load();

        for (const cmd of cliConfig.raw.commands) {
            const name = std.path.relative(adone.realm.config.packagesPath, cmd.subsystem).split(std.path.sep)[0];
            const index = result.findIndex((x) => x.name === name);
            if (index === -1) {
                result.push({
                    name,
                    isValid: false,
                    errInfo: "present in config but not installed"
                });
            }
        }

        // Sort in ascending order.
        result.sort((a, b) => a.name > b.name);

        kit.updateProgress({
            schema: "",
            result: true,
            clean: true
        });

        if (keyword.length === 0) {
            return result;
        }

        return (new text.Fuzzy(result, {
            keys: ["name"],
            threshold
        })).search(keyword);
    }
}
