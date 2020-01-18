const {
    cli,
    error,
    is,
    fs,
    github
} = adone;

@adone.task.task("realmPublish")
export default class extends adone.realm.BaseTask {
    async main({ realm, auth, tag } = {}) {
        this.manager.notify(this, "progress", {
            message: "checking"
        });

        if (is.string(realm)) {
            realm = new adone.realm.RealmManager({ cwd: realm });
        }

        if (!realm || !is.realm(realm)) {
            throw new error.NotValidException(`Invalid type of srcRealm: ${adone.typeOf(realm)}`);
        }

        this.manager.notify(this, "progress", {
            message: "connecting to realm"
        });

        // Connect to source realm
        await realm.connect({
            transpile: true
        });

        this.manager.notify(this, "progress", {
            message: "forking realm"
        });

        const publishInfo = realm.devConfig.raw.publish;
        if (!publishInfo) {
            throw new error.NotExistsException("Publish metadata not found in dev configuration file");
        }

        const tmpPath = await fs.tmpName();
        const targetRealm = await this.manager.runAndWait("realmFork", {
            name: realm.name,
            path: tmpPath,
            tags: publishInfo.artifacts.dev,
            realm: realm.cwd
        });
        await targetRealm.connect({
            transpile: true
        });

        this.manager.notify(this, "progress", {
            message: "building realm"
        });
        await targetRealm.runAndWait("build");

        const path = await this.manager.runAndWait("realmPack", {
            realm: targetRealm,
            tags: publishInfo.artifacts.rel,
            path: tmpPath,
            filter: publishInfo.filter
        });

        const filename = adone.path.basename(path);
        this.manager.notify(this, "progress", {
            message: `uploading ${cli.style.primary(filename)}`
        });

        if (publishInfo.type === "github") {
            const relManager = new github.GitHubReleaseManager({
                owner: publishInfo.owner,
                repo: publishInfo.repo,
                auth,
                apiBase: publishInfo.apiBase || github.apiBase
            });

            /*const result = */await relManager.uploadAsset({
                tag,
                path
            });
        }

        this.manager.notify(this, "progress", {
            message: "removing temporary files"
        });

        await fs.remove(tmpPath);

        this.manager.notify(this, "progress", {
            message: `realm ${cli.style.primary(targetRealm.name)} successfully published as ${cli.style.accent(filename)}`,
            status: true
        });
    }
}
