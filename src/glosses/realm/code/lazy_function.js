const {
    is
} = adone;

export default class XLazyFunction extends adone.realm.code.Base {
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
