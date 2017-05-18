const { is } = adone;

export default class XLazyFunction extends adone.meta.code.Base {
    constructor(options) {
        super(options);
        if (!is.null(this.ast) && this.ast.id) {
            this.name = this.ast.id.name;
        } else {
            this.name = null;            
        }
    }

    getType() {
        return "LazyFunction";
    }
}
adone.tag.define("CODEMOD_LAZYFUNCTION");
adone.tag.set(XLazyFunction, adone.tag.CODEMOD_LAZYFUNCTION);
