const __ = adone.lazify({
    /**
     * A shareable symbol constants that can be used
     * as a non-enumerable/semi-hidden level identifiers
     * to allow the readable level property to be mutable for
     * operations like colorization.
     */
    LEVEL: () => Symbol.for("level"),
    MESSAGE: () => Symbol.for("message"),
    SPLAT: () => Symbol.for("splat"),

    config: "./configs",
    format: "./formats",
    Logger: "./logger",
    Container: "./container",
    ExceptionHandler: "./exception_handler",
    RejectionHandler: "./rejection_handler",
    ExceptionStream: "./exception_stream",
    TransportStream: "./transport",
    Profiler: "./profiler",
    tailFile: "./tail_file",
    transport: "./transports",
    loggers: () => new __.Container(),
    addColors: () => (config) => {
        adone.app.logger.format.colorize.Colorizer.addColors(config.colors || config);
        return config;
    },

    create: () => {
        const isLevelEnabledFunctionName = (level) => `is${level.charAt(0).toUpperCase()}${level.slice(1)}Enabled`;

        /**
         * DerivedLogger to attach the logs level methods.
         * @type {DerivedLogger}
         * @extends {Logger}
         */
        class DerivedLogger extends __.Logger {
            /**
             * Create a new class derived logger for which the levels can be attached to
             * the prototype of. This is a V8 optimization that is well know to increase
             * performance of prototype functions.
             * @param {!Object} options - Options for the created logger.
             */
            constructor(options) {
                super(options);
                this._setupLevels();
            }

            /**
             * Create the log level methods for the derived logger.
             * @returns {undefined}
             * @private
             */
            _setupLevels() {
                Object.keys(this.levels).forEach((level) => {
                    if (level === "log") {
                        // eslint-disable-next-line no-console
                        console.warn('Level "log" not defined: conflicts with the method "log". Use a different level name.');
                        return;
                    }

                    // Define prototype methods for each log level
                    // e.g. logger.log('info', msg) <––> logger.info(msg) & logger.isInfoEnabled()
                    // this is not an arrow function so it'll always be called on the instance instead of a fixed place in the prototype chain.
                    this[level] = function (...args) {
                        // Optimize the hot-path which is the single object.
                        if (args.length === 1) {
                            const [msg] = args;
                            const info = msg && msg.message && msg || { message: msg };
                            info.level = info[__.LEVEL] = level;
                            this._addDefaultMeta(info);
                            this.write(info);
                            return this;
                        }

                        // Otherwise build argument list which could potentially conform to
                        // either:
                        // 1. v3 API: log(obj)
                        // 2. v1/v2 API: log(level, msg, ... [string interpolate], [{metadata}], [callback])
                        return this.log(level, ...args);
                    };

                    this[isLevelEnabledFunctionName(level)] = () => this.isLevelEnabled(level);
                });
            }
        }

        return (opts = { levels: __.config.npm.levels }) => new DerivedLogger(opts);
    }
}, exports, require);
