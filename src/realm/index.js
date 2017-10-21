const {
    is,
    std
} = adone;

adone.lazify({
    config: () => require(std.path.join(adone.rootPath, "realm.js")),
    path: () => adone.realm.config.home,
    Realm: "./realm"
}, adone.asNamespace(exports), require);

adone.lazifyPrivate({
    Package: "./__/package",
    AbstractHandler: "./__/package/abstract_handler"
}, exports, require);

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

    await adone.fs.mkdirp(adone.realm.config.packagesPath);
    return path;
};

export const clean = () => new adone.fs.Directory(adone.realm.path).clean();


let realmInstance = null;

export const getInstance = async () => {
    if (is.null(realmInstance)) {
        realmInstance = new adone.realm.Realm();
        await realmInstance._initialize();
    }
    return realmInstance;
};
