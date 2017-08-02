const { std: { path }, lazify, fs, terminal } = adone;

const lazy = lazify({
    Builder: ["./builder", (x) => x.Builder]
}, null, require);

const parseRestArgs = (args) => {
    const map = {};
    let lastArg = null;
    for (let arg of args) {
        if (arg.match(/^--[\w-]+=.+$/)) {
            const i = arg.indexOf("=");
            map[arg.slice(2, i)] = arg.slice(i + 1);
            continue;
        }
        if (arg.startsWith("-")) {
            arg = arg.slice(arg[1] === "-" ? 2 : 1);
            if (lastArg) {
                map[lastArg] = true;
            }
            lastArg = arg;
        } else {
            map[lastArg] = arg;
            lastArg = null;
        }
    }
    return map;
};

export default class extends adone.application.Subsystem {
    initialize() {
        this.defineCommand({
            name: "project",
            group: "subsystem",
            help: "cli interface for adone project management",
            arguments: [
            ],
            options: [
            ],
            commands: [
                {
                    name: "new",
                    help: "Create new directory and initialize project",
                    arguments: [
                        {
                            name: "name",
                            type: String,
                            required: true,
                            help: "Name of project"
                        }
                    ],
                    options: [
                        {
                            name: ["--type", "-t"],
                            choices: ["app", "subsystem", "service"],
                            default: "app",
                            help: "Type of adone project"
                        },
                        {
                            name: "--compact",
                            help: "Generate compact version of application entry point"
                        }
                    ],
                    handler: this.newCommand
                },
                {
                    name: "build",
                    help: "Build project",
                    options: [
                        {
                            name: "--watch",
                            help: "Watch files changes",
                        },
                        {
                            name: "--build",
                            help: "Build before watching"
                        }
                    ],
                    handler: this.buildCommand
                },
                {
                    name: "clean",
                    help: "Clean project",
                    handler: this.cleanCommand
                }
            ]
        });
    }

    async newCommand(args, opts) {
        const name = args.get("name");
        const type = opts.get("type");
        const appPath = path.join(process.cwd(), name);
        const templateBasePath = adone.std.path.join(this.app.adoneEtcPath, "templates", type);

        try {
            if ((await adone.fs.exists(appPath))) {
                throw new adone.x.Exists(`Directory '${name}' already exists`);
            }

            terminal.print(`{white-fg}Generating {bold}${type}{/bold} project{/}:\n`);

            await adone.fs.mkdir(appPath);

            // 'src' directory
            terminal.print(`  {green-fg}src/${type}.js{/}...`);
            await adone.fs.mkdir(adone.std.path.join(appPath, "src"));

            let appContent;

            if (type === "app") {
                const isCompact = opts.has("compact");
                appContent = await adone.fs.readFile(adone.std.path.join(templateBasePath, "src", `${isCompact ? "compact." : ""}${type}.js`), { encoding: "utf8" });

                if (!opts.has("compact")) {
                    appContent = appContent.replace(/\$App/gi, `${adone.text.capitalize(name)}Application`);
                }
            } else {
                //
            }
            await adone.fs.writeFile(adone.std.path.join(appPath, "src", `${type}.js`), appContent);
            terminal.print("{white-fg}{bold}OK{/}\n");

            // package.json
            terminal.print("  {green-fg}package.json{/}...");
            const packageJson = new adone.configuration.FileConfiguration();
            await packageJson.load(adone.std.path.join(templateBasePath, `${type}.package.json`));
            packageJson.name = name;
            await packageJson.save(adone.std.path.join(appPath, "package.json"), null, { space: "  " });
            terminal.print("{white-fg}{bold}OK{/}\n");

            // adone.conf.js
            terminal.print("  {green-fg}adone.conf.js{/}...");
            let adoneConfJs = await adone.fs.readFile(adone.std.path.join(templateBasePath, `${type}.adone.conf.js`), { encoding: "utf8" });
            adoneConfJs = adoneConfJs.replace(/\$app/gi, name);
            await adone.fs.writeFile(adone.std.path.join(appPath, "adone.conf.js"), adoneConfJs);
            terminal.print("{white-fg}{bold}OK{/}\n");
            
            const asIsFiles = [".eslintrc.js"];

            for (const name of asIsFiles) {
                terminal.print(`  {green-fg}${name}{/}...`);
                await adone.fs.copy(adone.std.path.join(templateBasePath, name), appPath);
                terminal.print("{white-fg}{bold}OK{/}\n");
            }

            terminal.print(`{white-fg}Project {bold}'${name}'{/bold} successfully created.{/}\n`);
            return 0;
        } catch (err) {
            adone.log(err);
            if (!(err instanceof adone.x.Exists)) {
                await adone.fs.rm(appPath);
            }

            return 1;
        }
    }

    async loadAdoneConfig() {
        const confPath = path.resolve("adone.conf.js");
        try {
            const stat = await fs.stat(confPath);
            if (!stat.isFile()) {
                throw new Error("adone.conf.js is not a file");
            }
        } catch (err) {
            if (err.code === "ENOENT") {
                throw new Error("adone.conf.js not found");
            }
            throw new Error(`adone.conf.js not found: ${err.message}`);
        }
        try {
            const conf = adone.require(confPath);
            return conf.default || conf;
        } catch (err) {
            throw new Error(`Failed to load adone.conf.js: ${err.message}`);
        }
    }

    async buildCommand(args, opts, { rest }) {
        let conf;
        try {
            conf = await this.loadAdoneConfig();
        } catch (err) {
            adone.error(err.message);
            return 1;
        }
        if (!conf.project.structure) {
            adone.error("Project structure is not defined");
            return 1;
        }
        const parsedRest = parseRestArgs(rest);
        const watch = opts.get("watch");
        const build = opts.get("build");
        if (!watch || build) {
            const builder = new lazy.Builder(conf.project.structure, {
                ...parsedRest
            });
            await builder.execute();
        }
        if (watch) {
            const builder = new lazy.Builder(conf.project.structure, {
                watch, ...parsedRest
            });
            await builder.execute();
        }
    }

    async cleanCommand() {

    }
}
