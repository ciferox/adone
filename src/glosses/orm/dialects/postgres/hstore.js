const { is } = adone;
const hstore = require("pg-hstore")({ sanitize: true }); // TODO

export const stringify = (data) => {
    if (is.null(data)) {
        return null;
    }
    return hstore.stringify(data);
};

export const parse = (value) => {
    if (is.null(value)) {
        return null;
    }
    return hstore.parse(value);
};
