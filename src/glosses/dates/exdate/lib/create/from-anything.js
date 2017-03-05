import adone from "adone";
import ExDate from "../exdate";
import { createInvalid } from "./valid";
import { getLocale } from "../locale";
import { hooks } from "../utils";
import checkOverflow from "./check-overflow";
import { isValid } from "./valid";

const { is } = adone;

import { configFromStringAndArray }  from "./from-string-and-array";
import { configFromStringAndFormat } from "./from-string-and-format";
import { configFromString }          from "./from-string";
import { configFromArray }           from "./from-array";
import { configFromObject }          from "./from-object";

function createFromConfig (config) {
    const res = new ExDate(checkOverflow(prepareConfig(config)));
    if (res._nextDay) {
        // Adding is smart enough around DST
        res.add(1, "d");
        res._nextDay = undefined;
    }

    return res;
}

export function prepareConfig (config) {
    config._locale = config._locale || getLocale(config._l);

    const format = config._f;
    let input = config._i;

    if (input === null || (format === undefined && input === "")) {
        return createInvalid({nullInput: true});
    }

    if (is.string(input)) {
        config._i = input = config._locale.preparse(input);
    }

    if (is.exdate(input)) {
        return new ExDate(checkOverflow(input));
    } else if (is.date(input)) {
        config._d = input;
    } else if (is.array(format)) {
        configFromStringAndArray(config);
    } else if (format) {
        configFromStringAndFormat(config);
    }  else {
        configFromInput(config);
    }

    if (!isValid(config)) {
        config._d = null;
    }

    return config;
}

function configFromInput(config) {
    const input = config._i;
    if (input === undefined) {
        config._d = new Date(hooks.now());
    } else if (is.date(input)) {
        config._d = new Date(input.valueOf());
    } else if (is.string(input)) {
        configFromString(config);
    } else if (is.array(input)) {
        config._a = input.slice(0).map((obj) => {
            return parseInt(obj, 10);
        });
        configFromArray(config);
    } else if (typeof(input) === "object") {
        configFromObject(config);
    } else if (is.number(input)) {
        // from milliseconds
        config._d = new Date(input);
    } else {
        hooks.createFromInputFallback(config);
    }
}

export function createLocalOrUTC (input, format, locale, strict, isUTC) {
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
}
