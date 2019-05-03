const {
    is,
    realm
} = adone;

export default class Inspector {
    constructor(cwd = adone.cwd) {
        this.cwd = cwd;
        this.namespaces = new Map();
    }

    async attachNamespace(nsName) {
        if (!this.namespaces.has(nsName)) {
            const ns = await realm.code.Namespace.inspect(nsName, this.cwd);
            // console.log(ns.name);
            // console.log(adone.meta.inspect(Object.keys(ns.exports), { style: "color" }));
            this.namespaces.set(nsName, ns/*await realm.code.Namespace.inspect(nsName, this.cwd)*/);
        }
    }

    isAttached(name) {
        const { namespace } = adone.meta.parseName(name);
        return this.namespaces.has(namespace);
    }

    listNamespaces() {
        return [...this.namespaces.keys()];
    }

    getNamespace(name, names = null) {
        const { namespace, objectName } = adone.meta.parseName(name);
        if (!this.namespaces.has(namespace)) {
            throw new adone.error.UnknownException(`Unknown namespace: '${namespace}'`);
        }
        if (is.plainObject(names)) {
            names.namespace = namespace;
            names.objectName = objectName;
        }
        return this.namespaces.get(namespace);
    }

    get(name) {
        const names = {};
        const ns = this.getNamespace(name, names);
        return ns.get(names.objectName);
    }

    getCode(name) {
        const xObj = this.get(name);
        return xObj.code;
    }
}
