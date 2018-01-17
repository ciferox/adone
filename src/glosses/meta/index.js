const {
    is
} = adone;

const GLOBAL_PREFIX_LEN = "global".length + 1;
const ADONE_PREFIX_LEN = "adone".length + 1;
export const skipAdoneNs = (namespace) => namespace.substring(ADONE_PREFIX_LEN);
export const skipGlobalNs = (namespace) => namespace.substring(GLOBAL_PREFIX_LEN);

adone.lazify({
    reflect: "./reflect",
    inspect: ["./inspect", (mod) => mod.inspect],
    inspectError: ["./inspect", (mod) => mod.inspectError],
    inspectStack: ["./inspect", (mod) => mod.inspectStack],
    nsNames: () => adone.meta.namespaces.map((ns) => ns.name).sort((a, b) => a.localeCompare(b))
}, adone.asNamespace(exports), require);

const adoneConf = adone.configuration.Adone.loadSync({
    cwd: adone.rootPath
});

const metaNamespace = adoneConf.getNamespace();

// Add global namespace
metaNamespace.global = metaNamespace.adone.namespace.global = {
    description: "Global namespace"
};

const isNamespace = (name) => {
    if (name === "global.adone") {
        return true;
    }
    return adone.meta.names.includes(name);
};

export const namespaces = [];
export const namespaceMap = metaNamespace;

const collectNamespace = (namespaceMap, prefix) => {
    if (is.nil(namespaceMap)) {
        return;
    }
    for (const [name, val] of Object.entries(namespaceMap)) {
        const nsName = is.null(prefix) ? name : `${prefix}.${name}`;
        namespaces.push(Object.assign({
            name: nsName
        }, adone.vendor.lodash.omit(val, ["namespace"])));
        collectNamespace(val.namespace, nsName);
    }
};

collectNamespace(metaNamespace, null);


export const getNamespaceInfo = (nsName) => {
    const namespace = namespaces.find((ns) => ns.name === nsName);
    if (is.undefined(namespace)) {
        throw new adone.x.Unknown(`Unknown namespace: ${nsName}`);
    }
    return namespace;
};

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

    const nsInfo = getNamespaceInfo(namespace);
    if (nsInfo.virtual === true) {
        namespace = namespace.substring("adone".length + 1);

        const parts = objectName.split(".");
        let i;
        for (i = 0; i < parts.length; i++) {
            const part = parts[i];
            const subPath = `${namespace}.${part}`;
            const obj = adone.vendor.lodash.get(adone, subPath);
            if (!is.namespace(obj)) {
                break;
            }
            namespace = subPath;
        }

        namespace = `adone.${namespace}`;
        objectName = parts.slice(i).join(".");
    }

    return {
        namespace,
        objectName
    };
};

export const listNamespaces = (keyword = "", { threshold = 0.3 } = {}) => {
    let result;
    if (keyword === "" || keyword === "global") {
        result = [
            namespaces[0],
            namespaces[1]
        ];
    } else if (keyword === "adone") {
        result = namespaces;
    } else {
        const fuzzy = new adone.text.Fuzzy(namespaces, {
            keys: ["name"],
            threshold
        });
        result = fuzzy.search(keyword);
    }

    return adone.vendor.lodash.cloneDeep(result.sort((a, b) => a.name.localeCompare(b.name)));
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
