const {
    x,
    shani: { util: { __: { util: { valueToString } } } }
} = adone;

const { prototype: { hasOwnProperty } } = Object;

export default function stubNonFunctionProperty(object, property, value) {
    const { [property]: original } = object;
    if (!hasOwnProperty.call(object, property)) {
        throw new x.IllegalState(`Cannot stub non-existent own property ${valueToString(property)}`);
    }
    object[property] = value;
    return {
        restore: () => object[property] = original
    };
}
