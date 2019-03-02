export default class XObject extends adone.js.adone.Base {
    constructor(options) {
        super(options);

        this._entries = new Map();

        for (const prop of this.ast.properties) {
            // TODO: how to handle spread?
            // { ...adone.std.fs.constants, hello: "world" }
            if (prop.type === "SpreadElement") {
                continue;
            }
            this.set(prop.key.name, this.createXObject({ ast: prop, xModule: this.xModule }));
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

    set(key, value) {
        this._entries.set(key, value);
    }

    getType() {
        return "Object";
    }
}
