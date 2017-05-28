const { is } = adone;

export default function getProperties(object) {
    const result = Object.getOwnPropertyNames(object);

    const addProperty = (property) => {
        if (result.indexOf(property) === -1) {
            result.push(property);
        }
    };

    let proto = Object.getPrototypeOf(object);
    while (!is.null(proto)) {
        Object.getOwnPropertyNames(proto).forEach(addProperty);
        proto = Object.getPrototypeOf(proto);
    }

    return result;
}
