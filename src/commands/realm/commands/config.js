const {
    app: { Subsystem, MainCommandMeta },
    fs,
    runtime: { cli },
    std
} = adone;


export default class extends Subsystem {
    @MainCommandMeta({
    })
    async configureCommand() {
        const manager = await this.parent.getRealm();

        const result = await cli.ask([
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
                const info = await cli.ask([
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
}
