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
        this._refExprs = [];
    }
    async prepare(name) {
        adone.info(`Preparing bundle for '${name}'`);
        await this._lookupRefs(name);
        // const x = this.inspector.get(name);

        // adone.log(x.name, x.ast.type, x.code);
        // adone.log(adone.meta.inspect(x.references(), { style: "color" }));

        // adone.log(x.name, x.ast.type, adone.meta.inspect(x.xModule.globals, { style: "color" }));

        // adone.log(this._refExprs);
    }

    async _lookupRefs(name) {
        const { namespace } = adone.meta.parseName(name);
        adone.info(`Processing: '${name}'`);
        if (!namespace.startsWith("adone")) {
            throw new adone.x.NotSupported("Extraction from namespace other than 'adone' is not supported");
        }
        if (namespace.startsWith("adone.vendor")) {
            adone.info("Skipping 'adone.vendor.*' code");
            return;
        } else if (namespace.startsWith("adone.std")) {
            adone.info("Skipping 'adone.std.*' code");
            return;
        }

        await this.inspector.attachNamespace(namespace);

        const x = this.inspector.get(name);
        const refs = x.references();
        this._collectRefExprs(refs);

        adone.info("Referenced namespaces:");
        adone.log(adone.text.pretty.json(refs));

        for (const ref of refs) {
            // Ignore in-module refs
            if (ref.indexOf(".") >= 0) {
                await this._lookupRefs(ref);
            }
        }
    }

    _collectRefExprs(refs) {
        for (const ref of refs) {
            if (!this._refExprs.includes(ref)) {
                this._refExprs.push(ref);
            }
        }
    }
}
