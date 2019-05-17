const {
    app: { Subsystem, mainCommand },
    cli,
    fs,
    process: { execStdout },
    std
} = adone;


const getGitUser = async () => {
    try {
        const name = (await execStdout("git", ["config", "--get", "user.name"])).trim();
        return name && JSON.stringify(name.toString().trim()).slice(1, -1);
    } catch (err) {
        return "";
    }
};

const getGitEmail = async () => {
    try {
        return (await adone.process.execStdout("git", ["config", "--get", "user.email"])).trim();
    } catch (err) {
        return "";
    }
};

export default class extends Subsystem {
    @mainCommand({
        arguments: [
            {
                name: "name",
                type: String,
                required: false,
                help: "Realm/project name"
            }
        ],
        options: [
            {
                name: ["--path", "-P"],
                type: String,
                default: process.cwd(),
                help: "Base path in which realm will be created"
            },
            {
                name: ["--dir", "-D"],
                type: String,
                help: "Directory name (default is same as 'name')"
            },
            {
                name: "--description",
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
                name: ["--author", "-A"],
                type: String,
                default: "",
                help: "Author name"
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
        if (args.has("name")) {
            info = {
                name: args.get("name"),
                ...opts.getAll()
            };
            info.dir = info.dir || info.name;
            info.author = info.author || `${await getGitUser()} <${await getGitEmail()}>`;
        } else {
            const {
                prompt
            } = cli.Enquirer;
            info = await prompt([
                {
                    type: "snippet",
                    name: "config",
                    message: "Common package.json fields",
                    required: true,
                    fields: [
                        {
                            name: "author",
                            message: "Author name"
                        },
                        {
                            name: "email",
                            valiate: adone.is.email
                        },
                        {
                            name: "version",
                            validate(value, state, item) {
                                if (item && item.name === "version" && !adone.semver.valid(value)) {
                                    return this.styles.danger("version should be a valid semver value");
                                }
                                return true;
                            }
                        }
                    ],
                    template: `{
  "name": "\${name}",
  "description": "\${description}",
  "version": "\${version}",
  "author": "\${author:${await getGitUser()}} <\${email:${await getGitEmail()}}>",
  "license": "\${license:${adone.package.license}}"
}
`
                },
                {
                    name: "options",
                    type: "multiselect",
                    message: "Options",
                    search: true,
                    asObject: true,
                    choices: [
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
                    ],
                    result(names) {
                        return names.map((name) => this.find(name).value);
                    }
                },
                {
                    type: "input",
                    name: "path",
                    message: "Realm base path",
                    default: process.cwd()
                },
                {
                    type: "input",
                    name: "dir",
                    message: "Directory name",
                    initial: ({ state }) => state.answers.config.values.name,
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

            Object.assign(info, JSON.parse(info.config.result));
            delete info.config;
            for (const opt of info.options) {
                info[opt] = true;
            }
            delete info.options;
        }

        try {
            const rootRealm = await this.parent.connectRealm();
            await rootRealm.runAndWait("realmCreate", info);

            return 0;
        } catch (err) {
            console.log(adone.pretty.error(err));
            return 1;
        }
    }
}
