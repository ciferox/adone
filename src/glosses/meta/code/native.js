export default class XNative extends adone.meta.code.Base {
    constructor(options) {
        super(options);
        if (adone.is.string(options.name)) {
            this.name = options.name;
        }
    }

    getType() {
        return "Native";
    }
}
adone.tag.define("CODEMOD_NATIVE");
adone.tag.set(XNative, adone.tag.CODEMOD_NATIVE);
