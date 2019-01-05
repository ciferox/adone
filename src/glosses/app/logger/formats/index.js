/**
 * Displays a helpful message and the source of
 * the format when it is invalid.
 */
class InvalidFormatError extends Error {
    constructor(formatFn) {
        super(`Format functions must be synchronous taking a two arguments: (info, opts)
Found: ${formatFn.toString().split("\n")[0]}\n`);

        Error.captureStackTrace(this, InvalidFormatError);
    }
}

/**
 * function format (formatFn)
 * Returns a create function for the `formatFn`.
 */
const format = (formatFn) => {
    if (formatFn.length > 2) {
        throw new InvalidFormatError(formatFn);
    }

    /**
     * function Format (options)
     * Base prototype which calls a `_format`
     * function and pushes the result.
     */
    class Format {
        constructor(options = {}) {
            this.options = options;
        }

        transform(...args) {
            return formatFn.apply(this, args);
        }
    }

    //
    // Create a function which returns new instances of
    // FormatWrap for simple syntax like:
    //
    // adone.app.loggger.format.json();
    //
    const createFormatWrap = (opts) => new Format(opts);

    //
    // Expose the FormatWrap through the create function
    // for testability.
    //
    createFormatWrap.Format = Format;
    return createFormatWrap;
};


adone.lazify({
    align: "./align",
    errors: "./errors",
    cli: "./cli",
    combine: "./combine",
    colorize: "./colorize",
    json: "./json",
    label: "./label",
    logstash: "./logstash",
    metadata: "./metadata",
    ms: "./ms",
    padLevels: "./pad_levels",
    prettyPrint: "./pretty_print",
    printf: "./printf",
    simple: "./simple",
    splat: "./splat",
    timestamp: "./timestamp",
    uncolorize: "./uncolorize"
}, format, require);

export default format;
