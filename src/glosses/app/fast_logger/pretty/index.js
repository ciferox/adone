const dateformat = require("dateformat");
// remove jsonParser once Node 6 is not supported anymore
const jsonParser = require("fast-json-parse");
const jmespath = require("jmespath");
const stringifySafe = require("fast-safe-stringify");

const CONSTANTS = require("./constants");

const {
    is,
    cli: { chalk }
} = adone;

const levels = {
    default: "USERLVL",
    60: "FATAL",
    50: "ERROR",
    40: "WARN ",
    30: "INFO ",
    20: "DEBUG",
    10: "TRACE"
};

const defaultOptions = {
    colorize: chalk.supportsColor,
    crlf: false,
    errorLikeObjectKeys: ["err", "error"],
    errorProps: "",
    levelFirst: false,
    messageKey: CONSTANTS.MESSAGE_KEY,
    translateTime: false,
    useMetadata: false,
    outputStream: process.stdout
};

const isPinoLog = (log) => log && (log.hasOwnProperty("v") && log.v === 1);

const formatTime = function (epoch, translateTime) {
    const instant = new Date(epoch);
    if (translateTime === true) {
        return dateformat(instant, `UTC:${CONSTANTS.DATE_FORMAT}`);
    }
    const upperFormat = translateTime.toUpperCase();
    return (!upperFormat.startsWith("SYS:"))
        ? dateformat(instant, `UTC:${translateTime}`)
        : (upperFormat === "SYS:STANDARD")
            ? dateformat(instant, CONSTANTS.DATE_FORMAT)
            : dateformat(instant, translateTime.slice(4));

};

const nocolor = (input) => input;

module.exports = function prettyFactory(options) {
    const opts = Object.assign({}, defaultOptions, options);
    const EOL = opts.crlf ? "\r\n" : "\n";
    const IDENT = "    ";
    const messageKey = opts.messageKey;
    const errorLikeObjectKeys = opts.errorLikeObjectKeys;
    const errorProps = opts.errorProps.split(",");
    let standardKeys;

    const color = {
        default: nocolor,
        60: nocolor,
        50: nocolor,
        40: nocolor,
        30: nocolor,
        20: nocolor,
        10: nocolor,
        message: nocolor
    };
    if (opts.colorize) {
        const ctx = new chalk.constructor({ enabled: true, level: 3 });
        color.default = ctx.white;
        color[60] = ctx.bgRed;
        color[50] = ctx.red;
        color[40] = ctx.yellow;
        color[30] = ctx.green;
        color[20] = ctx.blue;
        color[10] = ctx.grey;
        color.message = ctx.cyan;
    }

    const search = opts.search;

    const joinLinesWithIndentation = function (value) {
        const lines = value.split(/\r?\n/);
        for (let i = 1; i < lines.length; i++) {
            lines[i] = IDENT + lines[i];
        }
        return lines.join(EOL);
    };

    const filterObjects = function (value, messageKey, errorLikeObjectKeys, excludeStandardKeys) {
        errorLikeObjectKeys = errorLikeObjectKeys || [];

        const keys = Object.keys(value);
        const filteredKeys = [];

        if (messageKey) {
            filteredKeys.push(messageKey);
        }

        if (excludeStandardKeys !== false) {
            Array.prototype.push.apply(filteredKeys, standardKeys);
        }

        let result = "";

        for (let i = 0; i < keys.length; i += 1) {
            if (errorLikeObjectKeys.indexOf(keys[i]) !== -1 && !is.undefined(value[keys[i]])) {
                const lines = stringifySafe(value[keys[i]], null, 2);
                if (is.undefined(lines)) {
                    continue;
                }
                const arrayOfLines = (
                    `${IDENT + keys[i]}: ${
                        joinLinesWithIndentation(lines)
                    }${EOL}`
                ).split("\n");

                for (let j = 0; j < arrayOfLines.length; j += 1) {
                    if (j !== 0) {
                        result += "\n";
                    }

                    const line = arrayOfLines[j];

                    if (/^\s*"stack"/.test(line)) {
                        const matches = /^(\s*"stack":)\s*(".*"),?$/.exec(line);

                        if (matches && matches.length === 3) {
                            const indentSize = /^\s*/.exec(line)[0].length + 4;
                            const indentation = " ".repeat(indentSize);

                            result += `${matches[1]}\n${indentation}${JSON.parse(matches[2]).replace(/\n/g, `\n${indentation}`)}`;
                        }
                    } else {
                        result += line;
                    }
                }
            } else if (filteredKeys.indexOf(keys[i]) < 0) {
                if (!is.undefined(value[keys[i]])) {
                    const lines = stringifySafe(value[keys[i]], null, 2);
                    if (!is.undefined(lines)) {
                        result += `${IDENT + keys[i]}: ${joinLinesWithIndentation(lines)}${EOL}`;
                    }
                }
            }
        }

        return result;
    };

    const pretty = function (inputData) {
        let log;
        if (!is.object(inputData)) {
            const parsed = jsonParser(inputData);
            log = parsed.value;
            if (parsed.err || !isPinoLog(log)) {
                // pass through
                return inputData + EOL;
            }
        } else {
            log = inputData;
        }

        if (search && !jmespath.search(log, search)) {
            return;
        }

        standardKeys = [
            "pid",
            "hostname",
            "name",
            "level",
            "time",
            "v"
        ];

        if (opts.translateTime) {
            log.time = formatTime(log.time, opts.translateTime);
        }

        let line = log.time ? `[${log.time}]` : "";

        const coloredLevel = levels.hasOwnProperty(log.level)
            ? color[log.level](levels[log.level])
            : color.default(levels.default);
        if (opts.levelFirst) {
            line = `${coloredLevel} ${line}`;
        } else {
            // If the line is not empty (timestamps are enabled) output it
            // with a space after it - otherwise output the empty string
            const lineOrEmpty = line && `${line} `;
            line = `${lineOrEmpty}${coloredLevel}`;
        }

        if (log.name || log.pid || log.hostname) {
            line += " (";

            if (log.name) {
                line += log.name;
            }

            if (log.name && log.pid) {
                line += `/${log.pid}`;
            } else if (log.pid) {
                line += log.pid;
            }

            if (log.hostname) {
                line += ` on ${log.hostname}`;
            }

            line += ")";
        }

        line += ": ";

        if (log[messageKey] && is.string(log[messageKey])) {
            line += color.message(log[messageKey]);
        }

        line += EOL;

        if (log.type === "Error" && log.stack) {
            const stack = log.stack;
            line += IDENT + joinLinesWithIndentation(stack) + EOL;

            let propsForPrint;
            if (errorProps && errorProps.length > 0) {
                // don't need print these props for 'Error' object
                const excludedProps = standardKeys.concat([messageKey, "type", "stack"]);

                if (errorProps[0] === "*") {
                    // print all log props excluding 'excludedProps'
                    propsForPrint = Object.keys(log).filter((prop) => excludedProps.indexOf(prop) < 0);
                } else {
                    // print props from 'errorProps' only
                    // but exclude 'excludedProps'
                    propsForPrint = errorProps.filter((prop) => excludedProps.indexOf(prop) < 0);
                }

                for (let i = 0; i < propsForPrint.length; i++) {
                    const key = propsForPrint[i];
                    if (!log.hasOwnProperty(key)) {
                        continue;
                    }
                    if (log[key] instanceof Object) {
                        // call 'filterObjects' with 'excludeStandardKeys' = false
                        // because nested property might contain property from 'standardKeys'
                        line += `${key}: {${EOL}${filterObjects(log[key], "", errorLikeObjectKeys, false)}}${EOL}`;
                        continue;
                    }
                    line += `${key}: ${log[key]}${EOL}`;
                }
            }
        } else {
            line += filterObjects(log, is.string(log[messageKey]) ? messageKey : undefined, errorLikeObjectKeys);
        }

        return line;
    };

    return pretty;
};
