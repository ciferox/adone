const {
    is
} = adone;

adone.lazify({
    Realm: "./realm",
    cli: "./cli"
}, adone.asNamespace(exports), require);

adone.lazifyPrivate({
    Package: "./__/package",
    AbstractHandler: "./__/package/abstract_handler"
}, exports, require);

// !!!!!!! This function should be called before 'adone.js' config is loaded. !!!!!!! //
export const init = (name) => {
    let home;
    const dirName = `.adone_${name}`;

    if (is.windows) {
        home = adone.std.path.resolve(process.env.USERPROFILE, dirName);
    } else {
        if (process.env.HOME && !process.env.HOMEPATH) {
            home = adone.std.path.resolve(process.env.HOME, dirName);
        } else if (process.env.HOME || process.env.HOMEPATH) {
            home = adone.std.path.resolve(process.env.HOMEDRIVE, process.env.HOME || process.env.HOMEPATH, dirName);
        } else {
            home = adone.std.path.resolve("/etc", dirName);
        }
    }
    // Update ADONE_HOME
    process.env.ADONE_HOME = home;
    process.env.ADONE_REALM = name;
    process.env.ADONE_DIRNAME = dirName;

    return adone.fs.mkdirp(adone.homePath);
};

let realmInstance = null;

export const getInstance = async () => {
    if (is.null(realmInstance)) {
        realmInstance = new adone.realm.Realm();
        await realmInstance._initialize();
    }
    return realmInstance;
};
