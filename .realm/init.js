// INCOMPLETE!

/**
 *
 * INIT script for realm.
 *
 * Should be running in adone root directory.
 */

const init = async () => {
    const path = process.cwd();

    if (!(await adone.fs.exists(adone.realm.config.LOCKFILE_PATH))) {
        // Create lockfile
        await adone.fs.mkdirp(adone.realm.config.runtimePath);
       await adone.fs.writeFile(adone.realm.config.LOCKFILE_PATH, "");
    }
};

init();
