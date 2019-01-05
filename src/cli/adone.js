#!/usr/bin/env node

import "adone";

const {
    is,
    std,
    app,
    runtime: { term }
} = adone;

const {
    DApplication,
    DCliCommand
} = app;

const baseSubsystem = (name) => std.path.join(__dirname, "..", "lib", "cli", "subsystems", name);

@DApplication({
    subsystems: [
        {
            name: "run",
            group: "cli",
            description: "Run application/script/code",
            subsystem: baseSubsystem("run")
        },
        {
            name: "link",
            group: "cli",
            description: "Adone cli link management",
            subsystem: baseSubsystem("link")
        },
        {
            name: "realm",
            group: "realm",
            description: "Realm management",
            subsystem: baseSubsystem("realm")
        },
        {
            name: "info",
            group: "cli",
            description: "Show available information about object you wish",
            subsystem: baseSubsystem("info")
        },
        {
            name: "inspect",
            group: "dev",
            description: "Inspect adone namespace/object",
            subsystem: baseSubsystem("inspect")
        },
        {
            name: "project",
            group: "dev",
            description: "Project management/scaffolding",
            subsystem: baseSubsystem("project")
        },
        {
            name: "bench",
            group: "dev",
            description: "Benchmarking",
            subsystem: baseSubsystem("bench")
        },
        {
            name: "shani",
            group: "dev",
            description: "Test framework",
            subsystem: baseSubsystem("shani")
        }
    ]
})
class AdoneCLI extends app.CliApplication {
    async configure() {
        adone.cli.kit.setPrettyLogger();
        
        !is.windows && this.exitOnSignal("SIGINT");

        this.config = await adone.cli.Configuration.load();

        // Expose cli interface for subsystems.
        this.exposeCliInterface();

        // Add cli kit as a subsystem
        this.addSubsystem({
            name: "kit",
            bind: true,
            subsystem: adone.cli.kit
        });

        // Define command groups.
        const groups = this.config.getGroups();
        for (const group of groups) {
            this.defineCommandsGroup(group);
        }

        await this._addInstalledSubsystems();
    }

    async _addInstalledSubsystems() {
        const commands = this.config.getCommands();
        for (const ss of commands) {
            // eslint-disable-next-line
            await this.defineCommandFromSubsystem({
                ...adone.util.omit(ss, "name"),
                name: [ss.name, ...adone.util.arrify(ss.aliases)],
                lazily: true
            });
        }
    }

    @DCliCommand({
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

    @DCliCommand({
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

    @DCliCommand({
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

    @DCliCommand({
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

    @DCliCommand({
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

    @DCliCommand({
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

app.runCli(AdoneCLI);
