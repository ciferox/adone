const { x, shani: { util: { __ } } } = adone;

const { prototype: { hasOwnProperty } } = Object;

export default function stubNonFunctionProperty(object, property) {
    const { [property]: original } = object;
    if (!hasOwnProperty.call(object, property)) {
        throw new x.IllegalState(`Cannot stub non-existent own property ${__.util.valueToString(property)}`);
    }
    return {
        restore: () => object[property] = original
    };
}
