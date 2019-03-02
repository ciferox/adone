export default class XObjectProperty extends adone.js.adone.Base {
    constructor(options) {
        super(options);
        this.name = this.ast.key.name;
    }

    getType() {
        return "ObjectProperty";
    }
}
