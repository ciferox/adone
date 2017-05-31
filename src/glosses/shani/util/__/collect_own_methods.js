const {
    is,
    shani: { util: { __: { util: { walk, getPropertyDescriptor } } } }
} = adone;

const collectMethod = (methods, object, prop, propOwner) => {
    if (
        is.function(getPropertyDescriptor(propOwner, prop).value) &&
        object.hasOwnProperty(prop)
    ) {
        methods.push(object[prop]);
    }
};

// This function returns an array of all the own methods on the passed object
export default function collectOwnMethods(object) {
    const methods = [];

    walk(object, collectMethod.bind(null, methods, object));

    return methods;
}
