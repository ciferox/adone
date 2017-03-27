export default class Symbol {
    constructor(value) {
        this._bsontype = "Symbol";
        this.value = value;
    }

    valueOf() {
        return this.value;
    }

    toString() {
        return this.value;
    }

    inspect() {
        return this.value;
    }

    toJSON() {
        return this.value;
    }
}
