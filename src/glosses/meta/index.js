const { is, std, fs, util } = adone;

const GLOBAL_PREFIX_LEN = "global".length + 1;
const ADONE_PREFIX_LEN = "adone".length + 1;
export const skipAdoneNs = (namespace) => namespace.substring(ADONE_PREFIX_LEN);
export const skipGlobalNs = (namespace) => namespace.substring(GLOBAL_PREFIX_LEN);

adone.lazify({
    reflect: "./reflect",
    inspect: ["./inspect", (mod) => mod.inspect],
    inspectError: ["./inspect", (mod) => mod.inspectError],
    inspectStack: ["./inspect", (mod) => mod.inspectStack],
    namespaces: ["./consts", (mod) => mod.namespaces],
    nsNames: () => adone.meta.namespaces.map((ns) => ns.name).sort((a, b) => a.localeCompare(b)),
    nsPaths: () => {
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
    while (namespace.length > 0 && !adone.meta.nsNames.includes(namespace)) {
        namespace = namespace.split(".").slice(0, -1).join(".");
    }

    let objectName;
    if (namespace.length === 0) {
        objectName = name;
    } else {
        objectName = name.substring(namespace.length + 1);
    }

    return {
        namespace,
        objectName
    };
};

export const getNamespaceInfo = (nsName) => {
    const namespace = adone.meta.namespaces.find((ns) => ns.name === nsName);
    if (is.undefined(namespace)) {
        throw new adone.x.Unknown(`Unknown namespace: ${nsName}`);
    }
    return namespace;
};

export const getNamespacePaths = async ({ name, relative = true, pathPrefix = std.path.join(adone.application.instance.adoneRootPath, "lib") }) => {
    const { namespace } = parseName(name);
    if (namespace === "") {
        return [];
    }
    const paths = adone.meta.nsPaths[namespace].map((p) => std.path.join(pathPrefix, p));
    let targetPaths = [];
    for (let i = 0; i < paths.length; i++) {
        let path = paths[i];
        let isDirectory;
        if ((await fs.exists(path))) {
            if (await fs.is.directory(path)) {
                isDirectory = true;
            } else {
                isDirectory = false;
            }
        } else {
            path = await fs.lookup(path);
            if (await fs.is.file(path)) {
                isDirectory = false;
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
    return (relative ? targetPaths.map((x) => x.substring(pathPrefix.length + 1)) : targetPaths);
};

export const listNamespaces = (keyword = "", { threshold = 0.3 } = { }) => {
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
            threshold
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

export const search = (keyword, nsName = "adone", { threshold = 0.3 } = {}) => {
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

export const getValue = (name) => {
    let obj;
    if (name.startsWith("global.")) {
        obj = adone.vendor.lodash.get(global, adone.meta.skipGlobalNs(name));
    } else {
        obj = adone.vendor.lodash.get(adone, adone.meta.skipAdoneNs(name));
    }
    return obj;
};
