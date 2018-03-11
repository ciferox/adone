const {
    crypto,
    error,
    is,
    fs,
    task,
    std
} = adone;

const { path: { join } } = std;

export default class ForkTask extends task.Task {
    async run({ cwd = process.cwd(), name, bits = 2048, keys = false } = {}) {
        if (!is.string(cwd)) {
            throw new error.NotValid(`Invalid type of 'cwd': ${adone.math.typeOf(cwd)}`);
        }

        if (!is.string(name)) {
            throw new error.NotValid(`Invalid type of 'name': ${adone.math.typeOf(name)}`);
        }

        const CWD = cwd;
        const RUNTIME_PATH = join(CWD, "runtime");
        const VAR_PATH = join(CWD, "var");
        const CONFIGS_PATH = join(CWD, "configs");
        const LOGS_PATH = join(VAR_PATH, "logs");
        const KEYS_PATH = join(CWD, "keys");
        const PACKAGES_PATH = join(CWD, "packages");
        const LOCKFILE_PATH = join(RUNTIME_PATH, "realm");

        // runtime dir + lockfile
        if (!(await fs.exists(LOCKFILE_PATH))) {
            // Create lockfile
            await fs.mkdirp(RUNTIME_PATH);
            await fs.writeFile(LOCKFILE_PATH, "");
        }

        // var dir
        if (!(await fs.exists(VAR_PATH))) {
            await fs.mkdirp(VAR_PATH);
        }

        // logs dir
        if (!(await fs.exists(LOGS_PATH))) {
            await fs.mkdirp(LOGS_PATH);
        }

        // packages dir
        if (!(await fs.exists(PACKAGES_PATH))) {
            await fs.mkdirp(PACKAGES_PATH);
        }

        // keys dir
        if (keys) {
            if (!(await fs.exists(KEYS_PATH))) {
                // Create realm identity
                await fs.mkdirp(KEYS_PATH);
            }
        }

        const identityConfig = new adone.configuration.Generic({
            cwd: CONFIGS_PATH
        });

        try {
            await identityConfig.load("identity.json");
        } catch (err) {
            const serverIdentity = crypto.Identity.create({
                bits
            });

            const clientIdentity = crypto.Identity.create({
                bits
            });

            identityConfig.raw = {
                server: {
                    id: serverIdentity.asBase58(),
                    privKey: serverIdentity.privKey.bytes.toString("base64")
                },
                client: {
                    id: clientIdentity.asBase58(),
                    privKey: clientIdentity.privKey.bytes.toString("base64")
                }
            };

            await identityConfig.save("identity.json", null, {
                space: "    "
            });
        }

        let destPath;
        try {
            this.root.kit.createProgress("checking");

            destPath = std.path.resolve(cwd, name);
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
}
