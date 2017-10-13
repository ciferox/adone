const {
    is,
    std
} = adone;

const mkdirp = (path, mode, fn, made) => {
    const stdFs = std.fs;
    if (is.nil(mode)) {
        mode = 0o777 & (~process.umask());
    }
    if (!made) {
        made = null;
    }

    const cb = fn || (adone.noop);
    path = std.path.resolve(path);

    stdFs.mkdir(path, mode, (err) => {
        if (!err) {
            made = made || path;
            return cb(null, made);
        }
        switch (err.code) {
            case "ENOENT":
                mkdirp(std.path.dirname(path), mode, (err2, made) => {
                    if (err2) {
                        return cb(err2, made);
                    }
                    mkdirp(path, mode, cb, made);
                });
                break;
            // In the case of any other error, just see if there"s a dir there already. If so, then hooray! If not, then something is borked.
            default:
                stdFs.stat(path, (err2, stat) => {
                    // if the stat fails, then that"s super weird.
                    // let the original error be the failure reason.
                    if (err2 || !stat.isDirectory()) {
                        return cb(err, made);
                    }
                    return cb(null, made);
                });
                break;
        }
    });
};

const mkdir = (path, mode) => {
    if (is.array(path)) {
        return Promise.all(path.map((x) => mkdir(x, mode))).then(adone.noop);
    }
    return new Promise((resolve, reject) => {
        mkdirp(path, mode, (err) => {
            err ? reject(err) : resolve();
        });
    });
};

export default mkdir;
