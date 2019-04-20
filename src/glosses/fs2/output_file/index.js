const {
    is,
    fs2,
    path
} = adone;
const { graceful } = fs2;

export default (file, data, encoding, callback) => {
    if (is.function(encoding)) {
        callback = encoding;
        encoding = "utf8";
    }

    const dir = path.dirname(file);
    fs2.pathExists(dir, (err, itDoes) => {
        if (err) {
            return callback(err);
        }
        if (itDoes) {
            return graceful.writeFile(file, data, encoding, callback);
        }

        fs2.mkdirp(dir, (err) => {
            if (err) {
                return callback(err);
            }

            graceful.writeFile(file, data, encoding, callback);
        });
    });
};
