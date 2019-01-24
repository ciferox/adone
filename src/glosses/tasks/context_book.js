const {
    is
} = adone;

const CONTEXTMAP_SYMBOL = Symbol();

export default class ContextBook {
    constructor(manager) {
        this.manager = manager;
        this[CONTEXTMAP_SYMBOL] = new Map();
    }

    getContext(name) {
        if (!this[CONTEXTMAP_SYMBOL].has(name)) {
            throw new adone.error.NotFound(`Context '${name}' is not found`);
        }
        return this[CONTEXTMAP_SYMBOL].get(name).context;
    }

    async createContext(name, type = "std", sandbox = undefined, options = {}) {
        let impl = null;

        if (!is.string(name)) {
            throw new adone.error.InvalidArgument(`Invalid type of name: ${adone.meta.typeOf(name)}`);
        }

        if (this[CONTEXTMAP_SYMBOL].has(name)) {
            throw new adone.error.Exists(`Context '${name}' already exists`);
        }

        sandbox = sandbox || {};

        switch (type) {
            case "std": {
                adone.std.vm.createContext(sandbox, options);
                break;
            }
            case "isolated": {
                const isolate = this.manager.getIsolate();
                impl = isolate.createContext(options);
                const ctxGlobal = impl.globalReference();
                let bootstrapCode = "(async () => {\n";

                for (const [name, val] of Object.entries(sandbox)) {
                    ctxGlobal.setSync(name, new adone.vm.Reference(val));
                    bootstrapCode += `  ${name} = ${name}.derefInto()`;
                }

                bootstrapCode += "})();";

                const bootstrapScript = await isolate.compileScript(bootstrapCode);
                await bootstrapScript.run(impl);
                break;
            }
            default:
                throw new adone.error.Unknown(`Unknown type of context: ${type}`);
        }

        const context = new adone.task.Context(type, impl, sandbox);
        this[CONTEXTMAP_SYMBOL].set(name, context);

        return context;
    }
}
