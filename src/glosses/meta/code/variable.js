export default class XVariable extends adone.meta.code.Base {
    constructor(options) {
        super(options);

        const node = this.ast; 
        this.name = node.id.name;
        this.value = this.createXObject({ ast: node.init, xModule: this.xModule });
        this.value.name = this.name;
        this.kind = null;
    }
}
adone.tag.define("CODEMOD_VAR");
adone.tag.set(XVariable, adone.tag.CODEMOD_VAR);
