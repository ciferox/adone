#!/usr/bin/env node

import adone from "adone";

const {
    is,
    std,
    application
} = adone;

export default class AdoneCLI extends application.Application {
    async initialize() {
        // Loading cli configuration
        await this.loadConfig("cli", {
            defaults: true,
            userDefined: true
        });

        this.defineArguments({
            commandsGroups: this.config.cli.groups,
            arguments: [
                {
                    name: "path",
                    default: "index.js",
                    help: "run [es6] script/adone compact application"
                }
            ],
            options: [
                {
                    name: "--sourcemaps",
                    help: "force enable sourcemaps support"
                }
            ],
            commands: [
                {
                    name: "config",
                    help: "configurations management",
                    arguments: [
                        {
                            name: "path",
                            help: "path to config file"
                        }
                    ],
                    options: [
                        {
                            name: "--convert",
                            help: "convert config from one format to another"
                        },
                        {
                            name: "--out",
                            type: String,
                            help: "output path for config"
                        },
                        {
                            name: "--format",
                            help: "type of format",
                            choices: ["json", "bson", "mpak", "json5"],
                            default: "json"
                        },
                        {
                            name: "--style",
                            choices: ["none", "color", "html"],
                            default: "color",
                            help: "output style"
                        },
                        {
                            name: "--depth",
                            type: Number,
                            help: "depth of nested objects",
                            default: 8
                        },
                        {
                            name: "--types",
                            help: "do not display types and constructors"
                        }
                    ],
                    handler: this.configCommand
                },
                {
                    name: "sloc",
                    help: "print stats of a source code",
                    arguments: [{ name: "paths", holder: "p", nargs: "+", help: "path to a script" }],
                    options: [
                        { name: "--format", choices: ["raw", "json", "table"], default: "raw", help: "output format", nargs: 1 },
                        { name: "--exts", holder: "e", help: "process files matching an extension", nargs: "+", default: ["js"] }
                    ],
                    handler: this.slocCommand
                }
            ]
        });

        for (const ss of this.config.cli.subsystems) {
            this.lazyLoadSubsystem(ss);
        }
    }

    uninitialize() {
    }

    async main(args, opts, { rest }) {
        let scriptPath = args.get("path");
        if (!std.path.isAbsolute(scriptPath)) {
            scriptPath = std.path.resolve(process.cwd(), scriptPath);
        }

        adone.__argv__ = [process.argv[0], scriptPath, ...rest];

        if (opts.get("sourcemaps")) {
            adone.sourcemap.support(Error).install();
        }

        adone.require(scriptPath);
    }

    async configCommand(args, opts) {
        const config = new adone.configuration.FileConfiguration();
        await config.load(args.get("path"), "__");
        adone.log(adone.meta.inspect(config.__, { style: opts.get("style"), depth: opts.get("depth"), noType: !opts.get("types"), noDescriptor: true, enumOnly: true, proto: false, funcDetails: false }));

        const outPath = opts.get("out");
        if (is.string(outPath)) {
            const ext = std.path.extname(outPath);
            const options = {

            };

            if (ext === ".json") {
                options.space = 4;
            }
            await config.save(outPath, "__", options);
            adone.log(`\nConfiguration saved to ${outPath}!`);
        }
        return 0;
    }

    async slocCommand(args, opts) {
        let paths = args.get("paths");
        const exts = opts.get("exts");

        const oldPaths = paths;
        paths = [];
        for (let i = 0; i < oldPaths.length; ++i) {
            // eslint-disable-next-line
            if (!await adone.fs.exists(oldPaths[i])) {
                adone.error(`No such file or directory: '${oldPaths[i]}'`);
                return this.exit(1);
            }

            // eslint-disable-next-line
            if (await adone.fs.is.directory(oldPaths[i])) {
                paths.push(std.path.join(oldPaths[i], "**/*"));
            } else {
                paths.push(oldPaths[i]);
                const fileExt = std.path.extname(oldPaths[i]).replace(".", "");
                if (!exts.includes(fileExt)) {
                    exts.push(fileExt);
                }
            }
        }

        const stats = {};
        for (const ext of exts) {
            stats[ext] = {
                total: 0,
                source: 0,
                comment: 0,
                single: 0,
                block: 0,
                mixed: 0,
                empty: 0,
                todo: 0
            };
        }

        let filesCount = 0;

        const search = adone.fs.glob(paths, { nodir: true }).map((path) => {
            const fileExt = std.path.extname(path).replace(".", "");
            if (exts.includes(fileExt)) {
                return {
                    ext: fileExt,
                    path
                };
            }
            return null;
        }).map(async (file) => {
            if (file) {
                const code = (await adone.fs.readFile(file.path)).toString();
                const fileStats = adone.metrics.sloc(code, file.ext);
                for (const key of adone.util.keys(fileStats)) {
                    stats[file.ext][key] += fileStats[key];
                }

                ++filesCount;
            }
        }).each(adone.noop);

        return new Promise((resolve) => {
            search.on("end", () => {
                if (exts.length > 1) {
                    const total = {
                        total: 0,
                        source: 0,
                        comment: 0,
                        single: 0,
                        block: 0,
                        mixed: 0,
                        empty: 0,
                        todo: 0
                    };

                    for (const ext of exts) {
                        for (const key of adone.util.keys(stats[ext])) {
                            total[key] += stats[ext][key];
                        }
                    }

                    stats.total = total;
                    exts.push("total");
                }

                const titles = {
                    total: "Physical",
                    source: "Source",
                    comment: "Comment",
                    single: "Single-line comment",
                    block: "Block comment",
                    mixed: "Mixed",
                    empty: "Empty",
                    todo: "TODO"
                };

                switch (opts.get("format")) {
                    case "raw": {
                        for (const ext of exts) {
                            adone.log(`${ext.toUpperCase()}:`);
                            for (const key of adone.util.keys(stats[ext])) {
                                adone.log(adone.sprintf(
                                    "%20s : %d",
                                    titles[key],
                                    stats[ext][key]
                                ));
                            }
                        }
                        adone.log(`\nNumber of files read : ${filesCount}`);
                        // adone.log(adone.meta.inspect({minimal: true}, stats));
                        // adone.log(adone.meta.inspect({minimal: true}, total));
                        break;
                    }
                    case "json": {
                        adone.log(JSON.stringify(stats));
                        break;
                    }
                    case "table": {
                        const table = new adone.text.Table();
                        const header = ["Extention"];
                        for (const key of adone.util.keys(titles)) {
                            header.push(titles[key]);
                        }
                        table.push(header);
                        for (const ext of exts) {
                            const row = [ext.toUpperCase()];
                            for (const key of adone.util.keys(stats[ext])) {
                                row.push(stats[ext][key]);
                            }
                            table.push(row);
                        }
                        adone.log(table.toString());
                        break;
                    }
                }
                resolve();
            });
        });
    }
}

if (require.main === module) {
    application.run(AdoneCLI);
}
