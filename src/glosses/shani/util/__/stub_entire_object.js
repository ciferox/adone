const { is, shani: { util: { __ } } } = adone;

export default function stubEntireObject(stub, object) {
    __.util.walk(object || {}, (prop, propOwner) => {
        // we don't want to stub things like toString(), valueOf(), etc. so we only stub if the object
        // is not Object.prototype
        if (
            propOwner !== Object.prototype &&
            prop !== "constructor" &&
            is.function(__.util.getPropertyDescriptor(propOwner, prop).value)
        ) {
            stub(object, prop);
        }
    });

    return object;
}
