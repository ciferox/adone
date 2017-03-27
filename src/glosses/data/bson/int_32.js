export default class Int32 {
    constructor(value) {
        this._bsontype = "Int32";
        this.value = value;
    }

    valueOf() {
        return this.value;
    }

    toJSON() {
        return this.value;
    }
}
