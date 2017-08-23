#!/usr/bin/env node

import "adone";

const {
    is,
    std,
    application,
    terminal
} = adone;

const lazy = adone.lazify({
    InstallationManager: ["../lib/cli/manager", (x) => x.InstallationManager]
}, exports, require);

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
                    help: "Run [es6] script or adone compact application"
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
                            help: "Extension name or absolute path to local project"
                        }
                    ],
                    options: [
                        {
                            name: "--symlink",
                            help: "Create symlink to project instead of install it (for local projects)"
                        }
                    ],
                    handler: this.installCommand
                },
                {
                    name: "uninstall",
                    help: "Uninstall adone glosses, extensions, applications, etc.",
                    handler: this.uninstallCommand
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

        this.loadCliSubsystems(this.config.cli.subsystems);
    }

    async installCommand(args, opts) {
        try {
            const manager = new lazy.InstallationManager({
                name: args.get("name")
            });

            await manager.install({
                symlink: opts.has("symlink")
            });

            return 0;
        } catch (err) {
            terminal.print(`{red-fg}${err.message}{/}`);
            return 1;
        }
    }

    uninstallCommand(args) {

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

    async inspectCommand(args) {
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
                adone.log(adone.meta.inspect(ns, inspectOptions));
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
            adone.error(err.message);
            return 1;
        }
        return 0;
    }
}

if (require.main === module) {
    application.run(AdoneCLI);
}
