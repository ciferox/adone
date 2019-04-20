import stringify from "./stringify";

const {
    is,
    fs2
} = adone;
const { graceful } = fs2;

export default (file, obj, options, callback) => {
    if (is.nil(callback)) {
        callback = options;
        options = {};
    }
    options = options || {};
    const fs = options.fs || graceful;

    let str = "";
    try {
        str = stringify(obj, options);
    } catch (err) {
        return callback(err, null);
    }

    fs.writeFile(file, str, options, callback);
};
