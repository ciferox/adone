export default class XObjectProperty extends adone.realm.code.Base {
    constructor(options) {
        super(options);
        this.name = this.ast.key.name;
    }

    getType() {
        return "ObjectProperty";
    }
}
