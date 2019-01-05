const {
    app,
    cli: { kit },
    is,
    fs,
    project,
    runtime: { term },
    std
} = adone;

const {
    DCliCommand
} = app;

const resolvePath = (args, opts) => {
    let path = args.has("path") ? args.get("path") : null;
    if (is.string(path) && opts.has("re")) {
        path = new RegExp(path);
    }
    return path;
};

const getGitUser = async () => {
    let name;
    let email;
    const {
        system: { process: { execStdout } }
    } = adone;

    try {
        name = (await execStdout("git", ["config", "--get", "user.name"])).trim();
        name = name && JSON.stringify(name.toString().trim()).slice(1, -1);
    } catch (err) {
        name = "";
    }

    try {
        email = (await execStdout("git", ["config", "--get", "user.email"])).trim();
    } catch (err) {
        email = "";
    }

    return {
        name,
        email,
        full: name + (email && ` <${email}>`)
    };
};

export default class extends app.Subsystem {
    @DCliCommand({
        name: "init",
        help: "Create new project",
        arguments: [
            {
                name: "name",
                type: String,
                required: false,
                help: "Project name"
            }
        ],
        options: [
            {
                name: "--type",
                type: String,
                default: "default",
                choices: ["default", "gloss", "application", "cli.application", "cli.command", "omnitron.service"],
                help: "Type of project"
            },
            {
                name: "--dir",
                type: String,
                required: false,
                help: "Directory name of project used instead of project name"
            },
            {
                name: ["--description", "--descr"],
                type: String,
                default: "",
                help: "Project description"
            },
            {
                name: ["--version", "--ver"],
                type: String,
                default: "0.0.0",
                help: "Project initial version"
            },
            {
                name: "--author",
                type: String,
                default: "",
                help: "Project author"
            },
            {
                name: "--skip-git",
                help: "Skip initializing git repository"
            },
            {
                name: "--skip-npm",
                help: "Skip installing npm packages"
            },
            {
                name: "--skip-eslint",
                help: "Skip generating .eslintrc.js"
            },
            {
                name: "--skip-jsconfig",
                help: "Skip generating jsconfig.js"
            }
        ]
    })
    async initCommand(args, opts) {
        let info;
        if (!args.has("name")) {
            info = await kit.ask([
                {
                    name: "name",
                    message: "Project name",
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
                            name: "Default",
                            value: "default"
                        },
                        {
                            name: "Adone gloss",
                            value: "gloss"
                        },
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
                    default: (await getGitUser()).full
                },
                {
                    name: "options",
                    type: "checkbox",
                    message: "Options",
                    search: true,
                    asObject: true,
                    choices(answers) {
                        const choices = [
                            {
                                name: "Skip git initialization",
                                value: "skipGit"
                            },
                            {
                                name: "No jsconfig config",
                                value: "skipJsconfig"
                            },
                            {
                                name: "No eslint config",
                                value: "skipEslint"
                            },   
                            {
                                name: "Skip npm initialization",
                                value: "skipNpm"
                            }
                        ];

                        if (answers.type === "default") {
                            choices[2].checked = true; // skitpEslint
                            choices[3].checked = true; // skipNpm
                        }

                        return choices;
                    }
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
        } else {
            info = {
                name: args.get("name"),
                type: opts.get("type"),
                description: opts.get("descr"),
                version: opts.get("version"),
                author: opts.has("author") ? opts.get("author") : undefined,
                child: opts.has("child"),
                skipGit: opts.has("skipGit"),
                skipNpm: opts.has("skipNpm"),
                skipEslint: opts.has("skipEslint"),
                skipJsconfig: opts.has("skipJsconfig")
            };

            info.dir = opts.has("dir") ? opts.get("dir") : info.name;
        }

        return this._initProject(info);
    }

    async _initProject({ name, type, description, version, author, dir, skipGit, skipNpm, skipEslint, skipJsconfig } = {}) {
        const manager = new project.Manager({
            cwd: std.path.join(process.cwd(), dir)
        });

        await kit.observe("progress", manager);

        await manager.createProject({
            name,
            type,
            description,
            version,
            author,
            skipGit,
            skipNpm,
            skipEslint,
            skipJsconfig
        });
    }

    @DCliCommand({
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

    @DCliCommand({
        name: ["file", "createfile"],
        help: "Create file",
        arguments: [
            {
                name: "name",
                type: String,
                help: "File name"
            }
        ],
        options: [
            {
                name: ["-t", "--type"],
                type: String,
                default: "application",
                choices: ["application", "cli.application", "cli.command", "omnitron.service"],
                help: "Type of file"
            },
            {
                name: ["-f", "--filename"],
                type: String,
                help: "Type of file"
            },
            {
                name: ["--editor", "-e"],
                type: String,
                nargs: "?",
                help: "open file immediately in the editor"
            }
        ]
    })
    async createfileCommand(args, opts) {
        const name = args.get("name");
        const manager = new project.Manager();

        const path = await manager.createFile({
            name,
            type: opts.get("type"),
            fileName: opts.has("filename") ? opts.get("filename") : undefined
        });

        if (opts.has("editor")) {
            await (new adone.util.Editor({
                path,
                editor: opts.get("editor")
            })).spawn({
                detached: true
            });
        }
    }

    @DCliCommand({
        name: ["struct", "structure"],
        help: "Show project structure",
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
            },
            {
                name: ["--full", "-f"],
                help: "Show full structure"
            },
            {
                name: ["--native", "-n"],
                help: "Show only entries bundled with C++ addons"
            }
        ]
    })
    async structureCommand(args, opts) {
        try {
            const path = resolvePath(args, opts);
            const manager = await project.Manager.load();
            const entries = manager.getProjectEntries({
                path,
                onlyNative: opts.has("native")
            });
            const structure = {};
            if (opts.has("full")) {
                for (const entry of entries) {
                    structure[entry.id] = adone.util.omit(entry, "id");
                }
            } else {
                for (const entry of entries) {
                    structure[entry.id] = entry.description || "";
                }
            }
            console.log(adone.pretty.json(structure));
            return 0;
        } catch (err) {
            term.print(`{red-fg}${err.message}{/}`);
            return 1;
        }
    }

    @DCliCommand({
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
            const path = resolvePath(args, opts);
            const manager = await project.Manager.load();
            await kit.observe("logInfo", manager);
            const observer = await manager.clean(path);
            await observer.result;
            return 0;
        } catch (err) {
            term.print(`{red-fg}${err.message}{/}`);
            return 1;
        }
    }

    @DCliCommand({
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
            },
            {
                name: "--watch",
                help: "Watch files changes"
            }
        ]
    })
    async buildCommand(args, opts) {
        try {
            adone.logInfo("Loading project configuration...");
            const path = resolvePath(args, opts);
            const manager = await project.Manager.load();
            adone.logInfo("Project build started");
            let observer = await manager.build(path);
            await observer.result;
            if (opts.has("watch")) {
                observer = await manager.watch(path);
                await observer.result;
                return;
            }
            return 0;
        } catch (err) {
            console.log(err);
            // term.print(`{red-fg}${err.message}{/}`);
            return 1;
        }
    }

    @DCliCommand({
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
            },
            {
                name: "--watch",
                help: "Watch files changes"
            }
        ]
    })
    async rebuildCommand(args, opts) {
        try {
            const path = resolvePath(args, opts);
            const manager = await project.Manager.load();
            let observer = await manager.rebuild(path);
            await observer.result;
            if (opts.has("watch")) {
                observer = await manager.watch(path);
                await observer.result;
                return;
            }
            return 0;
        } catch (err) {
            term.print(`{red-fg}${err.message}{/}`);
            return 1;
        }
    }

    @DCliCommand({
        name: "watch",
        help: "Watch project",
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
    async watchCommand(args, opts) {
        try {
            const path = resolvePath(args, opts);
            const manager = await project.Manager.load();
            const observer = await manager.watch(path);
            await observer.result;
        } catch (err) {
            term.print(`{red-fg}${err.message}{/}`);
            return 1;
        }
    }

    @DCliCommand({
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
            const path = resolvePath(args, opts);
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

    @DCliCommand({
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
            const path = resolvePath(args, opts);
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

    @DCliCommand({
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
            const manager = await project.Manager.load();
            await kit.observe(["log", "logInfo"], manager);
            const observer = await manager.incVersion({
                part: args.get("part"),
                preid: (opts.has("preid") ? opts.get("preid") : null),
                loose: opts.has("loose")
            });
            await observer.result;

            return 0;
        } catch (err) {
            term.print(`{red-fg}${err.message}{/}`);
            return 1;
        }
    }

    @DCliCommand({
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

    @DCliCommand({
        name: "tasks",
        help: "Show tasks available in the project"
    })
    async tasksCommand() {
        const manager = await project.Manager.load();
        console.log(manager.getTaskNames().sort().join(", "));
    }
}
