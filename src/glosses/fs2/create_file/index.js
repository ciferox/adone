const {
    fs2,
    path
} = adone;
const { graceful } = fs2;

export default (file, callback) => {
    const makeFile = () => {
        graceful.writeFile(file, "", (err) => {
            if (err) {
                return callback(err);
            }
            callback();
        });
    };

    graceful.stat(file, (err, stats) => { // eslint-disable-line handle-callback-err
        if (!err && stats.isFile()) {
            return callback();
        }
        const dir = path.dirname(file);
        fs2.pathExists(dir, (err, dirExists) => {
            if (err) {
                return callback(err);
            }
            if (dirExists) {
                return makeFile();
            }
            fs2.mkdirp(dir, (err) => {
                if (err) {
                    return callback(err);
                }
                makeFile();
            });
        });
    });
};
