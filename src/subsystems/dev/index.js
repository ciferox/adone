import AdoneManager from "./adone_manager";

const {
    std,
    fs,
    terminal
} = adone;

export default class extends adone.application.Subsystem {
    initialize() {
        this.defineCommand({
            commands: [
                {
                    name: "install",
                    help: "Install current adone globally",
                    arguments: [
                        {
                            name: "name",
                            type: String,
                            default: "adone",
                            help: "Name of global link and module directory"
                        }
                    ],
                    options: [
                        {
                            name: "--dirname",
                            type: String,
                            default: ".adone",
                            help: "Name of home directory of adone"
                        },
                        {
                            name: "--env",
                            type: String,
                            default: "production",
                            help: "The short name of the environment the build is intended for"
                        }
                    ],
                    handler: this.installCommand
                },
                {
                    name: "uninstall",
                    help: "Uninstall globally installed adone",
                    arguments: [
                        {
                            name: "name",
                            type: String,
                            default: "adone",
                            help: "Name of global link and module directory"
                        }
                    ],
                    handler: this.uninstallCommand
                },
                {
                    name: "link",
                    help: "Create global link to current adone",
                    arguments: [
                        {
                            name: "name",
                            default: "adone",
                            help: "Link name"
                        }
                    ],
                    options: [
                        {
                            name: "--del",
                            help: "Delete link instead of create"
                        }
                    ],
                    handler: this.linkCommand
                },
                {
                    name: "publish",
                    help: "Publish binary build of adone",
                    options: [
                        {
                            name: "--auth",
                            type: /(\w+):(\w+)/,
                            required: true,
                            help: "User and password"
                        },
                        {
                            name: "--dirname",
                            type: String,
                            default: ".adone",
                            help: "Name of home directory of adone"
                        },
                        {
                            name: "--env",
                            type: String,
                            default: "production",
                            help: "The short name of the environment the build is intended for"
                        },
                        {
                            name: "--build",
                            type: String,
                            default: "latest",
                            help: "Build name: latest, stable, 'X.Y.Z'"
                        },
                        {
                            name: "--url",
                            type: String,
                            default: "https://adone.io/dist",
                            help: "Upload to"
                        }
                    ],
                    handler: this.publishCommand
                }
            ]
        });
    }

    async installCommand(args, opts) {
        const builder = new AdoneManager();
        if (await builder.install(args.get("name"), opts.get("dirname"), opts.get("env"))) {
            adone.log(`Adone v${builder.adoneVersion} successfully installed`);
            return 0;
        }
        adone.log("Something already exists");
        return 1;
    }

    async uninstallCommand(args) {
        const builder = new AdoneManager();
        try {
            await builder.uninstall(args.get("name"));
        } catch (err) {
            adone.log(err.message);
            return 1;
        }
        adone.log("Adone successfully uninstalled");
        return 0;
    }

    async linkCommand(args, opts) {
        const builder = new AdoneManager();
        const linkName = args.get("name");
        if (!opts.has("del")) {
            await builder.installLink(linkName);
            adone.log(`Global link '${linkName}' successfully created`);
        } else {
            await builder.uninstallLink(linkName);
            adone.log(`Global link '${linkName}' successfully deleted`);
        }
    }

    async publishCommand(args, opts) {
        const builder = new AdoneManager();
        const outDir = await fs.Directory.createTmp();
        const auth = opts.get("auth");
        const build = opts.get("build");
        const username = auth[1];
        const password = auth[2];
        let types;

        switch (builder.os) {
            case "win":
                types = ["zip", "7z"];
                break;
            case "linux":
            case "freebsd":
            case "darwin":
            case "sunos":
                types = ["gz", "xz"];
                break;
        }

        const promises = [];

        for (const type of types) {
            const fileName = builder.archiveName(type);
            const bar = terminal.progress({
                schema: `:spinner Preparing {bold}${fileName}{/} :elapsed`
            });
            bar.update(0);

            const p = builder.createArchive(outDir.path(), { env: opts.get("env"), dirName: opts.get("dirname"), type }).then(() => {
                const filePath = outDir.resolve(fileName);
                const file = new fs.File(filePath);
                const st = file.statSync();

                bar.total = st.size;
                bar.setSchema(`:spinner Uploading {bold}${fileName}{/} {green-fg}:filled{/}{gray-fg}:blank{/} :current/:total :elapsed`);

                return adone.net.http.client.request.post(opts.get("url"), std.fs.createReadStream(filePath), {
                    params: {
                        subject: "adone",
                        build,
                        version: builder.adoneVersion,
                        type,
                        os: builder.os,
                        arch: builder.arch,
                        node: builder.nodeVersion
                    },
                    headers: {
                        "Content-Type": "application/octet-stream",
                        "Content-Length": st.size
                    },
                    auth: {
                        username,
                        password
                    },
                    rejectUnauthorized: false,
                    onUploadProgress: (evt) => {
                        bar.update(evt.loaded / evt.total);
                    }
                }).then(() => {
                    bar.setSchema(`:spinner Complete {bold}${fileName}{/} :elapsed`);
                    bar.complete(true);
                });
            });

            promises.push(p);
        }
        await Promise.all(promises);
        await outDir.unlink();
    }
}
