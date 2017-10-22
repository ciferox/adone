const { is, shani: { util: { __ } } } = adone;

export default function iterableToString(obj) {
    let representation = "";

    const stringify = (item) => is.string(item) ? `'${item}'` : String(item);

    const mapToString = (map) => {
        map.forEach((value, key) => {
            representation += `[${stringify(key)},${stringify(value)}],`;
        });

        representation = representation.slice(0, -1);
        return representation;
    };

    const genericIterableToString = (iterable) => {
        iterable.forEach((value) => {
            representation += `${stringify(value)},`;
        });

        representation = representation.slice(0, -1);
        return representation;
    };

    if (__.util.typeOf(obj) === "map") {
        return mapToString(obj);
    }

    return genericIterableToString(obj);
}
