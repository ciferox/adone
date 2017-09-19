const { is } = adone;
const __ = adone.private(adone.datetime);

const configFromInput = (config) => {
    const input = config._i;
    if (is.undefined(input)) {
        config._d = new Date(__.util.hooks.now());
    } else if (is.date(input)) {
        config._d = new Date(input.valueOf());
    } else if (is.string(input)) {
        __.create.configFromString(config);
    } else if (is.array(input)) {
        config._a = input.slice(0).map((obj) => {
            return parseInt(obj, 10);
        });
        __.create.configFromArray(config);
    } else if (is.object(input)) {
        __.create.configFromObject(config);
    } else if (is.number(input)) {
        // from milliseconds
        config._d = new Date(input);
    } else {
        __.util.hooks.createFromInputFallback(config);
    }
};

export const prepareConfig = (config) => {
    config._locale = config._locale || __.locale.getLocale(config._l);

    const format = config._f;
    let input = config._i;

    if (is.null(input) || (is.undefined(format) && input === "")) {
        return __.create.createInvalid({ nullInput: true });
    }

    if (is.string(input)) {
        config._i = input = config._locale.preparse(input);
    }

    if (is.datetime(input)) {
        return new __.datetime.Datetime(__.create.checkOverflow(input));
    } else if (is.date(input)) {
        config._d = input;
    } else if (is.array(format)) {
        __.create.configFromStringAndArray(config);
    } else if (format) {
        __.create.configFromStringAndFormat(config);
    } else {
        configFromInput(config);
    }

    if (!__.create.isValid(config)) {
        config._d = null;
    }

    return config;
};

const createFromConfig = (config) => {
    const res = new __.datetime.Datetime(__.create.checkOverflow(prepareConfig(config)));
    if (res._nextDay) {
        // Adding is smart enough around DST
        res.add(1, "d");
        res._nextDay = undefined;
    }

    return res;
};

export const createLocalOrUTC = (input, format, locale, strict, isUTC) => {
    const c = {};

    if (locale === true || locale === false) {
        strict = locale;
        locale = undefined;
    }

    if ((is.array(input) && input.length === 0) ||
            (is.plainObject(input) && is.emptyObject(input))) {
        input = undefined;
    }

    c._isAnExDateObject = true;
    c._useUTC = c._isUTC = isUTC;
    c._l = locale;
    c._i = input;
    c._f = format;
    c._strict = strict;

    return createFromConfig(c);
};
