export default class XAdone extends adone.js.adone.Base {
    getType() {
        return "Adone";
    }
}
adone.tag.define("CODEMOD_ADONE");
adone.tag.set(XAdone, adone.tag.CODEMOD_ADONE);
