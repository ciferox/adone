const {
    task
} = adone;

export default class RealmCleanTask extends task.Task {
    async run({ skipRealmFiles = true } = {}) {
        // const paths = [
        //     adone.realm.config.packagesPath,
        //     adone.realm.config.configsPath,
        //     adone.realm.config.varPath
        // ];
        // const realmFiles = [
        //     std.path.basename(adone.realm.config.LOCKFILE_PATH)
        // ];

        // for (const path of paths) {
        //     // eslint-disable-next-line
        //     if (await adone.fs.exists(path)) {
        //         await new adone.fs.Directory(path).clean(); // eslint-disable-line
        //     }
        // }

        // let files = await adone.fs.readdir(adone.realm.config.runtimePath);

        // if (skipRealmFiles) {
        //     files = files.filter((f) => !realmFiles.includes(f));
        // }

        // for (const file of files) {
        //     await adone.fs.rm(std.path.join(adone.realm.config.runtimePath, file)); // eslint-disable-line
        // }
    }
}
