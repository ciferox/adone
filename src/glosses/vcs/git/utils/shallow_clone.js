export default function shallowClone() {
    const merges = Array.prototype.slice.call(arguments);

    return merges.reduce((obj, merge) => {
        return Object.keys(merge).reduce((obj, key) => {
            obj[key] = merge[key];
            return obj;
        }, obj);
    }, {});
}
