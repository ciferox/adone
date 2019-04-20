const {
    is,
    fs2,
    text: { stripBom }
} = adone;
const { graceful } = fs2;

export default (file, options) => {
    options = options || {};
    if (is.string(options)) {
        options = { encoding: options };
    }

    const fs = options.fs || graceful;

    let shouldThrow = true;
    if ("throws" in options) {
        shouldThrow = options.throws;
    }

    try {
        let content = fs.readFileSync(file, options);
        content = stripBom(content);
        return JSON.parse(content, options.reviver);
    } catch (err) {
        if (shouldThrow) {
            err.message = `${file}: ${err.message}`;
            throw err;
        } else {
            return null;
        }
    }
};
