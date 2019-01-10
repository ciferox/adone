require(process.argv[2]); // the main process passes adone's absolute path

adone.sourcemap.support(Error).install();

const {
    is,
    std: { path },
    shani: {
        Engine,
        consoleReporter,
        simpleReporter,
        minimalReporter
    },
    system,
    noop,
    runtime: { logger }
} = adone;

adone.app.runCli({
    async main() {
        this._uncaughtException = (err) => {
            // console.log("Uncaught exception", err.stack);
        };
        this._unhandledRejection = (err) => {
            // console.log("Unhandled rejection", err.stack);
        };
        this.__rejectionHandled = adone.noop;
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
            printCoverStats,
            root
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
            root,
            perProcess: config.options.perProcess,
            onlySlow: config.options.onlySlow,
            skipSlow: config.options.skipSlow,
            defaultTimeout: config.options.timeout,
            transpilerOptions: config.transpiler,
            callGc: config.options.callGc,
            dryRun: config.options.dryRun
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
            ticks: !config.options.noTicks,
            onlyStats: config.options.stats
        })(emitter);

        let failed = false;
        emitter
            .on("end test", ({ meta: { err } }) => {
                if (err) {
                    failed = true;
                    if (config.options.first) {
                        emitter.stop();
                    }
                }
            })
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
                logger.info("[coverage] no data can be shown");
            }
        }
        if (startCoverServer) {
            if (adone.js.coverage.hasStats()) {
                const port = startCoverServer;
                logger.info(`start http server with coverage stats at 127.0.0.1:${port}`);
                await adone.js.coverage.startHTTPServer(port);
                return;
            } else if (!printCoverStats) {
                logger.info("[coverage] no data can be shown");
            }
        }

        const children = await system.process.getChildPids(process.pid);

        await Promise.all(children.map(async ({ PID }) => {
            await system.process.kill(PID, { force: true, tree: false }).catch(noop);
        }));

        if (failed) {
            return 1;
        }
        return 0;
    }
}, true); // disable process.argv parsing
