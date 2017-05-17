const { is } = adone;

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
                        enumerable: true,
                        value: mod
                    });
                    return mod;
                }
            });
        }
        return obj;
    };
    const adone = Object.create({
        lazify,
        log: console.log,
        fatal: console.error,
        error: console.error,
        warn: console.warn,
        info: console.info,
        debug: console.debug,
        trace: console.trace,
        null: Symbol(),
        noop: () => { },
        identity: (x) => x,
        truly: () => true,
        falsely: () => false,
        ok: "OK"
    });

    lazify({
{{ code | safe }}
    }, adone);

    window["adone"] = adone;
})();
`;

const ignoredRefs = [
    "adone.native",
    "adone.bind",
    "adone.lazify",
    "adone.log",
    "adone.fatal",
    "adone.error",
    "adone.warn",
    "adone.info",
    "adone.debug",
    "adone.trace",
    "adone.null",
    "adone.noop",
    "adone.identity",
    "adone.truly",
    "adone.falsely",
    "adone.ok"
];

export default class Bundler {
    constructor() {
        this.inspector = new adone.meta.code.Inspector();
        this._refExprs = [];
    }
    async prepare(name) {
        adone.info(`Preparing bundle for '${name}'`);
        await this._lookupRefs(name);
        this.name = name;
        // const x = this.inspector.get(name);

        // adone.log(/*x.name, x.ast.type, */x.code);
        // adone.log(adone.meta.inspect(x.references(), { style: "color" }));

        // adone.log(x.name, x.ast.type, adone.meta.inspect(x.xModule.globals, { style: "color" }));

        // adone.log(this._refExprs);
    }

    async generate() {
        const x = this.inspector.get(this.name);
        const allRefs = [];
        
        this._obtainReferences(x, allRefs);
        const bundleSchema = {};

        for (const ref of allRefs) {
            adone.vendor.lodash.set(bundleSchema, ref.split(".").slice(1), null);

        }
        adone.log(bundleSchema);
        // adone.log(x.references());
        // adone.log(this._generateReferencesDeclaration(x));

        return this._generate("adone", bundleSchema, bundleTemplate, 8);
    }

    _obtainReferences(xObj, allRefs) {
        const refs = xObj.references();
        for (const ref of refs) {
            if (ref.startsWith("adone.") && !ref.startsWith("adone.vendor.") && !ref.startsWith("adone.std.") && !ignoredRefs.includes(ref) && !allRefs.includes(ref)) {
                allRefs.push(ref);
                const x = this.inspector.get(ref);
                this._obtainReferences(x, allRefs);
            }
        }
    }

    _generate(nsName, schema, codeTemplate, tabSize) {
        const lazies = [];
        for (const [key, val] of Object.entries(schema)) {
            if (is.null(val)) {
                const objectName = `${nsName}.${key}`;
                const xObj = this.inspector.get(objectName);
                if (adone.meta.code.is.arrowFunction(xObj)) {
                    adone.log(xObj.references());
                    lazies.push(`${" ".repeat(tabSize)}${key}: ${xObj.code}`);
                }
            }
        }


        // return lazies.join(",\n");
        return adone.templating.nunjucks.renderString(codeTemplate, {
            code: lazies.join(",\n")
        });
    }

    _generateReferencesDeclaration(xObj) {
        const refs = xObj.references();
        const lazyRefs = [];
        let maxLevel = 0;
        const globalNames = xObj.xModule.globals.map((x) => x.name);

        for (const ref of refs) {
            if (ref.startsWith("adone.")) {
                const parts = ref.split(".");

                lazyRefs.push(parts.slice(1));
                const sz = parts.length - 1;
                if (maxLevel < sz) {
                    maxLevel = sz;
                }
            }
        }

        const obj = {};

        for (let level = 0; level < maxLevel; level++) {
            for (let i = 0; i < lazyRefs.length; i++) {
                const parts = lazyRefs[i];
                if (level < parts.length) {
                    let subObj = obj;
                    for (let j = 0; j <= level; j++) {
                        const part = parts[j];

                        if (!is.propertyOwned(obj, part)) {
                            if (globalNames.includes(part)) {
                                subObj[part] = null;
                            } else if (j < (parts.length - 1)) {
                                subObj[part] = {};
                            } else {
                                break;
                            }
                        }
                        subObj = subObj[part];
                    }
                }
            }
        }

        return `const ${adone.std.util.inspect(obj, { depth: null, breakLength: Infinity }).replace(/: null/g, "")} = adone;`;
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

        if (!this.inspector.namespaces.has(namespace)) {
            await this.inspector.attachNamespace(namespace);
        }
        if (!this._refExprs.includes(name)) {
            this._addRefExpr(name);
            const x = this.inspector.get(name);
            const refs = x.references();
            // this._collectRefExprs(refs);

            adone.info("Referenced namespaces:");
            adone.log(adone.text.pretty.json(refs));

            for (const ref of refs) {
                // Ignore in-module refs
                if (ref.indexOf(".") >= 0) {
                    await this._lookupRefs(ref);
                }
            }
        }
    }

    _collectRefExprs(refs) {
        for (const ref of refs) {
            this._addRefExpr(ref);
        }
    }

    _addRefExpr(name) {
        if (!this._refExprs.includes(name)) {
            this._refExprs.push(name);
        }
    }
}
