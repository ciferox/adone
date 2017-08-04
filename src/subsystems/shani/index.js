const { shani: { Engine, consoleReporter, simpleReporter, minimalReporter }, is, std: { path, child_process: cp } } = adone;

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
                { name: "config", description: "Configuring" },
                { name: "coverage", description: "Coverage" }
            ],
            options: [
                { name: "--first", help: "exit if some test fails", group: "flow" },
                { name: "--timeout", help: "default timeout for all tests", nargs: 1, type: Number, default: 5000, group: "flow" },
                { name: "--skip", help: "tests to skip", nargs: 1, default: "", group: "flow" },
                { name: "--call-gc", help: "call gc after file processing", group: "flow" },

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
                { name: ["--minimal", "-m"], help: "Use minimal console reporter", group: "output" },

                { name: "--print-cover-stats", nargs: "?", holder: "FILTER", help: "Print cover stats if exists", group: "coverage" },
                { name: "--start-cover-server", nargs: "?", holder: "PORT", default: 9111, type: Number, help: "Start http server to analyse coverage if exists", group: "coverage" },
            ],
            handler: this.main,
            commands: [
                { name: "itself", help: "test itself", handler: this.testItself }
            ]
        });
    }

    async main(args, opts) {
        const configPath = path.resolve(opts.get("config"));
        const useConfig = !opts.get("dontUseConfig");

        const configOptions = {};

        for (const name of [
            "tests", "first", "timeout",
            "showHandles", "dontUseMap", "allTimings",
            "skip", "timers", "showHooks",
            "dontKeepHooks", "noTicks", "simple",
            "minimal", "callGc"
        ]) {
            if (opts.has(name)) {
                configOptions[name] = opts.get(name);
            }
        }
        const inclusive = args.get("tests");

        const proc = cp.fork(path.resolve(__dirname, "runner.js"), {
            stdio: ["inherit", "inherit", "inherit", "ipc"],
            execArgv: ["--expose-gc"]
        });

        await new Promise((resolve) => proc.once("message", resolve));
        proc.send({
            useConfig,
            configPath,
            configOptions,
            inclusive,
            startCoverServer: opts.has("start-cover-server") && opts.get("start-cover-server"),
            printCoverStats: opts.has("print-cover-stats") && opts.get("print-cover-stats")
        });

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
                        proc.send("stop");
                        break;
                    }
                    case "C-c": {
                        // immediate exit
                        proc.kill("SIGKILL");
                        break;
                    }
                }
            });
        }


        const [code, signal] = await new Promise((resolve) => proc.once("exit", (code, signal) => {
            resolve([code, signal]);
        }));

        if (code !== 0) {
            if (signal) {
                adone.info(`Died due to ${signal}`);
            }
            return 1;
        }

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
