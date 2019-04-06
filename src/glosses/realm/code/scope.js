const {
    error
} = adone;

export default class Scope {
    #variables = new adone.collection.HashSet(null, (v) => v.name);

    constructor(/*nodes = null*/) {
        // this.astNodes = nodes;
        this.children = [];
    }

    get size() {
        return this.#variables.size;
    }

    get identifiers() {
        return [...this.#variables.values()].map((v) => v.name);
    }

    contains(name) {
        return this.#variables.has({ name });
    }

    get(name) {
        if (!this.contains(name)) {
            throw new error.NotExistsException(`Variable '${name}' not found`);
        }

        return [...this.#variables.values()].find((v) => v.name === name);
    }

    getAll({ native = true, declared = true } = {}) {
        return [...this.#variables.values()]
            .filter((v) => ((v.isNative && native) || !v.isNative))
            .filter((v) => (!v.isNative && declared) || v.isNative);
    }

    addDeclaration(variable) {
        if (this.#variables.has(variable)) {
            throw new error.ExistsException(`Identifier '${variable.name}' has already been declared`);
        }
        this.#variables.add(variable);
    }

    addChild(scope) {
        this.children.push(scope);
    }
}
