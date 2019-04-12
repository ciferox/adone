const {
    app: { Subsystem, mainCommand },
    cli,
    fs,
    std
} = adone;


const getGitUser = async () => {
    let name;
    let email;
    const {
        process: { execStdout }
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
    @mainCommand({
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
                name: ["--base-path", "-P"],
                type: String,
                default: process.cwd(),
                help: "Base path in which realm will be created"
            },
            {
                name: "--dir",
                type: String,
                default: "",
                help: "Directory name of project used instead of project name"
            },
            {
                name: ["--description", "-D"],
                type: String,
                default: "",
                help: "Realm description"
            },
            {
                name: ["--version", "-V"],
                type: String,
                default: "0.0.0",
                help: "Initial version"
            },
            {
                name: "--author",
                type: String,
                default: "",
                help: "Author name"
            },
            {
                name: "--dev-config",
                help: "Create development configuration"
            },
            {
                name: "--init-git",
                help: "Initialize git repository"
            },
            {
                name: "--init-npm",
                help: "Install npm packages"
            },
            {
                name: "--init-eslint",
                help: "Generate .eslintrc.js"
            },
            {
                name: "--init-jsconfig",
                help: "Generate jsconfig.js"
            }
        ]
    })
    async main(args, opts) {
        let info;
        if (!args.has("name")) {
            info = await cli.prompt([
                {
                    name: "name",
                    message: "Realm name",
                    async validate(value) {
                        if (!value) {
                            return "Please enter a valid name";
                        }
                        return true;
                    }
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
                    choices: [
                        {
                            name: "Create development configuration",
                            value: "devConfig"
                        },
                        {
                            name: "Initialize git repository",
                            value: "initGit"
                        },
                        {
                            name: "Generate jsconfig.js config",
                            value: "initJsconfig"
                        },
                        {
                            name: "Generate .eslintrc.js config",
                            value: "initEslint"
                        },
                        {
                            name: "Install npm packages",
                            value: "initNpm"
                        }
                    ]
                },
                {
                    name: "basePath",
                    message: "Realm base path",
                    default: process.cwd()
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
                ...opts.getAll()
            };
        }

        try {
            const rootRealm = await this.parent.connectRealm();
            const newRealm = await rootRealm.runAndWait("realmCreate", info);

            const { merge } = await cli.prompt({
                type: "confirm",
                name: "merge",
                message: `Whould you like to merge ${cli.style.primary(info.name)} realm into ADONE realm?`
            });

            if (merge) {
                await adone.realm.rootRealm.runAndWait("realmMerge", {
                    superRealm: adone.realm.rootRealm,
                    subRealm: newRealm,
                    symlink: true
                });
            }

            return 0;
        } catch (err) {
            console.log(adone.pretty.error(err));
            return 1;
        }
    }
}
