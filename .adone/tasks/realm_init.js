const {
    fs,
    crypto,
    std,
    task
} = adone;

const {
    join
} = std.path;

export default class RealmInitTask extends task.Task {
    async run({ cwd = adone.ROOT_PATH, bits = 2048, keys = false } = {}) {
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
            }

            await identityConfig.save("identity.json", null, {
                space: "    "
            });
        }
    }
}
