const {
    is,
    fake
} = adone;

/**
 * past
 *
 * @method fake.date.past
 * @param {number} years
 * @param {date} refDate
 */
export const past = function (years, refDate) {
    const date = (refDate) ? new Date(Date.parse(refDate)) : new Date();
    const range = {
        min: 1000,
        max: (years || 1) * 365 * 24 * 3600 * 1000
    };

    let past = date.getTime();
    past -= fake.random.number(range); // some time from now to N years ago, in milliseconds
    date.setTime(past);

    return date;
};

/**
 * future
 *
 * @method fake.date.future
 * @param {number} years
 * @param {date} refDate
 */
export const future = function (years, refDate) {
    const date = (refDate) ? new Date(Date.parse(refDate)) : new Date();
    const range = {
        min: 1000,
        max: (years || 1) * 365 * 24 * 3600 * 1000
    };

    let future = date.getTime();
    future += fake.random.number(range); // some time from now to N years later, in milliseconds
    date.setTime(future);

    return date;
};

/**
 * between
 *
 * @method fake.date.between
 * @param {date} from
 * @param {date} to
 */
export const between = function (from, to) {
    const fromMilli = Date.parse(from);
    const dateOffset = fake.random.number(Date.parse(to) - fromMilli);

    const newDate = new Date(fromMilli + dateOffset);

    return newDate;
};

/**
 * recent
 *
 * @method fake.date.recent
 * @param {number} days
 */
export const recent = function (days) {
    const date = new Date();
    const range = {
        min: 1000,
        max: (days || 1) * 24 * 3600 * 1000
    };

    let future = date.getTime();
    future -= fake.random.number(range); // some time from now to N days ago, in milliseconds
    date.setTime(future);

    return date;
};

/**
 * soon
 *
 * @method fake.date.soon
 * @param {number} days
 */
export const soon = function (days) {
    const date = new Date();
    const range = {
        min: 1000,
        max: (days || 1) * 24 * 3600 * 1000
    };

    let future = date.getTime();
    future += fake.random.number(range); // some time from now to N days later, in milliseconds
    date.setTime(future);

    return date;
};

/**
 * month
 *
 * @method fake.date.month
 * @param {object} options
 */
export const month = function (options) {
    options = options || {};

    let type = "wide";
    if (options.abbr) {
        type = "abbr";
    }
    if (options.context && !is.undefined(fake.definitions.date.month[`${type}_context`])) {
        type += "_context";
    }

    const source = fake.definitions.date.month[type];

    return fake.random.arrayElement(source);
};

/**
 * weekday
 *
 * @param {object} options
 * @method fake.date.weekday
 */
export const weekday = function (options) {
    options = options || {};

    let type = "wide";
    if (options.abbr) {
        type = "abbr";
    }
    if (options.context && !is.undefined(fake.definitions.date.weekday[`${type}_context`])) {
        type += "_context";
    }

    const source = fake.definitions.date.weekday[type];

    return fake.random.arrayElement(source);
};
