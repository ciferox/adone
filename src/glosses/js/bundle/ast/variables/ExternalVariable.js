import Variable from "./Variable";
export function isExternalVariable(variable) {
    return variable.isExternal;
}
export default class ExternalVariable extends Variable {
    constructor(module, name) {
        super(name);
        this.module = module;
        this.isExternal = true;
        this.isNamespace = name === "*";
    }

    addReference(identifier) {
        if (this.name === "default" || this.name === "*") {
            this.module.suggestName(identifier.name);
        }
    }

    includeVariable() {
        if (this.included) {
            return false;
        }
        this.included = true;
        this.module.used = true;
        return true;
    }
}
