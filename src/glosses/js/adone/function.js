const {
    is
} = adone;

export default class XFunction extends adone.js.adone.Base {
    constructor(options) {
        super(options);
        if (!is.null(this.ast) && this.ast.id) {
            this.name = this.ast.id.name;
        } else {
            this.name = null;
        }
    }

    getType() {
        return "Function";
    }
}
adone.tag.define("CODEMOD_FUNCTION");
adone.tag.add(XFunction, "CODEMOD_FUNCTION");
