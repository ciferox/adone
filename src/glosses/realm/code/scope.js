const {
    error,
    lodash
} = adone;

export default class Scope {
    #variables = new Map();

    constructor() {
        this.children = [];
    }

    get size() {
        return this.#variables.size;
    }

    get identifiers() {
        return [...this.#variables.keys()];
    }

    contains(name) {
        return this.#variables.has(name);
    }

    get(name) {
        return this.#variables.get(name);
    }

    getAll({ native = true, declared = true } = {}) {
        return [...this.#variables.values()]
            .filter((v) => ((v.isNative && native) || !v.isNative))
            .filter((v) => (!v.isNative && declared) || v.isNative);
    }

    add(variable) {
        if (this.#variables.has(variable.name)) {
            throw new error.ExistsException(`Identifier '${variable.name}' has already been declared`);
        }
        this.#variables.set(variable.name, variable);
    }
}
