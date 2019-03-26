const {
    cli: { style },
    error,
    fast,
    is,
    fs,
    std,
    realm
} = adone;

export default class extends realm.BaseTask {
    async main({ superRealm, subRealm, symlink = false } = {}) {
        this.superRealm = await this._checkRealm(superRealm, "super");
        this.subRealm = await this._checkRealm(subRealm, "sub");

        this.manager.notify(this, "progress", {
            message: "merging"
        });

        await adone.fs.mkdirp(this.superRealm.OPT_PATH);

        this.optRealmPath = std.path.join(this.superRealm.OPT_PATH, this.subRealm.name);

        if (symlink) {
            await this._createSymlink();

            const devConfig = this.subRealm.devConfig;
            if (is.null(devConfig)) {
                const helper = require("./realm_create/helpers");
                await helper.realmConfig.createDev({
                    cwd: this.subRealm.cwd,
                    superRealm: this.superRealm,
                    mergedAs: this.subRealm.name
                });
            } else {
                devConfig.set("mergedAs", this.subRealm.name);
                await devConfig.save();
            }
        } else {
            await this._copyFiles();
        }

        this.manager.notify(this, "progress", {
            status: true,
            message: `realm ${style.primary.bold(this.subRealm.name)} successfully merged`
        });

        return this.optRealmPath;
    }

    async _createSymlink() {
        if (await fs.exists(this.optRealmPath)) {
            const stat = fs.lstatSync(this.optRealmPath);
            if (!stat.isSymbolicLink()) {
                throw new error.ExistsException(`Realm ${style.primary(this.subRealm.name)} already merged`);
            }
            await fs.rm(this.optRealmPath);
        }

        await fs.symlink(this.subRealm.cwd, this.optRealmPath, is.windows ? "junction" : undefined);
    }

    async _copyFiles() {
        // Remove old files
        await fs.rm(this.optRealmPath);

        // Copy all files
        return fast.src("**/*", {
            cwd: this.subRealm.cwd
        }).dest(this.optRealmPath, {
            produceFiles: true,
            originTimes: true,
            originMode: true,
            originOwner: true
        });
    }

    async _checkRealm(r, type) {
        this.manager.notify(this, "progress", {
            message: `checking ${type}-realm`
        });

        let result = r;
        if (is.string(result)) {
            result = new realm.Manager({
                cwd: r
            });
        }

        if (!is.realm(result)) {
            throw new adone.error.NotValidException(`Invalid ${type}-realm instance`);
        }

        await result.connect();

        return result;
    }
}
