const {
    fs: {
        engine: {
            AbstractEngine
        }
    },
    std: {
        // here we must have the original methods to work properly when std.fs is mocked
        fs: {
            readFile,
            stat,
            lstat,
            readdir,
            realpath
        }
    }
} = adone;

export default class StandardEngine extends AbstractEngine {
    _readFile(path, options, callback) {
        return readFile(path.relativePath(), options, callback);
    }

    _stat(path, callback) {
        return stat(path.relativePath(), callback);
    }

    _lstat(path, callback) {
        return lstat(path.relativePath(), callback);
    }

    _readdir(path, options, callback) {
        return readdir(path.relativePath(), options, callback);
    }

    _realpath(path, options, callback) {
        return realpath(path.relativePath(), options, callback);
    }
}
