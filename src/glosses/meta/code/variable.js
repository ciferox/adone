export default class XVariable extends adone.meta.code.Base {
    constructor(options) {
        super(options);

        const node = this.ast.declarations[0]; 
        this.name = node.id.name;
        this.value = this.createXObject(node.init);
    }
}
adone.tag.define("CODEMOD_VAR");
adone.tag.set(XVariable, adone.tag.CODEMOD_VAR);
