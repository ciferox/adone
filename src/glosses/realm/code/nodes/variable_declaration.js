export default class VariableDeclaration extends adone.realm.code.BaseNode {
    constructor(ast, parent, parentScope) {
        super(ast, parent, parentScope);

        this.declarations = [];
    }
}
