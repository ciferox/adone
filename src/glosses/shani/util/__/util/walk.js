const { is } = adone;

const walkInternal = (obj, iterator, context, originalObj, seen) => {
    Object.getOwnPropertyNames(obj).forEach((k) => {
        if (seen[k] !== true) {
            seen[k] = true;
            const target = is.function(Object.getOwnPropertyDescriptor(obj, k).get)
                ? originalObj
                : obj;
            iterator.call(context, k, target);
        }
    });

    const proto = Object.getPrototypeOf(obj);
    if (proto) {
        walkInternal(proto, iterator, context, originalObj, seen);
    }
};

/* Walks the prototype chain of an object and iterates over every own property
 * name encountered. The iterator is called in the same fashion that Array.prototype.forEach
 * works, where it is passed the value, key, and own object as the 1st, 2nd, and 3rd positional
 * argument, respectively. In cases where Object.getOwnPropertyNames is not available, walk will
 * default to using a simple for..in loop.
 *
 * obj - The object to walk the prototype chain for.
 * iterator - The function to be called on each pass of the walk.
 * context - (Optional) When given, the iterator will be called with this object as the receiver.
 */
export default function walk(obj, iterator, context) {
    return walkInternal(obj, iterator, context, obj, {});
}
