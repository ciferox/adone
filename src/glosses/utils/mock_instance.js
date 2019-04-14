const {
    is,
    util
} = adone;

export default (instance, mock = {}) => {
    const keys = util.keys(instance, { enumOnly: false, followProto: true });

    for (const key of keys) {
        // ignore private methods and properties
        if (key.startsWith("__private_")) {
            continue;
        }
        if (is.function(instance[key])) {
            mock[key] = (...args) => instance[key].apply(instance, args);
        } else {
            const descriptor = Object.getOwnPropertyDescriptor(instance, key);
            if (descriptor) {
                Object.defineProperty(mock, key, {
                    configurable: descriptor.configurable,
                    enumerable: descriptor.enumerable,
                    get() {
                        return instance[key];
                    },
                    set(val) {
                        instance[key] = val;
                    }
                });
            } else {
                mock[key] = instance[key];
            }
        }
    }

    return mock;
};
