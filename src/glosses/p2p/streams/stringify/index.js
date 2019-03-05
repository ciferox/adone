const defined = require("defined");

module.exports = pullStringify;

function pullStringify(options) {
    options = defined(options, {});

    // default is pretty double newline delimited json
    const open = defined(options.open, "");
    const prefix = defined(options.prefix, "");
    const suffix = defined(options.suffix, "\n\n");
    const close = defined(options.close, "");
    const indent = defined(options.indent, 2);
    const stringify = defined(options.stringify, JSON.stringify);

    let first = true; let ended;
    return function (read) {
        return function (end, cb) {
            if (ended) {
                return cb(ended); 
            }
            read(null, (end, data) => {
                if (!end) {
                    const f = first;
                    first = false;

                    const string = stringify(data, null, indent);
                    cb(null, (f ? open : prefix) + string + suffix);
                } else {
                    ended = end;
                    if (ended !== true) {
                        return cb(ended); 
                    }
                    cb(null, first ? open + close : close);
                }
            });
        };
    };
}

module.exports.lines =
module.exports.ldjson = function (stringify) {
    return pullStringify({
        suffix: "\n",
        indent: 0,
        stringify
    });
};

module.exports.array = function (stringify) {
    return pullStringify({
        open: "[",
        prefix: ",\n",
        suffix: "",
        close: "]\n",
        indent: 2,
        stringify
    });
};
