export default (obj) => {
    if (obj === null || typeof obj !== "object") {
        return obj;
    }

    let copy;
    if (obj instanceof Object) {
        copy = { __proto__: obj.__proto__ };
    } else {
        copy = Object.create(null);
    }

    for (const key of Object.getOwnPropertyNames(obj)) {
        Object.defineProperty(copy, key, Object.getOwnPropertyDescriptor(obj, key));
    }

    return copy;
};
