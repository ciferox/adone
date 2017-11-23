const {
    is,
    std
} = adone;

adone.lazify({
    config: () => require(std.path.join(adone.rootPath, "realm.js")),
    path: () => adone.realm.config.home,
    TypeHandler: "./type_handler",
    Manager: "./manager",
    task: "./tasks"
}, adone.asNamespace(exports), require);

export const createDirs = async () => {
    await adone.fs.mkdirp(adone.realm.config.packagesPath);
    
    if (!(await adone.fs.exists(adone.realm.config.lockFilePath))) {
        // Create lockfile
        await adone.fs.mkdirp(adone.realm.config.runtimePath);
        await adone.fs.writeFile(adone.realm.config.lockFilePath, "");
    }
};

// !!!!!!! This function should be called before 'realm.js' config is loaded. !!!!!!! //
export const init = async (name = ".adone_dev", customPath) => {
    let path;
    
    if (is.string(customPath)) {
        path = customPath;
    } else {
        if (is.windows) {
            path = std.path.resolve(process.env.USERPROFILE, name);
        } else {
            if (process.env.HOME && !process.env.HOMEPATH) {
                path = std.path.resolve(process.env.HOME, name);
            } else if (process.env.HOME || process.env.HOMEPATH) {
                path = std.path.resolve(process.env.HOMEDRIVE, process.env.HOME || process.env.HOMEPATH, name);
            } else {
                path = std.path.resolve("/etc", name);
            }
        }
    }

    process.env.ADONE_HOME = path;
    process.env.ADONE_REALM = name;

    await createDirs();

    return path;
};

export const clean = async ({ skipRealmFiles = true } = {}) => {
    const paths = [
        adone.realm.config.packagesPath,
        adone.realm.config.configsPath,
        adone.realm.config.varPath
    ];
    const realmFiles = [
        std.path.basename(adone.realm.config.lockFilePath)
    ];

    for (const path of paths) {
        // eslint-disable-next-line
        if (await adone.fs.exists(path)) {
            await new adone.fs.Directory(path).clean(); // eslint-disable-line
        }
    }

    let files = await adone.fs.readdir(adone.realm.config.runtimePath);

    if (skipRealmFiles) {
        files = files.filter((f) => !realmFiles.includes(f));
    }
    
    for (const file of files) {
        await adone.fs.rm(std.path.join(adone.realm.config.runtimePath, file)); // eslint-disable-line
    }
};

export const getManager = async () => {
    if (is.null(adone.runtime.realm)) {
        adone.runtime.realm = await adone.realm.Manager.create();
    }
    return adone.runtime.realm;
};
