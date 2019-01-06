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
        __.format.colorize.Colorizer.addColors(config);
        return config;
    },

    create: () => {
        const isLevelEnabledFunctionName = (level) => `is${level.charAt(0).toUpperCase()}${level.slice(1)}Enabled`;

        class XLogger extends __.Logger {
            constructor(options) {
                super(options);
                
                Object.keys(this.config).forEach((level) => {
                    if (level === "log") {
                        // eslint-disable-next-line no-console
                        console.warn('Level "log" not defined: conflicts with the method "log". Use a different level name.');
                        return;
                    }

                    const icon = this.config[level].icon;

                    this[level] = function (...args) {
                        if (args.length === 1) {
                            const [msg] = args;
                            const info = msg && msg.message && msg || { message: msg };
                            info.level = info[__.LEVEL] = level;
                            info.icon = icon;
                            this._addDefaultMeta(info);
                            this.write(info);
                            return this;
                        }

                        return this.log(level, ...args);
                    };

                    this[isLevelEnabledFunctionName(level)] = () => this.isLevelEnabled(level);
                });
            }
        }

        return (opts = { config: __.config.adone }) => new XLogger(opts);
    }
}, exports, require);
