const MAX_INTEGER = Number.MAX_SAFE_INTEGER >>> 0;

export default class FastUid {
    constructor() {
        this.id = 0 >>> 0;
    }

    create() {
        if (this.id === MAX_INTEGER) {
            this.id = 1;
        } else {
            this.id++;
        }
        return this.id;
    }

    compare(id1, id2) {
        return id1 === id2;
    }

    toString(id) {
        return id.toString();
    }
}
