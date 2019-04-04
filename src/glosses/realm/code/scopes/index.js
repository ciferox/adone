const {
    error,
    is,
    realm: { code }
} = adone;

export class Scope {
    identifiers = new Map();

    constructor() {
        this.children = [];
    }

    contains(name) {
        return this.identifiers.has(name);
    }

    addDeclaration(name, type) {
        if (this.identifiers.has(name)) {
            throw new error.ExistsException(`Identifier '${name}' has already been declared`);
        }
        this.identifiers.set(name, type);
    }
}

adone.lazify({
    GlobalScope: "./global",
    ModuleScope: "./module",
    FunctionScope: "./function",
    BlockScope: "./block"
}, exports, require);
