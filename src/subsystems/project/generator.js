const {
    is,
    fs,
    regex,
    std: { path },
    vcs: { git },
    terminal,
    fast,
    text: { unicode },
    system: { process: { exec } }
} = adone;

export class Generator {
    constructor() {
        this.templatesPath = path.join(adone.appinstance.adoneEtcPath, "templates");
        this.templateAppPath = path.join(this.templatesPath, "app");
    }

    async getApplicationContent(name, compact) {
        let appContent = await fs.readFile(path.join(this.templateAppPath, "src", `${compact ? "compact." : ""}app.js`), { encoding: "utf8" });

        if (!compact) {
            appContent = appContent.replace(/\$App/gi, `${adone.text.capitalize(name)}Application`);
        }

        return appContent;
    }

    async createProject(name, type, { editor }) {
        const appPath = path.join(process.cwd(), name);

        // Force create OOP application base
        if (type === "application") {
            type = "app";
        }

        try {
            if ((await fs.exists(appPath))) {
                throw new adone.x.Exists(`Directory '${name}' already exists`);
            }

            await fs.mkdir(appPath);

            // 'src' directory
            await fs.mkdir(path.join(appPath, "src"));

            let appContent;

            switch (type) {
                case "app":
                    appContent = await this.getApplicationContent(name, false);
                    break;
                default:
                    throw new adone.x.NotSupported(`Unsupported project type: ${type}`);
            }

            const files = ["package.json", "adone.conf.js"];

            await fs.writeFile(path.join(appPath, "src", `${type}.js`), appContent);
            files.push(path.join("src", `${type}.js`));
            this._logFileCreation("src/${type}.js");

            // package.json
            const packageJson = new adone.configuration.FileConfiguration();
            await packageJson.load(path.join(this.templatesPath, type, "package.json"));
            packageJson.name = name;
            const pkgVersion = `>=${adone.package.version}-0`;
            // packageJson.devDependencies["@types/adone"] = pkgVersion;
            packageJson.devDependencies["eslint-plugin-adone"] = pkgVersion;
            await packageJson.save(path.join(appPath, "package.json"), null, { space: "  " });
            this._logFileCreation("package.json");

            // adone.conf.js
            let adoneConfJs = await fs.readFile(path.join(this.templatesPath, type, "adone.conf.js"), { encoding: "utf8" });
            adoneConfJs = adoneConfJs.replace(/\$app/gi, name);
            await fs.writeFile(path.join(appPath, "adone.conf.js"), adoneConfJs);
            this._logFileCreation("adone.conf.js");

            await fast.src("common/**/*", { cwd: this.templatesPath }).map((x) => {
                return x;
            }).dest(appPath, { produceFiles: true }).through((x) => {
                files.push(x.relative);
                this._logFileCreation(x.relative);
            });

            const time = adone.datetime.now() / 1000;
            const zoneOffset = adone.datetime().utcOffset();

            // npm
            const npmBar = adone.terminal.progress({
                schema: " :spinner installing npm packages"
            });
            npmBar.update(0);

            try {
                await exec("npm", ["i", "--save-dev"], {
                    cwd: appPath
                });

                npmBar.setSchema(" :spinner npm packages installed");
                npmBar.complete(true);
            } catch (err) {
                npmBar.setSchema(" :spinner npm packages installation failed");
                npmBar.complete(false);
                throw err;
            }

            // git
            const gitBar = adone.terminal.progress({
                schema: " :spinner initializing git"
            });
            gitBar.update(0);

            try {
                const logoContent = await fs.readFile(path.join(adone.appinstance.adoneEtcPath, "media", "adone.txt"), { encoding: "utf8" });
                const repository = await git.Repository.init(appPath, 0);
                const index = await repository.refreshIndex();
                for (const file of files) {
                    await index.addByPath(file);
                }
                await index.write();
                const oid = await index.writeTree();
                const author = git.Signature.create("ADONE", "info@adone.io", time, zoneOffset);
                const committer = git.Signature.create("ADONE", "info@adone.io", time, zoneOffset);
                await repository.createCommit("HEAD", author, committer, `initial commit from adone/cli\n\n${logoContent}`, oid, []);
                gitBar.setSchema(" :spinner git initialized");
                gitBar.complete(true);
            } catch (err) {
                npmBar.setSchema(" :spinner git initialization failed");
                npmBar.complete(false);
                throw err;
            }

            terminal.print(`{green-fg}Project {bold}'${name}'{/bold} successfully created.{/}\n`);

            this.spawnEditor(appPath, editor);
            return 0;
        } catch (err) {
            terminal.print(`{red-fg}${err.message}{/}`);
            if (!(err instanceof adone.x.Exists)) {
                await fs.rm(appPath);
            }

            return 1;
        }
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

            if (dir) {
                if ((await fs.exists(path.dirname(fullPath)))) {
                    throw new adone.x.Exists(`Directory '${path.dirname(fullPath)}' already exists\n`);
                }
            } else {
                if ((await fs.exists(fullPath))) {
                    throw new adone.x.Exists(`File/directory '${fullPath}' already exists\n`);
                }
            }

            let skeleton;

            switch (type) {
                case "appliation": {
                    skeleton = await this.getApplicationContent(name, false);
                    break;
                }
                case "app": {
                    skeleton = await this.getApplicationContent(name, true);
                    break;
                }
                default:
                    throw new adone.x.NotSupported(`Unsupported skeleton: ${type}`);
            }

            await fs.mkdir(path.dirname(fullPath));
            await fs.writeFile(fullPath, skeleton);

            terminal.print("{white-fg}File successfully created.{/}\n");

            this.spawnEditor(fullPath, editor);

            return 0;
        } catch (err) {
            terminal.print(`{red-fg}${err.message}{/}\n`);
            return 1;
        }
    }

    spawnEditor(path, editor) {
        if (!is.nil(editor)) {
            (new adone.util.Editor({ path, editor })).spawn();
        }
    }

    _logFileCreation(name) {
        terminal.print(` {green-fg}${unicode.approx(unicode.symbol.tick)}{/green-fg} file {bold}${name}{/bold}\n`);
    }

    static new() {
        return new Generator();
    }
}
