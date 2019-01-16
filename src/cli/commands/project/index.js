const {
    app,
    cli: { kit },
    is,
    fs,
    project,
    runtime: { term, logger },
    std
} = adone;

const {
    SubsystemMeta,
    CommandMeta
} = app;

const subCommand = (name) => std.path.join(__dirname, name);

@SubsystemMeta({
    subsystems: [
        {
            name: "init",
            description: "Create new project",
            subsystem: subCommand("init")
        },
        {
            name: "new",
            description: "Create adone/project/web/... artifact",
            subsystem: subCommand("new")
        },
        {
            name: "info",
            description: "Display information about project",
            subsystem: subCommand("info")
        },
        {
            name: "dev",
            description: "Start project development cycle",
            subsystem: subCommand("dev")
        },
        {
            name: "webdev",
            description: "Start web project development cycle",
            subsystem: subCommand("webdev")
        }
    ]
})
export default class extends app.Subsystem {
    resolvePath(args, opts) {
        let path = args.has("path") ? args.get("path") : null;
        if (is.string(path) && opts.has("re")) {
            path = new RegExp(path);
        }
        return path;
    }

    @CommandMeta({
        name: "config",
        help: "Configure project"
    })
    async configureCommand() {
        const manager = new project.Manager({
            cwd: process.cwd()
        });
        await manager.load();

        const result = await kit.ask([
            {
                name: "task",
                type: "list",
                message: "Task",
                search: true,
                choices: [
                    {
                        name: "Create subproject",
                        value: "subproject"
                    }
                ]
            }
        ]);

        switch (result.task) {
            case "subproject": {
                const info = await kit.ask([
                    {
                        name: "name",
                        message: "Project name",
                        default: manager.config.raw.name,
                        async validate(value) {
                            if (!value) {
                                return "Please enter a valid project name";
                            }
                            return true;
                        }
                    },
                    {
                        type: "list",
                        name: "type",
                        search: true,
                        message: "Select project type",
                        choices: [
                            {
                                name: "Adone application",
                                value: "application"
                            },
                            {
                                name: "Adone CLI command",
                                value: "cli.command"
                            },
                            {
                                name: "Omnitron service",
                                value: "omnitron.service"
                            }
                        ]
                    },
                    {
                        name: "description",
                        message: "Project description"
                    },
                    {
                        name: "author",
                        message: "Author",
                        default: manager.config.raw.author// || (await getGitUser()).full
                    },
                    {
                        name: "options",
                        type: "checkbox",
                        message: "Options",
                        search: true,
                        asObject: true,
                        choices: [
                            {
                                name: "No eslint config",
                                value: "skipEslint"
                            },
                            {
                                name: "Skip npm initialization",
                                value: "skipNpm"
                            }
                        ]
                    },
                    {
                        name: "dir",
                        message: "Directory name",
                        default: (answers) => answers.name,
                        async validate(value) {
                            const fullPath = std.path.join(process.cwd(), value);

                            if (await fs.exists(fullPath)) {
                                const files = await fs.readdir(fullPath);
                                if (files.length > 0) {
                                    return `Path '${fullPath}' exists and is not empty`;
                                }
                            }

                            return true;
                        }
                    }
                ]);

                Object.assign(info, info.options);
                delete info.options;

                await kit.observe("progress", manager);
                await manager.createSubProject(info);
                break;
            }
        }
    }

    @CommandMeta({
        name: "clean",
        help: "Clean project",
        arguments: [
            {
                name: "path",
                nargs: "?",
                help: "Project entry path"
            }
        ],
        options: [
            {
                name: ["-re", "--re"],
                help: "Interpret 'path' as regular expression"
            }
        ]
    })
    async cleanCommand(args, opts) {
        try {
            logger.start({
                message: `Clean ${args.has("path") ? args.get("path") : "whole project"}`
            });

            const path = this.resolvePath(args, opts);
            const manager = await project.Manager.load();
            await kit.observe("logInfo", manager);
            const observer = await manager.clean(path);
            await observer.result;

            logger.success({
                message: "Successfully cleaned"
            });

            return 0;
        } catch (err) {
            term.print(`{red-fg}${err.message}{/}`);
            return 1;
        }
    }

    @CommandMeta({
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
                name: ["-re", "--re"],
                help: "Interpret 'path' as regular expression"
            }
        ]
    })
    async buildCommand(args, opts) {
        try {
            logger.start({
                message: `Build ${args.has("path") ? args.get("path") : "whole project"}`
            });

            const path = this.resolvePath(args, opts);
            const manager = await project.Manager.load();

            const observer = await manager.build(path);
            await observer.result;

            logger.success({
                message: "Successfully builded"
            });

            return 0;
        } catch (err) {
            logger.error(err);
            return 1;
        }
    }

    @CommandMeta({
        name: "rebuild",
        help: "Rebuild project",
        arguments: [
            {
                name: "path",
                nargs: "?",
                help: "Project entry path"
            }
        ],
        options: [
            {
                name: ["-re", "--re"],
                help: "Interpret 'path' as regular expression"
            }
        ]
    })
    async rebuildCommand(args, opts) {
        try {
            await this.cleanCommand(args, opts);
            return this.buildCommand(args, opts);
        } catch (err) {
            term.print(`{red-fg}${err.message}{/}`);
            return 1;
        }
    }

    @CommandMeta({
        name: "nbuild",
        help: "Build C++ addons",
        arguments: [
            {
                name: "path",
                nargs: "?",
                help: "Project entry path"
            }
        ],
        options: [
            {
                name: ["-re", "--re"],
                help: "Interpret 'path' as regular expression"
            }
        ]
    })
    async nbuildCommand(args, opts) {
        try {
            const path = this.resolvePath(args, opts);
            const manager = await project.Manager.load();
            const observer = await manager.nbuild(path);
            if (is.nil(observer)) {
                console.log("Nothing to build");
            } else {
                await observer.result;
            }
            return 0;
        } catch (err) {
            console.log(err);
            // term.print(`{red-fg}${err.message}{/}`);
            return 1;
        }
    }

    @CommandMeta({
        name: "nclean",
        help: "Clean builded C++ addons",
        arguments: [
            {
                name: "path",
                nargs: "?",
                help: "Project entry path"
            }
        ],
        options: [
            {
                name: ["-re", "--re"],
                help: "Interpret 'path' as regular expression"
            }
        ]
    })
    async ncleanCommand(args, opts) {
        try {
            const path = this.resolvePath(args, opts);
            const manager = await project.Manager.load();
            const observer = await manager.nclean(path);
            if (is.nil(observer)) {
                console.log("Nothing to clean");
            } else {
                await observer.result;
            }
            return 0;
        } catch (err) {
            console.log(err);
            // term.print(`{red-fg}${err.message}{/}`);
            return 1;
        }
    }

    @CommandMeta({
        name: "incver",
        help: "Increase project version",
        arguments: [
            {
                name: "part",
                choices: ["major", "minor", "patch", "premajor", "preminor", "prepatch", "prerelease"],
                default: "patch",
                help: "Part of version to bump"
            }
        ],
        options: [
            {
                name: ["--loose", "-l"],
                help: "Interpret version loosely"
            },
            {
                name: ["--preid"],
                help: "Identifier to be used to prefix premajor, preminor, prepatch or prerelease"
            }
        ]
    })
    async incverCommand(args, opts) {
        try {
            logger.start({
                message: `Increase version`
            });

            const manager = await project.Manager.load();
            await kit.observe(["log", "logInfo"], manager);
            const observer = await manager.incVersion({
                part: args.get("part"),
                preid: (opts.has("preid") ? opts.get("preid") : null),
                loose: opts.has("loose")
            });
            await observer.result;

            logger.success({
                message: `New version is ${adone.package.version}`
            });

            return 0;
        } catch (err) {
            term.print(`{red-fg}${err.message}{/}`);
            return 1;
        }
    }

    @CommandMeta({
        name: "deps",
        help: "Show dependencies for a particular source file or adone namespace",
        arguments: [
            {
                name: "path",
                help: "Path to source file or name of adone namespace (e.g. 'adone.fs')"
            }
        ]
    })
    async depsCommand(args) {
        // only paths are supported
        const m = new adone.js.adone.Module({
            filePath: args.get("path")
        });
        await m.load();
        const deps = m.getAdoneDependencies();

        const keys = [...deps.keys()].sort();

        for (const key of keys) {
            const v = deps.get(key);
            let res = key;
            if (v.hasComputedValue) {
                res += "[*]";
            }
            console.log(res);
        }
    }
}
