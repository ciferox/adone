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
    async run({ rootPath = adone.ROOT_PATH, bits = 2048, keys = false } = {}) {
        const HOME = rootPath;
        const RUNTIME_PATH = join(HOME, "runtime");
        const VAR_PATH = join(HOME, "var");
        const CONFIGS_PATH = join(HOME, "configs");
        const omnitronVarPath = join(VAR_PATH, "omnitron");
        const omnitronDataPath = join(omnitronVarPath, "data");
        const LOGS_PATH = join(VAR_PATH, "logs");
        const omnitronLogsPath = join(LOGS_PATH, "omnitron");
        const KEYS_PATH = join(HOME, "keys");
        const PACKAGES_PATH = join(HOME, "packages");
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
