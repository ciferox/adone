const {
    fs: {
        engine: {
            AbstractEngine
        }
    },
    std: {
        // here we must have the original methods to work properly when std.fs is mocked
        fs: {
            stat,
            lstat,
            readdir,
            realpath,
            readlink
        }
    },
    promise
} = adone;

const promisify = (target, key, descriptor) => {
    descriptor.value = promise.promisify(descriptor.value);
};

export default class StandardEngine extends AbstractEngine {
    @promisify
    _stat(path, callback) {
        stat(path.relativePath, callback);
    }

    @promisify
    _lstat(path, callback) {
        lstat(path.relativePath, callback);
    }

    @promisify
    _readdir(path, options, callback) {
        readdir(path.relativePath, options, callback);
    }

    @promisify
    _realpath(path, options, callback) {
        realpath(path.relativePath, options, callback);
    }

    @promisify
    _readlink(path, options, callback) {
        readlink(path.relativePath, options, callback);
    }
}
