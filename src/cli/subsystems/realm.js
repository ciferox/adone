const {
    app,
    is
} = adone;

const {
    DCliCommand
} = app;

export default class RealmManager extends app.Subsystem {
    @DCliCommand({
        name: ["fork"],
        help: "Fork active realm",
        arguments: [
            {
                name: "name",
                type: String,
                help: "Realm name (directory name)"
            }
        ],
        options: [
            {
                name: ["--path", "-p"],
                type: String,
                default: adone.system.env.home(),
                help: "Path where realm will be deploy"
            },
            {
                name: ["--bits"],
                type: Number,
                default: 2048,
                help: "Realm identity's RSA key size"
            },
            {
                name: ["--with-src"],
                help: "With source code directory"
            },
            {
                name: ["--compress"],
                type: String,
                default: is.windows ? "zip" : "tar.gz",
                help: "compress realm"
            }
        ]
    })
    async forkCommand(args, opts) {
        try {
            const realmManager = await this.getRealm();
            if (args.has("name")) {
                await realmManager.runAndWait("forkRealm", {
                    cwd: opts.get("path"),
                    name: args.get("name"),
                    bits: opts.get("bits"),
                    withSrc: opts.has("withSrc"),
                    compress: opts.has("compress") ? opts.get("compress") : false
                });
            } else {

            }

            return 0;
        } catch (err) {
            this.root.kit.updateProgress({
                message: err.message,
                status: false
            });

            return 1;
        }
    }

    @DCliCommand({
        name: "info",
        help: "Show realm information"
    })
    async infoCommand(args, opts) {
        const name = args.get("name");
        try {
            const realmManager = await this.getRealm();
            const commonInfo = {
                "Home path": realmManager.cwd
            };

            

            // const path = await adone.realm.init(name, opts.has("path") ? opts.get("path") : null);
            // term.print(`Realm {green-fg}'${path}'{/green-fg} successfully initialized\n`);
            return 0;
        } catch (err) {
            this.root.kit.updateProgress({
                message: err.message,
                status: false
            });
            return 1;
        }
    }

    async getRealm() {
        if (!this._realmManager) {
            this._realmManager = await adone.realm.getManager();
            this.root.kit.observe("progress", this._realmManager);
        }

        return this._realmManager;
    }
}
