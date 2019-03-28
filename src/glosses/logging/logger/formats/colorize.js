const {
    logging: { logger: { LEVEL, MESSAGE } },
    is,
    cli: { chalk }
} = adone;

/**
 * @property {RegExp} hasSpace
 * Simple regex to check for presence of spaces.
 */
const hasSpace = /\s+/;

/**
 * Colorizer format. Wraps the `level` and/or `message` properties
 * of the `info` objects with ANSI color codes based on a few options.
 */
class Colorizer {
    static allColors = {};

    constructor(opts = {}) {
        if (opts.config) {
            this.addColors(opts.config);
        }

        this.options = opts;
    }

    /**
     * Adds the colors Object to the set of allColors
     * known by the Colorizer
     *
     * @param {Object} colors Set of color mappings to add.
     */
    static addColors(config) {
        const nextColors = Object.keys(config).reduce((acc, level) => {
            acc[level] = hasSpace.test(config[level].color)
                ? config[level].color.split(hasSpace)
                : config[level].color;
            return acc;
        }, {});

        Colorizer.allColors = Object.assign({}, Colorizer.allColors, nextColors);
        return Colorizer.allColors;
    }

    /**
     * Adds the colors Object to the set of allColors
     * known by the Colorizer
     *
     * @param {Object} config Set of color mappings to add.
     */
    addColors(config) {
        return Colorizer.addColors(config);
    }

    /**
     * function colorize (lookup, level, message)
     * Performs multi-step colorization using colors/safe
     */
    colorize(lookup, level, message) {
        if (is.undefined(message)) {
            message = level;
        }

        //
        // If the color for the level is just a string
        // then attempt to colorize the message with it.
        //
        if (!is.array(Colorizer.allColors[lookup])) {
            return chalk[Colorizer.allColors[lookup]](message);
        }

        //
        // If it is an Array then iterate over that Array, applying
        // the colors function for each item.
        //
        for (let i = 0, len = Colorizer.allColors[lookup].length; i < len; i++) {
            message = chalk[Colorizer.allColors[lookup][i]](message);
        }

        return message;
    }

    /**
     * function transform (info, opts)
     * Attempts to colorize the { level, message } of the given
     * `logform` info object.
     */
    transform(info, opts) {
        if (opts.all && is.string(info[MESSAGE])) {
            info[MESSAGE] = this.colorize(info[LEVEL], info.level, info[MESSAGE]);
        }

        if (opts.level || opts.all || !opts.message) {
            info.level = this.colorize(info[LEVEL], info.level);
            if (is.string(info.icon)) {
                info.icon = this.colorize(info[LEVEL], info.icon);
            }
        }

        if (opts.all || opts.message) {
            info.message = this.colorize(info[LEVEL], info.level, info.message);
        }

        return info;
    }
}

/**
 * function colorize (info)
 * Returns a new instance of the colorize Format that applies
 * level colors to `info` objects.
 */
const colorize = (opts) => new Colorizer(opts);
colorize.Colorizer = Colorizer;

export default colorize;
