const { is } = adone;
const hstore = require("pg-hstore")({ sanitize: true });

const stringify = (data) => {
    if (is.null(data)) {
        return null;
    }
    return hstore.stringify(data);
};
exports.stringify = stringify;

const parse = (value) => {
    if (is.null(value)) {
        return null;
    }
    return hstore.parse(value);
};
exports.parse = parse;
