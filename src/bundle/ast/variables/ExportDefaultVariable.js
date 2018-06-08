import LocalVariable from './LocalVariable';
export function isExportDefaultVariable(variable) {
    return variable.isDefault;
}
export default class ExportDefaultVariable extends LocalVariable {
    constructor(name, exportDefaultDeclaration) {
        super(name, exportDefaultDeclaration, exportDefaultDeclaration.declaration);
        // Not initialised during construction
        this.original = null;
        this.hasId = !!exportDefaultDeclaration.declaration
            .id;
    }
    addReference(identifier) {
        if (!this.hasId) {
            this.name = identifier.name;
            if (this.original !== null) {
                this.original.addReference(identifier);
            }
        }
    }
    getName(reset) {
        if (!reset && this.safeName)
            return this.safeName;
        if (this.original !== null && !this.original.isReassigned)
            return this.original.getName();
        return this.name;
    }
    referencesOriginal() {
        return this.original && !this.original.isReassigned;
    }
    getOriginalVariableName() {
        return this.original && this.original.getName();
    }
    setOriginalVariable(original) {
        this.original = original;
    }
}
ExportDefaultVariable.prototype.isDefault = true;
