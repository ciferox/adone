const {
    is,
    fs,
    regex,
    text,
    std: { path },
    vcs: { git },
    terminal,
    fast,
    system: { process: { exec } },
    templating: { nunjucks },
    configuration
} = adone;

// Constants 

const NETRON_PACKAGES = {
    "adone": "^0.6.54-3", // eslint-disable-line
    "lodash": "^4.17.4", // eslint-disable-line
    "ng-netron": "^0.1.7"
};
const NG_ADDITIONAL_NPM_PACKAGES = {
    "@angular/flex-layout": "^2.0.0-beta.8"
};
const BACKEND_NAME = "backend";
const FRONTEND_NAME = "frontend";
const DEST_OPTIONS = {
    produceFiles: true,
    originTimes: false,
    originMode: true,
    originOwner: false
};

export class Generator {
    constructor() {
        this.templatesPath = path.join(adone.appinstance.adoneEtcPath, "subsystems", "project", "templates");
        this.adoneConfPath = path.join(this.templatesPath, "adone.conf");

        this.gitFiles = [];

        nunjucks.configure("/", {
            autoescape: false
        });
    }

    async generate(name, type, { cwd, dir, editor }) {
        try {
            if (!regex.filename.test(name)) {
                throw new adone.x.Incorrect(`Incorrect filename: ${name}`);
            }

            let basePath;
            if (is.string(cwd)) {
                basePath = path.resolve(cwd);
            } else {
                basePath = process.cwd();
            }
            const fullPath = dir ? path.join(basePath, name, "index.js") : path.join(basePath, `${name}.js`);
            const appRelPath = dir ? path.join(name, "index.js") : `${name}.js`;

            if (dir) {
                if ((await fs.exists(path.dirname(fullPath)))) {
                    throw new adone.x.Exists(`Directory '${path.dirname(fullPath)}' already exists\n`);
                }
            } else {
                if ((await fs.exists(fullPath))) {
                    throw new adone.x.Exists(`File/directory '${fullPath}' already exists\n`);
                }
            }

            await fast.src([`skeletons/${type}.js`], {
                cwd: this.templatesPath
            }).mapIf((x) => x.basename === "app.js", async (x) => {
                x.relative = appRelPath;
                x.contents = Buffer.from(await nunjucks.renderString(x.contents.toString(), {
                    name: `${adone.text.capitalize(name)}Application`
                }));
                return x;
            }).mapIf((x) => x.basename === "miniapp.js", async (x) => {
                x.relative = appRelPath;
                return x;
            }).dest(basePath, DEST_OPTIONS);

            terminal.print(`{green-fg}Script {bold}'${name}'{/bold} successfully created.{/}\n`);

            this._spawnEditor(fullPath, editor);

            return 0;
        } catch (err) {
            terminal.print(`{red-fg}${err.message}{/}\n`);
            return 1;
        }
    }

    async createProject(name, type, { sourceDir, skipGit, editor, frontend, netron }) {
        let projectPath = null;
        try {
            if (!regex.filename.test(name)) {
                throw new adone.x.Incorrect(`Incorrect name of project: ${name}`);
            }

            projectPath = path.join(process.cwd(), name);

            if ((await fs.exists(projectPath))) {
                throw new adone.x.Exists(`Directory '${name}' already exists`);
            }

            await fs.mkdir(projectPath);

            if (type === "application") {
                type = "app";
            } else if (type === "webapplication") {
                type = "webapp";
            }

            if (is.nil(sourceDir)) {
                sourceDir = "src";
            } else {
                if (path.isAbsolute(sourceDir)) {
                    throw new adone.x.NotValid(`Invalid source directory: ${sourceDir}`);
                }
                sourceDir = path.normalize(sourceDir);
            }

            const projectName = text.capitalize(text.toCamelCase(name));

            switch (type) {
                case "app":
                    await this._createApp(name, projectName, projectPath, { sourceDir, skipGit });
                    break;
                case "webapp":
                    await this._createWebApp(name, projectName, projectPath, { sourceDir, skipGit, frontend, netron });
                    break;
            }

            terminal.print(`{green-fg}Project {bold}'${name}'{/bold} successfully created.{/}\n`);

            this._spawnEditor(projectPath, editor);
            return 0;
        } catch (err) {
            terminal.print(`{red-fg}${err.message}{/}\n`);
            if (!(err instanceof adone.x.Exists) && !is.null(projectPath)) {
                await fs.rm(projectPath);
            }

            return 1;
        }
    }

    async _createApp(name, projectName, projectPath, { sourceDir, skipGit }) {
        this.gitFiles.push("package-lock.json");

        // backend files
        await this._installApp(name, projectName, projectPath, { sourceDir, skipGit });

        // npm
        await this._installNpms(projectPath);

        // git
        if (!skipGit) {
            await this._initializeGit(projectPath);
        }
    }

    async _createWebApp(name, projectName, projectPath, { sourceDir, skipGit, frontend, netron }) {
        const withFrontend = is.string(frontend);
        const backendPath = withFrontend ? path.join(projectPath, BACKEND_NAME) : projectPath;
        this.gitFiles.push(path.join(withFrontend ? BACKEND_NAME : "", "package-lock.json"));
        if (withFrontend) {
            this.gitFiles.push(path.join(FRONTEND_NAME, "package-lock.json"));
        }

        let bundleDir;
        if (netron) {
            bundleDir = `${frontend}_netron`;
        } else {
            bundleDir = frontend;
        }

        // backend files
        await this._installWebappBackend(name, projectName, projectPath, { sourceDir, skipGit, frontend, netron, bundleDir, withFrontend, backendPath });

        // backend npms
        await this._installNpms(backendPath);

        // frontend
        if (withFrontend) {
            const frotnendPath = path.join(projectPath, FRONTEND_NAME);

            await this._installWebappFrontend(name, projectPath, frotnendPath, { frontend, netron, bundleDir });

            // frontend npms
            await this._installNpms(frotnendPath);
        }

        // git
        if (!skipGit) {
            await this._initializeGit(projectPath);
        }
    }

    async _installApp(name, projectName, projectPath, { sourceDir, skipGit }) {
        const bar = adone.terminal.progress({
            schema: " :spinner installing files"
        });
        bar.update(0);

        try {
            const appRelPath = path.join(sourceDir, "app.js");

            await fast.src(["skeletons/app.js", "common/**/*"], {
                cwd: this.templatesPath
            }).filter((x) => {
                if (x.basename === ".gitignore" && skipGit) {
                    return false;
                }
                return true;
            }).mapIf((x) => x.basename === "app.js", async (x) => {
                x.relative = appRelPath;
                x.contents = Buffer.from(await nunjucks.renderString(x.contents.toString(), {
                    name: `${projectName}Application`
                }));
                return x;
            }).mapIf((x) => x.basename === "package.json", (x) => {
                const packageJson = JSON.parse(x.contents.toString());
                packageJson.name = name;
                packageJson.main = `"./bin/${name}.js"`;
                x.contents = Buffer.from(JSON.stringify(packageJson, null, "  "));
                return x;
            }).mapIf((x) => x.basename === "adone.conf.js", async (x) => {
                x.contents = Buffer.from(await nunjucks.renderString(x.contents.toString(), {
                    name,
                    from: appRelPath
                }));
                return x;
            }).dest(projectPath, DEST_OPTIONS).through((x) => {
                this._addFileToGit(x.relative);
            });

            bar.setSchema(" :spinner files installed");
            bar.complete(true);
        } catch (err) {
            bar.setSchema(" :spinner files installation failed");
            bar.complete(false);
            throw err;
        }
    }

    async _installWebappBackend(name, projectName, projectPath, { sourceDir, skipGit, frontend, netron, bundleDir, withFrontend, backendPath }) {
        const bar = adone.terminal.progress({
            schema: " :spinner installing backend files"
        });
        bar.update(0);

        try {

            const appRelPath = path.join(sourceDir, "app.js");

            // common
            await fast.src("common/**/*", {
                cwd: this.templatesPath
            }).filter((x) => {
                if (x.basename === ".gitignore" && skipGit) {
                    return false;
                }
                return true;
            }).mapIf((x) => x.basename === "package.json", (x) => {
                const packageJson = JSON.parse(x.contents.toString());
                packageJson.name = name;
                packageJson.main = `./bin/${name}.js`;
                x.contents = Buffer.from(JSON.stringify(packageJson, null, "  "));
                return x;
            }).mapIf((x) => x.basename === "adone.conf.js", async (x) => {
                const bin = await nunjucks.renderString(await fs.readFile(path.join(this.adoneConfPath, "bin.nunjucks"), { encoding: "utf8" }), {
                    fromBin: appRelPath
                });
                const lib = await nunjucks.renderString(await fs.readFile(path.join(this.adoneConfPath, "lib.nunjucks"), { encoding: "utf8" }), {
                    fromBin: appRelPath,
                    fromLib: path.join(sourceDir, "**", "*")
                });

                x.contents = Buffer.from(await nunjucks.renderString(x.contents.toString(), {
                    bin,
                    lib,
                    name,
                    from: appRelPath
                }));
                return x;
            }).dest(backendPath, DEST_OPTIONS).through((x) => {
                this._addFileToGit(withFrontend ? path.join(BACKEND_NAME, x.relative) : x.relative);
            });

            // src
            await fast.src(`skeletons/webapp/backend/${bundleDir}/src/**/*`, {
                cwd: this.templatesPath
            }).map((x) => {
                x.relative = path.join(sourceDir, x.relative);
                return x;
            }).mapIf((x) => x.basename === "app.js", async (x) => {
                x.contents = Buffer.from(await nunjucks.renderString(x.contents.toString(), {
                    name: `${projectName}Application`
                }));
                return x;
            }).dest(backendPath, DEST_OPTIONS).through((x) => {
                this._addFileToGit(withFrontend ? path.join(BACKEND_NAME, x.relative) : x.relative);
            });

            // configs
            await fast.src(`configs/webapp/${bundleDir}/**/*`, {
                cwd: this.templatesPath
            }).dest(backendPath, DEST_OPTIONS).through((x) => {
                this._addFileToGit(withFrontend ? path.join(BACKEND_NAME, x.relative) : x.relative);
            });

            // readme
            await fast.src(`readme/webapp/${frontend}/**/*`, {
                cwd: this.templatesPath
            }).map(async (x) => {
                x.contents = Buffer.from(await nunjucks.renderString(x.contents.toString(), {
                    name,
                    adoneVersion: adone.package.version
                }));

                return x;
            }).dest(projectPath, DEST_OPTIONS).through((x) => {
                this._addFileToGit(x.relative);
            });

            bar.setSchema(" :spinner backend files installed");
            bar.complete(true);
        } catch (err) {
            bar.setSchema(" :spinner backend files installation failed");
            bar.complete(false);
            throw err;
        }
    }

    async _installWebappFrontend(name, projectPath, frotnendPath, { frontend, netron, bundleDir }) {
        const bar = adone.terminal.progress({
            schema: " :spinner installing frontend files"
        });
        bar.update(0);

        try {
            const packageJsonPath = path.join(frotnendPath, "package.json");
            const packageJson = new configuration.FileConfiguration();

            switch (frontend) {
                case "ng": {
                    await this._initNgFrontend(name, projectPath, frotnendPath);

                    // add additional packages
                    await packageJson.load(packageJsonPath);
                    for (const [name, version] of Object.entries(NG_ADDITIONAL_NPM_PACKAGES)) {
                        packageJson.dependencies[name] = version;
                    }

                    // rewrite files
                    await fast.src(`skeletons/webapp/frontend/${bundleDir}/**/*`, {
                        cwd: this.templatesPath
                    }).map((x) => {
                        if (x.relative === "proxy.conf.js") {
                            this._addFileToGit(path.join(FRONTEND_NAME, x.relative));
                        }
                        return x;
                    }).dest(frotnendPath, DEST_OPTIONS);

                    // added lodash script
                    const ngCliJson = new configuration.FileConfiguration();
                    const ngCliJsonPath = path.join(frotnendPath, ".angular-cli.json");
                    await ngCliJson.load(ngCliJsonPath);
                    ngCliJson.apps[0].scripts.push("../node_modules/lodash/lodash.min.js");
                    await ngCliJson.save(ngCliJsonPath, null, { space: "  " });

                    break;
                }
            }

            if (netron) {
                for (const [name, version] of Object.entries(NETRON_PACKAGES)) {
                    packageJson.dependencies[name] = version;
                }
            }
            
            await packageJson.save(packageJsonPath, null, { space: "  " });

            bar.setSchema(" :spinner frontend files installed");
            bar.complete(true);
        } catch (err) {
            bar.setSchema(" :spinner frontend files installation failed");
            bar.complete(false);
            throw err;
        }
    }

    async _initNgFrontend(name, projectPath, frotnendPath) {
        await exec("ng", ["new", name, "--directory", FRONTEND_NAME, "--skip-install"], {
            cwd: projectPath
        });

        // get commited frontend files
        const repository = await git.Repository.open(frotnendPath);
        const commit = await repository.getBranchCommit("master");
        const tree = await commit.getTree();

        await new Promise(((resolve, reject) => {
            const walker = tree.walk();

            walker.on("entry", (entry) => {
                this.gitFiles.push(path.join(FRONTEND_NAME, entry.path()));
            });
            walker.on("end", (/*entries*/) => {
                resolve();
            });
            walker.on("error", reject);

            walker.start();
        }));

        // Remove frontend .git
        await fs.rm(path.join(frotnendPath, ".git"));
    }

    async _installNpms(projectPath) {
        const bar = adone.terminal.progress({
            schema: " :spinner installing npm packages"
        });
        bar.update(0);

        try {
            await exec("npm", ["i", "--save-dev"], {
                cwd: projectPath
            });

            bar.setSchema(" :spinner npm packages installed");
            bar.complete(true);
        } catch (err) {
            bar.setSchema(" :spinner npm packages installation failed");
            bar.complete(false);
            throw err;
        }
    }

    async _initializeGit(projectPath) {
        const time = adone.datetime.now() / 1000;
        const zoneOffset = adone.datetime().utcOffset();

        const bar = adone.terminal.progress({
            schema: " :spinner initializing git"
        });
        bar.update(0);

        try {
            const logoContent = await fs.readFile(path.join(adone.appinstance.adoneEtcPath, "media", "adone.txt"), { encoding: "utf8" });
            const repository = await git.Repository.init(projectPath, 0);
            const index = await repository.refreshIndex();
            for (const file of this.gitFiles) {
                await index.addByPath(file); // eslint-disable-line
            }
            await index.write();
            const oid = await index.writeTree();
            const author = git.Signature.create("ADONE", "info@adone.io", time, zoneOffset);
            const committer = git.Signature.create("ADONE", "info@adone.io", time, zoneOffset);
            await repository.createCommit("HEAD", author, committer, `initial commit from adone/cli:\n\n  $ adone ${adone.appinstance.argv.join(" ")}\n\n${logoContent}`, oid, []);
            bar.setSchema(" :spinner git initialized");
            bar.complete(true);
        } catch (err) {
            bar.setSchema(" :spinner git initialization failed");
            bar.complete(false);
            throw err;
        }
    }

    _addFileToGit(filePath) {
        this.gitFiles.push(filePath);
    }

    _spawnEditor(path, editor) {
        if (!is.nil(editor)) {
            (new adone.util.Editor({ path, editor })).spawn();
        }
    }

    static new() {
        return new Generator();
    }
}
