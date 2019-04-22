const {
    is,
    fs2: { base },
    path,
    std: { os }
} = adone;

// HFS, ext{2,3}, FAT do not, Node.js v0.10 does not
export const hasMillisResSync = () => {
    let tmpfile = path.join(`millis-test-sync${Date.now().toString()}${Math.random().toString().slice(2)}`);
    tmpfile = path.join(os.tmpdir(), tmpfile);

    // 550 millis past UNIX epoch
    const d = new Date(1435410243862);
    base.writeFileSync(tmpfile, "https://github.com/jprichardson/node-fs-extra/pull/141");
    const fd = base.openSync(tmpfile, "r+");
    base.futimesSync(fd, d, d);
    base.closeSync(fd);
    return base.statSync(tmpfile).mtime > 1435410243000;
};

export const hasMillisRes = (callback) => {
    let tmpfile = path.join(`millis-test${Date.now().toString()}${Math.random().toString().slice(2)}`);
    tmpfile = path.join(os.tmpdir(), tmpfile);

    // 550 millis past UNIX epoch
    const d = new Date(1435410243862);
    base.writeFile(tmpfile, "https://github.com/jprichardson/node-fs-extra/pull/141", (err) => {
        if (err) {
            return callback(err);
        }
        base.open(tmpfile, "r+", (err, fd) => {
            if (err) {
                return callback(err);
            }
            base.futimes(fd, d, d, (err) => {
                if (err) {
                    return callback(err);
                }
                base.close(fd, (err) => {
                    if (err) {
                        return callback(err);
                    }
                    base.stat(tmpfile, (err, stats) => {
                        if (err) {
                            return callback(err);
                        }
                        callback(null, stats.mtime > 1435410243000);
                    });
                });
            });
        });
    });
};

export const timeRemoveMillis = (timestamp) => {
    if (is.number(timestamp)) {
        return Math.floor(timestamp / 1000) * 1000;
    } else if (timestamp instanceof Date) {
        return new Date(Math.floor(timestamp.getTime() / 1000) * 1000);
    }
    throw new Error("fs-extra: timeRemoveMillis() unknown parameter type");

};

export const utimesMillis = (path, atime, mtime, callback) => {
    // if (!HAS_MILLIS_RES) return base.utimes(path, atime, mtime, callback)
    base.open(path, "r+", (err, fd) => {
        if (err) {
            return callback(err);
        }
        base.futimes(fd, atime, mtime, (futimesErr) => {
            base.close(fd, (closeErr) => {
                if (callback) {
                    callback(futimesErr || closeErr);
                }
            });
        });
    });
};

export const utimesMillisSync = (path, atime, mtime) => {
    const fd = base.openSync(path, "r+");
    base.futimesSync(fd, atime, mtime);
    return base.closeSync(fd);
};
