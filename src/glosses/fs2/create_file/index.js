const {
    fs2,
    path
} = adone;
const { base } = fs2;

export default (file, callback) => {
    const makeFile = () => {
        base.writeFile(file, "", (err) => {
            if (err) {
                return callback(err);
            }
            callback();
        });
    };

    base.stat(file, (err, stats) => { // eslint-disable-line handle-callback-err
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
