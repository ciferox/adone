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
    async run(info = {}) {
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

        info.cwd = cwd;

        this.manager.notify(this, "progress", {
            message: "initializing"
        });

        await fs.mkdirp(std.path.join(cwd, ".adone"));

        this.manager.notify(this, "progress", {
            message: `creating ${style.primary(configuration.Npm.configName)}`
        });

        await __.helper.packageConfig.create(info);

        this.manager.notify(this, "progress", {
            message: `creating ${style.primary(realm.Configuration.configName)}`
        });

        await __.helper.realmConfig.create(info);

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
            await __.helper.eslintrc.create(info);
        }

        if (info.initGit) {
            // Check git is installed
            await adone.fs.which("git");
            this.manager.notify(this, "progress", {
                message: "initializing git repo"
            });
            await __.helper.git.init(info);
        }

        // try {
        //     await this.runAndWait(`${is.string(info.type) ? text.toCamelCase(info.type) : "empty"}Project`, info);
        // } catch (err) {
        //     await fs.rm(cwd);
        // }

        this.manager.notify(this, "progress", {
            message: `Realm ${style.primary.bold(info.name)} successfully created`,
            status: true
        });
    }

    // async createSubProject(info) {
    //     this._checkLoaded();
    //     const context = await this._createSubProject(info);
    //     await this.config.load();

    //     this.notify(this, "progress", {
    //         message: `sub project ${term.theme.primary.bold(info.name)} successfully created`,
    //         status: true
    //     });
    //     return context;
    // }

    // async _createSubProject(info) {
    //     const cwd = std.path.join(this.owner.cwd, info.dirName || info.name);
    //     const context = {};

    //     await this._checkAndCreateProject({
    //         name: this.owner.config.raw.name,
    //         description: this.owner.config.raw.description,
    //         version: this.owner.config.raw.version,
    //         author: this.owner.config.raw.author,
    //         ...info,
    //         cwd,
    //         skipGit: true,
    //         skipJsconfig: true
    //     }, context);

    //     this.contexts.set(cwd, context);

    //     // Adone parent adone.json
    //     const subName = info.dirName || info.name;
    //     this.owner.config.set(["struct", subName], std.path.relative(this.owner.cwd, cwd));
    //     await this.owner.config.save();

    //     if (is.string(info.type)) {
    //         // Update parent jsconfig.json if it exists
    //         if (await fs.exists(std.path.join(this.owner.cwd, configuration.Jsconfig.configName))) {
    //             await this.runAndWait("jsconfig", {
    //                 cwd: this.owner.cwd,
    //                 include: [std.path.relative(this.owner.cwd, std.path.join(cwd, "src"))]
    //             }, this.contexts.get(this.owner.cwd));
    //         }
    //     }

    //     return context;
    // }
}
