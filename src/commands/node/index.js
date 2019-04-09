const {
    cli,
    fs,
    app: {
        Subsystem,
        command
    },
    nodejs,
    semver,
    pretty,
    std
} = adone;
const { chalk, style, chalkify } = cli;

const activeStyle = chalkify("bold.underline.#388E3C", chalk);
const cachedStyle = chalkify("#388E3C", chalk);
const inactiveStyle = chalkify("white", chalk);

const IGNORE_FILES = ["LICENSE", "CHANGELOG.md", "README.md"];

export default class NodeCommand extends Subsystem {
    onConfigure() {
        this.nodejsManager = new nodejs.NodejsManager();
    }

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
            const indexJson = await nodejs.getReleases();

            const options = opts.getAll();

            const items = indexJson.filter((item) => options.all
                ? true
                : semver.satisfies(item.version.substr(1), adone.package.engines.node, false));

            const currentVersion = await nodejs.getCurrentVersion();
            const downloadedVersions = await this.nodejsManager.getDownloadedVersions();

            // cachedVersions
            const styledItem = (item) => {
                const isCurrent = item.version === currentVersion;

                if (isCurrent) {
                    return `${adone.text.unicode.symbol.bullet} ${`${activeStyle(item.version)}`}`;
                } else if (downloadedVersions.includes(item.version)) {
                    return `  ${cachedStyle(item.version)}`;
                }
                return `  ${inactiveStyle(item.version)}`;
            };

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

            const version = await nodejs.checkVersion(args.get("version"));

            cli.updateProgress({
                message: "waiting"
            });

            const result = await this.nodejsManager.download({
                version,
                outPath: opts.get("out"),
                force: opts.get("force"),
                progressBar: true
            });

            if (result.downloaded) {
                cli.updateProgress({
                    message: `Saved to ${style.accent(result.path)}`,
                    status: true
                });
            } else { 
                cli.updateProgress({
                    message: `Already downloaded: ${style.accent(result.path)}`,
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
            }
        ]
    })
    async activate(args, opts) {
        try {
            cli.updateProgress({
                message: "checking version"
            });

            const version = await nodejs.checkVersion(args.get("version"));
            const currentVersion = await nodejs.getCurrentVersion();
            const prefixPath = await nodejs.getPrefixPath();

            if (version === currentVersion) {
                cli.updateProgress({
                    message: `Node.js ${style.primary(version)} is active`,
                    status: true
                });
            } else {
                cli.updateProgress({
                    message: "waiting"
                });

                await this.nodejsManager.download({
                    version,
                    progressBar: true
                });

                cli.updateProgress({
                    message: `unpacking ${style.accent(nodejs.getArchiveName({ version }))}`
                });
                const unpackedPath = await this.nodejsManager.unpack({ version });

                cli.updateProgress({
                    message: "deleting previous files"
                });
                await this.nodejsManager.deleteCurrent();

                cli.updateProgress({
                    message: "copying new files"
                });
                
                await fs.copy(unpackedPath, prefixPath, {
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
}
