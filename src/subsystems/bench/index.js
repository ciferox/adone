const { is, std } = adone;

const formatNumber = (number) => {
    number = String(number).split(".");
    return number[0].replace(/(?=(?:\d{3})+$)(?!\b)/g, ",") + (number[1] ? `.${number[1]}` : "");
};

export default class extends adone.application.Subsystem {
    initialize() {
        this.defineCommand({
            arguments: [
                { name: "script", help: "path to script with suites", nargs: "?", default: "index.js" }
            ],
            options: [
                { name: "--async", help: "run suites asynchronously" },
                {
                    name: "--version",
                    help: "show version of vendor's benchmarking code",
                    handler: () => {
                        adone.log(adone.vendor.Benchmark.version);
                        return 0;
                    }
                },
                {
                    name: "--db",
                    holder: "PATH",
                    nargs: 1,
                    help: "use database to compare results"
                },
                {
                    name: "--init-count",
                    holder: "N",
                    help: "The default number of times to execute a test on a benchmark’s first cycle",
                    type: Number
                },
                {
                    name: "--max-time",
                    holder: "N",
                    help: "The maximum time a benchmark is allowed to run before finishing (secs)",
                    type: Number
                },
                {
                    name: "--min-time",
                    holder: "N",
                    help: "The time needed to reduce the percent uncertainty of measurement to 1% (secs)",
                    type: Number
                },
                {
                    name: "--min-samples",
                    holder: "N",
                    help: "The minimum sample size required to perform statistical analysis",
                    type: Number
                },
                {
                    name: "--defer",
                    help: "A flag to indicate that the benchmark clock is deferred"
                },
                {
                    name: "--suite",
                    nargs: 1,
                    help: "A regexp to filter suites"
                }
            ],
            handler: this.bench
        });
    }

    async bench(args, opts) {
        let scriptPath = args.get("script");
        if (!std.path.isAbsolute(scriptPath)) {
            scriptPath = std.path.resolve(process.cwd(), scriptPath);
        }

        const benchModule = adone.require(scriptPath);

        this._.filename = std.path.basename(scriptPath, ".js");
        this._.async = Boolean(opts.get("async"));

        adone.log(`File: '${scriptPath}'`);
        adone.log(`System: '${adone.metrics.system.toString()}'`);
        adone.log(`Options: async=${this._.async}`);
        adone.log();

        if (is.function(benchModule.init)) {
            adone.log("Initializing...");
            await benchModule.init();
            adone.log();
        }

        const { terminal } = adone;

        const formatEventMessage = (event, oldResult) => {
            const { target } = event;

            const size = target.stats.sample.length;
            let message = `> ${formatNumber(target.hz.toFixed(target.hz < 100 ? 2 : 0))}`;
            if (oldResult) {
                const diff = target.hz - oldResult[target.name].hz;
                const percent = (diff / oldResult[target.name].hz * 100).toFixed(2);
                if (diff >= 0) {
                    message += terminal.parse(` ({#4CAF50-fg}+${formatNumber(diff.toFixed(diff < 100 ? 2 : 0))} : +${percent}%{/})`);
                } else {
                    message += terminal.parse(` ({#F44336-fg}${formatNumber(diff.toFixed(diff > -100 ? 2 : 0))} : ${percent}%{/})`);
                }
            }
            message += ` ops/sec ±${target.stats.rme.toFixed(2)}% (${size} run${size === 1 ? "" : "s"} sampled)`;
            if (oldResult) {
                const diff = target.stats.sample.length - oldResult[target.name].sampleLength;
                if (diff >= 0) {
                    message += terminal.parse(` ({#4CAF50-fg}+${diff}{/})`);
                } else {
                    message += terminal.parse(` ({#F44336-fg}${diff}{/})`);
                }
            }
            return `${message} : ${target.name}`;
        };

        const defaultOptions = {
            defer: opts.get("defer"),
            onCycle: (event) => {
                terminal.column(0);
                terminal.eraseLine();
                terminal.write(`${formatEventMessage(event)}`);
            },
            onComplete: () => {
                terminal.column(0);
                terminal.eraseLine();
            }
        };

        for (const key of ["minSamples", "minTime", "maxTime", "initCount"]) {
            if (opts.has(key)) {
                defaultOptions[key] = opts.get(key);
            }
        }

        let suites;

        if (is.object(benchModule.default)) {
            suites = benchModule.default;
        } else if (is.object(benchModule.suites)) {
            suites = benchModule.suites;
        }

        const dbPath = opts.get("db");
        const db = dbPath ? new adone.database.local.Datastore({
            filename: dbPath
        }) : null;

        if (db) {
            await db.load();
        }

        suites = this._getSuites(suites, defaultOptions);

        if (opts.has("suite")) {
            const re = new RegExp(opts.get("suite"));
            suites = suites.filter((x) => re.test(x.name));
        }

        for (const suite of suites) {
            terminal.print(`Suite: ${suite.name}\n`);
            const result = {};
            let oldResult = db ? await db.findOne({ name: suite.name }) : null;  // eslint-disable-line
            if (oldResult) {
                oldResult = oldResult.result;
            }
            await new Promise((resolve, reject) => {  // eslint-disable-line
                suite
                    .on("error", reject)
                    .on("cycle", (event) => {
                        const { target } = event;

                        result[target.name] = {
                            hz: target.hz,
                            sampleLength: target.stats.sample.length
                        };
                        terminal.write(`${formatEventMessage(event, oldResult)}\n`);
                    })
                    .on("complete", function onComplete() {
                        adone.log(`Fastest is ${this.filter("fastest").map("name")}`);
                        adone.log();
                        resolve();
                    })
                    .run({ async: this._.async });
            });
            if (db && !oldResult) {
                await db.insert({ name: suite.name, result });  // eslint-disable-line
            }
        }
        return 0;
    }

    _getSuites(funcs, defaultOptions, suiteName = this._.filename) {
        const suites = [];
        const suite = new adone.vendor.Benchmark.Suite(suiteName);
        for (const [name, fn] of adone.util.entries(funcs)) {
            if (is.function(fn)) {
                suite.add(name, fn, defaultOptions);
            } else if (is.array(fn)) {
                suite.add(name, fn[0], adone.o(defaultOptions, fn[1]));
            } else if (is.object(fn)) {
                suites.push(...this._getSuites(fn, defaultOptions, `${suiteName} - ${name}`));
            }
        }
        if (suite.length) {
            suites.unshift(suite);
        }
        return suites;
    }
}
