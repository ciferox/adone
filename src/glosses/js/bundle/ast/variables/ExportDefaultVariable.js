import LocalVariable from "./LocalVariable";
export default class ExportDefaultVariable extends LocalVariable {
    constructor(name, exportDefaultDeclaration) {
        super(name, exportDefaultDeclaration, exportDefaultDeclaration.declaration);
        this.isDefault = true;
        this.hasId = Boolean(exportDefaultDeclaration.declaration.id);
    }

    addReference(identifier) {
        this.name = identifier.name;
        if (this._original) {
            this._original.addReference(identifier);
        }
    }

    getName() {
        if (this._original && !this._original.isReassigned) {
            return this._original.getName();
        }
        return this.safeName || this.name;
    }

    getOriginalVariableName() {
        return this._original && this._original.getName();
    }

    setOriginalVariable(original) {
        this._original = original;
    }
}
