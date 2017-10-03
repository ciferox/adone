const DATA = Symbol();

export default class MapCache {
    constructor() {
        this[DATA] = {};
    }

    has(key) {
        return this[DATA].hasOwnProperty(key);
    }

    get(key) {
        return this[DATA][key];
    }

    set(key, value) {
        this[DATA][key] = value;
    }

    delete(key) {
        delete this[DATA][key];
    }

    clear() {
        this[DATA] = {};
    }
}
