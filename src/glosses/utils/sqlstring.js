const { is, util } = adone;

const charsRegex = /[\0\b\t\n\r\x1a\"\'\\]/g; // eslint-disable-line no-control-regex
const charsMap = new Map([
    ["\0", "\\0"],
    ["\b", "\\b"],
    ["\t", "\\t"],
    ["\n", "\\n"],
    ["\r", "\\r"],
    ["\x1a", "\\Z"],
    ['"', '\\"'],
    ["'", "\\'"],
    ["\\", "\\\\"]
]);

const escapeString = (val) => {
    let chunkIndex = charsRegex.lastIndex = 0;
    let escapedVal = "";
    let match;

    while ((match = charsRegex.exec(val))) {
        escapedVal += val.slice(chunkIndex, match.index) + charsMap.get(match[0]);
        chunkIndex = charsRegex.lastIndex;
    }

    if (chunkIndex === 0) {
        // Nothing was escaped
        return `'${val}'`;
    }

    if (chunkIndex < val.length) {
        return `'${escapedVal}${val.slice(chunkIndex)}'`;
    }

    return `'${escapedVal}'`;
};

const zeroPad = (number, length) => {
    number = number.toString();

    if (number.length >= length) {
        return number;
    }

    return `${"0".repeat(length - number.length)}${number}`;
};

const convertTimezone = (tz) => {
    if (tz === "Z") {
        return 0;
    }

    const m = tz.match(/([\+\-\s])(\d\d):?(\d\d)?/);
    if (m) {
        const t = (parseInt(m[2], 10) + ((m[3] ? parseInt(m[3], 10) : 0) / 60)) * 60;
        return (m[1] === "-" ? -1 : 1) * t;
    }
    return false;
};

export const escapeId = (val, forbidQualified) => {
    if (is.array(val)) {
        if (val.length === 0) {
            return "";
        }

        let sql = escapeId(val[0], forbidQualified);

        for (let i = 1; i < val.length; i++) {
            sql += `, ${escapeId(val[i], forbidQualified)}`;
        }

        return sql;
    }

    if (forbidQualified) {
        return `\`${String(val).replace(/`/g, "``")}\``;
    }

    return `\`${String(val).replace(/`/g, "``").replace(/\./g, "`.`")}\``;
};

export const dateToString = (date, timeZone) => {
    const dt = new Date(date);

    if (isNaN(dt.getTime())) {
        return "NULL";
    }

    let year;
    let month;
    let day;
    let hour;
    let minute;
    let second;
    let millisecond;

    if (timeZone === "local") {
        year = dt.getFullYear();
        month = dt.getMonth() + 1;
        day = dt.getDate();
        hour = dt.getHours();
        minute = dt.getMinutes();
        second = dt.getSeconds();
        millisecond = dt.getMilliseconds();
    } else {
        const tz = convertTimezone(timeZone);

        if (tz !== false && tz !== 0) {
            dt.setTime(dt.getTime() + (tz * 60000));
        }

        year = dt.getUTCFullYear();
        month = dt.getUTCMonth() + 1;
        day = dt.getUTCDate();
        hour = dt.getUTCHours();
        minute = dt.getUTCMinutes();
        second = dt.getUTCSeconds();
        millisecond = dt.getUTCMilliseconds();
    }

    // YYYY-MM-DD HH:mm:ss.mmm
    year = zeroPad(year, 4);
    month = zeroPad(month, 2);
    day = zeroPad(day, 2);
    hour = zeroPad(hour, 2);
    minute = zeroPad(minute, 2);
    second = zeroPad(second, 2);
    millisecond = zeroPad(millisecond, 3);
    const str = `${year}-${month}-${day} ${hour}:${minute}:${second}.${millisecond}`;

    return escapeString(str);
};

export const arrayToList = (array, timeZone) => {
    let sql = "";

    for (let i = 0; i < array.length; i++) {
        const value = array[i];

        if (is.array(value)) {
            sql += `${i === 0 ? "" : ", "}(${arrayToList(value, timeZone)})`;
        } else {
            // eslint-disable-next-line no-use-before-define
            sql += `${i === 0 ? "" : ", "}${escape(value, true, timeZone)}`;
        }
    }

    return sql;
};

export const bufferToString = (buffer) => `X${escapeString(buffer.toString("hex"))}`;

export const objectToValues = (object, timeZone) => {
    let sql = "";

    const entries = util.entries(object);

    for (let i = 0; i < entries.length; ++i) {
        const [key, value] = entries[i];

        if (is.function(value)) {
            continue;
        }
        // eslint-disable-next-line no-use-before-define
        sql += `${(sql.length === 0 ? "" : ", ") + escapeId(key)} = ${escape(value, true, timeZone)}`;
    }

    return sql;
};

export const escape = (value, stringifyObjects, timeZone) => {
    if (is.nil(value)) {
        return "NULL";
    }

    switch (typeof value) {
        case "boolean": {
            return (value) ? "true" : "false";
        }
        case "number": {
            return String(value);
        }
        case "object": {
            if (is.date(value)) {
                return dateToString(value, timeZone || "local");
            } else if (is.array(value)) {
                return arrayToList(value, timeZone);
            } else if (is.buffer(value)) {
                return bufferToString(value);
            } else if (stringifyObjects) {
                return escapeString(value.toString());
            } else {
                return objectToValues(value, timeZone);
            }
        }
        default: {
            return escapeString(value);
        }
    }
};

export const format = (sql, values, stringifyObjects, timeZone) => {
    if (is.nil(values)) {
        return sql;
    }

    values = util.arrify(values);

    let chunkIndex = 0;
    const placeholdersRegex = /\?\??/g;
    let result = "";
    let valuesIndex = 0;
    let match;

    while (valuesIndex < values.length && (match = placeholdersRegex.exec(sql))) {
        const value = match[0] === "??"
            ? escapeId(values[valuesIndex])
            : escape(values[valuesIndex], stringifyObjects, timeZone);

        result += sql.slice(chunkIndex, match.index) + value;
        chunkIndex = placeholdersRegex.lastIndex;
        valuesIndex++;
    }

    if (chunkIndex === 0) {
        // Nothing was replaced
        return sql;
    }

    if (chunkIndex < sql.length) {
        return result + sql.slice(chunkIndex);
    }

    return result;
};
