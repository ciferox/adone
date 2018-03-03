const {
    fs,
    crypto
} = adone;

/**
 * Initialize realm.
 */
export default async ({ bits = 2048, keys = false } = {}) => {
    const rootPath = adone.ROOT_PATH;

    // runtime dir + lockfile
    if (!(await fs.exists(adone.realm.config.LOCKFILE_PATH))) {
        // Create lockfile
        await fs.mkdirp(adone.realm.config.RUNTIME_PATH);
        await fs.writeFile(adone.realm.config.LOCKFILE_PATH, "");
    }

    // var dir
    if (!(await fs.exists(adone.realm.config.VAR_PATH))) {
        await fs.mkdirp(adone.realm.config.VAR_PATH);
    }

    // keys dir
    if (keys) {
        if (!(await fs.exists(adone.realm.config.KEYS_PATH))) {
            // Create realm identity
            await fs.mkdirp(adone.realm.config.KEYS_PATH);
        }
    }

    const identityConfig = new adone.configuration.Generic({
        cwd: adone.realm.config.CONFIGS_PATH
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
};
