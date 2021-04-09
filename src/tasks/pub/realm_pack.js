const {
    cli,
    error,
    is,
    fast,
    fs,
    path: aPath,
    nodejs,
    realm: { BaseTask, RealmManager }
} = adone;

@adone.task.task("realmPack")
export default class extends BaseTask {
    async main({ realm, path, name, tags, filter, type = nodejs.DEFAULT_EXT } = {}) {
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
            name = `${realm.name}-v${realm.package.version}-node-v${process.version.split(".")[0].slice(1)}.x-${nodejs.getCurrentPlatform()}-${nodejs.getCurrentArch()}`;
        }

        this.manager.notify(this, "progress", {
            message: "connecting to realm"
        });

        // Connect to source realm
        await realm.connect({
            transpile: true
        });

        this.manager.notify(this, "progress", {
            message: `packing realm ${cli.style.primary(realm.name)}`
        });

        const artifacts = new Set;
        if (is.array(tags) && tags.length > 0) {
            tags = new Set(tags);
        } else if (is.string(tags) && tags.length > 0) {
            tags = new Set(tags.split(","));
        } else if (!tags || tags.length === 0) {
            tags = new Set();
            const files = await fs.readdir(realm.cwd);
            files.forEach((file) => artifacts.add(file));
        }

        for (const attr of tags.values()) {
            const files = realm.artifacts.get(attr).map((info) => info.path);
            files.forEach((file) => artifacts.add(file));
        }

        // artifacts required for a realm
        artifacts.add(".adone");
        artifacts.add("package.json");

        const from = [];
        for (const dir of artifacts.values()) {
            const fromPath = aPath.join(realm.cwd, dir);
            if (await fs.isDirectory(fromPath)) {
                from.push(aPath.join(dir, "**", "*"));
            } else {
                from.push(dir);
            }
        }

        const filename = `${name}${type}`;
        await fast.src([
            ...from,
            ...filter,
        ], {
            cwd: realm.cwd,
            base: realm.cwd
        })
            // .archive(type, filename)
            .dest(path);

        this.manager.notify(this, "progress", {
            message: `realm ${cli.style.primary(realm.name)} successfully packed`,
            status: true
        });

        return aPath.join(path, filename);
    }
}
