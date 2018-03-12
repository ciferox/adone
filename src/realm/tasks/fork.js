const {
    crypto,
    error,
    is,
    fast,
    fs,
    task,
    std,
    util
} = adone;

const { path: { join } } = std;

export default class ForkTask extends task.Task {
    async run({ cwd = process.cwd(), name, bits = 2048, withSrc = false, keys = false } = {}) {
        this.manager.notify(this, "progress", {
            message: "checking"
        });

        if (!is.string(cwd)) {
            throw new error.NotValid(`Invalid type of 'cwd': ${adone.math.typeOf(cwd)}`);
        }

        if (!is.string(name)) {
            throw new error.NotValid(`Invalid type of 'name': ${adone.math.typeOf(name)}`);
        }

        this.destPath = std.path.resolve(cwd, name);
        if (await fs.exists(this.destPath)) {
            throw new error.Exists(`Path '${this.destPath}' already exists`);
        }
        await fs.mkdirp(this.destPath);

        this.manager.notify(this, "progress", {
            message: "initializing common realm structure"
        });

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

        this.manager.notify(this, "progress", {
            message: "copying files"
        });

        const targets = [
            "!**/*.map",
            "package.json",
            "adone.json",
            "README*",
            "LICENSE*",
            ...[".adone", "bin", "lib", "etc"].map((x) => util.globize(x, { recursive: true }))
        ];

        if (withSrc) {
            targets.push("src");
            targets.push("!src/**/native/build/**/*");
        }

        await fast.src(targets, { base: adone.ROOT_PATH }).dest(this.destPath, {
            produceFiles: true
        });

        this.manager.notify(this, "progress", {
            message: `Realm {green-fg}{bold}${name}{/} succescfully forked!`,
            result: true
        });
    }

    async undo(err) {
        this.manager.notify(this, "progress", {
            message: err.message,
            result: false
        });

        if (!(err instanceof error.Exists)) {
            is.string(this.destPath) && await fs.rm(this.destPath);
        }
    }
}
