const { is } = adone;

export default class XClass extends adone.meta.code.Base {
    constructor(options) {
        super(options);
        this.superClass = null;
        if (!is.null(this.ast)) {
            this.name = this.ast.id.name;
        } else {
            this.name = null;            
        }
    }
}
adone.tag.define("CODEMOD_CLASS");
adone.tag.set(XClass, adone.tag.CODEMOD_CLASS);
