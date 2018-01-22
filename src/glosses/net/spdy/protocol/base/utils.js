const {
    is
} = adone;

export class ProtocolError extends Error {
    constructor(code, message) {
        super();
        this.code = code;
        this.message = message;
    }
}

export const error = function (code, message) {
    return new ProtocolError(code, message);
};

export const reverse = function (object) {
    const result = [];

    Object.keys(object).forEach((key) => {
        result[object[key] | 0] = key;
    });

    return result;
};

// weight [1, 36] <=> priority [0, 7]
// This way weight=16 is preserved and has priority=3
export const weightToPriority = function (weight) {
    return ((Math.min(35, (weight - 1)) / 35) * 7) | 0;
};

export const priorityToWeight = function (priority) {
    return (((priority / 7) * 35) | 0) + 1;
};

// Copy-Paste from node
export const addHeaderLine = function (field, value, dest) {
    field = field.toLowerCase();
    if (/^:/.test(field)) {
        dest[field] = value;
        return;
    }

    switch (field) {
        // Array headers:
        case "set-cookie":
            if (!is.undefined(dest[field])) {
                dest[field].push(value);
            } else {
                dest[field] = [value];
            }
            break;

        /* eslint-disable max-len */
        // list is taken from:
        /* eslint-enable max-len */
        case "content-type":
        case "content-length":
        case "user-agent":
        case "referer":
        case "host":
        case "authorization":
        case "proxy-authorization":
        case "if-modified-since":
        case "if-unmodified-since":
        case "from":
        case "location":
        case "max-forwards":
            // drop duplicates
            if (is.undefined(dest[field])) {
                dest[field] = value;
            }
            break;

        case "cookie":
            // make semicolon-separated list
            if (!is.undefined(dest[field])) {
                dest[field] += `; ${value}`;
            } else {
                dest[field] = value;
            }
            break;

        default:
            // make comma-separated list
            if (!is.undefined(dest[field])) {
                dest[field] += `, ${value}`;
            } else {
                dest[field] = value;
            }
    }
};
