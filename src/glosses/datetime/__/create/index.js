adone.lazify({
    checkOverflow: "./check_overflow",
    createDate: ["./date_from_array", (x) => x.createDate],
    createUTCDate: ["./date_from_array", (x) => x.createUTCDate],
    prepareConfig: ["./from_anything", (x) => x.prepareConfig],
    createLocalOrUTC: ["./from_anything", (x) => x.createLocalOrUTC],
    configFromArray: ["./from_array", (x) => x.configFromArray],
    configFromObject: ["./from_object", (x) => x.configFromObject],
    configFromStringAndArray: ["./from_string_and_array", (x) => x.configFromStringAndArray],
    configFromStringAndFormat: ["./from_string_and_format", (x) => x.configFromStringAndFormat],
    configFromISO: ["./from_string", (x) => x.configFromISO],
    configFromRFC2822: ["./from_string", (x) => x.configFromRFC2822],
    configFromString: ["./from_string", (x) => x.configFromString],
    createLocal: "./local",
    getParsingFlags: "./parsing_flags",
    createUTC: "./utc",
    isValid: ["./valid", (x) => x.isValid],
    createInvalid: ["./valid", (x) => x.createInvalid]
}, exports, require);
