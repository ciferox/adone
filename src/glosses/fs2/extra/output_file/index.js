export default (fs) => {
    const {
        is,
        path
    } = adone;
    
    return (file, data, encoding, callback) => {
        if (is.function(encoding)) {
            callback = encoding;
            encoding = "utf8";
        }
    
        const dir = path.dirname(file);
        fs.pathExists(dir, (err, itDoes) => {
            if (err) {
                return callback(err);
            }
            if (itDoes) {
                return fs.writeFile(file, data, encoding, callback);
            }
    
            fs.mkdirp(dir, (err) => {
                if (err) {
                    return callback(err);
                }
    
                fs.writeFile(file, data, encoding, callback);
            });
        });
    };    
};
