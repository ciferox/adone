const { std: { path }, lazify, fs } = adone;

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
            name: "app",
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
        const appPath = path.join(process.cwd(), name);

        if ((await adone.fs.exists(appPath))) {
            throw new adone.x.Exists(`Directory ${name} already exists`);
        }

        await adone.fs.mkdir(appPath);

        adone.info(`Project '${name}' successfully created.`);
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
            adone.error("project structure is not defined");
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
