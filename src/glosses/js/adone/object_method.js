export default class XObjectMethod extends adone.js.adone.Base {
    constructor(options) {
        super(options);
        this.name = this.ast.key.name;
    }

    getType() {
        return "ObjectMethod";
    }
}
adone.tag.define("CODEMOD_OBJECT_METHOD");
adone.tag.set(XObjectMethod, adone.tag.CODEMOD_OBJECT_METHOD);
