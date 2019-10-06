const __ = adone.lazify({
    Configuration: "./configuration",
    repl: "./repl",
    ts: "./typescript"
}, null, require);

const {
    is,
    cli,
    path,
    app
} = adone;

const {
    subsystem,
    mainCommand
} = app;

const log = ({ stdout, stderr, inspect, ...options } = {}) => {
    if (is.plainObject(inspect)) {
        const options = inspect.options || {
            style: "color",
            depth: 8,
            noType: true,
            noArrayProperty: true
        };
        const value = is.array(inspect.value)
            ? inspect.value.map((rel) => adone.util.pick(rel, inspect.onlyProps))
            : adone.util.pick(inspect.value, inspect.onlyProps)

        stdout = adone.inspect(value, options);
    }
    if (stderr) {
        cli.updateProgress({
            status: false,
            clean: true
        });
        console.error(stderr);
    } else if (stdout) {
        if (!is.undefined(options.status) && !is.undefined(options.clean)) {
            cli.updateProgress(options);
        }
        console.log(stdout);
    } else {
        cli.updateProgress(options);
    }
};

const command = (name) => path.join(__dirname, "..", "commands", name);

@subsystem({
    subsystems: [
        {
            name: "inspect",
            group: "common",
            description: "Inspect namespace/object",
            subsystem: command("inspect")
        },
        {
            name: "realm",
            group: "common",
            description: "Realm management",
            subsystem: command("realm")
        },
        {
            name: "rollup",
            group: "common",
            description: "Rollup CLI",
            subsystem: command("rollup")
        }
    ]
})
export default class ADONEApp extends app.Application {
    async onConfigure() {
        !is.windows && this.exitOnSignal("SIGINT");

        this.config = await __.Configuration.load({
            cwd: path.join(adone.realm.rootRealm.getPath("etc"))
        });

        // Define command groups.
        const groups = this.config.getGroups();
        for (const group of groups) {
            this.helper.defineCommandsGroup(group);
        }

        await this._addInstalledSubsystems();

        if (!this.replBanner) {
            this.replBanner = `${cli.chalk.bold.hex("ab47bc")("ADONE")} v${adone.package.version}, ${cli.chalk.bold.hex("689f63")("Node.JS")} ${process.version}`
        }

        this.log = log;
    }

    @mainCommand({
        blindMode: true,
        arguments: [
            {
                name: "path",
                type: String,
                default: null,
                help: "Path to script"
            }
        ],
        options: [
            {
                name: ["--eval", "-e"],
                type: String,
                default: null,
                help: "Evaluate code",
                holder: "CODE"
            },
            {
                name: ["--print", "-p"],
                help: "Print result of '--eval'"
            },
            // {
            //     name: ["--require", "-r"],
            //     // nargs: "*",
            //     type: String,
            //     help: "Require a node module before execution",
            //     holder: "path"
            // },
            {
                name: ["--ts", "-T"],
                description: "Force using TypeScript compiler for (only used by '--eval' and REPL)"
            },
            {
                name: "--ts-type-check",
                help: "Enable type checking (slow)"
            },
            {
                name: "--ts-files",
                help: "Load files from 'tsconfig.json' on startup"
            },
            {
                name: ["--ts-config", "-C"],
                type: String,
                help: "Path to TypeScript JSON project file",
                holder: "path"
            },
            {
                name: ["--ts-ignore-diagnostics", "-D"],
                nargs: "+",
                type: String,
                help: "Ignore TypeScript warnings by diagnostic code",
                holder: "code"
            },
            {
                name: ["--ignore", "-I"],
                type: String,
                help: "Override the path patterns to skip compilation",
                holder: "pattern"
            }
        ]
    })
    async run(args, opts, { rest } = {}) {
        const cwd = path.normalize(process.cwd());
        const code = opts.get("eval");

        if (code) {
            await this._evalCode({
                cwd,
                code,
                ...opts.getAll()
            });
        } else {
            if (args.get("path")) {
                if (opts.get("ts")) {
                    __.ts.register({
                        cwd,
                        ...opts.getAll()
                    });
                }
                // make the filename absolute
                const filePath = path.resolve(cwd, args.get("path"));

                // add back on node and concat the sliced args
                process.argv = [process.execPath, filePath, ...rest];
                adone.require(filePath);
            } else {
                // Piping of execution _only_ occurs when no other script is specified.
                if (process.stdin.isTTY) {
                    __.repl.start({
                        banner: this.replBanner,
                        ...opts.getAll(),
                        // force type checking
                        tsTypeCheck: true,
                        cwd,
                        __
                    });
                } else {
                    let code = "";
                    process.stdin.on("data", (chunk) => code += chunk);
                    process.stdin.on("end", () => this._evalCode({
                        cwd,
                        code,
                        ...opts.getAll()
                    }));
                }
            }
        }
    }

    async _evalCode({ cwd, code, print, ts: isTypeScript, ...options }) {
        if (isTypeScript) {
            const ts = __.ts.register({
                cwd,
                evalCode: true,
                ...options
            });
            ts.evalCode(code, print);
        } else {
            const filename = global.__filename = "[eval].js";
            global.__dirname = cwd;

            const module = new adone.module.Module(filename, {
                transforms: [
                    adone.module.transform.babel()
                ]
            });
            module.filename = filename;
            module.paths = adone.std.module.Module._nodeModulePaths(global.__dirname);
            global.exports = module.exports;
            global.module = module;
            const $require = (path) => module.require(path);
            $require.cache = module.cache;
            $require.main = module;
            $require.resolve = (request) => adone.module.Module._resolveFilename(request, module);
            $require.uncache = (id) => module.uncache(id);
            global.require = $require;

            code = code.trim();

            let result = adone.js.compiler.core.transform(code.trim(), {
                plugins: adone.module.COMPILER_PLUGINS,
                parserOpts: {
                    allowAwaitOutsideFunction: true
                },
                filename
            });

            let fn = new adone.js.AsyncFunction(result.code);

            if (print) {
                // TODO: not a perfect solution
                result = adone.js.compiler.core.transform(fn.toString(), {
                    ast: true,
                    code: false,
                    plugins: ["transform.implicitReturn"],
                    filename: "index.js"
                });
                // print function block statement
                result = adone.js.compiler.generate(result.ast.program.body[0].body);

                // `.slice(2, -2)`: cut block braces
                fn = new adone.js.AsyncFunction(result.code.slice(2, -2));
                result = await fn();
                console.log(is.string(result)
                    ? result
                    : adone.std.util.inspect(result));
            } else {
                await fn();
            }
        }
    }

    async _addInstalledSubsystems() {
        const commands = this.config.getCommands();
        for (const ss of commands) {
            // eslint-disable-next-line
            await this.helper.defineCommandFromSubsystem({
                ...adone.util.omit(ss, "name"),
                name: [ss.name, ...adone.util.arrify(ss.aliases)],
                lazily: true
            });
        }
    }
}
