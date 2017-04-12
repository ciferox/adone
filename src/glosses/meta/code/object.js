export default class XObject extends adone.meta.code.Base {
    constructor(options) {
        super(options);

        this._entries = {};

        for (const prop of this.ast.properties) {
            this._entries[prop.key.name] = this.createXObject({ ast: prop.value, xModule: this.xModule });
        }
    }

    entries() {
        return Object.entries(this._entries);
    }

    keys() {
        return Object.keys(this._entries);
    }

    values() {
        return Object.values(this._entries);
    }
}
adone.tag.define("CODEMOD_OBJECT");
adone.tag.set(XObject, adone.tag.CODEMOD_OBJECT);
