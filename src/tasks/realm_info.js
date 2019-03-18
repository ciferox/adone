const {
    error,
    is,
    fs,
    realm
} = adone;

export default class extends realm.BaseTask {
    get arch() {
        const arch = process.arch;
        switch (arch) {
            case "ia32": return "x86";
            default: return arch;
        }
    }

    get os() {
        const platform = process.platform;
        switch (platform) {
            case "win32": return "win";
            default: return platform;
        }
    }

    async main({ cwd, common = false, struct = false, tasks = false, onlyNative = false, structFull = false } = {}) {
        if (!is.string(cwd)) {
            throw new error.NotValidException(`Invalid type of cwd: ${adone.typeOf(cwd)}`);
        }

        this.manager.notify(this, "progress", {
            message: "collecting to realm"
        });

        const all = (common && struct && tasks) || (!common && !struct && !tasks);

        const r = new realm.Manager({ cwd });
        await r.connect();

        this.manager.notify(this, "progress", {
            message: "collecting info"
        });

        const result = {};

        if (common || all) {
            result.common = this._getCommonInfo(r);
        }

        if (tasks || all) {
            result.tasks = [
                {
                    key: "Tasks:",
                    value: r.getTaskNames().sort().join(", ")
                }
            ];
        }

        if (struct || all) {
            const entries = r.getEntries({
                path: null,
                onlyNative,
                excludeVirtual: false // TODO: make it configurable
            });
            const structure = {};
            if (structFull) {
                for (const entry of entries) {
                    structure[entry.id] = adone.util.omit(entry, "id");
                }
            } else {
                for (const entry of entries) {
                    structure[entry.id] = entry.description || "";
                }
            }
            result.struct = structure;
        }

        this.manager.notify(this, "progress", {
            clean: true,
            status: true
        });

        return result;
    }

    _getCommonInfo(rootRealm) {
        const info = [];
        if (is.string(rootRealm.package.name)) {
            info.push({
                key: "Name:",
                value: rootRealm.package.name
            });
        }

        if (is.string(rootRealm.package.version)) {
            info.push({
                key: "Version:",
                value: rootRealm.package.version
            });
        }

        if (is.string(rootRealm.package.description)) {
            info.push({
                key: "Description:",
                value: rootRealm.package.description
            });
        }

        if (is.string(rootRealm.package.author)) {
            info.push({
                key: "Author:",
                value: rootRealm.package.author
            });
        }

        return info;
    }

    async undo(err) {
        this.manager.notify(this, "progress", {
            message: err.message,
            status: false
        });

        is.realm(this.destRealm) && await fs.rm(this.destRealm.cwd);
    }
}
