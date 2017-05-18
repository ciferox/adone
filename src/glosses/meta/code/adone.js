export default class XAdone extends adone.meta.code.Base {
    getType() {
        return "Adone";
    }
}
adone.tag.define("CODEMOD_ADONE");
adone.tag.set(XAdone, adone.tag.CODEMOD_ADONE);
