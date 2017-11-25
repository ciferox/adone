#!/usr/bin/env node

import "adone";

const {
    is,
    std,
    application,
    runtime: { term }
} = adone;

const {
    Command,
    MainCommand,
    CommandsGroups
} = application.CliApplication;

@CommandsGroups([
    {
        name: "subsystem",
        description: "Subsystems"
    },
    {
        name: "realm",
        description: "Realm management"
    }
])
class AdoneCLI extends application.CliApplication {
    async configure() {
        this.config = await adone.cli.Configuration.load();

        // expose cli interface for subsystems.
        this.exposeCliInterface();

        // Add base subsystems
        await this.addSubsystemsFrom(std.path.join(__dirname, "..", "lib", "cli", "subsystems"), {
            addOnCommand: true,
            useFilename: true
        });

        if (is.array(this.config.raw.commands)) {
            for (const ss of this.config.raw.commands) {
                // eslint-disable-next-line
                await this.addSubsystem(Object.assign({
                    addOnCommand: true
                }, ss));
            }
        }
    }

    @MainCommand({
        blindMode: true,
        arguments: [
            {
                name: "path",
                default: "index.js",
                help: "Run [es6] script or adone application"
            }
        ],
        options: [
            {
                name: "--sourcemaps",
                help: "Force enable sourcemaps support"
            },
            {
                name: ["-e", "--exec"],
                help: "Execute code"
            }
        ]
    })
    async main(args, opts, { rest }) {
        if (opts.has("exec")) {
            const m = new adone.js.Module(process.cwd(), {
                transform: adone.js.Module.transforms.transpile(adone.require.options)
            });

            m._compile(args.get("path"), "index.js");
            let result = m.exports;
            if (result.__esModule) {
                result = result.default;
            }
            if (is.asyncFunction(result)) {
                await result();
            } else if (is.function(result)) {
                result();
            } else if (!is.nil(result)) {
                adone.log(result);
            }
        } else {
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
    }

    @Command({
        name: "initrealm",
        group: "realm",
        help: "Initialize new realm",
        arguments: [
            {
                name: "name",
                type: String,
                default: "dev",
                help: "Name of realm"
            }
        ],
        options: [
            {
                name: "--path",
                type: String,
                help: "Path where realm will be initialized (home directory by default)"
            }
        ]
    })
    async initrealmCommand(args, opts) {
        const name = args.get("name");
        try {
            const path = await adone.realm.init(name, opts.has("path") ? opts.get("path") : null);
            term.print(`Realm {green-fg}'${path}'{/green-fg} successfully initialized\n`);
        } catch (err) {
            term.print(`{red-fg}${err.message}{/}\n`);
        }
    }

    @Command({
        name: "install",
        group: "realm",
        help: "Install adone glosses, extensions, applications, etc.",
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
            const observer = await realmManager.install({
                name: args.get("name"),
                symlink: opts.has("symlink"),
                build: opts.has("build")
            });
            await observer.result;

            return 0;
        } catch (err) {
            adone.log(err);
            // term.print(`{red-fg}${err.message}{/}`);
            return 1;
        }
    }

    @Command({
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
            const observer = await realmManager.uninstall({
                name: args.get("name")
            });
            await observer.result;

            return 0;
        } catch (err) {
            adone.log(err);
            // term.print(`{red-fg}${err.message}{/}`);
            return 1;
        }
    }

    @Command({
        name: "list",
        group: "realm",
        help: "List installed packages",
        arguments: [
            {
                name: "keyword",
                type: String,
                default: "",
                help: "Name or keywork for searching"
            }
        ]
    })
    async listCommand(args) {
        try {
            const realmManager = await adone.realm.getManager();
            const observer = await realmManager.list({
                keyword: args.get("keyword")
            });
            const result = await observer.result;

            if (result.length > 0) {
                adone.log(adone.text.pretty.table(result, {
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
                                const invalid = item.isValid ? "" : "{red-fg} (not valid){/}";
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
            // adone.log(err);
            term.print(`{red-fg}${err.message}{/}\n`);
            return 1;
        }
    }

    @Command({
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

    @Command({
        name: "inspect",
        help: "Inspect adone namespace/object",
        arguments: [
            {
                name: "name",
                type: String,
                default: "",
                help: "Name of class/object/function/namespace"
            }
        ],
        options: [
            {
                name: "--all",
                help: "Show all properties"
            }
        ]
    })
    async inspectCommand(args, opts) {
        try {
            const name = args.get("name");
            const { namespace, objectName } = adone.meta.parseName(name);
            const inspectOptions = { style: "color", depth: 1, noDescriptor: true, noNotices: true, sort: true };

            let ns;
            if (namespace === "global" || namespace === "") {
                ns = global;
            } else {
                if (namespace === "adone") {
                    ns = adone;
                } else {
                    ns = adone.vendor.lodash.get(adone, namespace.substring("adone".length + 1));
                }
            }

            if (objectName === "") {
                const { util } = adone;

                const styleType = (type) => `{magenta-fg}${type}{/magenta-fg}`;
                const styleName = (name) => `{green-fg}{bold}${name}{/bold}{/green-fg}`;
                const styleArgs = (args) => `{green-fg}(${args.join(", ")}){/green-fg}`;
                const styleLiteral = (type, name) => `${styleName(name)}: ${styleType(type)}`;
                const styleLiteralArgs = (type, name, args) => `${styleName(name)}: ${styleType(type)}${styleArgs(args)}`;
                const styleLiteralValue = (type, name, value) => {
                    if (is.string(value)) {
                        value = `"${value}"`;
                    }

                    return `${styleName(name)}: ${styleType(type)} = {blue-fg}${value}{/blue-fg}`;
                };

                const list = [];
                for (let [key, value] of util.entries(ns, { all: opts.has("all") })) {
                    const origType = util.typeOf(value);
                    let type = origType;

                    switch (type) {
                        case "function": {
                            try {
                                const result = adone.js.parseFunction(value);
                                type = "";
                                if (result.isAsync) {
                                    type += "async ";
                                }
                                if (!result.isArrow) {
                                    type += "function ";
                                }

                                value = result.args;
                            } catch (err) {
                                if (value.toString().includes("[native code]")) {
                                    type = "native function ";
                                } else {
                                    type = "function ";
                                }

                                value = [];
                            }
                            break;
                        }
                        case "Object": {
                            if (is.class(value.constructor)) {
                                type = value.constructor.name;
                            } else {
                                type = "object ";
                            }
                            break;
                        }
                    }

                    list.push({
                        origType,
                        type,
                        key,
                        value
                    });
                }

                list.sort((a, b) => {
                    if (a.key < b.key) {
                        return -1;
                    } else if (a.key > b.key) {
                        return 1;
                    }
                    return 0;
                });

                term.print(`${styleType("namespace")} ${styleName(namespace)}\n`);
                for (const { origType, type, key, value } of list) {
                    term.print("    ");
                    switch (origType) {
                        case "string": {
                            term.print(`${styleLiteralValue(type, key, value)} {italic}{grey-fg}(${value.length}){/grey-fg}{/italic}`);
                            break;
                        }
                        case "number":
                        case "boolean":
                            term.print(`${styleLiteralValue(type, key, value)}`);
                            break;
                        case "function": {
                            term.print(styleLiteralArgs(type, key, value));
                            break;
                        }
                        case "class": {
                            term.print(styleLiteral(type, key));
                            break;
                        }
                        case "namespace": {
                            term.print(styleLiteral(type, key));
                            break;
                        }
                        case "Object": {
                            term.print(styleLiteral(type, key));
                            break;
                        }
                        default:
                            term.print(styleLiteral(type, key));
                    }
                    term.print("\n");
                }
                // adone.log(adone.meta.inspect(ns, inspectOptions));
            } else if (adone.vendor.lodash.has(ns, objectName)) {
                const obj = adone.vendor.lodash.get(ns, objectName);
                const type = adone.util.typeOf(obj);
                if (type === "function") {
                    adone.log(obj.toString());
                } else {
                    adone.log(adone.meta.inspect(adone.vendor.lodash.get(ns, objectName), inspectOptions));
                }
            } else {
                throw new adone.x.Unknown(`Unknown object: ${name}`);
            }
        } catch (err) {
            adone.log(err);
            // adone.error(err.message);
            return 1;
        }
        return 0;
    }

    // Temporary commands, until the builds for all supported systems are ready

    @Command({
        name: "clean",
        help: "Clean project",
        arguments: [
            {
                name: "path",
                nargs: "?",
                help: "Project entry path"
            }
        ]
    })
    async cleanCommand(args) {
        try {
            const path = args.has("path") ? args.get("path") : null;
            const manager = new adone.project.Manager();
            await manager.load();
            const observer = await manager.clean(path);
            await observer.result;
            return 0;
        } catch (err) {
            term.print(`{red-fg}${err.message}{/}\n`);
            return 1;
        }
    }

    @Command({
        name: "build",
        help: "Build project",
        arguments: [
            {
                name: "path",
                nargs: "?",
                help: "Project entry path"
            }
        ],
        options: [
            {
                name: "--watch",
                help: "Watch files changes"
            }
        ]
    })
    async buildCommand(args, opts) {
        try {
            const path = args.has("path") ? args.get("path") : null;
            const manager = new adone.project.Manager();
            await manager.load();
            let observer = await manager.build(path);
            await observer.result;
            if (opts.has("watch")) {
                observer = await manager.watch(path);
                await observer.result;
                return;
            }
            return 0;
        } catch (err) {
            adone.log(err);
            // term.print(`{red-fg}${err.message}{/}`);
            return 1;
        }
    }

    @Command({
        name: "rebuild",
        help: "Rebuild project",
        options: [
            {
                name: "--watch",
                help: "Watch files changes"
            },
        ],
        arguments: [
            {
                name: "path",
                nargs: "?",
                help: "Project entry path"
            }
        ]
    })
    async rebuildCommand(args, opts) {
        try {
            const path = args.has("path") ? args.get("path") : null;
            const manager = new adone.project.Manager();
            await manager.load();
            let observer = await manager.rebuild(path);
            await observer.result;
            if (opts.has("watch")) {
                observer = await manager.watch(path);
                await observer.result;
                return;
            }
            return 0;
        } catch (err) {
            term.print(`{red-fg}${err.message}{/}\n`);
            return 1;
        }
    }

    @Command({
        name: "watch",
        help: "Watch project",
        arguments: [
            {
                name: "path",
                nargs: "?",
                help: "Project entry path"
            }
        ]
    })
    async watchCommand(args, opts) {
        try {
            const path = args.has("path") ? args.get("path") : null;
            const manager = new adone.project.Manager();
            await manager.load();
            const observer = await manager.watch(path);
            await observer.result;
        } catch (err) {
            term.print(`{red-fg}${err.message}{/}\n`);
            return 1;
        }
    }
}

application.runCli(AdoneCLI);
