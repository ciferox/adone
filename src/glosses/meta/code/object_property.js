export default class XObjectProperty extends adone.meta.code.Base {
    constructor(options) {
        super(options);
        this.name = this.ast.key.name;
    }

    getType() {
        return "ObjectProperty";
    }
}
adone.tag.define("CODEMOD_OBJECT_PROPERTY");
adone.tag.set(XObjectProperty, adone.tag.CODEMOD_OBJECT_PROPERTY);
