const { is, std, fs, terminal } = adone;
import AdoneManager from "./adone_manager";
import Bundler from "./bundler";


export default class extends adone.application.Subsystem {
    initialize() {
        this.defineCommand({
            name: "meta",
            group: "subsystem",
            help: "cli interface for adone meta-management",
            handler: this.metaCommand,
            arguments: [
                {
                    name: "ns",
                    holder: "namespace",
                    type: String,
                    default: "",
                    help: "Name of namespace"
                }
            ],
            options: [
                {
                    name: "--descr",
                    help: "Show description"
                },
                {
                    name: "--paths",
                    help: "Show paths"
                },
                {
                    name: "--full-paths",
                    help: "Show expanded paths"
                },
                {
                    name: "--threshold",
                    type: Number,
                    default: 0.3,
                    help: "The accuracy of the search algorithm"
                }
            ],
            commands: [
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
                    name: "search",
                    help: "Deep search something in the namespace",
                    arguments: [
                        {
                            name: "keyword",
                            type: String,
                            help: "Keyword for searching"
                        }
                    ],
                    options: [
                        {
                            name: "--namespace",
                            type: String,
                            default: "",
                            help: "Name of namespace from which the keyword will be searched"
                        },
                        {
                            name: "--threshold",
                            type: Number,
                            default: 0.3,
                            help: "The accuracy of the search algorithm"
                        }
                    ],
                    handler: this.searchCommand
                },
                {
                    name: "verify",
                    help: "Verify namespace",
                    arguments: [
                        {
                            name: "name",
                            type: String,
                            help: "Fully qualified namespace name (e.g. 'adone.netron')"
                        }
                    ],
                    handler: this.verifyCommand
                },
                {
                    name: "bundle",
                    help: "Bundle object/function/class with all dependencies",
                    arguments: [
                        {
                            name: "name",
                            type: String,
                            help: "Fully qualified object name (e.g. 'adone.netron.ws.Netron')"
                        }
                    ],
                    options: [
                        {
                            name: "--out",
                            type: String,
                            help: "Path where resulting code will be placed"
                        },
                        {
                            name: "--editor",
                            type: String,
                            nargs: "?",
                            default: "",
                            help: "Open result code in text editor"
                        }
                    ],
                    handler: this.bundleCommand
                },
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
                        }
                    ],
                    handler: this.publishCommand
                }
            ]
        });
    }

    async metaCommand(args, opts) {
        try {
            const nsName = args.get("ns");
            const namespaces = adone.meta.listNamespaces(nsName, { threshold: opts.get("threshold") });
            if (namespaces.length === 0) {
                throw new adone.x.Unknown(`Unknown namespace: ${nsName}`);
            }
            const showDescr = opts.get("descr");
            const showPaths = opts.get("paths");
            const showFullPaths = opts.get("fullPaths");
            const nameWidth = adone.vendor.lodash.maxBy(namespaces, (o) => o.name.length).name.length;
            let descrWidth = 0;
            let pathsWidth = 0;
            const options = {
                colWidths: [nameWidth]
            };

            if (showDescr) {
                descrWidth = adone.vendor.lodash.maxBy(namespaces, (o) => o.description.length).description.length;
                options.colWidths.push(2, descrWidth);
            }
            if (showPaths || showFullPaths) {
                if (showFullPaths) {
                    for (let i = 0; i < namespaces.length; i++) {
                        namespaces[i].paths = await adone.meta.getNamespacePaths({ name: namespaces[i].name });
                    }
                }
                pathsWidth = adone.terminal.cols - (nameWidth + descrWidth + 2 + (descrWidth > 0 ? 2 : 0));
                options.colWidths.push(2, pathsWidth);
            }

            const table = new adone.text.table.BorderlessTable(options);
            for (const { name, description, paths } of namespaces) {
                const ns = [name];
                if (showDescr) {
                    ns.push(null, description);
                }
                if (showPaths || showFullPaths) {
                    ns.push(null, adone.text.wordwrap(paths.join("; "), pathsWidth));
                }

                table.push(ns);
            }
            adone.log(table.toString());
        } catch (err) {
            adone.log(err.message);
            return 1;
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

    async searchCommand(args, opts) {
        try {
            const namespace = opts.get("namespace");
            const name = args.get("keyword");
            const result = await adone.meta.search(name, namespace, { threshold: opts.get("threshold") });

            for (const objName of result) {
                adone.log(objName, adone.meta.inspect(adone.meta.getValue(objName), { depth: 1, style: "color", noDescriptor: true, noNotices: true }));
            }
        } catch (err) {
            adone.error(err.message);
            return 1;
        }
        return 0;
    }

    async verifyCommand(args) {
        try {
            const inspector = new adone.meta.code.Inspector();
            const name = args.get("name");
            const { namespace } = adone.meta.parseName(name);

            if (namespace === "adone" || namespace === "global") {
                throw new adone.x.NotSupported(`Whole ${namespace} namespace verification is not supported`);
            } else if (namespace.startsWith("adone.vendor")) {
                throw new adone.x.NotSupported("'adone.vendor' namespace verification is not supported");
            } else if (namespace.startsWith("adone.std")) {
                throw new adone.x.NotSupported("'adone.std' namespace verification is not supported");
            }

            terminal.print(`Namespace:{/} {bold}{green-fg}${namespace}{/}\n`);

            await inspector.attachNamespace(namespace);
            const ns = inspector.getNamespace(namespace);

            const names = Object.keys(ns.exports);

            terminal.print("Exports:\n");

            for (const name of names) {
                const fullName = `${namespace}.${name}`;
                const xObj = inspector.get(fullName);
                terminal.print(` {bold}{green-fg}${name}{/} {#7B1FA2-fg}(${xObj.getType()}){/}\n`);
            }
        } catch (err) {
            terminal.print(`{bold}{red-fg}${err.message}{/}\n`);
            return 1;
        }

        return 0;
    }

    async bundleCommand(args, opts) {
        try {
            const bundler = new Bundler();
            await bundler.prepare(args.get("name"));
            const code = await bundler.generate();

            let out;
            if (opts.has("out")) {
                out = opts.get("out");
                if (!adone.std.path.isAbsolute(out)) {
                    out = adone.std.path.resolve(process.cwd(), out);
                }
            }
            if (opts.has("editor")) {
                //     const options = {
                //         editor: opts.get("editor"),
                //         text: code,
                //         ext: ".js"
                //     };
                //     if (is.string(out)) {
                //         options.path = out;
                //     }

                //     const editor = new util.Editor(options);
                //     await editor.run();
            } else if (is.string(out)) {
                await fs.writeFile(out, code);
                adone.log(`Saved to ${out}.`);
            } else {
                console.log(code);
            }
        } catch (err) {
            adone.error(err/*.message*/);
            return 1;
        }

        return 0;
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
        const username = auth[1];
        const password = auth[2];
        const types = ["gz", "xz"];

        for (const type of types) {
            const fileName = builder.getArchiveName(type);
            const bar = new adone.cui.Progress({
                schema: `:spinner Preparing {bold}${fileName}{/} :elapsed`
            });

            await builder.createArchive(outDir.path(), { env: opts.get("env"), dirName: opts.get("dirname"), type });

            const filePath = outDir.resolve(fileName);
            const file = new fs.File(filePath);
            const st = await file.stat();

            bar.total = st.size;
            bar.setSchema(`:spinner Uploading {bold}${fileName}{/} {green-fg}:filled{/}{gray-fg}:blank{/} :current/:total :elapsed`);

            await adone.net.http.client.request.post(`https://adone.io/public/dist?subject=adone&version=${builder.adoneVersion}&filename=${fileName}`, std.fs.createReadStream(filePath), {
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
            });

            bar.setSchema(`:spinner Complete {bold}${fileName}{/} :elapsed`);
        }

        await outDir.unlink();
    }
}
