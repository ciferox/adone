export default (fs) => {
    const {
        path
    } = adone;

    return (srcpath, dstpath, callback) => {
        const makeLink = (srcpath, dstpath) => {
            fs.link(srcpath, dstpath, (err) => {
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
        };

        fs.pathExists(dstpath, (err, destinationExists) => {
            if (err) {
                return callback(err);
            }
            if (destinationExists) {
                return callback(null);
            }
            fs.lstat(srcpath, (err) => {
                if (err) {
                    err.message = err.message.replace("lstat", "ensureLink");
                    return callback(err);
                }

                const dir = path.dirname(dstpath);
                fs.pathExists(dir, (err, dirExists) => {
                    if (err) {
                        return callback(err);
                    }
                    if (dirExists) {
                        return makeLink(srcpath, dstpath);
                    }
                    fs.mkdirp(dir, (err) => {
                        if (err) {
                            return callback(err);
                        }
                        makeLink(srcpath, dstpath);
                    });
                });
            });
        });
    }
};
