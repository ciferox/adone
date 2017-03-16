#!/usr/bin/env node

import adone from "adone";

const { shani: { Engine, consoleReporter } } = adone;

const { is, std: { path } } = adone;

export class ShaniCLI extends adone.Application {

    initialize() {
        this.defineArguments({
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
                { name: "--no-ticks", help: "Don't show the test/hook/timers ticks.\nForced to be true if there is no TTY", group: "output" }
            ],
            commands: [
                { name: "itself", help: "test itself", handler: this.testItself }
            ]
        });
        this.success = false;
    }

    async main(args, opts) {
        const configPath = path.resolve(opts.get("config"));
        this.showHandles = opts.get("showHandles");
        const useConfig = !opts.get("dontUseConfig");
        let config = {};
        if (useConfig && await adone.fs.exists(configPath)) {
            config = require(configPath) || {};
        }

        config.options = config.options || {};

        for (const name of ["tests", "first", "timeout", "showHandles", "dontUseMap", "allTimings", "skip", "timers", "showHooks", "dontKeepHooks", "noTicks"]) {
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
                const configDir = path.dirname(configPath);
                mapping = async (x) => {
                    let res = await config.mapping(x);
                    if (!is.array(res)) {
                        res = [res];
                    }
                    return res.map((x) => path.resolve(configDir, x));
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

        const emitter = engine.start();

        if (adone.terminal.input.isTTY) {
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
        }

        consoleReporter({
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
                console.error(`${type}(${hook.description}) - ${msg}\n${err.message}\n${err.stack}`);
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
            });

        await new Promise((resolve) => emitter.once("done", resolve));
        if (failed) {
            await this.exit(1);
        }
        this.success = true;
        if (adone.terminal.input.isTTY) {
            adone.terminal.destroy();
        }
        await this.exit(0);
    }

    async testItself() {
        const proc = adone.std.child_process.fork("libTests/glosses/shani/test.js", {
            stdio: "inherit"
        });
        const code = await new Promise((resolve) => {
            proc.once("exit", resolve);
        });
        return this.exit(code);
    }

    async uninitialize() {
        if (this.success) {
            let _immediate;
            await new Promise((resolve) => {
                // to resolve all the timers
                _immediate = setImmediate(resolve);
            });
            const handles = process._getActiveHandles().filter((x) => {
                return ![process.stdin, process.stdout, process.stderr, _immediate].includes(x);
            });
            if (handles.length) {
                if (this.showHandles) {
                    for (const [idx, handle] of adone.util.enumerate(handles, 1)) {
                        adone.log(`${idx}) ${adone.std.util.inspect(handle)}`);
                    }
                }
                // wait for resolving all the handles
                await new Promise((resolve) => process.on("beforeExit", () => resolve()));
            }
        }
    }

    _unhandledRejection(reason) {
        adone.error("unhandledRejection");
        adone.error(reason.stack || reason.message || reason);
    }

    async _rejectionHandled(p) {
        adone.error("rejectionHandled");
        const e = await p.catch((e) => e);
        adone.error(e.stack || e.message || e);
    }
}

if (require.main === module) {
    new ShaniCLI().run().catch((e) => {
        console.error(e.stack || e.message || e);
    });
}
