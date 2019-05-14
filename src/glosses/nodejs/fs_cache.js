const {
    is,
    fs,
    path: aPath
} = adone;

export default class FsCache {
    constructor({ realm, basePath, appName, ...cacheDirs } = {}) {
        if (is.realm(realm)) {
            this.realm = realm;
        } else {
            this.realm = adone.realm.rootRealm;
        }
        this.appName = appName;
        Object.assign(this, cacheDirs);
        this.basePath = aPath.join(basePath || this.realm.getPath("var"), appName);
    }

    async getPath(...dirs) {
        const path = aPath.join(this.basePath, ...dirs);
        await fs.mkdirp(path);
        return path;
    }
}
