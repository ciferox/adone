export default class ObjectPattern extends adone.realm.code.BaseNode {
    constructor(ast, parent, parentScope) {
        super(ast, parent, parentScope);

        this.properties = [];
    }

    addProperty(prop) {
        this.properties.push(prop);
    }
}
