const {
    app: { Subsystem, mainCommand },
    cli,
    error,
    fs,
    github
} = adone;

export default class extends Subsystem {
    onConfigure() {
        this.log = this.root.log;
    }

    @mainCommand({
        options: [
            {
                name: "--auth",
                type: String,
                required: true,
                description: "Auth value like `username:password`, `token`, etc."
            },
            {
                name: ["--tag", "-T"],
                type: String,
                required: true,
                description: "The name of the release tag"
            },
        ]
    })
    async main(args, opts) {
        try {
            const { auth, tag } = opts.getAll();
            const r = await this.parent.connectRealm({
                cwd: process.cwd(),
                progress: false
            });

            const publishInfo = r.devConfig.raw.publish;
            if (!publishInfo) {
                throw new error.NotExistsException("Publish metadata not found in dev configuration file");
            }

            const tmpPath = await fs.tmpName();

            const rootRealm = await this.parent.connectRealm();

            const targetRealm = await rootRealm.runAndWait("realmFork", {
                name: r.name,
                path: tmpPath,
                tags: publishInfo.artifacts.dev,
                realm: r.cwd
            });
            await targetRealm.connect({
                transpile: true
            });
            
            this.log({
                message: "installing npm modules"
            });
            await targetRealm.runAndWait("installModules");
            this.log({
                message: "npm modules successfully installed",
                status: true
            });

            this.log({
                message: "building realm"
            });
            await targetRealm.runAndWait("build");
            this.log({
                message: "realm successfully builded",
                status: true
            });

            const path = await rootRealm.runAndWait("realmPack", {
                realm: targetRealm,
                tags: publishInfo.artifacts.rel,
                path: tmpPath,
                filter: [
                    "!**/*.js.map",
                    "!bin/adone.map"
                ]
            });

            const filename = adone.path.basename(path);
            this.log({
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

            this.log({
                message: `realm ${cli.style.primary(targetRealm.name)} successfully published as ${cli.style.accent(filename)}`,
                status: true
            });

            await fs.remove(tmpPath);

            return 0;
        } catch (err) {
            console.log(adone.pretty.error(err));
            return 1;
        }
    }
}
