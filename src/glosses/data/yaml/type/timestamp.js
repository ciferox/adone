const { data: { yaml }, is, error } = adone;

const YAML_DATE_REGEXP = new RegExp(
    "^([0-9][0-9][0-9][0-9])" + // [1] year
    "-([0-9][0-9])" + // [2] month
    "-([0-9][0-9])$");  // [3] day

const YAML_TIMESTAMP_REGEXP = new RegExp(
    "^([0-9][0-9][0-9][0-9])" + // [1] year
    "-([0-9][0-9]?)" + // [2] month
    "-([0-9][0-9]?)" + // [3] day
    "(?:[Tt]|[ \\t]+)" + // ...
    "([0-9][0-9]?)" + // [4] hour
    ":([0-9][0-9])" + // [5] minute
    ":([0-9][0-9])" + // [6] second
    "(?:\\.([0-9]*))?" + // [7] fraction
    "(?:[ \\t]*(Z|([-+])([0-9][0-9]?)" + // [8] tz [9] tz_sign [10] tz_hour
    "(?::([0-9][0-9]))?))?$"); // [11] tz_minute

const resolveYamlTimestamp = (data) => {
    if (is.null(data)) {
        return false;
    }
    if (!is.null(YAML_DATE_REGEXP.exec(data))) {
        return true;
    }
    if (!is.null(YAML_TIMESTAMP_REGEXP.exec(data))) {
        return true;
    }
    return false;
};

const constructYamlTimestamp = (data) => {
    let match = YAML_DATE_REGEXP.exec(data);
    if (is.null(match)) {
        match = YAML_TIMESTAMP_REGEXP.exec(data);
    }

    if (is.null(match)) {
        throw new error.InvalidArgument("Date resolve error");
    }

    // match: [1] year [2] month [3] day

    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);

    if (!match[4]) { // no hour
        return new Date(Date.UTC(year, month, day));
    }

    // match: [4] hour [5] minute [6] second [7] fraction

    const hour = Number(match[4]);
    const minute = Number(match[5]);
    const second = Number(match[6]);

    let fraction = 0;
    if (match[7]) {
        fraction = match[7].slice(0, 3);
        while (fraction.length < 3) { // milli-seconds
            fraction += "0";
        }
        fraction = Number(fraction);
    }

    // match: [8] tz [9] tz_sign [10] tz_hour [11] tz_minute

    let delta = null;
    let tzMinute;
    let tzHour;
    if (match[9]) {
        tzHour = Number(match[10]);
        tzMinute = Number(match[11] || 0);
        delta = (tzHour * 60 + tzMinute) * 60000; // delta in mili-seconds
        if (match[9] === "-") {
            delta = -delta;
        }
    }

    const date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));

    if (delta) {
        date.setTime(date.getTime() - delta);
    }

    return date;
};

export default new yaml.type.Type("tag:yaml.org,2002:timestamp", {
    kind: "scalar",
    resolve: resolveYamlTimestamp,
    construct: constructYamlTimestamp,
    instanceOf: Date,
    represent: (object) => object.toISOString()
});
