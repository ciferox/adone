export default function flag(obj, key, value) {
    if (!obj.__flags) {
        obj.__flags = Object.create(null);
    }
    const f = obj.__flags;
    if (arguments.length === 3) {
        f[key] = value;
    } else {
        return f[key];
    }
}
