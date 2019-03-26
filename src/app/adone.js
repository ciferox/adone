#!/usr/bin/env node

import "..";
import Configuration from "../lib/app/configuration";

const {
    is,
    std,
    app
} = adone;

const {
    subsystem
} = app;

const command = (name) => std.path.join(__dirname, "..", "lib", "commands", name);

@subsystem({
    subsystems: [
        {
            name: "run",
            group: "common",
            description: "Run application/script/code",
            subsystem: command("run")
        },
        {
            name: "link",
            group: "common",
            description: "Adone cli link management",
            subsystem: command("link")
        },
        {
            name: "realm",
            group: "common",
            description: "Realm management",
            subsystem: command("realm")
        },
        {
            name: "inspect",
            group: "common",
            description: "Inspect adone namespace/object",
            subsystem: command("inspect")
        },
        {
            name: "bench",
            group: "common",
            description: "Benchmarking",
            subsystem: command("bench")
        },
        {
            name: "shani",
            group: "common",
            description: "Test framework",
            subsystem: command("shani")
        },
        {
            name: "cmake",
            group: "common",
            description: "CMake build system",
            subsystem: command("cmake")
        }
    ]
})
class AdoneCLI extends app.Application {
    async onConfigure() {
        !is.windows && this.exitOnSignal("SIGINT");

        this.config = await Configuration.load();

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

    run() {
        // print usage message by default
        console.log(`${this.helper.getHelpMessage()}\n`);
        return 0;
    }

    _configureLogger() {
        const {
            app: { logger: { format } },
            cli: { chalk }
        } = adone;

        adone.app.runtime.logger.configure({
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

    // @command({
    //     name: "config",
    //     help: "Configurations management",
    //     arguments: [
    //         {
    //             name: "path",
    //             help: "path to config file"
    //         }
    //     ],
    //     options: [
    //         {
    //             name: "--convert",
    //             help: "convert config from one format to another"
    //         },
    //         {
    //             name: "--out",
    //             type: String,
    //             help: "output path for config"
    //         },
    //         {
    //             name: "--format",
    //             help: "type of format",
    //             choices: ["json", "bson", "mpak", "json5"],
    //             default: "json"
    //         },
    //         {
    //             name: "--style",
    //             choices: ["none", "color", "html"],
    //             default: "color",
    //             help: "output style"
    //         },
    //         {
    //             name: "--depth",
    //             type: Number,
    //             help: "depth of nested objects",
    //             default: 8
    //         },
    //         {
    //             name: "--types",
    //             help: "do not display types and constructors"
    //         }
    //     ]
    // })
    // async configCommand(args, opts) {
    //     const config = new adone.configuration.Generic();
    //     await config.load(args.get("path"), "__");
    //     console.log(adone.meta.inspect(config.__, { style: opts.get("style"), depth: opts.get("depth"), noType: !opts.get("types"), noDescriptor: true, enumOnly: true, proto: false, funcDetails: false }));

    //     const outPath = opts.get("out");
    //     if (is.string(outPath)) {
    //         const ext = std.path.extname(outPath);
    //         const options = {

    //         };

    //         if (ext === ".json") {
    //             options.space = 4;
    //         }
    //         await config.save(outPath, "__", options);
    //         console.log(`\nConfiguration saved to ${outPath}!`);
    //     }
    //     return 0;
    // }
}

app.run(AdoneCLI, {
    useArgs: true
});
