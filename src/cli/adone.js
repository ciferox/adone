#!/usr/bin/env node

import "adone";

const {
    x,
    is,
    fs,
    std,
    fast,
    configuration,
    text,
    util,
    application,
    runtime: { term }
} = adone;


const ADONE_CONFIG = adone.config;
const ADONE_CONFIGS_PATH = ADONE_CONFIG.configsPath;
const CLI_SUBSYSTEMS_PATH = ADONE_CONFIG.cli.subsystemsPath;
const OMNITRON_SERVICES_PATH = ADONE_CONFIG.omnitron.servicesPath;

const DEST_OPTIONS = {
    produceFiles: true,
    originTimes: true,
    originMode: true,
    originOwner: true
};

class Installer {
    constructor({ name }) {
        this.name = name;
    }

    async install({ symlink = false } = {}) {
        this.bar = adone.runtime.term.progress({
            schema: " :spinner preparing"
        });
        this.bar.update(0);

        let adoneConf;

        try {
            if (std.path.isAbsolute(this.name)) {
                adoneConf = await this.installLocal(this.name, { symlink });
            } else {
                if (this.name.startsWith("adone.")) {
                    //
                } else {
                    const fullPath = std.path.join(process.cwd(), this.name);
                    adoneConf = await this.installLocal(fullPath, { symlink });
                }
            }
            this.bar.setSchema(` :spinner ${adoneConf.project.type} {green-fg}${adoneConf.name} v${adoneConf.version}{/green-fg} successfully installed`);
            this.bar.complete(true);
        } catch (err) {
            if (!is.null(this.bar)) {
                this.bar.setSchema(" :spinner installation failed");
                this.bar.complete(false);
            }
            throw err;
        }
    }

    async installLocal(path, { symlink }) {
        this.bar.setSchema(` :spinner installing from: ${path}`);

        const adoneConf = await adone.project.Configuration.load({
            cwd: path
        });

        // if (adoneConf.project.type === "composite") {
        //     for (const [key, relativeDir] of Object.entries(adoneConf.project.structure)) {

        //     }
        // }

        switch (adoneConf.project.type) {
            case "adone-cli":
                await this._installAdoneCliSubsystem(adoneConf, path, {
                    symlink
                });
                break;
            case "omnitron-service":
                await this._installOmnitronService(adoneConf, path, {
                    symlink
                });
                break;
        }
        return adoneConf;
    }

    async _installAdoneCliSubsystem(adoneConf, cwd, { symlink } = {}) {
        const destPath = std.path.join(CLI_SUBSYSTEMS_PATH, adoneConf.name);

        // force create dir
        await fs.mkdir(CLI_SUBSYSTEMS_PATH);

        if (symlink) {
            await this._installSymlink(destPath, cwd);
        } else {
            await this._installFiles(adoneConf, destPath, cwd);
        }

        let indexPath;
        if (is.string(adoneConf.project.main)) {
            indexPath = std.path.join(destPath, adoneConf.project.main);
        } else {
            indexPath = destPath;
        }

        const subsystemInfo = {
            name: adoneConf.name,
            description: adoneConf.description,
            subsystem: indexPath
        };
        const subsystems = adone.runtime.app.config.cli.subsystems;

        let i;
        for (i = 0; i < subsystems.length; i++) {
            if (subsystems[i].name === adoneConf.name) {
                break;
            }
        }

        if (i < subsystems.length) {
            subsystems[i] = subsystemInfo;
        } else {
            subsystems.push(subsystemInfo);
        }

        subsystems.sort((a, b) => a.name > b.name);

        await adone.runtime.app.config.save(std.path.join(ADONE_CONFIGS_PATH, "cli.json"), "cli", {
            space: "    "
        });
    }

    async _installOmnitronService(adoneConf, cwd, { symlink } = {}) {
        const destPath = std.path.join(OMNITRON_SERVICES_PATH, adoneConf.name);

        // force create dir
        await fs.mkdir(OMNITRON_SERVICES_PATH);

        if (symlink) {
            await this._installSymlink(destPath, cwd);
        } else {
            await this._installFiles(adoneConf, destPath, cwd);
        }
    }

    async _installSymlink(destPath, cwd) {
        if (await fs.exists(destPath)) {
            const stat = fs.lstatSync(destPath);
            if (!stat.isSymbolicLink()) {
                throw new x.Exists("Extension already installed, please uninstall it and try again");
            }
            await fs.rm(destPath);
        }

        if (is.windows) {
            await fs.symlink(cwd, destPath, "junction");
        } else {
            await fs.symlink(cwd, destPath);
        }
    }

    async _installFiles(adoneConf, destPath, cwd) {
        for (const [name, info] of Object.entries(adoneConf.project.structure)) {
            let srcPath;

            if (is.string(info)) {
                srcPath = info;
            } else if (is.plainObject(info)) {
                srcPath = adoneConf.project.structure[name].$to;
                if (!is.glob(srcPath)) {
                    srcPath = util.globize(srcPath, { recursively: true });
                }
            } else {
                throw new x.NotValid("Invalid type of project part descriptor");
            }

            const subPath = std.path.join(destPath, name);

            if (await fs.exists(subPath)) { // eslint-disable-line
                await fs.rm(subPath); // eslint-disable-line
            }

            // eslint-disable-next-line
            await fast.src(srcPath, {
                cwd
            }).dest(subPath, DEST_OPTIONS);
        }
    }

    _printInfo(adoneConf) {
        adone.log(text.pretty.table([
            {
                name: "Name:",
                value: `${adoneConf.name} v${adoneConf.version}`
            },
            {
                name: "Type:",
                value: adoneConf.project.type
            },
            {
                name: "Description:",
                value: adoneConf.description
            },
            {
                name: "Author:",
                value: adoneConf.author
            }
        ], {
                noHeader: true,
                borderless: true,
                style: {
                    compact: true
                },
                model: [
                    {
                        id: "name",
                        style: "{green-fg}",
                        align: "right",
                        format: (val) => `${val} `
                    },
                    {
                        id: "value"
                    }
                ]
            }));
    }
}


class AdoneCLI extends application.Application {
    async configure() {
        // load default config
        this.config = await configuration.load(std.path.join(adone.etcPath, "configs", "cli.json"), true, {
            base: adone.config.configsPath
        });

        const destConfigPath = std.path.join(adone.config.configsPath, "cli.json");
        if (await fs.exists(destConfigPath)) {
            // assign config from home
            await this.config.load(destConfigPath, true);
        } else {
            await this.config.save(destConfigPath, true, {
                space: "    "
            });
        }

        // expose cli interface for subsystems.
        this.exposeCliInterface();

        this.defineArguments({
            commandsGroups: this.config.cli.groups,
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
                },
                {
                    name: "build",
                    help: "Build project",
                    arguments: [
                        {
                            name: "path",
                            nargs: "?",
                            help: "Project unit path"
                        }
                    ],
                    options: [
                        {
                            name: "--watch",
                            help: "Watch files after build"
                        }
                    ],
                    handler: this.buildCommand
                },
                {
                    name: "clean",
                    help: "Clean project",
                    arguments: [
                        {
                            name: "path",
                            nargs: "?",
                            help: "Project unit path"
                        }
                    ],
                    handler: this.cleanCommand
                }
            ]
        });

        for (const ss of this.config.cli.subsystems) {
            // eslint-disable-next-line
            await this.addSubsystem(Object.assign({
                addOnCommand: true
            }, ss));
        }
    }

    async installCommand(args, opts) {
        try {
            const manager = new Installer({
                name: args.get("name")
            });

            await manager.install({
                symlink: opts.has("symlink")
            });

            return 0;
        } catch (err) {
            adone.log(err);
            // term.print(`{red-fg}${err.message}{/}`);
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

    async buildCommand(args, opts) {
        try {
            const unitPath = args.has("path") ? args.get("path") : null;
            const project = new adone.project.Manager();
            await project.load();
            await project.build(unitPath);
            if (opts.has("watch")) {
                await project.watch(unitPath);
            }
        } catch (err) {
            adone.log(err);

            // term.print(`{red-fg}${err.message}{/}`);
        }
    }

    async cleanCommand(args, opts) {
        try {
            const unitPath = args.has("path") ? args.get("path") : null;
            const project = new adone.project.Manager();
            await project.load();
            await project.clean(unitPath);
        } catch (err) {
            adone.log(err);

            // term.print(`{red-fg}${err.message}{/}`);
        }
    }
}

application.run(AdoneCLI);
