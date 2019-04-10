export default class ObjectProperty extends adone.realm.code.BaseNode {
    constructor(ast, parent, parentScope) {
        super(ast, parent, parentScope);

        this.key = undefined;
        this.value = undefined;
    }
}
