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
    async run({ srcRealm, symlink = false } = {}) {
        this.srcRealm = srcRealm;
        if (is.string(srcRealm)) {
            this.srcRealm = new realm.Manager({
                cwd: srcRealm
            });
        }

        if (!is.realm(this.srcRealm)) {
            throw new adone.error.NotValidException(`Invalid type of realm: ${adone.typeOf}`);
        }

        this.manager.notify(this, "progress", {
            message: `connecting to realm: ${style.accent(srcRealm.cwd)}`
        });

        await this.srcRealm.connect();

        this.manager.notify(this, "progress", {
            message: "merging realm"
        });

        await adone.fs.mkdirp(realm.rootRealm.OPT_PATH);

        this.optRealmPath = std.path.join(realm.rootRealm.OPT_PATH, this.srcRealm.name);

        if (symlink) {
            await this._createSymlink();
            if (!this.srcRealm.config.has("dev")) {
                this.srcRealm.config.set("dev", {
                    merged: this.optRealmPath
                });
            } else {
                this.srcRealm.config.raw.dev.merged = this.optRealmPath;
            }
            await this.srcRealm.config.save();
        } else {
            await this._copyFiles();
        }

        this.manager.notify(this, "progress", {
            status: true,
            message: `realm ${style.primary.bold(this.srcRealm.name)} successfully merged`
        });
    }

    async _createSymlink() {
        if (await fs.exists(this.optRealmPath)) {
            const stat = fs.lstatSync(this.optRealmPath);
            if (!stat.isSymbolicLink()) {
                throw new error.ExistsException(`Realm ${style.primary(this.srcRealm.name)} already merged`);
            }
            await fs.rm(this.optRealmPath);
        }

        await fs.symlink(this.srcRealm.cwd, this.optRealmPath, is.windows ? "junction" : undefined);
    }

    async _copyFiles() {
        // Remove old files
        await fs.rm(this.optRealmPath);

        // Copy all files
        return fast.src("**/*", {
            cwd: this.srcRealm.cwd
        }).dest(this.optRealmPath, {
            produceFiles: true,
            originTimes: true,
            originMode: true,
            originOwner: true
        });
    }
}
