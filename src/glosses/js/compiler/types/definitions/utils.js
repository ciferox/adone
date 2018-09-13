import is from "../validators/is";

export const VISITOR_KEYS = {};
export const ALIAS_KEYS = {};
export const FLIPPED_ALIAS_KEYS = {};
export const NODE_FIELDS = {};
export const BUILDER_KEYS = {};
export const DEPRECATED_KEYS = {};

const store = {};

const getType = function (val) {
    if (adone.is.array(val)) {
        return "array";
    } else if (adone.is.null(val)) {
        return "null";
    } else if (adone.is.undefined(val)) {
        return "undefined";
    }
    return typeof val;
};

export const validate = function (validate) {
    return { validate };
};

export const assertNodeType = function (...types) {
    const validate = function (node, key, val) {
        let valid = false;

        for (const type of types) {
            if (is(type, val)) {
                valid = true;
                break;
            }
        }

        if (!valid) {
            throw new TypeError(
                `Property ${key} of ${node.type} expected node to be of a type ${JSON.stringify(types)} ` +
                `but instead got ${JSON.stringify(val && val.type)}`,
            );
        }
    };

    validate.oneOfNodeTypes = types;

    return validate;
};


export const typeIs = function (typeName) {
    return adone.is.string(typeName)
        ? assertNodeType(typeName)
        : assertNodeType(...typeName);
};

export const validateType = function (typeName) {
    return validate(typeIs(typeName));
};

export const validateOptional = function (validate) {
    return { validate, optional: true };
};

export const validateOptionalType = function (typeName) {
    return { validate: typeIs(typeName), optional: true };
};

export const assertValueType = function (type) {
    const validate = function (node, key, val) {
        const valid = getType(val) === type;

        if (!valid) {
            throw new TypeError(
                `Property ${key} expected type of ${type} but got ${getType(val)}`,
            );
        }
    };

    validate.type = type;

    return validate;
};

export const chain = function (...fns) {
    const validate = function (...args) {
        for (const fn of fns) {
            fn(...args);
        }
    };
    validate.chainOf = fns;
    return validate;
};

export const assertEach = function (callback) {
    const validator = function (node, key, val) {
        if (!adone.is.array(val)) {
            return;
        }

        for (let i = 0; i < val.length; i++) {
            callback(node, `${key}[${i}]`, val[i]);
        }
    };
    validator.each = callback;
    return validator;
};

export const arrayOf = function (elementType) {
    return chain(assertValueType("array"), assertEach(elementType));
};

export const arrayOfType = function (typeName) {
    return arrayOf(typeIs(typeName));
};

export const validateArrayOfType = function (typeName) {
    return validate(arrayOfType(typeName));
};

export const assertOneOf = function (...values) {
    const validate = function (node, key, val) {
        if (!values.includes(val)) {
            throw new TypeError(
                `Property ${key} expected value to be one of ${JSON.stringify(
                    values,
                )} but got ${JSON.stringify(val)}`,
            );
        }
    };

    validate.oneOf = values;

    return validate;
};

export const assertNodeOrValueType = function (...types) {
    const validate = function (node, key, val) {
        let valid = false;

        for (const type of types) {
            if (getType(val) === type || is(type, val)) {
                valid = true;
                break;
            }
        }

        if (!valid) {
            throw new TypeError(
                `Property ${key} of ${node.type} expected node to be of a type ${JSON.stringify(types)} ` +
                `but instead got ${JSON.stringify(val && val.type)}`,
            );
        }
    };

    validate.oneOfNodeOrValueTypes = types;

    return validate;
};

export default function defineType(
    type,
    opts = {},
) {
    const inherits = (opts.inherits && store[opts.inherits]) || {};

    const fields = opts.fields || inherits.fields || {};
    const visitor = opts.visitor || inherits.visitor || [];
    const aliases = opts.aliases || inherits.aliases || [];
    const builder =
        opts.builder || inherits.builder || opts.visitor || [];

    if (opts.deprecatedAlias) {
        DEPRECATED_KEYS[opts.deprecatedAlias] = type;
    }

    // ensure all field keys are represented in `fields`
    for (const key of (visitor.concat(builder))) {
        fields[key] = fields[key] || {};
    }

    for (const key in fields) {
        const field = fields[key];

        if (!builder.includes(key)) {
            field.optional = true;
        }
        if (adone.is.undefined(field.default)) {
            field.default = null;
        } else if (!field.validate) {
            field.validate = assertValueType(getType(field.default));
        }
    }

    VISITOR_KEYS[type] = opts.visitor = visitor;
    BUILDER_KEYS[type] = opts.builder = builder;
    NODE_FIELDS[type] = opts.fields = fields;
    ALIAS_KEYS[type] = opts.aliases = aliases;
    aliases.forEach((alias) => {
        FLIPPED_ALIAS_KEYS[alias] = FLIPPED_ALIAS_KEYS[alias] || [];
        FLIPPED_ALIAS_KEYS[alias].push(type);
    });

    store[type] = opts;
}
