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
            const packagePath = std.path.join(adone.realm.config.packagesPath, name);
            const lstat = await fs.lstat(packagePath); // eslint-disable-line

            if (lstat.isSymbolicLink()) {
                try {
                    const stat = await fs.stat(packagePath); // eslint-disable-line
                } catch (err) {
                    if (err.code === "ENOENT") {
                        isValid = false;
                    }
                }
            }

            const packageInfo = {
                name,
                isValid,
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
