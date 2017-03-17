const { is, std, fs, util } = adone;
// const { parse, traverse } = adone.js.compiler;

const GLOBAL_PREFIX_LEN = "global".length + 1;
const ADONE_PREFIX_LEN = "adone".length + 1;
export const skipAdoneNs = (namespace) => namespace.substring(ADONE_PREFIX_LEN);
export const skipGlobalNs = (namespace) => namespace.substring(GLOBAL_PREFIX_LEN);

adone.lazify({
    reflect: "./reflect",
    namespaces: ["./consts", (mod) => mod.namespaces],
    names: () => adone.meta.namespaces.map((ns) => ns.name).sort((a, b) => a.localeCompare(b)),
    paths: () => {
        const result = {};
        const len = adone.meta.namespaces.length;
        for (let i = 0; i < len; i++) {
            const ns = adone.meta.namespaces[i];
            result[ns.name] = ns.paths;
        }
        return result;
    }
}, exports, require);

export const parseName = (name) => {
    let namespace = name;
    while (namespace.length > 0 && !adone.meta.names.includes(namespace)) {
        namespace = namespace.split(".").slice(0, -1).join(".");
    }
    const objectName = name.substring(namespace.length + 1);

    return {
        namespace,
        objectName
    };
};

export const getNamespacePaths = async (name) => {
    const { namespace } = parseName(name);
    if (namespace === "") {
        return [];
    }
    const pathPrefix =  std.path.join(adone.appinstance.adoneRootPath, "lib");
    const paths = adone.meta.paths[namespace].map((p) => std.path.join(pathPrefix, p));
    let targetPaths = [];
    for (let i = 0; i < paths.length; i++) {
        let path = paths[i];
        let isDirectory;
        if ((await fs.exists(path))) {
            if (await fs.isDirectory(path)) {
                isDirectory = true;
            } else {
                isDirectory = false;
            }
        } else {
            for (const ext of adone.exts) {
                const newPath = `${path}${ext}`;
                if ((await fs.exists(newPath)) && (await fs.isFile(newPath))) {
                    isDirectory = false;
                    path = `${path}${ext}`;
                    break;
                }
            }
        }
        if (is.undefined(isDirectory)) {
            throw new adone.x.NotValid(`Path ${path} is neither a file nor a directory`);
        }

        if (isDirectory) {
            path = util.globize(path, { exts: `{${adone.exts.join(",")}}` } );
        }
        targetPaths.push(path);
    }

    if (targetPaths.length === 0) {
        return [];
    }
    targetPaths = await fs.glob(targetPaths);
    return targetPaths.map((x) => x.substring(pathPrefix.length + 1));
};

export const listNamespaces = (keyword = "") => {
    let result;
    if (keyword === "" || keyword === "global") {
        result = [
            adone.meta.namespaces[0],
            adone.meta.namespaces[1]
        ];
    } else if (keyword === "adone") {
        result = adone.meta.namespaces;
    } else {
        const fuzzy = new adone.text.Fuzzy(adone.meta.namespaces, {
            keys: ["name"],
            threshold: 0.1
        });
        result = fuzzy.search(keyword);
    }

    return adone.vendor.lodash.cloneDeep(result.sort((a, b) => a.name.localeCompare(b.name)));
};

export const isNamespace = (name) => {
    if (name === "global.adone") {
        return true;
    }
    return adone.meta.names.includes(name);
};

export const search = (keyword, nsName = "adone", { threshold = 0.1 } = {}) => {
    let { namespace } = adone.meta.parseName(nsName);

    if (namespace !== nsName) {
        throw new adone.x.NotValid(`Invalid namespace: ${nsName}`);
    }

    let ns;
    if (namespace === "" || namespace === "global") {
        namespace = "global";
        ns = global;
    } else if (namespace === "adone") {
        ns = adone;
    } else {
        ns = adone.vendor.lodash.get(adone, skipAdoneNs(namespace));
    }

    const keys = Object.getOwnPropertyNames(ns);
    const nestedNamespaces = [];
    for (let i = 0; i < keys.length; i++) {
        const name = `${namespace}.${keys[i]}`;
        if (isNamespace(name)) {
            nestedNamespaces.push(name === "global.adone" ? "adone" : name);
            keys.splice(i, 1);
        }
    }

    const fuzzy = new adone.text.Fuzzy(keys, {
        threshold
    });
    let result = fuzzy.search(keyword).map((x) => `${namespace}.${keys[x]}`);

    for (const nsName of nestedNamespaces) {
        result = result.concat(search(keyword, nsName, { threshold }));
    }

    return result;
};

// export class Inspector {
//     constructor() {
//         this.code = null;
//     }



//     // async load(filePath) {
//     //     this.filePath = filePath;
//     //     this.code = await fs.readFile(this.filePath, { check: true, encoding: "utf8" });
//     //     return this;
//     // }
// }

// export class Inspector {
//     constructor(filePath, { transpiled = false } = {}) {
//         this.code = null;
//         this.filePath = filePath;
//         this.transpiled = transpiled;
//         this.ast = null;
//         this.module = null;
//         this.globals = ["global", "adone"];
//         this.namespaces = ["global", "adone"];
//         this.namespaceAliases = {};
//     }

//     analyze() {
//         this.compile();

//         this.ast = parse(this.code, {
//             sourceType: "module",
//             plugins: [
//                 "decorators",
//                 "functionBind"
//             ]
//         });

//         traverse(this.ast, {
//             VariableDeclaration: (path) => {
//                 // Process only const declarations.
//                 if (path.node.kind === "const") {
//                     for (const decl of path.node.declarations) {
//                         this._traverseVariableDeclarator(decl);
//                     }
//                 }
//             },
//             MemberExpression: (path) => {
//                 this._addNamespace(this._traverseMemberExpression(path.node));
//             }
//         });

//         return this;
//     }

//     compile() {
//         if (is.null(this.module)) {
//             let transform;
//             if (this.transpiled) {
//                 transform = null;
//             } else {
//                 const options = {
//                     compact: false,
//                     sourceMaps: "inline",
//                     plugins: [
//                         "transform.flowStripTypes",
//                         "transform.decoratorsLegacy",
//                         "transform.classProperties",
//                         "transform.ESModules",
//                         "transform.functionBind",
//                         "transform.objectRestSpread"
//                     ]
//                 };
//                 transform = adone.js.Module.transforms.transpile(options);
//             }
//             this.module = new adone.js.Module(this.filePath, {
//                 transform
//             });
//             this.module._compile(this.code, this.filePath);
//         }

//         return this;
//     }

//     hasExport(name) {
//         this.compile();
//         const moduleExports = adone.vendor.lodash.omit(this.module.exports, ["__esModule"]);

//         for (const [key, obj] of Object.entries(moduleExports)) {
//             if (is.function(obj) && obj.name === name) {
//                 return true;
//             } else if (key === name) {
//                 return true;
//             }
//         }

//         return false;
//     }

//     _traverseMemberExpression(node) {
//         let prefix;
//         const type = node.object.type;
//         if (type === "MemberExpression") {
//             prefix = this._traverseMemberExpression(node.object);
//         } else if (type === "Identifier") {
//             return `${node.object.name}.${node.property.name}`;
//         }

//         if (is.undefined(prefix)) {
//             return node.property.name;
//         } else {
//             return `${prefix}.${node.property.name}`;
//         }
//     }

//     _traverseObjectProperty(node) {
//         const key = node.key;
//         const value = node.value;
//         if (key.type === value.type) {
//             if (key.start === value.start && key.end === value.end) {
//                 return [value.name];
//             } else {
//                 this.globals.push(value.name);
//                 return [key.name];
//             }
//         } else if (value.type === "ObjectPattern") {
//             const result = [];
//             const prefix = `${key.name}.`;
//             const exprs = this._traverseObjectPattern(value);
//             for (const expr of exprs) {
//                 result.push(`${prefix}${expr}`);
//             }
//             return result;
//         }
//     }

//     _traverseObjectPattern(node) {
//         const result = [];
//         for (const prop of node.properties) {
//             if (prop.type === "ObjectProperty") {
//                 const exprs = this._traverseObjectProperty(prop);
//                 for (const expr of exprs) {
//                     result.push(expr);
//                 }
//             }
//         }
//         return result;
//     }

//     _traverseVariableDeclarator(node) {
//         let prefix = "";
//         if (node.init === null) {
//             return;
//         }
//         const initType = node.init.type;
//         switch (initType) {
//             case "Identifier": prefix = node.init.name; break;
//             case "MemberExpression": prefix = this._traverseMemberExpression(node.init); break;
//         }

//         if (prefix.length > 0) {
//             prefix = `${prefix}.`;
//         }
        
//         if (node.id.type === "ObjectPattern") {
//             const exprs = this._traverseObjectPattern(node.id);
//             for (const expr of exprs) {
//                 if (this._addNamespace(`${prefix}${expr}`)) {
//                     if (expr.indexOf(".") > 0) {
//                         const parts = expr.split(".");
//                         this._addGlobal(parts[parts.length - 1]);
//                     } else {
//                         this._addGlobal(expr);
//                     }
//                 }
//             }
//         }
//     }

//     _isValidExpression(expr) {
//         for (const prefix of this.globals) {
//             if (expr.startsWith(`${prefix}.`)) {
//                 return prefix;
//             }
//         }
//         return null;
//     }

//     _addNamespace(expr) {
//         let added = false;
//         const globalExpr = this._isValidExpression(expr);
//         if (!is.null(globalExpr)) {
//             let subExpr = expr;
//             for (let counter = 0; subExpr !== globalExpr; counter++) {
//                 if (adone.meta.namespaces.includes(subExpr) && !this.namespaces.includes(subExpr)) {
//                     (counter === 0) && (added = true);
//                     this.namespaces.push(subExpr);
//                 }
//                 subExpr = subExpr.split(".").slice(0, -1).join(".");
//             }
//         }
//         return added;
//     }
    
//     _addGlobal(expr) {
//         if (!this.globals.includes(expr)) {
//             this.globals.push(expr);
//         }
//     }
// }
