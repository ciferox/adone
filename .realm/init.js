const {
    fs,
    crypto
} = adone;

/**
 * Initialize realm.
 */
export default async ({ bits = 2048 } = {}) => {
    const rootPath = adone.ROOT_PATH;

    if (!(await fs.exists(adone.realm.config.LOCKFILE_PATH))) {
        // Create lockfile
        await fs.mkdirp(adone.realm.config.RUNTIME_PATH);
        await fs.writeFile(adone.realm.config.LOCKFILE_PATH, "");
    }

    if (!(await fs.exists(adone.realm.config.KEYS_PATH))) {
        // Create realm identity
        await fs.mkdirp(adone.realm.config.KEYS_PATH);
    }

    const identityConfig = new adone.configuration.Generic({
        cwd: adone.realm.config.CONFIGS_PATH
    });

    try {
        await identityConfig.load("identity.json");
    } catch (err) {
        adone.log(err);
        const identity = crypto.Identity.create({
            bits
        });
    
        identityConfig.raw = {
            id: identity.asBase58(),
            privKey: identity.privKey.bytes.toString("base64")
        }
    
        await identityConfig.save("identity.json", null, {
            space: "    "
        });
    }
};
