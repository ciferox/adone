const {
    is
} = adone;

const noopTest = () => {
    return function (done) {
        done();
    };
};

const testCommon = (options) => {
    const factory = options.factory;

    if (!is.function(factory)) {
        throw new TypeError("factory must be a function");
    }

    return {
        factory,
        setUp: options.setUp || noopTest(),
        tearDown: options.tearDown || noopTest(),
        bufferKeys: options.bufferKeys !== false,
        createIfMissing: options.createIfMissing !== false,
        errorIfExists: options.errorIfExists !== false,
        snapshots: options.snapshots !== false,
        seek: options.seek !== false,
        clear: Boolean(options.clear)
    };
};

module.exports = testCommon;
