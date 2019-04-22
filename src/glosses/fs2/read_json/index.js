const {
    is,
    fs2,
    text: { stripBom }
} = adone;
const { base } = fs2;

export default (file, options, callback) => {
    if (is.nil(callback)) {
        callback = options;
        options = {};
    }

    if (is.string(options)) {
        options = { encoding: options };
    }

    options = options || {};
    const fs = options.fs || base;

    let shouldThrow = true;
    if ("throws" in options) {
        shouldThrow = options.throws;
    }

    fs.readFile(file, options, (err, data) => {
        if (err) {
            return callback(err);
        }

        data = stripBom(data);

        let obj;
        try {
            obj = JSON.parse(data, options ? options.reviver : null);
        } catch (err2) {
            if (shouldThrow) {
                err2.message = `${file}: ${err2.message}`;
                return callback(err2);
            }
            return callback(null, null);

        }

        callback(null, obj);
    });
};
