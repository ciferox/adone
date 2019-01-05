const {
    is
} = adone;

/**
 * TODO: add class description.
 * @type {Profiler}
 * @private
 */
export default class Profiler {
    /**
     * Constructor function for the Profiler instance used by
     * `Logger.prototype.startTimer`. When done is called the timer will finish
     * and log the duration.
     * @param {!Logger} logger - TODO: add param description.
     * @private
     */
    constructor(logger) {
        if (!logger) {
            throw new Error("Logger is required for profiling.");
        }

        this.logger = logger;
        this.start = Date.now();
    }

    /**
     * Ends the current timer (i.e. Profiler) instance and logs the `msg` along
     * with the duration since creation.
     * @returns {mixed} - TODO: add return description.
     * @private
     */
    done(...args) {
        const info = typeof args[args.length - 1] === "object" ? args.pop() : {};
        info.level = info.level || "info";
        info.durationMs = (Date.now()) - this.start;

        return this.logger.write(info);
    }
};
