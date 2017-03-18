const { is } = adone;

export default class XClass extends adone.meta.codemod.Base {
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
