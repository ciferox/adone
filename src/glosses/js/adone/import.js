export default class XImport extends adone.js.adone.Base {
    getType() {
        return "ImportDeclaration";
    }
}
adone.tag.define("CODEMOD_IMPORT");
adone.tag.add(XImport, "CODEMOD_IMPORT");
