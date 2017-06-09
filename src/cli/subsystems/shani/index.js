const { shani: { Engine, consoleReporter, simpleReporter, minimalReporter }, is, std: { path } } = adone;

export default class ShaniCLI extends adone.application.Subsystem {
    initialize() {
        this.defineCommand({
            name: "shani",
            group: "subsystem",
            help: "cli interface to 'shani' test framework",
            arguments: [
                { name: "tests", holder: "test", help: "a test file", nargs: "*" }
            ],
            optionsGroups: [
                { name: "output", description: "Output" },
                { name: "flow", description: "Execution flow controls" },
                { name: "config", description: "Configuring" }
            ],
            options: [
                { name: "--first", help: "exit if some test fails", group: "flow" },
                { name: "--timeout", help: "default timeout for all tests", nargs: 1, type: Number, default: 5000, group: "flow" },
                { name: "--skip", help: "tests to skip", nargs: 1, default: "", group: "flow" },

                { name: "--config", help: "a config path", nargs: 1, default: "shanifile.js", group: "config" },
                { name: "--tests", help: "tests path", nargs: 1, default: "tests/**/*.js", group: "config" },
                { name: "--dont-use-config", help: "dont use the config file", group: "config" },
                { name: "--dont-use-map", help: "dont use a custom test name mapping", group: "config" },

                { name: "--all-timings", help: "show all the timings", group: "output" },
                { name: "--timers", help: "show timers", group: "output" },
                { name: "--show-hooks", help: "show hook executing info", group: "output" },
                { name: "--dont-keep-hooks", help: "Dont keep hook info on the screen", group: "output" },
                { name: "--show-handles", help: "show handles holding the event loop", group: "output" },
                { name: "--no-ticks", help: "Don't show the test/hook/timers ticks.\nForced to be true if there is no TTY", group: "output" },
                { name: "--simple", help: "Use simple console reporter", group: "output" },
                { name: ["--minimal", "-m"], help: "Use minimal console reporter", group: "output" }
            ],
            handler: this.main,
            commands: [
                { name: "itself", help: "test itself", handler: this.testItself }
            ]
        });
        this.success = false;
        this.started = false;
    }

    async main(args, opts) {
        this.app._uncaughtException = (err) => {
            // adone.log("Uncaught exception", err.stack);
        };
        this.app._unhandledRejection = (err) => {
            // adone.log("Unhandled rejection", err.stack);
        };
        this.app.__rejectionHandled = adone.noop;

        const configPath = path.resolve(opts.get("config"));
        this.showHandles = opts.get("showHandles");
        const useConfig = !opts.get("dontUseConfig");
        let config = {};
        if (useConfig && await adone.fs.exists(configPath)) {
            config = adone.require(configPath);
            if (config.__esModule) {  // TODO: fix?
                config = config.default;
            }
        }

        config.options = config.options || {};

        for (const name of [
            "tests", "first", "timeout",
            "showHandles", "dontUseMap", "allTimings",
            "skip", "timers", "showHooks",
            "dontKeepHooks", "noTicks", "simple",
            "minimal"
        ]) {
            if (opts.has(name)) {
                config.options[name] = opts.get(name);
            }
        }
        const shaniOptions = {
            defaultTimeout: config.options.timeout,
            transpilerOptions: config.transpiler
        };
        const engine = new Engine(shaniOptions);
        const inclusive = args.get("tests");
        const exclusive = config.options.skip ? config.options.skip.split(",") : [];
        if (inclusive.length || exclusive.length) {
            let mapping;
            if (!config.options.dontUseMap && config.mapping) {
                mapping = async (x) => {
                    let res = await config.mapping(x);
                    if (!is.array(res)) {
                        res = [res];
                    }
                    return res;
                };
            } else {
                mapping = (x) => [path.resolve(x)];
            }
            for (const x of inclusive) {
                engine.include(...(await mapping(x)));
            }
            for (const x of exclusive) {
                engine.exclude(...(await mapping(x)));
            }
        }
        if (!inclusive.length) {
            let tests = is.array(config.options.tests) ? config.options.tests : [config.options.tests];
            const configDir = path.dirname(configPath);
            tests = tests.map((x) => path.resolve(configDir, x));
            engine.include(...tests);
        }

        adone.sourcemap.support(Error).install();

        const emitter = engine.start();

        let { options: { simple } } = config;

        if (process.stdin.isTTY && process.stdout.isTTY) {
            // TODO: fix this
            // trackCursor must not be called there,
            // but it doesnt work after enabling stdin raw mode (on("keypress") enables it)
            adone.terminal.trackCursor();
            adone.terminal.listen();
            adone.terminal.on("keypress", (ch, key) => {
                switch (key.full) {
                    case "C-q": {
                        // stop testing
                        emitter.stop();
                        break;
                    }
                    case "C-c": {
                        // immediate exit
                        process.exit(1);
                        break;
                    }
                }
            });
        } else {
            simple = true;
        }

        let reporter;

        const { options: { minimal } } = config;

        if (simple) {
            reporter = simpleReporter;
        } else if (minimal) {
            reporter = minimalReporter;
        } else {
            reporter = consoleReporter;
        }

        reporter({
            allTimings: config.options.allTimings,
            timers: config.options.timers,
            showHooks: config.options.showHooks,
            keepHooks: !config.options.dontKeepHooks,
            ticks: !config.options.noTicks
        })(emitter);

        let failed = false;
        const hookListener = (type) => ({ block, test = null, hook, meta: { err } = {} }) => {
            if (err) {
                failed = true;
                let msg = block.chain();
                if (test) {
                    msg = `${msg} - ${test.description}`;
                }
                adone.error(`${type}(${hook.description}) - ${msg}\n${err.message}\n${err.stack}`);
                emitter.stop();
            }
        };
        emitter
            .on("end test", ({ meta: { err } }) => {
                if (err) {
                    failed = true;
                    if (config.options.first) {
                        emitter.stop();
                    }
                }
            })
            .on("end before hook", hookListener("before"))
            .on("end after hook", hookListener("after"))
            .on("end before each hook", hookListener("beforeEach"))
            .on("end after each hook", hookListener("afterEach"))
            .on("error", () => {
                failed = true;
            })
            .on("reporterError", (err) => {
                adone.error("Reporter failed");
                adone.error(err);
                process.exit(1);
            });

        await new Promise((resolve) => emitter.once("done", resolve));
        if (failed) {
            return 1;
        }
        this.success = true;
        return 0;
    }

    async testItself() {
        const proc = adone.std.child_process.fork("libTests/glosses/shani/test.js", {
            stdio: "inherit"
        });
        const code = await new Promise((resolve) => {
            proc.once("exit", resolve);
        });
        return code;
    }
}
