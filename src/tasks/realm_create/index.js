const {
    cli: { style },
    error,
    configuration,
    is,
    fs,
    std,
    realm
} = adone;

const __ = adone.lazify({
    helper: "./helpers"
}, null, require);

export default class extends realm.BaseTask {
    async main(info = {}) {
        if (!is.string(info.basePath)) {
            throw new error.InvalidArgumentException("Invalid base path");
        }

        if (!is.string(info.name)) {
            throw new error.InvalidArgumentException("Invalid name of realm");
        }

        if (!(await fs.exists(info.basePath))) {
            await fs.mkdirp(info.basePath);
        }

        const cwd = std.path.join(info.basePath, info.dir || info.name);
        if (await fs.exists(cwd)) {
            throw new error.ExistsException(`Path '${cwd}' already exists`);
        }

        info.cwd = this.cwd = cwd;

        this.manager.notify(this, "progress", {
            message: "initializing"
        });

        await fs.mkdirp(std.path.join(cwd, ".adone"));

        this.manager.notify(this, "progress", {
            message: `creating ${style.primary(configuration.Npm.configName)}`
        });

        const npmConfig = await __.helper.packageConfig.create(info);

        this.manager.notify(this, "progress", {
            message: `creating ${style.primary(realm.Configuration.configName)}`
        });

        await __.helper.realmConfig.create(info);
        await __.helper.realmConfig.createDev({
            cwd,
            superRealm: adone.realm.rootRealm
        });

        info = adone.lodash.defaults(info, {
            initGit: false,
            initNpm: false,
            initJsconfig: false,
            initEslint: false
        });

        if (info.initJsconfig) {
            this.manager.notify(this, "progress", {
                message: `creating ${style.primary("jsconfig.json")}`
            });
            await __.helper.jsconfig.create(info);
        }

        if (info.initEslint) {
            this.manager.notify(this, "progress", {
                message: `creating ${style.primary(".eslintrc.js")}`
            });
            await __.helper.eslintrc.create({ cwd, npmConfig });
        }

        if (info.initGit) {
            // Check git is installed
            await fs.which("git");
            this.manager.notify(this, "progress", {
                message: "initializing git repo"
            });
            await __.helper.git.init(info);
        }

        if (info.initNpm) {
            this.manager.notify(this, "progress", {
                message: "installing npm packages"
            });
            await __.helper.packageManager.runInstall({ cwd });
        }

        this.manager.notify(this, "progress", {
            message: `realm ${style.primary.bold(info.name)} successfully created`,
            status: true
        });

        return new realm.Manager({ cwd });
    }

    async undo(err) {
        this.manager.notify(this, "progress", {
            message: err.message,
            status: false
        });

        is.string(this.cwd) && await fs.rm(this.cwd);
    }
}
