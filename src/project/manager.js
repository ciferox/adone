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
        this.config = null;
        this._loaded = false;
        this.silent = false;
    }

    setSilent(silent) {
        this.silent = silent;
    }

    getVersion() {
        return this.config.raw.version;
    }

    async incVersion({ part = "minor", preid = undefined, loose = false } = {}) {
        this._checkLoaded();
        if (!VERSION_PARTS.includes(part)) {
            throw new adone.x.NotValid(`Not valid version part: ${part}`);
        }
        // adone.log(this.config.raw.version);

        const version = this.config.raw.version;

        if (!adone.semver.valid(version, loose)) {
            throw new adone.x.NotValid(`Version is not valid: ${version}`);
        }

        this.config.raw.version = adone.semver.inc(adone.semver.clean(version, loose), part, loose, preid);

        await this.config.save();

        const updateConfig = async (name) => {
            if (await fs.exists(std.path.join(this.path, name))) {
                const cfg = await adone.configuration.load(name, null, {
                    cwd: this.path
                });
                cfg.raw.version = this.config.raw.version;
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

        this.config = await project.Configuration.load({
            cwd: this.path
        });

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

    getProjectEntries(options) {
        return this.config.getProjectEntries(options);
    }

    async clean(path) {
        this._checkLoaded();
        const entries = this.config.getProjectEntries({ path });

        const results = [];
        for (const entry of entries) {
            const observer = await this.run("delete", entry); // eslint-disable-line
            results.push(observer.result);
        }

        return Promise.all(results);
    }

    async build(path) {
        this._checkLoaded();
        const entries = this.config.getProjectEntries({ path });

        const promises = [];
        for (const entry of entries) {
            if (!this._checkEntry(entry)) {
                continue;
            }

            const observer = await this.run(entry.$task, entry); // eslint-disable-line
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
        const entries = this.config.getProjectEntries({ path });

        const promises = [];
        for (const entry of entries) {
            if (!this._checkEntry(entry)) {
                continue;
            }

            const observer = await this.runOnce(project.task.Watch, entry); // eslint-disable-line
            promises.push(observer.result);
        }

        return Promise.all(promises);
    }

    _checkEntry(entry) {
        if (is.nil(entry.$dst)) {
            return false;
        }

        if (!is.string(entry.$task)) {
            entry.$task = "copy";
        }

        return true;
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
