export default class XConstant extends adone.meta.code.Base {
    getType() {
        return "Constant";
    }
}
adone.tag.define("CODEMOD_CONST");
adone.tag.set(XConstant, adone.tag.CODEMOD_CONST);
