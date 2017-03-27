export default class Code {
    constructor(code, scope) {
        this._bsontype = "Code";
        this.code = code;
        this.scope = scope;
    }

    toJSON() {
        return { scope: this.scope, code: this.code };
    }
}
