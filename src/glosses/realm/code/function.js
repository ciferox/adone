export default class Function {
    constructor(node, scope, { isArrow = false } = {}) {
        this.node = node;
        this.scope = scope;
        this.isArrow = isArrow;
    }
}
