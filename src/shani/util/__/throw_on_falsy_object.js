const {
    is,
    exception,
    shani: { util: { __ } }
} = adone;

export default function throwOnFalsyObject(object, property) {
    if (property && !object) {
        const type = is.null(object) ? "null" : "undefined";
        throw new exception.IllegalState(`Trying to stub property '${__.util.valueToString(property)}' of ${type}`);
    }
}
