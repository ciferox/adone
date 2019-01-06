const {
    app: { logger },
    async: { forEach },
    is,
    std: { stream: { Stream, Transform } }
} = adone;

const { Profiler, RejectionHandler, ExceptionHandler } = logger;

/**
 * Captures the number of format (i.e. %s strings) in a given string.
 * Based on `util.format`, see Node.js source:
 * https://github.com/nodejs/node/blob/b1c8f15c5f169e021f7c46eb7b219de95fe97603/lib/util.js#L201-L230
 * @type {RegExp}
 */
const formatRegExp = /%[scdjifoO%]/g;

const getLevelValue = (levels, level) => {
    const value = levels[level];
    if (!value && value !== 0) {
        return null;
    }
    return value;
};

export default class Logger extends Transform {
    /**
     * Constructor function for the Logger object responsible for persisting log
     * messages and metadata to one or more transports.
     * @param {!Object} options - foo
     */
    constructor(options) {
        super({
            objectMode: true
        });
        this.configure(options);
    }

    child(defaultRequestMetadata) {
        const logger = this;
        return Object.create(logger, {
            write: {
                value(info) {
                    const infoClone = Object.assign(
                        {},
                        defaultRequestMetadata,
                        info
                    );

                    // Object.assign doesn't copy inherited Error properties so we have to do that explicitly
                    if (info instanceof Error) {
                        infoClone.stack = info.stack;
                        infoClone.message = info.message;
                    }

                    logger.write(infoClone);
                }
            }
        });
    }

    /**
     * This will wholesale reconfigure this instance by:
     * 1. Resetting all transports. Older transports will be removed implicitly.
     * 2. Set all other options including levels configuration, filters,
     *    exceptionHandlers, etc.
     * @param {!Object} options - TODO: add param description.
     * @returns {undefined}
     */
    configure({
        silent,
        format,
        defaultMeta,
        config,
        level = "info",
        exitOnError = true,
        transports,
        exceptionHandlers,
        rejectionHandlers
    } = {}) {
        // Reset transports if we already have them
        if (this.transports.length) {
            this.clear();
        }

        this.silent = silent;
        this.format = format || this.format || adone.app.logger.format.json();

        this.defaultMeta = defaultMeta || null;
        // Hoist other options onto this instance.
        this.config = config || adone.app.logger.config.adone;
        this.levels = {};
        Object.keys(this.config).forEach((level) => {
            this.levels[level] = this.config[level].id;
        });
        
        this.level = level;
        this.exceptions = new ExceptionHandler(this);
        this.rejections = new RejectionHandler(this);
        this.profilers = {};
        this.exitOnError = exitOnError;

        // Add all transports we have been provided.
        if (transports) {
            transports = is.array(transports) ? transports : [transports];
            transports.forEach((transport) => this.add(transport));
        }

        if (exceptionHandlers) {
            this.exceptions.handle(exceptionHandlers);
        }

        if (rejectionHandlers) {
            this.rejections.handle(rejectionHandlers);
        }
    }

    isLevelEnabled(level) {
        const givenLevelValue = getLevelValue(this.levels, level);
        if (is.null(givenLevelValue)) {
            return false;
        }

        const configuredLevelValue = getLevelValue(this.levels, this.level);
        if (is.null(configuredLevelValue)) {
            return false;
        }

        if (!this.transports || this.transports.length === 0) {
            return configuredLevelValue >= givenLevelValue;
        }

        const index = this.transports.findIndex((transport) => {
            let transportLevelValue = getLevelValue(this.levels, transport.level);
            if (is.null(transportLevelValue)) {
                transportLevelValue = configuredLevelValue;
            }
            return transportLevelValue >= givenLevelValue;
        });
        return index !== -1;
    }

    /**
     * eslint-disable valid-jsdoc
     */
    /**
     * Ensure backwards compatibility with a `log` method
     * @param {mixed} level - Level the log message is written at.
     * @param {mixed} msg - TODO: add param description.
     * @param {mixed} meta - TODO: add param description.
     * @returns {Logger} - TODO: add return description.
     *
     * @example
     *    // Supports the existing API:
     *    logger.log('info', 'Hello world', { custom: true });
     *    logger.log('info', new Error('Yo, it\'s on fire'));
     *    logger.log('info', '%s %d%%', 'A string', 50, { thisIsMeta: true });
     *
     *    // And the new API with a single JSON literal:
     *    logger.log({ level: 'info', message: 'Hello world', custom: true });
     *    logger.log({ level: 'info', message: new Error('Yo, it\'s on fire') });
     *    logger.log({
     *      level: 'info',
     *      message: '%s %d%%',
     *      [SPLAT]: ['A string', 50],
     *      meta: { thisIsMeta: true }
     *    });
     *
     */
    /**
     * eslint-enable valid-jsdoc
     */
    log(level, msg, ...splat) {
        // eslint-disable-line max-params
        // Optimize for the hotpath of logging JSON literals
        if (arguments.length === 1) {
            // Yo dawg, I heard you like levels ... seriously ...
            // In this context the LHS `level` here is actually the `info` so read
            // this as: info[LEVEL] = info.level;
            level[logger.LEVEL] = level.level;
            this._addDefaultMeta(level);
            this.write(level);
            return this;
        }

        const icon = this.config[level].icon;

        // Slightly less hotpath, but worth optimizing for.
        if (arguments.length === 2) {
            if (msg && typeof msg === "object") {
                msg[logger.LEVEL] = msg.level = level;
                msg.icon = icon;
                this._addDefaultMeta(msg);
                this.write(msg);
                return this;
            }

            this.write({
                [logger.LEVEL]: level,
                icon,
                level,
                message: msg
            });
            return this;
        }

        const [meta] = splat;
        if (typeof meta === "object" && !is.null(meta)) {
            // Extract tokens, if none available default to empty array to
            // ensure consistancy in expected results
            const tokens = msg && msg.match && msg.match(formatRegExp);

            if (!tokens) {
                this.write(Object.assign({}, meta, {
                    [logger.LEVEL]: level,
                    [logger.SPLAT]: splat,
                    icon,
                    level,
                    message: msg
                }, this.defaultMeta));
            } else {
                this.write(Object.assign({}, {
                    [logger.LEVEL]: level,
                    [logger.SPLAT]: splat,
                    icon,
                    level,
                    message: msg
                }, this.defaultMeta));
            }
        } else {
            this.write(Object.assign({}, {
                [logger.LEVEL]: level,
                [logger.SPLAT]: splat,
                icon,
                level,
                message: msg
            }, this.defaultMeta));
        }

        return this;
    }

    /**
     * Pushes data so that it can be picked up by all of our pipe targets.
     * @param {mixed} info - TODO: add param description.
     * @param {mixed} enc - TODO: add param description.
     * @param {mixed} callback - Continues stream processing.
     * @returns {undefined}
     * @private
     */
    _transform(info, enc, callback) {
        if (this.silent) {
            return callback();
        }

        // [LEVEL] is only soft guaranteed to be set here since we are a proper
        // stream. It is likely that `info` came in through `.log(info)` or
        // `.info(info)`. If it is not defined, however, define it.
        if (!info[logger.LEVEL]) {
            info[logger.LEVEL] = info.level;
        }

        // Remark: not sure if we should simply error here.
        if (!this._readableState.pipes) {
            // eslint-disable-next-line no-console
            console.error("[adone.app.logger] Attempt to write logs with no transports %j", info);
        }

        // Here we write to the `format` pipe-chain, which on `readable` above will
        // push the formatted `info` Object onto the buffer for this instance. We trap
        // (and re-throw) any errors generated by the user-provided format, but also
        // guarantee that the streams callback is invoked so that we can continue flowing.
        try {
            this.push(this.format.transform(info, this.format.options));
        } catch (ex) {
            throw ex;
        } finally {
            // eslint-disable-next-line callback-return
            callback();
        }
    }

    /**
     * Delays the 'finish' event until all transport pipe targets have
     * also emitted 'finish' or are already finished.
     * @param {mixed} callback - Continues stream processing.
     */
    _final(callback) {
        const transports = this.transports.slice();
        forEach(
            transports,
            (transport, next) => {
                if (!transport || transport.finished) { 
                    return setImmediate(next); 
                }
                transport.once("finish", next);
                transport.end();
            },
            callback
        );
    }

    /**
     * Adds the transport to this logger instance by piping to it.
     * @param {mixed} transport - TODO: add param description.
     * @returns {Logger} - TODO: add return description.
     */
    add(transport) {
        if (!transport || !is.stream(transport) || !is.function(transport.log)) {
            throw new Error("Invalid transport, must be an object with a log method.");
        }

        if (!transport._writableState || !transport._writableState.objectMode) {
            throw new Error("Transports must WritableStreams in objectMode. Set { objectMode: true }.");
        }

        // Listen for the `error` event and the `warn` event on the new Transport.
        this._onEvent("error", transport);
        this._onEvent("warn", transport);
        this.pipe(transport);

        if (transport.handleExceptions) {
            this.exceptions.handle();
        }

        if (transport.handleRejections) {
            this.rejections.handle();
        }

        return this;
    }

    /**
     * Removes the transport from this logger instance by unpiping from it.
     * @param {mixed} transport - TODO: add param description.
     * @returns {Logger} - TODO: add return description.
     */
    remove(transport) {
        let target = transport;
        if (!is.stream(transport) || transport.log.length > 2) {
            target = this.transports
                .filter((match) => match.transport === transport)[0];
        }

        if (target) {
            this.unpipe(target);
        }
        return this;
    }

    /**
     * Removes all transports from this logger instance.
     * @returns {Logger} - TODO: add return description.
     */
    clear() {
        this.unpipe();
        return this;
    }

    /**
     * Cleans up resources (streams, event listeners) for all transports
     * associated with this instance (if necessary).
     * @returns {Logger} - TODO: add return description.
     */
    close() {
        this.clear();
        this.emit("close");
        return this;
    }

    /**
     * Queries the all transports for this instance with the specified `options`.
     * This will aggregate each transport's results into one object containing
     * a property per transport.
     * @param {Object} options - Query options for this instance.
     * @param {function} callback - Continuation to respond to when complete.
     */
    query(options, callback) {
        if (is.function(options)) {
            callback = options;
            options = {};
        }

        options = options || {};
        const results = {};
        const queryObject = Object.assign({}, options.query || {});

        // Helper function to query a single transport
        const queryTransport = function (transport, next) {
            if (options.query && is.function(transport.formatQuery)) {
                options.query = transport.formatQuery(queryObject);
            }

            transport.query(options, (err, res) => {
                if (err) {
                    return next(err);
                }

                if (is.function(transport.formatResults)) {
                    res = transport.formatResults(res, options.format);
                }

                next(null, res);
            });
        };

        // Helper function to accumulate the results from `queryTransport` into
        // the `results`.
        const addResults = function (transport, next) {
            queryTransport(transport, (err, result) => {
                // queryTransport could potentially invoke the callback multiple times
                // since Transport code can be unpredictable.
                if (next) {
                    result = err || result;
                    if (result) {
                        results[transport.name] = result;
                    }

                    // eslint-disable-next-line callback-return
                    next();
                }

                next = null;
            });
        };

        // Iterate over the transports in parallel setting the appropriate key in
        // the `results`.
        forEach(
            this.transports.filter((transport) => Boolean(transport.query)),
            addResults,
            () => callback(null, results)
        );
    }

    /**
     * Returns a log stream for all transports. Options object is optional.
     * @param{Object} options={} - Stream options for this instance.
     * @returns {Stream} - TODO: add return description.
     */
    stream(options = {}) {
        const out = new Stream();
        const streams = [];

        out._streams = streams;
        out.destroy = () => {
            let i = streams.length;
            while (i--) {
                streams[i].destroy();
            }
        };

        // Create a list of all transports for this instance.
        this.transports
            .filter((transport) => Boolean(transport.stream))
            .forEach((transport) => {
                const str = transport.stream(options);
                if (!str) {
                    return;
                }

                streams.push(str);

                str.on("log", (log) => {
                    log.transport = log.transport || [];
                    log.transport.push(transport.name);
                    out.emit("log", log);
                });

                str.on("error", (err) => {
                    err.transport = err.transport || [];
                    err.transport.push(transport.name);
                    out.emit("error", err);
                });
            });

        return out;
    }

    /**
     * Returns an object corresponding to a specific timing. When done is called
     * the timer will finish and log the duration. e.g.:
     * @returns {Profile} - TODO: add return description.
     * @example
     *    const timer = logger.startTimer()
     *    setTimeout(() => {
     *      timer.done({
     *        message: 'Logging message'
     *      });
     *    }, 1000);
     */
    startTimer() {
        return new Profiler(this);
    }

    /**
     * Tracks the time inbetween subsequent calls to this method with the same
     * `id` parameter. The second call to this method will log the difference in
     * milliseconds along with the message.
     * @param {string} id Unique id of the profiler
     * @returns {Logger} - TODO: add return description.
     */
    profile(id, ...args) {
        const time = Date.now();
        if (this.profilers[id]) {
            const timeEnd = this.profilers[id];
            delete this.profilers[id];

            // Set the duration property of the metadata
            const info = typeof args[args.length - 1] === "object" ? args.pop() : {};
            info.level = info.level || "info";
            info.durationMs = time - timeEnd;
            info.message = info.message || id;
            return this.write(info);
        }

        this.profilers[id] = time;
        return this;
    }

    /**
     * Bubbles the `event` that occured on the specified `transport` up
     * from this instance.
     * @param {string} event - The event that occured
     * @param {Object} transport - Transport on which the event occured
     * @private
     */
    _onEvent(event, transport) {
        const transportEvent = function (err) {
            this.emit(event, err, transport);
        };

        if (!transport[`__logger${event}`]) {
            transport[`__logger${event}`] = transportEvent.bind(this);
            transport.on(event, transport[`__logger${event}`]);
        }
    }

    _addDefaultMeta(msg) {
        if (this.defaultMeta) {
            Object.assign(msg, this.defaultMeta);
        }
    }
}

/**
 * Represents the current readableState pipe targets for this Logger instance.
 * @type {Array|Object}
 */
Object.defineProperty(Logger.prototype, "transports", {
    configurable: false,
    enumerable: true,
    get() {
        const { pipes } = this._readableState;
        return !is.array(pipes) ? [pipes].filter(Boolean) : pipes;
    }
});
