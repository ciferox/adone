export default function getPropertyDescriptor(object, property) {
    let proto = object;
    let descriptor;

    while (proto && !(descriptor = Object.getOwnPropertyDescriptor(proto, property))) {
        proto = Object.getPrototypeOf(proto);
    }
    return descriptor;
}
