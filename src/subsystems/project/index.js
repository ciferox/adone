const { std: { path }, lazify, fs } = adone;

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
                            choices: ["ng"],
                            default: "ng",
                            nargs: "?",
                            help: "name of frontend library"
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
        const type = args.get("type");
        return lazy.Generator.new().createProject(args.get("name"), type, {
            sourceDir: opts.has("sourceDir") ? opts.get("sourceDir") : null,
            skipGit: opts.has("skipGit"),
            editor: opts.has("editor") ? opts.get("editor") : null,
            frontend: opts.has("frontend") && ["webapp", "webapplication"].includes(type) ? opts.get("frontend") : null
        });
    }

    async generateCommand(args, opts) {
        return lazy.Generator.new().generate(args.get("name"), args.get("type"), {
            dir: opts.has("dir"),
            editor: opts.has("editor") ? opts.get("editor") : null
        });
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
