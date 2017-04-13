const bundleTemplate = `
; (function () {
    const lazify = (modules, obj_) => {
        const obj = obj_ || {};
        const keys = Object.keys(modules);
        for (const key of keys) {
            Object.defineProperty(obj, key, {
                configurable: true,
                get() {
                    const value = modules[key];
                    const mod = value(key);
                    Object.defineProperty(obj, key, {
                        configurable: false,
                        value: mod
                    });
                    return mod;
                }
            });
        }
    };
    const adone = Object.create({
        lazify
    });

    lazify({
        {{ namespaces }}
    }, adone);

    window["adone"] = adone;
})();
`;

export default class Bundler {
    constructor({ dir }) {
        this.inspector = new adone.meta.code.Inspector({ dir });
    }
    async prepare(name) {
        await this._lookupRefs(name);
        // adone.log(this.inspector.listNamespaces());

        const x = this.inspector.get(name);

        // adone.log(x.name, x.ast.type, x.code);
        // adone.log(adone.meta.inspect(x.references(), { style: "color" }));

        // adone.log(x.name, x.ast.type, adone.meta.inspect(x.xModule.globals, { style: "color" }));
    }

    async _lookupRefs(name) {
        const { namespace, objectName } = adone.meta.parseName(name);
        if (!namespace.startsWith("adone")) {
            throw new adone.x.NotSupported("Extraction from namespace other than 'adone' is not supported");
        }
        if (objectName === "") {
            throw new adone.x.NotValid("Extraction of namespace is not supported");
        }

        await this.inspector.attachNamespace(namespace);

        const x = this.inspector.get(name);

        const refs = x.references();

        for (const ref of refs) {
            if (ref.startsWith("adone.is.") || ref.startsWith("adone.x.")) {
                await this._lookupRefs(ref);
            }
        }
    }
}
