const {
    fs2,
    path
} = adone;
const { graceful } = fs2;

export default (srcpath, dstpath, callback) => {
    const makeLink = (srcpath, dstpath) => {
        graceful.link(srcpath, dstpath, (err) => {
            if (err) {
                return callback(err);
            }
            callback(null);
        });
    };

    fs2.pathExists(dstpath, (err, destinationExists) => {
        if (err) {
            return callback(err);
        }
        if (destinationExists) {
            return callback(null);
        }
        graceful.lstat(srcpath, (err) => {
            if (err) {
                err.message = err.message.replace("lstat", "ensureLink");
                return callback(err);
            }

            const dir = path.dirname(dstpath);
            fs2.pathExists(dir, (err, dirExists) => {
                if (err) {
                    return callback(err);
                }
                if (dirExists) {
                    return makeLink(srcpath, dstpath);
                }
                fs2.mkdirp(dir, (err) => {
                    if (err) {
                        return callback(err);
                    }
                    makeLink(srcpath, dstpath);
                });
            });
        });
    });
}
