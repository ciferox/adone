export default class XExpression extends adone.meta.code.Base {
    getType() {
        return "Expression";
    }
}
adone.tag.define("CODEMOD_EXPRESSION");
adone.tag.set(XExpression, adone.tag.CODEMOD_EXPRESSION);
