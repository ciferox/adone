const {
    cli,
    error,
    is,
    fast,
    fs,
    std,
    realm
} = adone;

@adone.task.task("realmFork")
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

    async main({ srcRealm, destPath, name, onlyArtifacts } = {}) {
        this.manager.notify(this, "progress", {
            message: "checking"
        });

        if (is.string(srcRealm)) {
            srcRealm = new realm.RealmManager({ cwd: srcRealm });
        }

        if (!srcRealm || !is.realm(srcRealm)) {
            throw new error.NotValidException(`Invalid type of srcRealm: ${adone.typeOf(srcRealm)}`);
        }

        if (!is.string(destPath) || destPath.length === 0) {
            throw new error.NotValidException(`Invalid destPath: ${adone.inspect(destPath)}`);
        }

        if (!is.string(name) || name.length === 0) {
            throw new error.NotValidException(`Invalid name: ${adone.inspect(name)}`);
        }

        this.manager.notify(this, "progress", {
            message: "connecting to source realm"
        });

        // Connect to source realm
        await srcRealm.connect({
            transpile: true
        });

        this.manager.notify(this, "progress", {
            message: "preparing to copy common realm files"
        });

        const destCwd = std.path.resolve(destPath, name);
        if (await fs.exists(destCwd)) {
            throw new error.ExistsException(`Path '${destCwd}' already exists`);
        }

        this.destCwd = destCwd;
        await fs.mkdirp(this.destCwd);

        const artifacts = new Set;
        let artifactTags = new Set();

        if (!onlyArtifacts) {
            const files = await fs.readdir(srcRealm.ROOT_PATH);
            files.forEach((file) => artifacts.add(file));
        } else if (is.string(onlyArtifacts)) {
            artifactTags.add(onlyArtifacts);
        } else if (is.array(onlyArtifacts)) {
            onlyArtifacts.forEach((tag) => artifactTags.add(tag));
        }

        for (const attr of artifactTags.values()) {
            const files = srcRealm.getArtifacts(attr).map((info) => info.path);
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

            const fromPath = std.path.join(srcRealm.ROOT_PATH, dir);
            const toPath = std.path.join(this.destCwd, dir);

            if (await fs.isDirectory(fromPath)) {
                await fs.copy(fromPath, toPath);
            } else {
                await fs.copyFile(fromPath, toPath, { overwrite: false });
            }
        }

        this.manager.notify(this, "progress", {
            message: `realm ${cli.style.primary(srcRealm.name)} successfully forked into ${cli.style.accent(this.destCwd)}`,
            status: true
        });

        this.destRealm = new realm.RealmManager({
            cwd: this.destCwd
        });

        return this.destRealm;
    }

    async undo(err) {
        this.manager.notify(this, "progress", {
            message: err.message,
            status: false
        });

        is.string(this.destCwd) && await fs.rm(this.destCwd);
    }
}
