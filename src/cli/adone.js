#!/usr/bin/env node

import "adone";

const {
    is,
    std,
    app,
    runtime: { term }
} = adone;

const {
    ApplicationMeta,
    CommandMeta
} = app;

const command = (name) => std.path.join(__dirname, "..", "lib", "cli", "commands", name);

@ApplicationMeta({
    subsystems: [
        {
            name: "run",
            group: "cli",
            description: "Run application/script/code",
            subsystem: command("run")
        },
        {
            name: "link",
            group: "cli",
            description: "Adone cli link management",
            subsystem: command("link")
        },
        {
            name: "realm",
            group: "realm",
            description: "Realm management",
            subsystem: command("realm")
        },
        {
            name: "info",
            group: "cli",
            description: "Show available information about object you wish",
            subsystem: command("info")
        },
        {
            name: "inspect",
            group: "dev",
            description: "Inspect adone namespace/object",
            subsystem: command("inspect")
        },
        {
            name: "project",
            group: "dev",
            description: "Project management/scaffolding",
            subsystem: command("project")
        },
        {
            name: "bench",
            group: "dev",
            description: "Benchmarking",
            subsystem: command("bench")
        },
        {
            name: "shani",
            group: "dev",
            description: "Test framework",
            subsystem: command("shani")
        },
        {
            name: "cmake",
            group: "dev",
            description: "CMake build system",
            subsystem: command("cmake")
        }
    ]
})
class AdoneCLI extends app.Application {
    async configure() {
        !is.windows && this.exitOnSignal("SIGINT");

        this.config = await adone.cli.Configuration.load();

        this._configureLogger();

        // Expose cli interface for subsystems.
        // this.exposeCliInterface();

        // Add cli kit as a subsystem
        // this.addSubsystem({
        //     name: "kit",
        //     bind: true,
        //     subsystem: adone.cli.kit
        // });

        // Define command groups.
        const groups = this.config.getGroups();
        for (const group of groups) {
            this.helper.defineCommandsGroup(group);
        }

        await this._addInstalledSubsystems();
    }

    main() {
        // print usage message by default
        console.log(`${this.helper.getHelpMessage()}\n`);
        return app.EXIT_SUCCESS;
    }

    _configureLogger() {
        const {
            app: { logger: { format } },
            terminal: { chalk }
        } = adone;

        adone.runtime.logger.configure({
            level: "verbose",
            format: format.combine(
                format.colorize({
                    config: adone.app.logger.config.adone
                }),
                format.padLevels(),
                format.printf((info) => {
                    let result = "";
                    if (is.string(info.prefix)) {
                        result += `[${info.prefix}] `;
                    }
                    if (is.string(info.icon)) {
                        result += `${info.icon}  `;
                    }
                    result += `${chalk.underline(info.level)}${info.message}`;
                    return result;
                })
            ),
            transports: [
                new adone.app.logger.transport.Console()
            ]
        });
    }

    async _addInstalledSubsystems() {
        const commands = this.config.getCommands();
        for (const ss of commands) {
            // eslint-disable-next-line
            await this.helper.defineCommandFromSubsystem({
                ...adone.util.omit(ss, "name"),
                name: [ss.name, ...adone.util.arrify(ss.aliases)],
                lazily: true
            });
        }
    }

    @CommandMeta({
        name: "install",
        group: "realm",
        help: "Install adone glosses, extensions, subsystems, applications, etc.",
        arguments: [
            {
                name: "name",
                type: String,
                required: true,
                help: "Full name or absolute path to local project"
            }
        ],
        options: [
            {
                name: "--symlink",
                help: "Create symlink to project instead of install it (for local projects)"
            },
            {
                name: "--build",
                help: "Rebuild project before install"
            }
        ]
    })
    async installCommand(args, opts) {
        try {
            const realmManager = await adone.realm.getManager();
            adone.cli.kit.observe("progress", realmManager);
            const observer = await realmManager.install({
                name: args.get("name"),
                symlink: opts.has("symlink"),
                build: opts.has("build")
            });
            await observer.result;

            return 0;
        } catch (err) {
            // adone.logError(err);
            return 1;
        }
    }

    @CommandMeta({
        name: "uninstall",
        group: "realm",
        help: "Uninstall adone glosses, extensions, applications, etc.",
        arguments: [
            {
                name: "name",
                type: String,
                required: true,
                help: "Full name or absolute path to local project"
            }
        ]
    })
    async uninstallCommand(args) {
        try {
            const realmManager = await adone.realm.getManager();
            adone.cli.kit.observe("progress", realmManager);
            const observer = await realmManager.uninstall({
                name: args.get("name")
            });
            await observer.result;

            return 0;
        } catch (err) {
            // adone.logError(err);
            return 1;
        }
    }

    @CommandMeta({
        name: "mount",
        group: "realm",
        help: "Mount new namespace to 'adone.dev'",
        arguments: [
            {
                name: "name",
                type: String,
                required: true,
                help: "Namespace name"
            },
            {
                name: "path",
                type: String,
                required: true,
                help: "Path to namespace implementation"
            }
        ]
    })
    async mountCommand(args) {
        try {
            const realmManager = await adone.realm.getManager();
            adone.cli.kit.observe("progress", realmManager);
            const observer = await realmManager.mount({
                name: args.get("name"),
                path: args.get("path")
            });
            await observer.result;

            return 0;
        } catch (err) {
            // term.print(`{red-fg}${err.message}{/}`);
            return 1;
        }
    }

    @CommandMeta({
        name: "unmount",
        group: "realm",
        help: "Unmount namespace from 'adone.dev'",
        arguments: [
            {
                name: "name",
                type: String,
                required: true,
                help: "Namespace name"
            }
        ]
    })
    async unmountCommand(args) {
        try {
            const realmManager = await adone.realm.getManager();
            adone.cli.kit.observe("progress", realmManager);
            const observer = await realmManager.unmount({
                name: args.get("name")
            });
            await observer.result;

            return 0;
        } catch (err) {
            // term.print(`{red-fg}${err.message}{/}`);
            return 1;
        }
    }

    @CommandMeta({
        name: "list",
        group: "realm",
        help: "List installed packages",
        arguments: [
            {
                name: "keyword",
                type: String,
                default: "",
                help: "Name or keyword for searching"
            }
        ]
    })
    async listCommand(args) {
        try {
            const realmManager = await adone.realm.getManager();
            adone.cli.kit.observe("progress", realmManager);
            const observer = await realmManager.list({
                keyword: args.get("keyword")
            });
            const result = await observer.result;

            if (result.length > 0) {
                console.log(adone.pretty.table(result, {
                    borderless: true,
                    noHeader: true,
                    style: {
                        head: null,
                        compact: true
                    },
                    model: [
                        {
                            id: "name",
                            header: "Package",
                            handle: (item) => {
                                const color = item.isValid ? "{green-fg}" : "{red-fg}";
                                const version = is.undefined(item.version) ? "" : ` ${item.version}`;
                                const description = is.undefined(item.description) ? "" : ` {grey-fg}- ${item.description}{/grey-fg}`;
                                const invalid = item.isValid ? "" : `{red-fg} (${item.errInfo}){/red-fg}`;
                                const symlink = item.isSymlink ? " {yellow-fg}(symlink){/yellow-fg}" : "";

                                return `${color}{bold}${item.name}{/bold}${version}{/}${symlink}${description}${invalid}`;
                            }
                        }
                    ]
                }));
            } else {
                term.print("{white-fg}No packages{/}\n");
            }

            return 0;
        } catch (err) {
            // console.log(err);
            term.print(`{red-fg}${err.message}{/}\n`);
            return 1;
        }
    }

    @CommandMeta({
        name: "config",
        help: "Configurations management",
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
        ]
    })
    async configCommand(args, opts) {
        const config = new adone.configuration.Generic();
        await config.load(args.get("path"), "__");
        console.log(adone.meta.inspect(config.__, { style: opts.get("style"), depth: opts.get("depth"), noType: !opts.get("types"), noDescriptor: true, enumOnly: true, proto: false, funcDetails: false }));

        const outPath = opts.get("out");
        if (is.string(outPath)) {
            const ext = std.path.extname(outPath);
            const options = {

            };

            if (ext === ".json") {
                options.space = 4;
            }
            await config.save(outPath, "__", options);
            console.log(`\nConfiguration saved to ${outPath}!`);
        }
        return 0;
    }
}

app.run(AdoneCLI, {
    useArgs: true
});
