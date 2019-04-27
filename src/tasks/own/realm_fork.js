const {
    cli,
    error,
    is,
    fs,
    std,
    realm: { BaseTask, RealmManager }
} = adone;

@adone.task.task("realmFork")
export default class extends BaseTask {
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

    async main({ realm, path, name, artifactTags, filter } = {}) {
        this.manager.notify(this, "progress", {
            message: "checking"
        });

        if (is.string(realm)) {
            realm = new RealmManager({ cwd: realm });
        }

        if (!realm || !is.realm(realm)) {
            throw new error.NotValidException(`Invalid type of srcRealm: ${adone.typeOf(realm)}`);
        }

        if (!is.string(path) || path.length === 0) {
            throw new error.NotValidException(`Invalid destPath: ${adone.inspect(path)}`);
        }

        if (!is.string(name) || name.length === 0) {
            throw new error.NotValidException(`Invalid name: ${adone.inspect(name)}`);
        }

        this.manager.notify(this, "progress", {
            message: "connecting to source realm"
        });

        // Connect to source realm
        await realm.connect({
            transpile: true
        });

        this.manager.notify(this, "progress", {
            message: "preparing to copy common realm files"
        });

        const destCwd = std.path.resolve(path, name);
        if (await fs.exists(destCwd)) {
            throw new error.ExistsException(`Path '${destCwd}' already exists`);
        }

        this.destCwd = destCwd;
        await fs.mkdirp(this.destCwd);

        const artifacts = new Set;
        if (is.array(artifactTags) && artifactTags.length > 0) {
            artifactTags = new Set(artifactTags);
        } else if (is.string(artifactTags) && artifactTags.length > 0) {
            artifactTags = new Set(artifactTags.split(","));
        } else if (!artifactTags || artifactTags.length === 0) {
            artifactTags = new Set();
            const files = await fs.readdir(realm.cwd);
            files.forEach((file) => artifacts.add(file));
        }

        for (const attr of artifactTags.values()) {
            const files = realm.artifacts.get(attr).map((info) => info.path);
            files.forEach((file) => artifacts.add(file));
        }

        // artifacts required for a realm
        artifacts.add(".adone");
        artifacts.add("package.json");

        this.manager.notify(this, "progress", {
            message: "copying realm artifactTags"
        });

        for (const dir of artifacts.values()) {
            this.manager.notify(this, "progress", {
                message: `copying ${cli.style.accent(dir)}`
            });

            const fromPath = std.path.join(realm.cwd, dir);
            const toPath = std.path.join(this.destCwd, dir);

            if (await fs.isDirectory(fromPath)) {
                await fs.copyEx(fromPath, toPath, {
                    base: realm.cwd,
                    results: false,
                    dot: true,
                    junk: true,
                    filter
                });
            } else {
                await fs.copyFile(fromPath, toPath, fs.constants.COPYFILE_EXCL);
            }
        }

        this.manager.notify(this, "progress", {
            message: `realm ${cli.style.primary(realm.name)} successfully forked into ${cli.style.accent(this.destCwd)}`,
            status: true
        });

        this.destRealm = new RealmManager({
            cwd: this.destCwd
        });

        return this.destRealm;
    }

    async undo(err) {
        this.manager.notify(this, "progress", {
            message: err.message,
            status: false
        });

        is.string(this.destCwd) && await fs.remove(this.destCwd);
    }
}
