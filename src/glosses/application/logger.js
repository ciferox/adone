const {
    is,
    std: { util: { format } }
} = adone;

const LOG_NOFORMAT = 255;

export default class Logger {
    constructor(options = {}) {
        this.options = options;
        if (!is.propertyDefined(options, "bindArgs")) {
            this.options.bindArgs = [];
        }
        this._channels = [];
        this._transforms = [];
        this._endPromisses = [];
    }

    log(...args) {
        let bindArgs = [];
        for (let i = 0; i < this.options.bindArgs.length; i++) {
            const a = this.options.bindArgs[i];
            if (is.function(a)) {
                bindArgs.push(a());
            } else {
                bindArgs.push(a);
            }
        }
        bindArgs = bindArgs.concat(args);
        for (const t of this._transforms) {
            t.write(bindArgs);
        }
        return this;
    }

    fatal(...args) {
        this.log(Logger.LOG_FATAL, format.apply(null, args));
    }

    error(...args) {
        this.log(Logger.LOG_ERROR, format.apply(null, args));
    }

    warn(...args) {
        this.log(Logger.LOG_WARNING, format.apply(null, args));
    }

    info(...args) {
        this.log(Logger.LOG_INFO, format.apply(null, args));
    }

    debug(...args) {
        this.log(Logger.LOG_DEBUG, format.apply(null, args));
    }

    trace(...args) {
        this.log(Logger.LOG_TRACE, format.apply(null, args));
    }

    done(fn) {
        for (const t of this._transforms) {
            t.end();
        }

        if (is.function(fn)) {
            Promise.all(this._endPromisses).then(() => {
                fn();
            });
        } else {
            return Promise.all(this._endPromisses);
        }
    }

    toSinks(sinks) {
        if (is.array(sinks)) {
            for (const options of sinks) {
                this._pipeTransform(options);
            }
        } else {
            throw new adone.x.InvalidArgument(`Unsupported type of sinks: ${typeof (sinks)}`);
        }
        return this;
    }

    toStdout(options) {
        this._pipeTransform(Object.assign({
            type: "stdout"
        }, options));
        return this;
    }

    toStderr(options) {
        this._pipeTransform(Object.assign({
            type: "stderr"
        }, options));
        return this;
    }

    toFile(options) {
        this._pipeTransform(Object.assign({
            type: "file"
        }), options);
        return this;
    }

    toStream(options) {
        this._pipeTransform(Object.assign({
            type: "stream"
        }), options);
        return this;
    }

    static default() {
        if (is.null(Logger.defaultLogger)) {
            const logger = new Logger({
                bindArgs: [
                    () => {
                        const now = new Date();
                        return (`${(`0${now.getDate()}`).slice(-2)}-${(`0${now.getMonth() + 1}`).slice(-2)}-${now.getFullYear()} ${(`0${now.getHours()}`).slice(-2)}:${(`0${now.getMinutes()}`).slice(-2)}:${(`0${now.getSeconds()}`).slice(-2)}`);
                    }
                ]
            });

            // setup default logger sinks
            for (const options of Logger.defaultSinks) {
                const methodName = adone.text.toCamelCase(`to_${options.type}`);
                const method = logger[methodName];
                if (is.function(method)) {
                    method.call(logger, options);
                }
            }

            Logger.defaultLogger = logger;
        }

        return Logger.defaultLogger;
    }

    _pipeTransform({ type, filter, argsSchema, noFormatLogger, delimiter = " ", stream, filePath } = {}) {
        class LogTransform extends adone.Transform { }

        LogTransform.prototype._format = format;
        LogTransform.prototype.LOG_NOFORMAT = LOG_NOFORMAT;

        let suffixStyle;
        let preprocessCode = "";
        let formatString = "\"";
        let definitions = "const args = x.slice();";
        if (is.array(argsSchema)) {
            const argsNum = argsSchema.length;
            for (let i = 0; i < argsNum; i++) {
                let leftBracket = "";
                let rightBracket = "";
                const argSchema = argsSchema[i];
                if (is.function(argSchema.preprocess)) {
                    LogTransform.prototype[`_preprocessArg${i}`] = argSchema.preprocess;
                    preprocessCode += `args[${i}] = this._preprocessArg${i}(args[${i}]);\n`;
                }

                if (is.propertyDefined(argSchema, "brackets")) {
                    if (argSchema.brackets === true) {
                        leftBracket = "[";
                        rightBracket = "]";
                    } else if (is.array(argSchema.brackets) && argSchema.brackets.length === 2) {
                        leftBracket = argSchema.brackets[0];
                        rightBracket = argSchema.brackets[1];
                    }
                }
                formatString += leftBracket;
                const hasStyle = ((type === "stdout" && process.stdout && process.stdout.isTTY) || (type === "stderr" && process.stderr && process.stderr.isTTY)) && is.propertyDefined(argSchema, "style");
                if (hasStyle) {
                    if (!is.propertyDefined(LogTransform.prototype, "_parseStyle")) {
                        suffixStyle = adone.terminal.parse("{/}");
                        LogTransform.prototype._parseStyle = adone.terminal.parse.bind(adone.terminal);
                    }
                    let styleArg = `args[${i}]`;
                    if (is.function(argSchema.styleArgTransform)) {
                        LogTransform.prototype[`_styleArgTransform${i}`] = argSchema.styleArgTransform;
                        styleArg = `this._styleArgTransform${i}(${styleArg})`;
                    }
                    if (is.function(argSchema.style)) {
                        LogTransform.prototype[`_styleFn${i}`] = argSchema.style;
                        definitions += `const origArg${i} = ${styleArg};`;
                        formatString += `" + this._parseStyle(this._styleFn${i}(origArg${i})) + "`;
                    } else if (is.string(argSchema.style)) {
                        formatString += adone.terminal.parse(argSchema.style);
                    } else if (is.object(argSchema.style)) {
                        for (const [id, val] of adone.util.entries(argSchema.style)) {
                            argSchema.style[id] = adone.terminal.parse(val);
                        }
                        LogTransform.prototype[`_styleObj${i}`] = argSchema.style;
                        definitions += `const origArg${i} = ${styleArg};`;
                        formatString += `" + this._parseStyle(this._styleObj${i}[origArg${i}]) + "`;
                    } else {
                        throw new adone.x.NotSupported(`Unsupported argument style for logger: ${typeof (argSchema.style)}`);
                    }
                }
                if (is.propertyDefined(argSchema, "format")) {
                    formatString += argSchema.format;
                } else {
                    formatString += "%s";
                }

                if (hasStyle) {
                    formatString += suffixStyle;
                }
                formatString += rightBracket;
                if (i < (argsNum - 1)) {
                    formatString += delimiter;
                }
            }
        }

        formatString += "\\n\"";

        let filterCode = "";
        if (is.function(filter)) {
            LogTransform.prototype._filter = filter;
            filterCode = "if (!this._filter(x)) return;";
        }

        const bindingsCount = this.options.bindArgs.length;
        let fnCode = "";
        if (noFormatLogger === true) {
            fnCode += `if (x[${bindingsCount}] === this.LOG_NOFORMAT) {
                    return this.push(\`\${this._format.apply(null, x.slice(1 + ${bindingsCount}))}\\n\`);
                }`;
        }
        fnCode += `
            ${filterCode}
            ${definitions}
            ${preprocessCode}
            const msg = this._format.apply(null, [${formatString}].concat(args));
            this.push(msg);
        `;
        LogTransform.prototype._transform = new Function("x", fnCode);
        const t = new LogTransform();
        switch (type) {
            case "stdout": t.pipe(process.stdout); break;
            case "stderr": t.pipe(process.stderr); break;
            case "file": {
                if (!is.string(filePath)) {
                    throw new adone.x.NotValid("For 'file' log channels you should specify 'filePath' option");
                }
                t.pipe(adone.std.fs.createWriteStream(filePath));
                break;
            }
            case "stream": {
                if (!is.stream(stream)) {
                    throw new adone.x.NotValid("For 'stream' log channels you should specify 'stream' option");
                }
                t.pipe(stream);
                break;
            }
        }

        if (noFormatLogger === true) {
            const logNoFormatName = `${type}LogNoFmt`;
            if (!is.propertyDefined(this, logNoFormatName)) {
                const dummyArray = new Array(bindingsCount);
                dummyArray.push(LOG_NOFORMAT);
                this[logNoFormatName] = (...args) => {
                    t.write(dummyArray.concat(format.apply(null, args)));
                };
            }
        }

        this._transforms.push(t);
        this._channels.push(type);
        this._endPromisses.push(new Promise((resolve) => {
            t.once("end", resolve);
        }));
        t.resume();
    }
}
Logger.LOG_FATAL = 0;
Logger.LOG_ERROR = 1;
Logger.LOG_WARNING = 2;
Logger.LOG_INFO = 3;
Logger.LOG_DEBUG = 4;
Logger.LOG_TRACE = 5;
Logger.LOG_LEVELS = {
    0: "FATAL",
    1: "ERROR",
    2: "WARNING",
    3: "INFO",
    4: "DEBUG",
    5: "TRACE"
};
Logger.defaultLogger = null;
Logger.defaultSinks = [
    {
        type: "stdout",
        noFormatLogger: true,
        filter: (args) => {
            const level = args[1];
            return (level >= Logger.LOG_WARNING && level <= Logger.LOG_TRACE);
        },
        argsSchema: [
            {
                format: "%s",
                style: "{grey-fg}",
                brackets: true
            },
            {
                format: "%s",
                style: {
                    5: "{cyan-fg}",
                    4: "{grey-fg}",
                    3: "{white-fg}",
                    2: "{yellow-fg}"
                },
                preprocess: (val) => Logger.LOG_LEVELS[val],
                brackets: true
            },
            {
                format: "%s",
                style: "{green-fg}"
            }
        ]
    },
    {
        type: "stderr",
        filter: (args) => {
            const level = args[1];
            return (level >= Logger.LOG_FATAL && level <= Logger.LOG_ERROR);
        },
        argsSchema: [
            {
                format: "%s",
                style: "{grey-fg}",
                brackets: true
            },
            {
                format: "%s",
                style: {
                    1: "{red-fg}",
                    0: "{bold}{red-fg}"
                },
                preprocess: (val) => Logger.LOG_LEVELS[val],
                brackets: true
            },
            {
                format: "%s",
                style: "{green-fg}"
            }
        ]
    }
];
adone.tag.set(Logger, adone.tag.LOGGER);
