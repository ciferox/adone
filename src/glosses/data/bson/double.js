export default class Double {
    constructor(value) {
        this._bsontype = "Double";
        this.value = value;
    }

    valueOf() {
        return this.value;
    }

    toJSON() {
        return this.value;
    }
}
