const {
    logging: { logger }
} = adone;

const {
    format: { padLevels: { Format: Padder } }
} = logger;


/**
 * Cli format class that handles initial state for a a separate
 * Colorizer and Padder instance.
 */
class Format {
    constructor(opts = {}) {
        if (!opts.config) {
            opts.config = logger.config.adone;
        }

        this.colorizer = new logger.format.colorize.Colorizer(opts);
        this.padder = new Padder(opts);
        this.options = opts;
    }

    /**
     * function transform (info, opts)
     * Attempts to both:
     * 1. Pad the { level }
     * 2. Colorize the { level, message }
     * of the given `logform` info object depending on the `opts`.
     */
    transform(info, opts) {
        this.colorizer.transform(
            this.padder.transform(info, opts),
            opts
        );

        info[logger.MESSAGE] = `${info.level}:${info.message}`;
        return info;
    }
}

/**
 * function cli (opts)
 * Returns a new instance of the CLI format that turns a log
 * `info` object.
 */
const cli = (opts) => new Format(opts);
cli.Format = Format;

export default cli;
