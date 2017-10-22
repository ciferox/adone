const { is, x, shani: { util: { __ } } } = adone;

export default function throwOnFalsyObject(object, property) {
    if (property && !object) {
        const type = is.null(object) ? "null" : "undefined";
        throw new x.IllegalState(`Trying to stub property '${__.util.valueToString(property)}' of ${type}`);
    }
}
