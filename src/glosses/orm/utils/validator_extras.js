const { is, vendor: { lodash: _ } } = adone;
const validator = {};

// TODO: move smth to adone.is ?

const numeric = /^[-+]?[0-9]+$/;
const alphanumeric = /^[0-9A-Z]+$/i;
const alpha = /^[A-Z]+$/i;

const creditCardRe = /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|(222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)[0-9]{12}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11}|62[0-9]{14})$/;

const extensions = {
    isAlpha: (str) => alpha.test(str),
    isNumeric: (str) => numeric.test(str),
    isAlphanumeric: (str) => alphanumeric.test(str),
    isLength(str, options) {
        let min;
        let max;
        if (is.object(options)) {
            min = options.min || 0;
            max = options.max;
        } else { // backwards compatibility: isLength(str, min [, max])
            min = arguments[1];
            max = arguments[2];
        }
        const surrogatePairs = str.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g) || [];
        const len = str.length - surrogatePairs.length;
        return len >= min && (is.undefined(max) || len <= max);
    },
    isFloat(str) {
        return is.numeral(str);
    },
    isInt(str) {
        return is.integer(Number(str));
    },
    isUUID: is.uuid,
    isBoolean(str) {
        return str === "true" || str === "false" || str === "1" || str === "0";
    },
    extend(name, fn) {
        this[name] = fn;

        return this;
    },
    notEmpty(str) {
        return !str.match(/^[\s\t\r\n]*$/);
    },
    len(str, min, max) {
        return this.isLength(str, min, max);
    },
    isUrl: is.url,
    isURL: is.url,
    isIPv6: is.ip6,
    isIPv4: is.ip4,
    isIP: is.ip,
    isIn(str, options) {
        if (is.array(options)) {
            const array = options.map(String);
            return array.includes(str);
        } else if (is.object(options)) {
            return options.hasOwnProperty(str);
        } else if (options && is.function(options.indexOf)) {
            return options.indexOf(str) >= 0; // eslint-disable-line
        }
        return false;
    },
    notIn(str, values) {
        return !this.isIn(str, values);
    },
    regex(str, pattern, modifiers) {
        str = String(str);
        if (Object.prototype.toString.call(pattern).slice(8, -1) !== "RegExp") {
            pattern = new RegExp(pattern, modifiers);
        }
        return str.match(pattern);
    },
    notRegex(str, pattern, modifiers) {
        return !this.regex(str, pattern, modifiers);
    },
    isDecimal(str) {
        return str !== "" && Boolean(str.match(/^(?:-?(?:[0-9]+))?(?:\.[0-9]*)?(?:[eE][\+\-]?(?:[0-9]+))?$/));
    },
    min(str, val) {
        const number = parseFloat(str);
        return isNaN(number) || number >= val;
    },
    max(str, val) {
        const number = parseFloat(str);
        return isNaN(number) || number <= val;
    },
    not(str, pattern, modifiers) {
        return this.notRegex(str, pattern, modifiers);
    },
    contains(str, elem) {
        return str.indexOf(elem) >= 0 && Boolean(elem);
    },
    notContains(str, elem) {
        return !this.contains(str, elem);
    },
    is(str, pattern, modifiers) {
        return this.regex(str, pattern, modifiers);
    },
    isEmail: is.email,
    isCreditCard(str) {
        if (!is.string(str)) {
            return str;
        }
        const sanitized = str.replace(/[- ]+/g, "");
        if (!creditCardRe.test(sanitized)) {
            return false;
        }
        let sum = 0;
        let digit;
        let tmpNum;
        let shouldDouble;
        for (let i = sanitized.length - 1; i >= 0; i--) {
            digit = sanitized.substring(i, (i + 1));
            tmpNum = parseInt(digit, 10);
            if (shouldDouble) {
                tmpNum *= 2;
                if (tmpNum >= 10) {
                    sum += ((tmpNum % 10) + 1);
                } else {
                    sum += tmpNum;
                }
            } else {
                sum += tmpNum;
            }
            shouldDouble = !shouldDouble;
        }
        return Boolean((sum % 10) === 0 ? sanitized : false);
    },
    isBefore: is.before,
    isAfter: is.after,
    equals: (a, b) => a === b,
    isUppercase: is.uppercase,
    isLowercase: is.lowercase
};
exports.extensions = extensions;

function extendModelValidations(modelInstance) {
    const extensions = {
        isImmutable(str, param, field) {
            return modelInstance.isNewRecord || modelInstance.dataValues[field] === modelInstance._previousDataValues[field];
        }
    };

    _.forEach(extensions, (extend, key) => {
        validator[key] = extend;
    });
}
exports.extendModelValidations = extendModelValidations;

// Deprecate this.
validator.notNull = function () {
    throw new Error('Warning "notNull" validation has been deprecated in favor of Schema based "allowNull"');
};

// https://github.com/chriso/validator.js/blob/6.2.0/validator.js
_.forEach(extensions, (extend, key) => {
    validator[key] = extend;
});

// map isNull to isEmpty
// https://github.com/chriso/validator.js/commit/e33d38a26ee2f9666b319adb67c7fc0d3dea7125
validator.isNull = (x) => x.length === 0;

// isDate removed in 7.0.0
// https://github.com/chriso/validator.js/commit/095509fc707a4dc0e99f85131df1176ad6389fc9
validator.isDate = function (dateString) {
    // avoid http://momentjs.com/guides/#/warnings/js-date/
    // by doing a preliminary check on `dateString`
    const parsed = Date.parse(dateString);
    if (isNaN(parsed)) {
        // fail if we can't parse it
        return false;
    }
    // otherwise convert to ISO 8601 as moment prefers
    // http://momentjs.com/docs/#/parsing/string/
    const date = new Date(parsed);
    return adone.datetime(date.toISOString()).isValid();

};

exports.validator = validator;
