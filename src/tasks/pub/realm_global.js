const {
    cli,
    error,
    is,
    fs,
    github
} = adone;

// library scope:
// - user: $HOME/.node_modules
// - node: $PREFIX/lib/node

@adone.task.task("realmGlobal")
export default class extends adone.realm.BaseTask {
    async main({ realm, unregister = false, binLinkName, libRelPath = "", libLinkName, libScope = "user", noBin = true, noLib = true } = {}) {
        this.manager.notify(this, "progress", {
            message: "checking"
        });

        if (is.string(realm)) {
            realm = new adone.realm.RealmManager({ cwd: realm });
        }

        if (!realm || !is.realm(realm)) {
            throw new error.NotValidException(`Invalid type of srcRealm: ${adone.typeOf(realm)}`);
        }

        this.manager.notify(this, "progress", {
            message: "connecting to realm"
        });

        await realm.connect({
            transpile: true
        });

        this.manager.notify(this, "progress", {
            message: (unregister ? "unregistering" : "registering") + " realm"
        });

        const packageConf = realm.package;

        if (!noBin && is.string(packageConf.bin)) {
            await this._makeChanges({
                realm,
                unregister,
                realmRelPath: packageConf.bin,
                prefixDir: "bin",
                linkName: binLinkName ? binLinkName : realm.package.bin
            });
        }

        if (!noLib && is.string(packageConf.main)) {
            await this._makeChanges({
                realm,
                unregister,
                realmRelPath: libRelPath,
                prefixDir: libScope === "user"
                    ? ".node_modules"
                    : "lib/node",
                libScope,
                linkName: libLinkName ? libLinkName : realm.package.name,
                sureDestExists: true
            });
        }

        this.manager.notify(this, "progress", {
            message: `realm successfully ${unregister ? "unregistered" : "registered"}`,
            status: true
        });
    }

    async _makeChanges({ realm, unregister, realmRelPath, prefixDir, linkName, libScope, sureDestExists = false} = {}) {
        const fullPath = realm.getPath(realmRelPath);
        if (!(await fs.pathExists(fullPath))) {
            throw new error.NotExistsException(`Path ${fullPath} not exists`);
        }

        let prefixPath;
        if(libScope === "user") {
            prefixPath = adone.system.env.home();
        } else {
            prefixPath = await adone.nodejs.getPrefixPath()
        }

        const fullLinkPath = adone.path.join(prefixPath, prefixDir, linkName);
        sureDestExists && await fs.mkdirp(adone.path.dirname(fullLinkPath));
        const linkExists = await fs.pathExists(fullLinkPath);
        if (unregister) {
            linkExists && await fs.unlink(fullLinkPath);
        } else {
            if (linkExists) {
                throw new error.ExistsException(`Cannot create link. Path ${fullLinkPath} exists`);
            }
            await fs.symlink(fullPath, fullLinkPath, is.windows ? "junction" : undefined);
        }
    }
}
