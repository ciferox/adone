export default class BaseNode {
    constructor(ast, parent, parentScope) {
        this.ast = ast;
        this.parent = parent;
        this.parentScope = parentScope;
        this.variable = undefined;
    }
}
