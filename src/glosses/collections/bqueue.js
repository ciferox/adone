

/**
 * Тот же список, но shift возвращает промис, если элементов в списке нет
 * и разрешает их при push'е элементов
 */
export default class BQueue extends adone.collection.LinkedList {
    constructor() {
        super();
        this.awaiters = new adone.collection.LinkedList();
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
