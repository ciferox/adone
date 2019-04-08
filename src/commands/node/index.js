import {
    getNodePath,
    getCachePath,
    getNodeArchiveName,
    getActiveNodeVersion,
    checkNodeVersion,
    downloadIndex,
    downloadNode,
    unpackNode
} from "./helpers";

const {
    cli,
    error,
    fs,
    is,
    app: {
        Subsystem,
        command
    },
    semver,
    pretty,
    util,
    std
} = adone;
const { chalk, style, chalkify } = cli;

const activeStyle = chalkify("bold.underline.#388E3C", chalk);
const cachedStyle = chalkify("#388E3C", chalk);
const inactiveStyle = chalkify("white", chalk);

const IGNORE_FILES = ["LICENSE", "CHANGELOG.md", "README.md"];

export default class NodeCommand extends Subsystem {
    @command({
        name: ["list", "ls"],
        description: "Display Node.js releases",
        options: [
            {
                name: ["--all", "-A"],
                description: "Show all versions instead of supported"
            },
            {
                name: ["--date", "-D"],
                description: "Show release date"
            }
        ]
    })
    async list(args, opts) {
        try {
            cli.updateProgress({
                message: `downloading ${style.accent("index.json")}`
            });
            const indexJson = await downloadIndex();

            const options = opts.getAll();

            const items = indexJson.filter((item) => options.all
                ? true
                : semver.satisfies(item.version.substr(1), adone.package.engines.node, false));

            const activeVersion = await getActiveNodeVersion();

            const cachedVersions = (await fs.readdir(await getCachePath())).map((f) => /^node-(v\d+\.\d+\.\d+)-.+/.exec(f)[1]);

            // cachedVersions
            const styledItem = (item) => {
                const isCurrent = item.version === activeVersion;

                if (isCurrent) {
                    return `${adone.text.unicode.symbol.bullet} ${`${activeStyle(item.version)}`}`;
                } else if (cachedVersions.includes(item.version)) {
                    return `  ${cachedStyle(item.version)}`;
                }
                return `  ${inactiveStyle(item.version)}`;
            }
            

            const model = [
                {
                    id: "version",
                    handle: (item) => `${styledItem(item)}${item.lts ? chalk.grey(" (LTS)") : ""}`
                }
            ];

            if (options.date) {
                model.push({
                    id: "date",
                    width: 12,
                    align: "right",
                    handle: (item) => chalk.grey(item.date)
                });
            }

            cli.updateProgress({
                message: "done",
                clean: true,
                status: true
            });

            console.log(pretty.table(items, {
                borderless: true,
                noHeader: true,
                style: {
                    head: null,
                    "padding-left": 1,
                    compact: true
                },
                model
            }));

            return 0;
        } catch (err) {
            // console.log(pretty.error(err));
            cli.updateProgress({
                message: err.message,
                status: false
            });
            return 1;
        }
    }

    @command({
        name: ["download", "get"],
        description: "Download Node.js of the specified version",
        arguments: [
            {
                name: "version",
                type: String,
                default: "latest",
                description: "Node.js version ('latest', 'latest-lts', '11.0.0', 'v10.15.3', ...)"
            }
        ],
        options: [
            {
                name: ["--force", "-F"],
                description: "Force download"
            },
            {
                name: ["--out", "-O"],
                type: String,
                description: "Output path"
            }
        ]
    })
    async download(args, opts) {
        try {
            cli.updateProgress({
                message: "checking version"
            });

            const version = await checkNodeVersion(args.get("version"));

            cli.updateProgress({
                schema: `downloading ${style.primary(version)} [:bar] :current/:total :percent`
            });

            const savedPath = await downloadNode({
                version,
                outPath: opts.get("out"),
                force: opts.get("force"),
                progressBar: cli.progressBar
            });

            cli.updateProgress({
                message: `Saved to ${style.accent(savedPath)}`,
                status: true
            });

            return 0;
        } catch (err) {
            // console.log(pretty.error(err));
            cli.updateProgress({
                message: err.message,
                status: false
            });
            return 1;
        }
    }

    @command({
        name: "activate",
        description: "Activate Node.js of the specified version",
        arguments: [
            {
                name: "version",
                type: String,
                default: "latest",
                description: "Node.js version ('latest', 'latest-lts', '11.0.0', 'v10.15.3', ...)"
            }
        ],
        options: [
            {
                name: ["--force", "-F"],
                description: "Force download"
            },
            {
                name: ["--out", "-O"],
                type: String,
                description: "Output path"
            }
        ]
    })
    async activate(args, opts) {
        try {
            cli.updateProgress({
                message: "checking version"
            });

            const version = await checkNodeVersion(args.get("version"));
            const activeVersion = await getActiveNodeVersion();

            if (version === activeVersion) {
                cli.updateProgress({
                    message: `Node.js ${style.primary(version)} is active`,
                    status: true
                });
            } else {
                cli.updateProgress({
                    message: "waiting"
                });

                const [cachedPath, activeCachedPath] = await Promise.all([
                    this.#downloadIfNotExists({ version }),
                    this.#downloadIfNotExists({ version: activeVersion })
                ]);

                cli.updateProgress({
                    message: `unpacking ${style.accent(getNodeArchiveName({ version }))}`
                });
                const unpackedPath = await unpackNode({ version });

                cli.updateProgress({
                    message: `unpacking ${style.accent(getNodeArchiveName({ version: activeVersion }))}`
                });
                const unpackedActivePath = await unpackNode({ version: activeVersion });


                const delFiles = (await fs.readdirp(unpackedActivePath, {
                    directories: false
                })).map((info) => info.path).filter((p) => !IGNORE_FILES.includes(p));
                await fs.rm(std.path.dirname(unpackedActivePath));

                cli.updateProgress({
                    message: "deleting previous files"
                });

                const basePath = std.path.dirname(std.path.dirname(await getNodePath()));
                for (const file of delFiles) {
                    try {
                        await fs.unlink(std.path.join(basePath, file));
                    } catch (err) {
                        // ignore
                    }
                }

                cli.updateProgress({
                    message: "copying files"
                });
                await fs.copy(unpackedPath, basePath, {
                    filter: (src, item) => !IGNORE_FILES.includes(item)
                });

                await fs.rm(std.path.dirname(unpackedPath));

                cli.updateProgress({
                    message: `Node.js ${style.primary(version)} successfully activated`,
                    status: true
                });
            }

            return 0;
        } catch (err) {
            // console.log(pretty.error(err));
            cli.updateProgress({
                message: err.message,
                status: false
            });
            return 1;
        }
    }

    async #downloadIfNotExists({ version } = {}) {
        let cachedPath = await getCachePath({ version });
        if (!(await fs.exists(cachedPath))) {
            const progressBar = new cli.Progress({
                clean: true,
                schema: `downloading ${style.primary(version)} [:bar] :current/:total :percent`
            });
            progressBar.update(0);

            cachedPath = await downloadNode({
                version,
                progressBar
            });
        }

        return cachedPath;
    }
}
