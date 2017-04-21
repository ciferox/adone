export default class XObject extends adone.meta.code.Base {
    constructor(options) {
        super(options);

        this._entries = new Map();

        for (const prop of this.ast.properties) {
            this._entries.set(prop.key.name, this.createXObject({ ast: prop, xModule: this.xModule }));
        }
    }

    entries() {
        return [...this._entries.entries()];
    }

    keys() {
        return [...this._entries.keys()];
    }

    values() {
        return [...this._entries.values()];
    }
}
adone.tag.define("CODEMOD_OBJECT");
adone.tag.set(XObject, adone.tag.CODEMOD_OBJECT);
