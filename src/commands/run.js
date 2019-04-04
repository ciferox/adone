const {
    is,
    fs,
    app: {
        Subsystem,
        mainCommand
    },
    std
} = adone;

export default class Run extends Subsystem {
    @mainCommand({
        blindMode: true,
        arguments: [
            {
                name: "path",
                help: "Path to adone application root or path to script or code"
            }
        ],
        options: [
            {
                name: ["--sourcemaps", "-s"],
                help: "Force enable sourcemaps support"
            },
            {
                name: ["--eval", "-e"],
                help: "Interpret path argument as js code"
            },
            {
                name: "--inspect",
                type: String,
                help: "Activate node inspector on host[:port] (eg. '9229' or '127.0.0.1:9229')",
                holder: "HOST[:PORT]"
            },
            {
                name: ["--force", "-f"],
                help: "Force create script file if file not exists"
            },
        ]
    })
    async main(args, opts, { rest }) {
        // Ignore other options
        if (opts.has("eval")) {
            return this._runCode(args.get("path"));
        }
        let shouldTranspile = true;

        let path = std.path.resolve(process.cwd(), args.get("path"));

        if (await fs.exists(path) && await fs.isDirectory(path)) {
            // adone application
            const conf = await adone.configuration.Adone.load({
                cwd: path
            });

            if (!is.string(conf.raw.bin)) {
                throw new adone.error.NotValidException(`Path '${path}' is not containt adone application`);
            }

            path = std.path.join(path, conf.raw.bin);
            shouldTranspile = false;
        } else if (!path.endsWith(".js")) {
            path = `${path}.js`;
        }

        if (opts.has("inspect")) {
            return this._runInspect(path, opts, rest, shouldTranspile);
        }

        return this._runScript(path, rest, opts.getAll());
    }

    async _runInspect(path, opts, rest, shouldTranspile = true) {
        let tmpPath;
        try {
            let scriptPath;
            if (shouldTranspile) {
                const tmpPath = await fs.tmpName({
                    prefix: "script-"
                });
                await fs.mkdirp(tmpPath);
                scriptPath = std.path.join(tmpPath, "index.js");

                let content = await fs.readFile(std.path.resolve(process.cwd(), path), {
                    encoding: "utf8"
                });

                const mre = adone.regex.shebang().exec(content);
                if (mre) {
                    content = content.substring(mre[0].length + 1);
                }

                const { code/*, map*/ } = adone.js.compiler.core.transform(content, {
                    ...adone.require.options,
                    // sourceMaps: "both",
                    filename: std.path.resolve(process.cwd(), path)
                });

                await fs.writeFile(scriptPath, code);
            } else {
                scriptPath = path;
            }

            const runArgs = [
                "--require",
                std.path.join(adone.ROOT_PATH, "lib", "index.js"),
                "--require",
                std.path.join(adone.ROOT_PATH, "lib", "glosses", "sourcemap", "support", "register.js"),
                `--inspect=${opts.get("inspect")}`,
                "--inspect-brk"
            ];

            if (opts.has("sourcemaps")) {
                runArgs.push("--sourcemaps");
            }

            runArgs.push(scriptPath);
            runArgs.push(...rest);

            // We can run script directly with 'adone' pre-require.
            const child = adone.system.process.exec(process.execPath, runArgs, {
                stdio: ["inherit", "inherit", "inherit"]
            });

            this.root.on("exit", async () => {
                child.kill();
                await adone.promise.delay(10);

                // Force kill all childs
                const pids = await adone.system.process.getChildPids(process.pid);
                if (pids.length > 0) {
                    await adone.system.process.kill(pids.map((x) => x.pid));
                }
            });

            await child;
        } catch (err) {
            if (!err.killed) {
                adone.logError(err);
                return 1;
            }
        } finally {
            is.string(tmpPath) && await fs.rm(tmpPath);
        }
        return 0;
    }

    async _runCode(code) {
        const m = new adone.module.Module(process.cwd(), {
            transform: adone.module.Module.transforms.transpile(adone.require.options)
        });

        m._compile(code, "index.js");
        let runnable = m.exports;
        if (runnable.__esModule) {
            if (is.propertyDefined(runnable, "default")) {
                runnable = runnable.default;
            }
        }

        if (is.asyncFunction(runnable)) {
            console.log(await runnable());
        } else if (is.function(runnable)) {
            console.log(runnable());
        } else {
            if (is.object(runnable)) {
                adone.util.keys(runnable, { enumOnly: false, all: true }).length > 0 && console.log(runnable);
            } else {
                console.log(runnable);
            }
        }
    }

    async _runScript(path, args, { sourcemaps, force } = {}) {
        let scriptPath = path;
        if (!std.path.isAbsolute(scriptPath)) {
            scriptPath = std.path.resolve(process.cwd(), scriptPath);
        }

        if (!(await fs.exists(scriptPath)) && force) {
            await adone.util.Editor.edit({
                path,
                save: true
            });
    
            const answers = await adone.cli.prompt().run([
                {
                    type: "confirm",
                    name: "execute",
                    message: "Execute the script?"
                }
            ]);
            if (!answers.execute) {
                return;
            }
        }

        adone.__argv__ = [process.argv[0], scriptPath, ...args];

        if (sourcemaps) {
            adone.sourcemap.support(Error).install();
        }

        let result = adone.require(scriptPath);
        if (result.__esModule && (is.function(result.default) || is.class(result.default))) {
            result = result.default;
        }

        if (is.class(result)) {
            // TODO: args
            const observer = await adone.task.run(result);
            await observer.result;
        } else if (is.function(result)) {
            try {
                await result();
            } catch (err) {
                // More preferably is to provide options to display such errors.
            }
        }
    }
}
