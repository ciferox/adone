const {
    std: { path },
    lazify,
    fs,
    terminal,
    configuration,
    semver
} = adone;

const lazy = lazify({
    Builder: ["./builder", (x) => x.Builder],
    Generator: ["./generator", (x) => x.Generator]
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
                            name: "type",
                            type: String,
                            choices: ["app", "application", "webapp", "webapplication", "subsystem", "service"],
                            required: true,
                            help: "type of project"
                        },
                        {
                            name: "name",
                            type: String,
                            required: true,
                            help: "name of project"
                        }
                    ],
                    options: [
                        {
                            name: "--frontend",
                            choices: ["generic", "ng"],
                            default: "generic",
                            nargs: "?",
                            help: "name of frontend library"
                        },
                        {
                            name: "--netron",
                            help: "generate netron stuff (also on the frontend side if '--frontend' option is specified)"
                        },
                        {
                            name: "--source-dir",
                            type: String,
                            help: "relative path to source directory"
                        },
                        {
                            name: "--skip-git",
                            help: "skip initializing git repository"
                        },
                        {
                            name: ["--editor", "-e"],
                            type: String,
                            nargs: "?",
                            help: "open file immediately in the editor"
                        }
                    ],
                    handler: this.newCommand
                },
                {
                    name: "generate",
                    help: "Generates adone-specific skeletons",
                    arguments: [
                        {
                            name: "type",
                            choices: ["app", "miniapp", "subsystem"],
                            required: true,
                            help: "type of script"
                        },
                        {
                            name: "name",
                            type: String,
                            required: true,
                            help: "name of script"
                        }
                    ],
                    options: [
                        {
                            name: "--dir",
                            help: "Create directory instead of a file and index.js inside it"
                        },
                        {
                            name: ["--editor", "-e"],
                            type: String,
                            nargs: "?",
                            help: "open file immediately in the editor"
                        }
                    ],
                    handler: this.generateCommand
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
                    arguments: [
                        {
                            nargs: "?",
                            name: "path",
                            help: "Execute a certain task"
                        }
                    ],
                    handler: this.buildCommand
                },
                {
                    name: "watch",
                    help: "Watch project",
                    options: [
                        {
                            name: "--build",
                            help: "Build before watching"
                        }
                    ],
                    handler: this.watchCommand
                },
                {
                    name: "clean",
                    help: "Clean project",
                    arguments: [
                        {
                            nargs: "?",
                            name: "path",
                            help: "Clean a certain task"
                        }
                    ],
                    handler: this.cleanCommand
                },
                {
                    name: "incver",
                    help: "Increase project version",
                    arguments: [
                        {
                            name: "type",
                            choices: ["major", "minor", "patch", "premajor", "preminor", "prepatch", "prerelease"],
                            default: "patch",
                            help: "part of version to bump"
                        }
                    ],
                    options: [
                        {
                            name: ["--loose", "-l"],
                            help: "interpret version loosely"
                        },
                        {
                            name: ["--preid"],
                            help: "identifier to be used to prefix premajor, preminor, prepatch or prerelease"
                        }
                    ],
                    handler: this.incverCommand
                }
            ]
        });
    }

    async newCommand(args, opts) {
        const type = args.get("type");
        return lazy.Generator.new().createProject(args.get("name"), type, {
            sourceDir: opts.has("sourceDir") ? opts.get("sourceDir") : null,
            skipGit: opts.has("skipGit"),
            editor: opts.has("editor") ? opts.get("editor") : null,
            frontend: ["webapp", "webapplication"].includes(type) ? opts.get("frontend") : null,
            netron: opts.has("netron")
        });
    }

    async generateCommand(args, opts) {
        return lazy.Generator.new().generate(args.get("name"), args.get("type"), {
            dir: opts.has("dir"),
            editor: opts.has("editor") ? opts.get("editor") : null
        });
    }

    async buildCommand(args, opts, { rest }) {
        try {
            const conf = await this._loadAdoneConf();

            const parsedRest = parseRestArgs(rest);
            const builder = new lazy.Builder(conf.project.structure, {
                ...parsedRest
            });
            await builder.execute(args.has("path") ? args.get("path") : null);
        } catch (err) {
            terminal.print(`{red-fg}${err.message}{/}`);
        }
    }

    async watchCommand(args, opts, { rest }) {
        try {
            const conf = await this._loadAdoneConf();

            const parsedRest = parseRestArgs(rest);
            const build = opts.has("build");
            if (build) {
                const builder = new lazy.Builder(conf.project.structure, {
                    ...parsedRest
                });
                await builder.execute();
            }
            const builder = new lazy.Builder(conf.project.structure, {
                watch: true,
                ...parsedRest
            });
            await builder.execute();
        } catch (err) {
            terminal.print(`{red-fg}${err.message}{/}`);
        }
    }

    async cleanCommand(args) {
        try {
            const conf = await this._loadAdoneConf();
            const builder = new lazy.Builder(conf.project.structure);
            await builder.clean(args.has("path") ? args.get("path") : null);
        } catch (err) {
            terminal.print(`{red-fg}${err.message}{/}`);
        }
    }

    async _loadAdoneConf() {
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
        let conf;
        try {
            conf = adone.require(confPath);
        } catch (err) {
            throw new Error(`Failed to load adone.conf.js: ${err.message}`);
        }
        conf = conf.default || conf;
        if (!conf.project.structure) {
            throw new adone.x.NotValid("Project structure is not defined");
        }
        return conf;
    }

    async incverCommand(args, opts) {
        try {
            const packageJsonPath = path.join(process.cwd(), "package.json");
            const type = args.get("type");
            const identifier = opts.get("preid");
            const packageJson = await configuration.load(packageJsonPath);
            const loose = opts.has("loose");
            const version = packageJson.version;

            if (!semver.valid(version, loose)) {
                throw new adone.x.NotValid(`Version is not valid: ${version}`);
            }

            packageJson.version = semver.inc(semver.clean(version, loose), type, loose, identifier);

            await packageJson.save(packageJsonPath, null, { space: "  " });

            terminal.print(`{green-fg}Original: {/green-fg}{bold}${version}{/}\n`);
            terminal.print(`{green-fg}Incremented: {/green-fg}{bold}${packageJson.version}{/}\n`);
        } catch (err) {
            terminal.print(`{red-fg}${err.message}{/}\n`);
        }
    }
}
