const {
    is,
    shani: { util: { __: { util: { getPropertyDescriptor, walk } } } }
} = adone;

export default function stubEntireObject(stub, object) {
    walk(object || {}, (prop, propOwner) => {
        // we don't want to stub things like toString(), valueOf(), etc. so we only stub if the object
        // is not Object.prototype
        if (
            propOwner !== Object.prototype &&
            prop !== "constructor" &&
            is.function(getPropertyDescriptor(propOwner, prop).value)
        ) {
            stub(object, prop);
        }
    });

    return object;
}
