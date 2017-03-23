const { is, std, fs, util } = adone;

export default class extends adone.application.Subsystem {
    initialize() {
        this.defineCommand({
            name: "meta",
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
                    name: "extract",
                    help: "Extract object/function/class with all dependencies",
                    arguments: [
                        {
                            name: "name",
                            type: String,
                            help: "Fully qualified object name (e.g. 'adone.netron.ws.Netron')"
                        }
                    ],
                    options: [
                        {
                            name: "--src",
                            help: "Use 'src' directory"
                        },
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
                    handler: this.extractCommand
                },
                {
                    name: "global",
                    help: "Make current adone global",
                    options: [
                        {
                            name: "--remove",
                            help: "Remove adone global script"
                        }
                    ],
                    handler: this.globalCommand
                },
                {
                    name: "publish",
                    help: "Publish binary build of adone",
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
                adone.log(adone.meta.inspect(adone.vendor.lodash.get(ns, objectName), inspectOptions));
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

    async extractCommand(args, opts) {
        try {
            const name = args.get("name");
            const { namespace, objectName } = adone.meta.parseName(name);
            if (!namespace.startsWith("adone")) {
                throw new adone.x.NotSupported("Extraction from namespace other than 'adone' not supported");
            }
            if (objectName === "") {
                throw new adone.x.NotValid("Extraction of namespace not supported");
            }

            const adoneMod = new adone.meta.code.Inspector({ dir: (opts.get("src") ? "src" : "lib") });
            await adoneMod.attachNamespace(namespace);

            const code = adoneMod.getCode(name);

            let out;
            if (opts.has("out")) {
                out = opts.get("out");
                if (!adone.std.path.isAbsolute(out)) {
                    out = adone.std.path.resolve(process.cwd(), out);
                }
            }
            if (opts.has("editor")) {
                const options = {
                    editor: opts.get("editor"),
                    text: code,
                    ext: ".js"
                };
                if (is.string(out)) {
                    options.path = out;
                }

                const editor = new util.Editor(options);
                await editor.run();
            } else if (is.string(out)) {
                await fs.writeFile(out, code);
                adone.log(`Saved to ${out}.`);
            } else {
                console.log(code);
            }
        } catch (err) {
            adone.error(err.message);
            return 1;
        }

        return 0;
    }

    async globalCommand(args, opts) {
        const name = is.win32 ? "adone.cmd" : "adone";
        const nodePath = std.path.dirname(process.execPath);        
        const adoneScriptPath = std.path.join(nodePath, name);
        const nodeModulesDir = new fs.Directory(std.path.resolve(fs.homeDir(), ".node_modules"));
        await nodeModulesDir.create();
        const destAdoneDir = nodeModulesDir.getDirectory("adone");
        if (await destAdoneDir.exists()) {
            // Temporary backup whole adone directory.
            const backupPath = await fs.tmpName();
            await destAdoneDir.copyTo(backupPath);
            try {
                await destAdoneDir.unlink();
            } catch (err) {
                // Recovery files in case of unsuccessful deletion.
                await destAdoneDir.copyFrom(backupPath, { ignoreExisting: true });
                adone.log(err.message);
                return 1;
            }
        }
        try {
            await adone.fs.unlink(adoneScriptPath);
        } catch (err) {
        }
        if (opts.get("remove")) {
            adone.log("Previous adone installation successfully deleted");
            return 0;
        }

        const targets = this._getTargets();
        await destAdoneDir.create();
        await adone.fast.src(targets, { base: this.app.adoneRootPath }).dest(destAdoneDir.path());
        const data = adone.templating.nunjucks.render(std.path.join(this.app.adoneDefaultsPath, "scripts", name), { targetPath: destAdoneDir.resolve("bin", "adone.js") });
        await adone.fs.writeFile(adoneScriptPath, data);
        if (!is.win32) {
            await adone.fs.chmod(adoneScriptPath, 0o755);
        }
        adone.log(`Adonve v${adone.package.version} successfully installed`);
        return 0;
    }

    async publishCommand() {
        const targets = this._getTargets();
        // return adone.fast.src(targets, { base: this.app.adoneRootPath }).dest(outDir);
        // adone.log(outDir.path());
    }

    _getTargets() {
        return ["!**/*.map", "package.json", "README*", "LICENSE*"].concat(adone.package.files.map((x) => util.globize(x, { recursively: true })));
    }
}
