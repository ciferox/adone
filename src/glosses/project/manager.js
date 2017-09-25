const {
    // configuration,
    is,
    // fast,
    fs,
    std,
    // regex,
    // templating: { nunjucks },
    // management: { c: { DEST_OPTIONS } },
    task,
    vendor: { lodash },
    project
} = adone;

// // Constants 

// export const NETRON_PACKAGES = {
//     "adone": "^0.6.54-3", // eslint-disable-line
//     "lodash": "^4.17.4", // eslint-disable-line
//     "ng-netron": "^0.1.7"
// };

// export const NG_ADDITIONAL_NPM_PACKAGES = {
//     "@angular/flex-layout": "^2.0.0-beta.8"
// };

// export const DEFAULT_BACKEND_NAME = "backend";
// export const DEFAULT_FRONTEND_NAME = "frontend";

// export const DEST_OPTIONS = {
//     produceFiles: true,
//     originTimes: false,
//     originMode: true,
//     originOwner: false
// };


// const generatorsPath = std.path.join(__dirname, "..", "lib", "generators");
// const names = fs.readdirSync(generatorsPath);
// const generators = {};
// for (const name of names) {
//     generators[name] = std.path.join("..", "lib", "generators", name);
// }

// const generator = adone.lazify(generators, null, require);

const VERSION_PARTS = ["major", "minor", "patch", "premajor", "preminor", "prepatch", "prerelease"];

export default class Manager extends task.Manager {
    constructor(path = process.cwd()) {
        super();
        this.name = null;
        this.path = path;
        this.config = new project.Configuration({
            cwd: this.path
        });
        this._loaded = false;
    }

    getVersion() {
        return this.config.version;
    }

    async incVersion({ part = "minor", preid = undefined, loose = false } = {}) {
        this._checkLoaded();
        if (!VERSION_PARTS.includes(part)) {
            throw new adone.x.NotValid(`Not valid version part: ${part}`);
        }
        const version = this.config.version;

        if (!adone.semver.valid(version, loose)) {
            throw new adone.x.NotValid(`Version is not valid: ${version}`);
        }

        this.config.version = adone.semver.inc(adone.semver.clean(version, loose), part, loose, preid);
        
        await this.config.save("adone.conf.json", null, {
            space: "    "
        });

        const updateConfig = async (name) => {
            if (await fs.exists(std.path.join(this.path, name))) {
                const cfg = await adone.configuration.load(name, null, {
                    cwd: this.path
                });
                cfg.version = this.config.version;
                await cfg.save(name, null, {
                    space: "  "
                });
            }
        };

        await updateConfig("package.json");
        await updateConfig("package-lock.json");
    }

    async load() {
        if (this._loaded) {
            throw new adone.x.IllegalState("Project already loaded");
        }

        await this.config.load(std.path.join(this.path, "adone.conf.json"));

        // Add default tasks
        await this.addTask("delete", project.task.Delete);
        await this.addTask("copy", project.task.Copy);
        await this.addTask("transpile", project.task.Transpile);
        await this.addTask("transpileExe", project.task.TranspileExe);

        // Load custom tasks
        const tasksPath = std.path.join(this.path, ".adone", "tasks.js");
        if (await fs.exists(tasksPath)) {
            const customTasks = adone.require(tasksPath).default;

            for (const [name, CustomTask] of Object.entries(customTasks)) {
                await this.addTask(name, CustomTask); // eslint-disable-line
            }
        }

        this._loaded = true;
    }

    getProjectEntries(path) {
        const units = {};

        this._parseProjectStructure("", this.config.project.structure, units);

        // Convert object to array
        const keys = Object.keys(units);
        const entries = [];

        for (const key of keys) {
            entries.push(Object.assign({
                $id: key
            }, units[key]));
        }

        if (is.string(path)) {
            return entries.filter((entry) => entry.$id.startsWith(path));
        }
        return entries;
    }

    async clean(path) {
        this._checkLoaded();
        const entries = this.getProjectEntries(path);

        const results = [];
        for (const unit of entries) {
            const observer = await this.run("delete", unit); // eslint-disable-line
            results.push(observer.result);
        }

        return Promise.all(results);
    }

    async build(path) {
        this._checkLoaded();
        const units = this.getProjectEntries(path);

        const promises = [];
        for (const unit of units) {
            if (!is.string(unit.$task)) {
                unit.$task = "copy";
            }

            const observer = await this.run(unit.$task, unit); // eslint-disable-line
            promises.push(observer.result);
        }

        return Promise.all(promises);
    }

    async rebuild(path) {
        await this.clean(path);
        await this.build(path);
    }

    async watch(path) {
        this._checkLoaded();
        const units = this.getProjectEntries(path);

        const promises = [];
        for (const unit of units) {
            if (!is.string(unit.$task)) {
                unit.$task = "copy";
            }

            const observer = await this.runOnce(project.task.Watch, unit); // eslint-disable-line
            promises.push(observer.result);
        }

        return Promise.all(promises);
    }

    // async create({ name = "app", type = "application", subDir = "./", sourceDir = "src", skipGit = false, skipNpm = false, skipTests = false } = {}) {
    //     this.name = name;
    //     if (!regex.filename.test(name)) {
    //         throw new adone.x.Incorrect(`Incorrect name of project: ${name}`);
    //     }
    //     this.type = type;

    //     this._generatedFiles = [];

    //     this._configureNunjucks();
    //     this._createAdoneConfig();

    //     const adoneConfig = new configuration.AdoneConfiguration({
    //         base: this.path
    //     });
    //     adoneConfig.project = {
    //         name: this.name,
    //         description: "",
    //         author: "",
    //         type: this.type,
    //         structure: {}
    //     };

    //     const subPath = std.path.join(this.path, std.path.normalize(subDir));
    //     if (subPath !== this.path) {
    //         const dirName = std.path.dirname(subPath);
    //         adoneConfig.project.structure[dirName] = `./${dirName}`;
    //         await this._generate({
    //             name: `${this.name}.${dirName}`,
    //             path: subPath,
    //             config: adoneConfig.subConfig(subDir),
    //             sourceDir,
    //             skipGit,
    //             skipNpm,
    //             skipTests
    //         });
    //     }

    //     await adoneConfig.save();
    // }

    _parseProjectStructure(prefix, schema, units) {
        for (const [key, val] of Object.entries(schema)) {
            if (key.startsWith("$")) {
                if (!is.propertyOwned(units, prefix)) {
                    units[prefix] = {};
                }
                units[prefix][key] = val;
            } else if (is.plainObject(val)) {
                this._parseProjectStructure((prefix.length > 0 ? `${prefix}.${key}` : key), val, units);
            }
        }
    }

    // _createAdoneConfig(subDir) {
    //     let config;
    //     if (is.null(this.adoneConfig)) {
    //         config = new configuration.AdoneConfiguration({
    //             base: this.path
    //         });

    //         this._addFile("adone.conf.json");
    //     } else {
    //         config = this.config.subConfig(subDir);
    //         this._addFile(std.path.join(subDir, "adone.conf.json"));
    //     }

    //     return config;
    // }

    // async _generate({ name, path, config, sourceDir, skipGit, skipNpm, skipTests } = {}) {
    //     await fs.mkdir(path);

    //     const gen = generator[this.type];

    //     if (!is.function(gen)) {
    //         throw new adone.x.Unknown(`Unknown generator: ${this.type}`);
    //     }

    //     // .mapIf((x) => x.basename === "adone.conf.js", async (x) => {
    //     //     const bin = await nunjucks.renderString(await fs.readFile(std.path.join(this.adoneConfPath, "bin.nunjucks"), { encoding: "utf8" }), {
    //     //         fromBin: appRelPath
    //     //     });
    //     //     const lib = await nunjucks.renderString(await fs.readFile(std.path.join(this.adoneConfPath, "lib.nunjucks"), { encoding: "utf8" }), {
    //     //         fromBin: appRelPath,
    //     //         fromLib: std.path.join(sourceDir, "**", "*")
    //     //     });

    //     //     x.contents = Buffer.from(await nunjucks.renderString(x.contents.toString(), {
    //     //         bin,
    //     //         lib,
    //     //         name,
    //     //         type,
    //     //         from: appRelPath
    //     //     }));
    //     //     return x;
    //     // })

    //     // const appRelPath = std.path.join(sourceDir, "app.js");

    //     // common files
    //     await fast.src("common/**/*", {
    //         cwd: std.path.join(__dirname, "..", "assets")
    //     }).filter((x) => {
    //         if (x.basename === ".gitignore" && skipGit) {
    //             return false;
    //         }
    //         return true;
    //     }).mapIf((x) => x.basename === "package.json", (x) => {
    //         const packageJson = JSON.parse(x.contents.toString());
    //         packageJson.name = name;
    //         packageJson.main = `./bin/${name}.js`;
    //         x.contents = Buffer.from(JSON.stringify(packageJson, null, "  "));
    //         return x;
    //     }).dest(path, DEST_OPTIONS).through((x) => {
    //         adone.log(std.path.relative(this.path, std.path.join(path, x.relative)));
    //         this._addFileToGit(std.path.relative(this.path, std.path.join(path, x.relative)));
    //     });

    //     // return gen({
    //     //     project: this,
    //     //     name,
    //     //     path,
    //     //     config
    //     // });
    // }

    // _addFile(relPath) {
    //     if (!this._generatedFiles.includes(relPath)) {
    //         this._generatedFiles.push(relPath);
    //     }
    // }

    // _configureNunjucks() {
    //     nunjucks.configure("/", {
    //         autoescape: false
    //     });
    // }

    _checkLoaded() {
        if (!this._loaded) {
            throw new adone.x.IllegalState("Project is not loaded");
        }
    }
}
