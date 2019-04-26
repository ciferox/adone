import check from "./check";

export default (fs) => (path, options = {}) => {
    try {
        return check(fs.statSync(path), path, options);
    } catch (err) {
        if (options.ignoreErrors || err.code === "EACCES") {
            return false;
        }
        throw err;
    }
};
