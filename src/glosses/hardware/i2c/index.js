const { is } = adone;

adone.asNamespace(exports);

const runtime = adone.lazify({
    Bus: () => {
        if (is.windows) {
            return require("./bus_windows");
        } 
        return require("./bus_unix");
    }
});

export const open = (busNumber, options, cb) => {
    if (is.function(options)) {
        cb = options;
        options = undefined;
    }

    const bus = new runtime.Bus(busNumber, options);

    setImmediate(cb, null);

    return bus;
};

export const openSync = (busNumber, options) => {
    return new runtime.Bus(busNumber, options);
};
