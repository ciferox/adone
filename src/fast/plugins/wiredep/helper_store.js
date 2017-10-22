class MiniStore {
    constructor() {
        this.bucket = {};
    }

    set(property, value) {
        this.bucket[property] = value;
        return this.set.bind(this);
    }

    get(property) {
        if (!property) {
            return this.bucket;
        }

        return this.bucket[property];
    }
}

export default MiniStore;
