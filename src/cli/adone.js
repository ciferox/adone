#!/usr/bin/env node

import "adone";

const {
    is,
    std,
    application,
    runtime: { term }
} = adone;

class AdoneCLI extends application.Application {
    async configure() {
        this.config = await adone.realm.cli.getConfig();

        // expose cli interface for subsystems.
        this.exposeCliInterface();

        this.defineArguments({
            commandsGroups: this.config.raw.groups,
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
                }
            ],
            commands: [
                {
                    name: "install",
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
                    ],
                    handler: this.installCommand
                },
                {
                    name: "uninstall",
                    help: "Uninstall adone glosses, extensions, applications, etc.",
                    arguments: [
                        {
                            name: "name",
                            type: String,
                            required: true,
                            help: "Full name or absolute path to local project"
                        }
                    ],
                    handler: this.uninstallCommand
                },
                {
                    name: "list",
                    help: "List installed packages",
                    arguments: [
                        {
                            name: "keyword",
                            type: String,
                            default: "",
                            help: "Name or keywork for searching"
                        }
                    ],
                    handler: this.listCommand
                },
                {
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
                    ],
                    handler: this.inspectCommand
                },
                {
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
                    ],
                    handler: this.configCommand
                }
            ]
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

    async installCommand(args, opts) {
        try {
            const realmInstance = await adone.realm.getInstance();
            await realmInstance.install({
                name: args.get("name"),
                symlink: opts.has("symlink"),
                build: opts.has("build")
            });

            return 0;
        } catch (err) {
            adone.log(err);
            // term.print(`{red-fg}${err.message}{/}`);
            return 1;
        }
    }

    async uninstallCommand(args) {
        try {
            const realmInstance = await adone.realm.getInstance();
            await realmInstance.uninstall({
                name: args.get("name")
            });

            return 0;
        } catch (err) {
            adone.log(err);
            // term.print(`{red-fg}${err.message}{/}`);
            return 1;
        }
    }

    async listCommand(args) {
        try {
            const realm = await adone.realm.getInstance();
            const result = await realm.list({
                keyword: args.get("keyword")
            });

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
                        handle: (item) => `{green-fg}{bold}${item.name}{/bold} ${item.version}{/green-fg} {grey-fg}- ${item.description}{/grey-fg}`
                    }
                ]
            }));

            return 0;
        } catch (err) {
            // adone.log(err);
            term.print(`{red-fg}${err.message}{/}`);
            return 1;
        }
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
                            styleLiteral(type, key);
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
}

application.run(AdoneCLI);
