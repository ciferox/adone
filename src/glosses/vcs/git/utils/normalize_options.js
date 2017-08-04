const { is } = adone;
/**
 * Normalize an object to match a struct.
 *
 * @param {String, Object} oid - The oid string or instance.
 * @return {Object} An Oid instance.
 */
export default function normalizeOptions(options, Ctor) {
    if (!options) {
        return null;
    }

    if (options instanceof Ctor) {
        return options;
    }

    const instance = new Ctor();

    Object.keys(options).forEach((key) => {
        if (!is.undefined(options[key])) {
            instance[key] = options[key];
        }
    });

    return instance;
}
