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
                            name: "--dir",
                            type: String,
                            choices: ["lib", "src"],
                            default: "lib",
                            help: "Source directory of the code"
                        },
                        {
                            name: "--out",
                            type: String,
                            default: "",
                            help: "Path where resulting code will be placed"
                        }
                    ],
                    handler: this.extractCommand
                },
                {
                    name: "slice",
                    help: "Make a slice of adone",
                    arguments: [
                        {
                            name: "ns",
                            help: "Name of namespace"
                        }
                    ],
                    options: [

                    ],
                    handler: this.sliceCommand
                }
            ]
        });
    }

    async metaCommand(args, opts) {
        try {
            const namespaces = adone.meta.listNamespaces(args.get("ns"));
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
                        namespaces[i].paths = await adone.meta.getNamespacePaths(namespaces[i].name);
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
            // table = new BorderlessTable();
            // const parts = this._parsePath(args.get("ns"));
            // const key = parts.join(".");
            // let obj;
            // if (key === "") {
            //     obj = adone;
            // } else {
            //     obj = adone.vendor.lodash.get(adone, key, undefined);
            // }

            // const type = util.typeOf(obj);
            // switch (type) {
            //     case "function": adone.log(obj.toString()); break;
            //     default: adone.log(adone.inspect(obj, { style: "color", depth: 1, funcDetails: true }));
            // }
        } catch (err) {
            adone.log(err.message);
            return 1;
        }

        return 0;
    }

    async inspectCommand(args, opts) {
        try {
            // const dir = opts.get("dir");
            const name = args.get("name");
            const { namespace, objectName } = adone.meta.parseName(name);
            const inspectOptions = { style: "color", depth: 1, noDescriptor: true, noNotices: true, sort: true };

            if (objectName === "") {
                let obj;
                if (namespace === "global" || namespace === "") {
                    obj = global;
                } else {
                    obj = adone.vendor.lodash.get(adone, namespace.substring("adone".length + 1));
                }
                adone.log(adone.inspect(obj, inspectOptions));
            }
            // // const parts = this._parsePath(args.get("ns"));
            // // const subNs = parts.join(".");
            // // const pathPrefix = std.path.resolve(this.app.adoneRootPath, dir, "glosses");
            // // const pathSuffix = parts.join(adone.std.path.sep);
            // // const fullPath = "/________/ciferox/adone/src/glosses/netron/ws/netron.js";//std.path.join(pathPrefix, pathSuffix);
            // // if (!(await fs.exists(fullPath))) {
            // //     throw new adone.x.NotExists(`Path '${fullPath}' is not exists`);
            // // }

            // //const paths = await fs.glob(util.globize(fullPath, { recursive: true }));
            // const paths = [fullPath];
            // const result = [];
            // for (const path of paths) {
            //     const moduleInfo = {
            //         exports: []
            //     };
            //     moduleInfo.path = path;
            //     const mod = _.omit(adone.require(path), ["__esModule"]);
            //     const subPath = path.substring(pathPrefix.length + pathSuffix.length + 2);
            //     let nsSuffix = adone.std.path.dirname(subPath).replace(".", "");
            //     if (is.string(nsSuffix) && nsSuffix.length > 0) {
            //         nsSuffix = `.${nsSuffix.split("/\\").join(".")}`;
            //     } else {
            //         nsSuffix = "";
            //     }
            //     const namespace = `adone.${subNs}${nsSuffix}`;
            //     const inspector = new adone.meta.Inspector(path);
            //     await inspector.load();
            //     inspector.analyze();
            //     adone.log(adone.text.pretty.json(inspector.namespaces));
            //     adone.log();
            //     adone.log(adone.text.pretty.json(inspector.globals));
            //     adone.log();
            //     // for (const [key, val] of Object.entries(mod)) {
            //     //     let name;
            //     //     let isDefault;
            //     //     if (key === "default") {
            //     //         name = val.name;
            //     //         isDefault = true;
            //     //     } else {
            //     //         name = key;
            //     //         isDefault = false;
            //     //     }
            //     //     const type = util.typeOf(val);
            //     //     const exportEntry = {
            //     //         name,
            //     //         namespace,
            //     //         type
            //     //     };
            //     //     if (isDefault === true) {
            //     //         exportEntry.default = isDefault;
            //     //     }
            //     //     moduleInfo.exports.push(exportEntry);
            //     // }
            //     // result.push(moduleInfo);
            // }

            // // adone.log(adone.text.pretty.json(result));
        } catch (err) {
            adone.error(err);
            return 1;
        }
        return 0;
    }

    async extractCommand(args, opts) {
        try {
            const name = args.get("name");
            const { namespace, objectName } = adone.meta.parseName(name);
            if (namespace === "") {
                throw new adone.x.NotValid(`Not valid namespace: '${name}'`);
            }
            if (objectName === "") {
                throw new adone.x.NotValid(`'${name}' is a namespace`);
            }

            const dir = opts.get("dir");
            const sources = await adone.meta.sourceOf(name, dir);

            for (const srcPath of sources) {
                adone.log(srcPath);
                adone.log();
                const inspector = new adone.meta.Inspector(srcPath);
                await inspector.load();
                inspector.analyze();
                adone.log(adone.text.pretty.json(inspector.namespaces));
                adone.log();
                adone.log(adone.text.pretty.json(inspector.globals));
                adone.log();
            }

            const outPath = opts.get("out");
        } catch (err) {
            adone.error(err.message);
            return 1;
        }

        return 0;
    }

    _parsePath(ns) {
        const parts = ns.split(".");
        if (parts.length > 0 && (parts[0] === "adone" || parts[0] === "")) {
            parts.shift();
        }
        let obj = adone;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (!is.propertyOwned(obj, part)) {
                throw new adone.x.NotValid(`Not valid path: adone.${parts.slice(0, i + 1).join(".")}`);
            }
            obj = obj[part];
        }
        return parts;
    }
}
