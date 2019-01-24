const {
    app: { Subsystem, MainCommandMeta },
    cli: { kit },
    fs,
    std,
    project
} = adone;


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

export default class extends Subsystem {
    @MainCommandMeta({
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
                choices: ["empty", "gloss", "application", "cli.application", "cli.command", "omnitron.service"],
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
    async main(args, opts) {
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
                            name: "Empty",
                            value: "empty"
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
                            name: "Adone cli subcommand",
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
}
