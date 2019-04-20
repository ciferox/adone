const {
    is
} = adone;

export default (obj, options) => {
    let spaces;
    let EOL = "\n";
    if (typeof options === "object" && !is.null(options)) {
        if (options.spaces) {
            spaces = options.spaces;
        }
        if (options.EOL) {
            EOL = options.EOL;
        }
    }

    const str = JSON.stringify(obj, options ? options.replacer : null, spaces);

    return str.replace(/\n/g, EOL) + EOL;
};
