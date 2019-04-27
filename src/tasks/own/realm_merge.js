import { checkRealm } from "../helpers";

const {
    cli: { style },
    error,
    is,
    fast,
    fs,
    path,
    realm
} = adone;

@adone.task.task("realmMerge")
export default class extends realm.BaseTask {
    async main({ superRealm, subRealm, symlink = false } = {}) {
        this.manager.notify(this, "progress", {
            message: `checking realms`
        });
        
        this.superRealm = await checkRealm(superRealm);
        this.subRealm = await checkRealm(subRealm);

        this.manager.notify(this, "progress", {
            message: "merging"
        });

        await adone.fs.mkdirp(this.superRealm.cwd);

        this.optRealmPath = path.join(this.superRealm.cwd, this.subRealm.name);

        if (symlink) {
            await this.#createSymlink();

            await this.#updateDevConfig();
        } else {
            await this.#copyFiles();
        }

        this.manager.notify(this, "progress", {
            status: true,
            message: `realm ${style.primary.bold(this.subRealm.name)} successfully merged`
        });

        await this.manager.runAndWait("realmMountExports", {
            superRealm,
            subRealm: await checkRealm(this.optRealmPath)
        });

        return this.optRealmPath;
    }

    async #createSymlink() {
        if (await fs.exists(this.optRealmPath)) {
            const stat = fs.lstatSync(this.optRealmPath);
            if (!stat.isSymbolicLink()) {
                throw new error.ExistsException(`Realm ${style.primary(this.subRealm.name)} already merged`);
            }
            await fs.remove(this.optRealmPath);
        }

        await fs.symlink(this.subRealm.cwd, this.optRealmPath, is.windows ? "junction" : undefined);
    }

    async #copyFiles() {
        // Remove old files
        await fs.remove(this.optRealmPath);

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

    async #updateDevConfig() {
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
    }
}
