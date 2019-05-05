const {
    cli: { style },
    error,
    configuration,
    is,
    fs,
    path,
    realm
} = adone;

const __ = adone.lazify({
    helper: "./helpers"
}, null, require);

/**
 * Creates realm.
 * 
 * `options`
 * - `name` - name of realm saved as package.json's 'name' property.
 * - `dir` - directory name of realm.
 * - `path` - destination path of realm. Full realm path will be `path.join(path, dir || name)`.
 * - `realm` - realm specific configuration.
 *   - `config` - predefined config parameters.
 *     - `ext` - configuration extension, where possible value might be one of supported by `adone.configuration.Generic`. Default is '.json'.
 *     - `...props` - properties to put in configuration.
 *   - `dev` - predefined dev-config parameters like `defaultTask`, `units`, etc.
 *     - `ext` - configuration extension. Default is '.json'.
 *     - `...props` - properties to put in configuration.
 * 
 * 
 * If `options.realm.config` is not defined or equal to `false`, associated config will not be created.
 * If `options.realm.dev` is not defined or equal to `false`, associated config will not be created.
 */
@adone.task.task("realmCreate")
export default class extends realm.BaseTask {
    async main(options = {}) {
        // keep original options immutable
        options = adone.lodash.defaults(options, {
            initGit: false,
            initNpm: false,
            initJsconfig: false,
            initEslint: false
        })

        if (!is.string(options.name) || options.name.trim().length === 0) {
            throw new error.InvalidArgumentException("Invalid name of realm");
        }
        options.name = options.name.trim();

        if (!is.string(options.path) || options.path.trim().length === 0) {
            throw new error.InvalidArgumentException("Invalid base path");
        }
        options.path = path.resolve(options.path.trim());

        const cwd = path.join(options.path, options.dir || options.name);
        if (await fs.exists(cwd)) {
            throw new error.ExistsException(`Path '${cwd}' already exists`);
        }

        // ensure path exists
        await fs.mkdirp(cwd);
        options.cwd = this.cwd = cwd;

        this.manager.notify(this, "progress", {
            message: "initializing"
        });

        await fs.mkdir(path.join(cwd, ".adone"));

        this.manager.notify(this, "progress", {
            message: `creating ${style.primary(configuration.NpmConfig.configName)}`
        });

        const npmConfig = await __.helper.packageConfig.create(options);

        if (is.plainObject(options.realm)) {
            if (options.realm.config) {
                this.manager.notify(this, "progress", {
                    message: `creating ${style.primary(realm.Configuration.configName)}`
                });

                await __.helper.realmConfig.create({
                    ...options.realm.config,
                    cwd
                });
            }

            if (options.realm.dev) {
                this.manager.notify(this, "progress", {
                    message: `creating ${style.primary(realm.DevConfiguration.configName)}`
                });

                await __.helper.realmConfig.createDev({
                    ...options.realm.dev,
                    cwd
                });
            }
        }

        if (options.initJsconfig) {
            this.manager.notify(this, "progress", {
                message: `creating ${style.primary("jsconfig.json")}`
            });
            await __.helper.jsconfig.create(options);
        }

        if (options.initEslint) {
            this.manager.notify(this, "progress", {
                message: `creating ${style.primary(".eslintrc.js")}`
            });
            await __.helper.eslintrc.create({ cwd, npmConfig });
        }

        if (options.initGit) {
            // Check git is installed
            await fs.which("git");
            this.manager.notify(this, "progress", {
                message: "initializing git repo"
            });
            await __.helper.git.init(options);
        }

        if (options.initNpm) {
            this.manager.notify(this, "progress", {
                message: "installing npm packages"
            });
            await __.helper.packageManager.runInstall({ cwd });
        }

        this.manager.notify(this, "progress", {
            message: `realm ${style.primary.bold(options.name)} successfully created`,
            status: true
        });

        return new realm.RealmManager({ cwd });
    }

    async undo(err) {
        this.manager.notify(this, "progress", {
            message: err.message,
            status: false
        });

        is.string(this.cwd) && await fs.remove(this.cwd);
    }
}
