const {
    is,
    lodash: _,
    std: {
        util: stdUtil
    },
    orm
} = adone;

const validateDeprecation = (value, expectation, options) => {
    if (!options.deprecated) {
        return;
    }

    const valid = value instanceof options.deprecated
        || Object.prototype.toString.call(value) === Object.prototype.toString.call(options.deprecated.call());

    if (valid) {
        const message = `${stdUtil.inspect(value)} should not be of type "${options.deprecated.name}"`;
        orm.util.deprecate(options.deprecationWarning || message);
    }

    return valid;
};

const validate = (value, expectation) => {
    // the second part of this check is a workaround to deal with an issue that occurs in node-webkit when
    // using object literals.  https://github.com/sequelize/sequelize/issues/2685
    if (value instanceof expectation || Object.prototype.toString.call(value) === Object.prototype.toString.call(expectation.call())) {
        return true;
    }

    throw new Error(`The parameter (value: ${value}) is no ${expectation.name}`);
};

export default function check(value, expectation, options) {
    options = _.extend({
        deprecated: false,
        index: null,
        method: null,
        optional: false
    }, options || {});

    if (!value && options.optional) {
        return true;
    }

    if (is.undefined(value)) {
        throw new Error("No value has been passed.");
    }

    if (is.undefined(expectation)) {
        throw new Error("No expectation has been passed.");
    }

    return validateDeprecation(value, expectation, options) || validate(value, expectation, options);
}
