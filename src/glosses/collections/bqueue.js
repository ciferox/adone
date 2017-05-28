const { collection } = adone;

export default class BQueue extends collection.LinkedList {
    constructor() {
        super();
        this.awaiters = new collection.LinkedList();
    }

    push(v) {
        if (!this.awaiters.empty) {
            this.awaiters.shift()(v);
            return;
        }
        return super.push(v);
    }

    shift() {
        return new Promise((resolve) => {
            if (!this.empty) {
                return resolve(super.shift());
            }
            this.awaiters.push(resolve);
        });
    }
}
