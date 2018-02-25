const {
    fs
} = adone;

/**
 * Initialize realm.
 */
export default async () => {
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
};
