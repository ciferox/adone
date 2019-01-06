const { 
    app: { logger: { LEVEL, MESSAGE } }
} = adone;


class Padder {
    constructor(opts = { config: adone.app.logger.config.adone }) {
        this.paddings = Padder.paddingForConfig(opts.config, opts.filler);
        this.options = opts;
    }

    /**
     * Returns the maximum length of keys in the specified `levels` Object.
     * @param  {Object} config
     * @returns {Number} Maximum length of the longest level string.
     */
    static getLongestLevel(config) {
        const lvls = Object.keys(config).map((level) => level.length);
        return Math.max(...lvls);
    }

    /**
     * Returns the padding for the specified `level` assuming that the
     * maximum length of all levels it's associated with is `maxLength`.
     * @param  {String} level Level to calculate padding for.
     * @param  {String} filler Repeatable text to use for padding.
     * @param  {Number} maxLength Length of the longest level
     * @returns {String} Padding string for the `level`
     */
    static paddingForLevel(level, filler, maxLength) {
        const targetLen = maxLength + 1 - level.length;
        const rep = Math.floor(targetLen / filler.length);
        const padding = `${filler}${filler.repeat(rep)}`;
        return padding.slice(0, targetLen);
    }

    /**
     * Returns an object with the string paddings for the given `levels`
     * using the specified `filler`.
     * @param  {Object} levels Set of all levels to calculate padding for.
     * @param  {String} filler Repeatable text to use for padding.
     * @returns {Object} Mapping of level to desired padding.
     */
    static paddingForConfig(config, filler = " ") {
        const maxLength = Padder.getLongestLevel(config);
        return Object.keys(config).reduce((acc, level) => {
            acc[level] = Padder.paddingForLevel(level, filler, maxLength);
            return acc;
        }, {});
    }

    /**
     * Prepends the padding onto the `message` based on the `LEVEL` of
     * the `info`.
     *
     * See: https://github.com/winstonjs/winston/blob/2.x/lib/winston/logger.js#L198-L201
     *
     * @param  {Info} info Logform info object
     * @param  {Object} opts Options passed along to this instance.
     * @returns {Info} Modified logform info object.
     */
    transform(info, opts) {
        info.message = `${this.paddings[info[LEVEL]]}${info.message}`;
        if (info[MESSAGE]) {
            info[MESSAGE] = `${this.paddings[info[LEVEL]]}${info[MESSAGE]}`;
        }

        return info;
    }
}

/**
 * function padLevels (info)
 * Returns a new instance of the padLevels Format which pads
 * levels to be the same length.
 */
const padLevels = (opts) => new Padder(opts);
padLevels.Format = Padder;
export default padLevels;
