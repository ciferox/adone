const {
    is,
    fs,
    regex,
    std: { path },
    vcs: { git },
    terminal
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

    async createProject(name, type) {
        const files = [];
        const appPath = path.join(process.cwd(), name);

        // Force create OOP application base
        if (type === "application") {
            type = "app";
        }

        try {
            if ((await fs.exists(appPath))) {
                throw new adone.x.Exists(`Directory '${name}' already exists`);
            }

            terminal.print(`{white-fg}Generating {bold}${type}{/bold} project{/}:\n`);

            await fs.mkdir(appPath);

            // 'src' directory
            terminal.print(`  {green-fg}src/${type}.js{/}...`);
            await fs.mkdir(path.join(appPath, "src"));

            let appContent;

            switch (type) {
                case "app":
                    appContent = await this.getApplicationContent(name, false);
                    break;
                default:
                    throw new adone.x.NotSupported(`Unsupported project type: ${type}`);
            }

            let filePath = path.join(appPath, "src", `${type}.js`);
            await fs.writeFile(filePath, appContent);
            files.push(filePath);
            terminal.print("{white-fg}{bold}OK{/}\n");

            // package.json
            terminal.print("  {green-fg}package.json{/}...");
            const packageJson = new adone.configuration.FileConfiguration();
            await packageJson.load(path.join(this.templatesPath, type, "package.json"));
            packageJson.name = name;
            filePath = path.join(appPath, "package.json");
            await packageJson.save(filePath, null, { space: "  " });
            files.push(filePath);
            terminal.print("{white-fg}{bold}OK{/}\n");

            // adone.conf.js
            terminal.print("  {green-fg}adone.conf.js{/}...");
            let adoneConfJs = await fs.readFile(path.join(this.templatesPath, type, "adone.conf.js"), { encoding: "utf8" });
            adoneConfJs = adoneConfJs.replace(/\$app/gi, name);
            filePath = path.join(appPath, "adone.conf.js");
            await fs.writeFile(filePath, adoneConfJs);
            files.push(filePath);
            terminal.print("{white-fg}{bold}OK{/}\n");

            const asIsFiles = [".eslintrc.js"];

            for (const name of asIsFiles) {
                terminal.print(`  {green-fg}${name}{/}...`);
                await fs.copy(path.join(this.templatesPath, type, name), appPath);
                files.push(path.join(appPath, name));
                terminal.print("{white-fg}{bold}OK{/}\n");
            }

            const time = adone.datetime.now() / 1000;
            const zoneOffset = adone.datetime().utcOffset();

            // git
            const logoContent = await fs.readFile(path.join(adone.appinstance.adoneEtcPath, "media", "adone.txt"), { encoding: "utf8" });
            const repository = await git.Repository.init(appPath, 0);
            const index = await repository.refreshIndex();
            for (const file of files) {
                // adone.log(path.relative(appPath, file));
                await index.addByPath(path.relative(appPath, file));
            }
            await index.write();
            const oid = await index.writeTree();
            const author = git.Signature.create("ADONE", "adone@ciferox.com", time, zoneOffset);
            const committer = git.Signature.create("ADONE", "adone@ciferox.com", time, zoneOffset);
            await repository.createCommit("HEAD", author, committer, `initial commit from adone/cli\n${logoContent}`, oid, []);
            terminal.print("{white-fg}Successfully initialized git.{/}\n");

            terminal.print(`{white-fg}Project {bold}'${name}'{/bold} successfully created.{/}\n`);
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

            if (!is.nil(editor)) {
                (new adone.util.Editor({ path: fullPath, editor })).spawn();
            }
        } catch (err) {
            terminal.print(`{red-fg}${err.message}{/}\n`);
            return 1;
        }
    }

    static new() {
        return new Generator();
    }
}
