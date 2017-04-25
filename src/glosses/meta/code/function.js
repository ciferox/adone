const { is } = adone;

export default class XFunction extends adone.meta.code.Base {
    constructor(options) {
        super(options);
        if (!is.null(this.ast) && this.ast.id) {
            this.name = this.ast.id.name;
        } else {
            this.name = null;            
        }
    }
}
adone.tag.define("CODEMOD_FUNCTION");
adone.tag.set(XFunction, adone.tag.CODEMOD_FUNCTION);
