export default class XVariable extends adone.js.adone.Base {
    constructor(options) {
        super(options);

        const node = this.ast;
        this.name = node.id.name;
        if (!adone.is.null(node.init)) {
            this.value = this.createXObject({ ast: node.init, xModule: this.xModule });
            this.value.name = this.name;
        }
        this.kind = null;
    }

    getType() {
        return "Variable";
    }
}
