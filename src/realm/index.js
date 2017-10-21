const {
    is
} = adone;

adone.lazify({
    config: () => require(adone.std.path.join(adone.rootPath, "realm.js")),
    homePath: () => adone.realm.config.home,
    Realm: "./realm",
    cli: "./cli"
}, adone.asNamespace(exports), require);

adone.lazifyPrivate({
    Package: "./__/package",
    AbstractHandler: "./__/package/abstract_handler"
}, exports, require);

// !!!!!!! This function should be called before 'adone.js' config is loaded. !!!!!!! //
export const init = async (name = "dev", customPath) => {
    let homePath;
    const dirName = `.adone_${name}`;

    if (is.string(customPath)) {
        homePath = customPath;
    } else {
        if (is.windows) {
            homePath = adone.std.path.resolve(process.env.USERPROFILE, dirName);
        } else {
            if (process.env.HOME && !process.env.HOMEPATH) {
                homePath = adone.std.path.resolve(process.env.HOME, dirName);
            } else if (process.env.HOME || process.env.HOMEPATH) {
                homePath = adone.std.path.resolve(process.env.HOMEDRIVE, process.env.HOME || process.env.HOMEPATH, dirName);
            } else {
                homePath = adone.std.path.resolve("/etc", dirName);
            }
        }
    }
    // Update ADONE_HOME
    process.env.ADONE_HOME = homePath;
    process.env.ADONE_REALM = name;
    process.env.ADONE_DIRNAME = dirName;

    await adone.fs.mkdirp(adone.realm.config.packagesPath);
    return homePath;
};

export const clean = () => new adone.fs.Directory(adone.realm.homePath).clean();


let realmInstance = null;

export const getInstance = async () => {
    if (is.null(realmInstance)) {
        realmInstance = new adone.realm.Realm();
        await realmInstance._initialize();
    }
    return realmInstance;
};
