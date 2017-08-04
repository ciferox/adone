import adone from "adone";

const { is, std: { path }, shani: { Engine, consoleReporter, simpleReporter, minimalReporter } } = adone;

adone.run({
    async main() {
        this.app._uncaughtException = (err) => {
            // adone.log("Uncaught exception", err.stack);
        };
        this.app._unhandledRejection = (err) => {
            // adone.log("Unhandled rejection", err.stack);
        };
        this.app.__rejectionHandled = adone.noop;
        const p = new Promise((resolve) => {
            process.once("message", resolve);
        });
        process.send("ready");
        const {
            useConfig,
            configPath,
            configOptions,
            inclusive,
            startCoverServer,
            printCoverStats
        } = await p;

        let config = {};
        if (useConfig && await adone.fs.exists(configPath)) {
            config = adone.require(configPath);
            if (config.__esModule) { // TODO: fix?
                config = config.default;
            }
        }

        config.options = config.options || {};
        config.options = { ...config.options, ...configOptions };
        const shaniOptions = {
            defaultTimeout: config.options.timeout,
            transpilerOptions: config.transpiler,
            callGc: config.options.callGc
        };
        const engine = new Engine(shaniOptions);
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

        if (!process.stdin.isTTY || !process.stdout.isTTY) {
            simple = true;
        }

        process.on("message", (msg) => {
            if (msg === "stop") {
                emitter.stop();
            }
        });

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
            .on("end before test hook", hookListener("beforeTest"))
            .on("end after each hook", hookListener("afterEach"))
            .on("end after test hook", hookListener("afterTest"))
            .on("error", () => {
                failed = true;
            })
            .on("reporterError", (err) => {
                adone.error("Reporter failed");
                adone.error(err);
                process.exit(1);
            });

        await new Promise((resolve) => emitter.once("done", resolve));
        if (printCoverStats) {
            if (adone.js.coverage.hasStats()) {
                const filter = is.string(printCoverStats) && printCoverStats;
                adone.js.coverage.printTable(filter && new RegExp(filter));
            } else {
                adone.info("[coverage] no data can be shown");
            }
        }
        if (startCoverServer) {
            if (adone.js.coverage.hasStats()) {
                const port = startCoverServer;
                adone.info(`start http server with coverage stats at 127.0.0.1:${port}`);
                await adone.js.coverage.startHTTPServer(port);
                return;
            } else if (!printCoverStats) {
                adone.info("[coverage] no data can be shown");
            }
        }
        if (failed) {
            return 1;
        }
        return 0;
    }
});
