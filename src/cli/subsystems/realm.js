const {
    application,
    fast,
    fs,
    is,
    error,
    project,
    std,
    util
} = adone;

const {
    DCliCommand
} = application;

export default class RealmManager extends application.Subsystem {
    @DCliCommand({
        name: "new",
        help: "Create new realm",
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
            }
        ]
    })
    async createCommand(args, opts) {
        try {
            const name = args.get("name");
            this.root.kit.createProgress("checking");

            const destPath = std.path.resolve(opts.get("path"), name);
            if (await fs.exists(destPath)) {
                throw new error.Exists(`Path '${destPath}' already exists`);
            }

            this.root.kit.updateProgress({
                message: `Realm {green-fg}{bold}${name}{/} succescfully created!`,
                result: true
            });
            return 0;
        } catch (err) {
            this.root.kit.updateProgress({
                message: err.message,
                result: false
            });
            return 1;
        }
    }

    @DCliCommand({
        name: ["fork"],
        help: "Fork current realm",
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
                name: ["--src"],
                help: "With source directory"
            }
        ]
    })
    async forkCommand(args, opts) {
        let destPath;
        try {
            const name = args.get("name");
            this.root.kit.createProgress("checking");

            destPath = std.path.resolve(opts.get("path"), name);
            if (await fs.exists(destPath)) {
                throw new error.Exists(`Path '${destPath}' already exists`);
            }

            this.root.kit.updateProgress({
                message: "initializing realm"
            });

            await fs.mkdirp(destPath);

            const projManager = await project.Manager.load({
                cwd: adone.ROOT_PATH
            });

            let observer = await projManager.run("realmInit", {
                cwd: destPath,
                bits: opts.get("bits")
            });
            await observer.result;

            this.root.kit.updateProgress({
                message: "copying files"
            });

            const targets = [
                "!**/*.map",
                "package.json",
                "adone.json",
                "README*",
                "LICENSE*",
                ...[".adone", "bin", "src", "etc"].map((x) => util.globize(x, { recursive: true }))
            ];

            targets.push("!src/**/native/build/**/*");

            await fast.src(targets, { base: adone.ROOT_PATH }).dest(destPath, {
                produceFiles: true
            });

            const targetProjManager = await project.Manager.load({
                cwd: destPath
            });
            targetProjManager.setSilent(true);

            const entries = targetProjManager.getProjectEntries();
            const entriesWithNative = targetProjManager.getProjectEntries({
                onlyNative: true
            }).map((entry) => entry.id);

            for (const entry of entries) {
                this.root.kit.updateProgress({
                    message: `transpiling: ${entry.id}`
                });
                const entryId = new RegExp(`${entry.id}$`);
                /* eslint-disable */
                observer = await targetProjManager.build(entryId);
                await observer.result;

                if (entriesWithNative.includes(entry.id)) {
                    this.root.kit.updateProgress({
                        message: `addon building: ${entry.id}`
                    });

                    observer = await targetProjManager.nbuild(entryId, {
                        clean: true
                    });
                    await observer.result;
                }
                /* eslint-enable */
            }

            if (!opts.has("src")) {
                this.root.kit.updateProgress({
                    message: "deleting unnecessary files"
                });

                await fs.rm(std.path.join(destPath, "src"));
                await fs.rm(util.globize(std.path.join(destPath, "lib"), {
                    recursive: true,
                    ext: ".js.map"
                }));
            }

            this.root.kit.updateProgress({
                message: `Realm {green-fg}{bold}${name}{/} succescfully created!`,
                result: true
            });
            return 0;
        } catch (err) {
            this.root.kit.updateProgress({
                message: err.message,
                result: false
            });

            if (!(err instanceof error.Exists)) {
                is.string(destPath) && await fs.rm(destPath);
            }
            return 1;
        }
    }

    // @DCliCommand({
    //     name: "initrealm",
    //     group: "realm",
    //     help: "Initialize new realm",
    //     arguments: [
    //         {
    //             name: "name",
    //             type: String,
    //             default: "dev",
    //             help: "Name of realm"
    //         }
    //     ],
    //     options: [
    //         {
    //             name: "--path",
    //             type: String,
    //             help: "Path where realm will be initialized (home directory by default)"
    //         }
    //     ]
    // })
    // async initrealmCommand(args, opts) {
    //     const name = args.get("name");
    //     try {
    //         const path = await adone.realm.init(name, opts.has("path") ? opts.get("path") : null);
    //         term.print(`Realm {green-fg}'${path}'{/green-fg} successfully initialized\n`);
    //         return 0;
    //     } catch (err) {
    //         term.print(`{red-fg}${err.message}{/}\n`);
    //         return 1;
    //     }
    // }
}
