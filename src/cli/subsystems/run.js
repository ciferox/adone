const {
    is,
    application: {
        Subsystem,
        DMainCliCommand
    },
    std
} = adone;


export default class Run extends Subsystem {
    @DMainCliCommand({
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
            }
        ]
    })
    async main(args, opts, { rest }) {
        // Ignore other options
        if (opts.has("eval")) {
            return this._runCode(args.get("path"));
        }
        let shouldTranspile = true;

        let path = std.path.resolve(process.cwd(), args.get("path"));

        if (await adone.fs.exists(path) && await adone.fs.is.directory(path)) {
            // adone application
            const conf = await adone.configuration.Adone.load({
                cwd: path
            });

            if (!is.string(conf.raw.bin)) {
                throw new adone.error.NotValid(`Path '${path}' is not containt adone application`);
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
                const tmpPath = await adone.fs.tmpName({
                    prefix: "script-"
                });
                await adone.fs.mkdirp(tmpPath);
                scriptPath = std.path.join(tmpPath, "index.js");

                let content = await adone.fs.readFile(std.path.resolve(process.cwd(), path), {
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

                await adone.fs.writeFile(scriptPath, code);
            } else {
                scriptPath = path;
            }

            const runArgs = [
                "--require",
                std.path.join(adone.rootPath, "lib", "index.js"),
                "--require",
                std.path.join(adone.rootPath, "lib", "glosses", "sourcemap", "support", "register.js"),
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
            is.string(tmpPath) && await adone.fs.rm(tmpPath);
        }
        return 0;
    }

    async _runCode(code) {
        const m = new adone.js.Module(process.cwd(), {
            transform: adone.js.Module.transforms.transpile(adone.require.options)
        });

        m._compile(code, "index.js");
        let result = m.exports;
        if (result.__esModule) {
            result = result.default;
        }
        if (is.asyncFunction(result)) {
            await result();
        } else if (is.function(result)) {
            result();
        } else if (!is.nil(result)) {
            adone.log(result);
        }
    }

    _runScript(path, args, { sourcemaps } = {}) {
        let scriptPath = path;
        if (!std.path.isAbsolute(scriptPath)) {
            scriptPath = std.path.resolve(process.cwd(), scriptPath);
        }

        adone.__argv__ = [process.argv[0], scriptPath, ...args];

        if (sourcemaps) {
            adone.sourcemap.support(Error).install();
        }

        adone.require(scriptPath);
    }
}
