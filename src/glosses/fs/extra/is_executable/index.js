import check from "./check";

export default (fs) => (path, options = {}) => new Promise((resolve, reject) => {
    fs.stat(path, (err, stat) => {
        if (err) {
            if (err.code === "EACCES" || options.ignoreErrors) {
                resolve(false);
                return;
            }
            reject(err);
        }
        resolve(check(stat, path, options));
    });
});
