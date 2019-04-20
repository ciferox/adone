const {
    is
} = adone;

module.exports = clone;

function clone(obj) {
    if (is.null(obj) || typeof obj !== "object") {
        return obj; 
    }

    if (obj instanceof Object) {
        var copy = { __proto__: obj.__proto__ }; 
    } else {
        var copy = Object.create(null); 
    }

    Object.getOwnPropertyNames(obj).forEach((key) => {
        Object.defineProperty(copy, key, Object.getOwnPropertyDescriptor(obj, key));
    });

    return copy;
}
