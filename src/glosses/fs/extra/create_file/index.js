export default (fs) => {
    const {
        path
    } = adone;

    return (file, callback) => {
        const makeFile = () => {
            fs.writeFile(file, "", (err) => {
                if (err) {
                    return callback(err);
                }
                callback();
            });
        };

        fs.stat(file, (err, stats) => { // eslint-disable-line handle-callback-err
            if (!err && stats.isFile()) {
                return callback();
            }
            const dir = path.dirname(file);
            fs.pathExists(dir, (err, dirExists) => {
                if (err) {
                    return callback(err);
                }
                if (dirExists) {
                    return makeFile();
                }
                fs.mkdirp(dir, (err) => {
                    if (err) {
                        return callback(err);
                    }
                    makeFile();
                });
            });
        });
    };
};
