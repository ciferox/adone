const {
    realm: { code: { scope, type } }
} = adone;

export default class ModuleScope extends scope.Scope {
    constructor() {
        super();

        this.addDeclaration("global", new type.ObjectType());
        this.addDeclaration("console", new type.ObjectType());
        this.addDeclaration("undefined", new type.UndefinedType());
    }
}
