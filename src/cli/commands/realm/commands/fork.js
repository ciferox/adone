const {
    app: { Subsystem, MainCommandMeta },
    is
} = adone;


export default class extends Subsystem {
    @MainCommandMeta({
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
                name: ["--bits", "-B"],
                type: Number,
                default: 2048,
                help: "Realm identity's RSA key size"
            },
            {
                name: "--with-src",
                help: "With source code directory"
            },
            {
                name: ["--compress", "-C"],
                type: String,
                nargs: "*",
                default: is.windows ? "zip" : "tar.gz",
                help: "Create archive instead of a directory"
            },
            {
                name: "--clean",
                help: "Clean version of adone (without tasks, configs, etc.)"
            }
        ]
    })
    async forkCommand(args, opts) {
        try {
            const realmManager = await this.getRealm();
            await realmManager.runAndWait("forkRealm", {
                basePath: opts.get("path"),
                name: args.get("name"),
                bits: opts.get("bits"),
                withSrc: opts.has("withSrc"),
                clean: opts.has("clean"),
                compress: opts.has("compress") ? opts.get("compress") : false
            });

            return 0;
        } catch (err) {
            this.root.kit.updateProgress({
                message: err.message,
                status: false
            });

            return 1;
        }
    }
}
