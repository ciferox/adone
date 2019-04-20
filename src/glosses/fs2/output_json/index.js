const {
    is,
    path,
    fs2
} = adone;

export default (file, data, options, callback) => {
    if (is.function(options)) {
        callback = options;
        options = {};
    }

    const dir = path.dirname(file);

    fs2.pathExists(dir, (err, itDoes) => {
        if (err) {
            return callback(err); 
        }
        if (itDoes) {
            return fs2.writeJson(file, data, options, callback); 
        }

        fs2.mkdirp(dir, (err) => {
            if (err) {
                return callback(err); 
            }
            fs2.writeJson(file, data, options, callback);
        });
    });
};
