import adone from "adone";

const imports = adone.lazify({
    Command: "./command",
    Commander: "./commander",
    utils: "./utils",
    eventHandler: "./redis/event_handler",
    Connector: "./connectors/connector",
    SentinelConnector: "./connectors/sentinel_connector",
    ScanStream: "./scan_stream",
    commands: "./commands",
    parser: "./redis/parser",
    Pipeline: "./pipeline"
}, null, require);

/**
 * Creates a Redis instance
 *
 * @constructor
 * @param {(number|string|Object)} [port=6379] - Port of the Redis server,
 * or a URL string(see the examples below),
 * or the `options` object(see the third argument).
 * @param {string|Object} [host=localhost] - Host of the Redis server,
 * when the first argument is a URL string,
 * this argument is an object represents the options.
 * @param {Object} [options] - Other options.
 * @param {number} [options.port=6379] - Port of the Redis server.
 * @param {string} [options.host=localhost] - Host of the Redis server.
 * @param {string} [options.family=4] - Version of IP stack. Defaults to 4.
 * @param {string} [options.path=null] - Local domain socket path. If set the `port`,
 * `host` and `family` will be ignored.
 * @param {number} [options.keepAlive=0] - TCP KeepAlive on the socket with a X ms delay before start.
 * Set to a non-number value to disable keepAlive.
 * @param {boolean} [options.noDelay=true] - Whether to disable the Nagle's Algorithm. By default we disable
 * it to reduce the latency.
 * @param {string} [options.connectionName=null] - Connection name.
 * @param {number} [options.db=0] - Database index to use.
 * @param {string} [options.password=null] - If set, client will send AUTH command
 * with the value of this option when connected.
 * @param {string} [options.parser=null] - Either "hiredis" or "javascript". If not set, "hiredis" parser
 * will be used if it's installed (`npm install hiredis`), otherwise "javascript" parser will be used.
 * @param {boolean} [options.dropBufferSupport=false] - Drop the buffer support for better performance.
 * This option is recommended to be enabled when "hiredis" parser is used.
 * Refer to https://github.com/luin/ioredis/wiki/Improve-Performance for more details.
 * @param {boolean} [options.enableReadyCheck=true] - When a connection is established to
 * the Redis server, the server might still be loading the database from disk.
 * While loading, the server not respond to any commands.
 * To work around this, when this option is `true`,
 * ioredis will check the status of the Redis server,
 * and when the Redis server is able to process commands,
 * a `ready` event will be emitted.
 * @param {boolean} [options.enableOfflineQueue=true] - By default,
 * if there is no active connection to the Redis server,
 * commands are added to a queue and are executed once the connection is "ready"
 * (when `enableReadyCheck` is `true`,
 * "ready" means the Redis server has loaded the database from disk, otherwise means the connection
 * to the Redis server has been established). If this option is false,
 * when execute the command when the connection isn't ready, an error will be returned.
 * @param {number} [options.connectTimeout=10000] - The milliseconds before a timeout occurs during the initial
 * connection to the Redis server.
 * @param {boolean} [options.autoResubscribe=true] - After reconnected, if the previous connection was in the
 * subscriber mode, client will auto re-subscribe these channels.
 * @param {boolean} [options.autoResendUnfulfilledCommands=true] - If true, client will resend unfulfilled
 * commands(e.g. block commands) in the previous connection when reconnected.
 * @param {boolean} [options.lazyConnect=false] - By default,
 * When a new `Redis` instance is created, it will connect to Redis server automatically.
 * If you want to keep disconnected util a command is called, you can pass the `lazyConnect` option to
 * the constructor:
 *
 * ```javascript
 * var redis = new Redis({ lazyConnect: true });
 * // No attempting to connect to the Redis server here.

 * // Now let's connect to the Redis server
 * redis.get('foo', function () {
 * });
 * ```
 * @param {string} [options.keyPrefix=''] - The prefix to prepend to all keys in a command.
 * @param {function} [options.retryStrategy] - See "Quick Start" section
 * @param {function} [options.reconnectOnError] - See "Quick Start" section
 * @param {boolean} [options.readOnly=false] - Enable READONLY mode for the connection.
 * Only available for cluster mode.
 * @param {boolean} [options.stringNumbers=false] - Force numbers to be always returned as JavaScript
 * strings. This option is necessary when dealing with big numbers (exceed the [-2^53, +2^53] range).
 * Notice that when this option is enabled, the JavaScript parser will be used even "hiredis" is specified
 * because only JavaScript parser supports this feature for the time being.
 * @extends [EventEmitter](http://nodejs.org/api/events.html#events_class_events_eventemitter)
 * @extends Commander
 * @example
 * ```js
 * var Redis = require('ioredis');
 *
 * var redis = new Redis();
 * // or: var redis = Redis();
 *
 * var redisOnPort6380 = new Redis(6380);
 * var anotherRedis = new Redis(6380, '192.168.100.1');
 * var unixSocketRedis = new Redis({ path: '/tmp/echo.sock' });
 * var unixSocketRedis2 = new Redis('/tmp/echo.sock');
 * var urlRedis = new Redis('redis://user:password@redis-service.com:6379/');
 * var urlRedis2 = new Redis('//localhost:6379');
 * var authedRedis = new Redis(6380, '192.168.100.1', { password: 'password' });
 * ```
 */
export default class Redis extends imports.Commander.mixin(adone.EventEmitter) {
    constructor() {
        super();
        this.parseOptions(arguments[0], arguments[1], arguments[2]);
        this.resetCommandQueue();
        this.resetOfflineQueue();

        if (this.options.sentinels) {
            this.connector = new imports.SentinelConnector(this.options);
        } else {
            this.connector = new imports.Connector(this.options);
        }

        this.retryAttempts = 0;

        // end(or wait) -> connecting -> connect -> ready -> end
        if (this.options.lazyConnect) {
            this.setStatus("wait");
        } else {
            this.connect().catch(adone.noop);
        }
    }

    /**
     * Create a Redis instance
     *
     * @deprecated
     */
    static createClient(...args) {
        return new this(...args);
    }

    resetCommandQueue() {
        this.commandQueue = new adone.collection.LinkedList();
    }

    resetOfflineQueue() {
        this.offlineQueue = new adone.collection.LinkedList();
    }

    parseOptions(...args) {
        this.options = {};
        for (const arg of args) {
            if (adone.is.null(arg) || adone.is.undefined(arg)) {
                continue;
            }
            if (adone.is.object(arg)) {
                adone.vendor.lodash.defaults(this.options, arg);
            } else if (adone.is.string(arg)) {
                adone.vendor.lodash.defaults(this.options, imports.utils.parseURL(arg));
            } else if (adone.is.number(arg)) {
                this.options.port = arg;
            } else {
                throw new adone.x.InvalidArgument(arg);
            }
        }
        const _dropBufferSupport = "dropBufferSupport" in this.options;
        adone.vendor.lodash.defaults(this.options, Redis.defaultOptions);
        if (!_dropBufferSupport) {
            if (this.options.parser !== "javascript") {
                this.options.dropBufferSupport = true;
            }
        }

        if (adone.is.string(this.options.port)) {
            this.options.port = parseInt(this.options.port, 10);
        }
        if (adone.is.string(this.options.db)) {
            this.options.db = parseInt(this.options.db, 10);
        }
    }

    /**
     * Change instance's status
     * @private
     */
    setStatus(status, arg) {
        this.status = status;
        process.nextTick(this.emit.bind(this, status, arg));
    }

    /**
     * Create a connection to Redis.
     * This method will be invoked automatically when creating a new Redis instance.
     * @param {function} callback
     * @return {Promise}
     * @public
     */
    connect(callback) {
        return adone.promise.nodeify(new Promise((resolve, reject) => {
            if (this.status === "connecting" || this.status === "connect" || this.status === "ready") {
                reject(new Error("Redis is already connecting/connected"));
                return;
            }
            this.setStatus("connecting");

            this.condition = {
                select: this.options.db,
                auth: this.options.password,
                subscriber: false
            };

            this.connector.connect((err, stream) => {
                if (err) {
                    this.flushQueue(err);
                    this.silentEmit("error", err);
                    reject(err);
                    this.setStatus("end");
                    return;
                }
                const CONNECT_EVENT = this.options.tls ? "secureConnect" : "connect";

                this.stream = stream;
                if (adone.is.number(this.options.keepAlive)) {
                    stream.setKeepAlive(true, this.options.keepAlive);
                }

                stream.once(CONNECT_EVENT, imports.eventHandler.connectHandler(this));
                stream.once("error", imports.eventHandler.errorHandler(this));
                stream.once("close", imports.eventHandler.closeHandler(this));
                stream.on("data", imports.eventHandler.dataHandler(this));

                if (this.options.connectTimeout) {
                    stream.setTimeout(this.options.connectTimeout, () => {
                        stream.setTimeout(0);
                        stream.destroy();

                        const err = new adone.x.Exception("connect ETIMEDOUT");
                        err.errorno = "ETIMEDOUT";
                        err.code = "ETIMEDOUT";
                        err.syscall = "connect";
                        imports.eventHandler.errorHandler(this)(err);
                    });
                    stream.once(CONNECT_EVENT, function () {
                        stream.setTimeout(0);
                    });
                }

                if (this.options.noDelay) {
                    stream.setNoDelay(true);
                }

                const connectionConnectHandler = () => {
                    this.removeListener("close", connectionCloseHandler);
                    resolve();
                };
                const connectionCloseHandler = () => {
                    this.removeListener(CONNECT_EVENT, connectionConnectHandler);
                    reject(new adone.x.Exception(imports.utils.CONNECTION_CLOSED_ERROR_MSG));
                };
                this.once(CONNECT_EVENT, connectionConnectHandler);
                this.once("close", connectionCloseHandler);
            });
        }), callback);
    }

    /**
     * Disconnect from Redis.
     *
     * This method closes the connection immediately,
     * and may lose some pending replies that haven't written to client.
     * If you want to wait for the pending replies, use Redis#quit instead.
     * @public
     */
    disconnect(reconnect) {
        if (!reconnect) {
            this.manuallyClosing = true;
        }
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        if (this.status === "wait") {
            imports.eventHandler.closeHandler(this)();
        } else {
            this.connector.disconnect();
        }
    }

    /**
     * Disconnect from Redis.
     *
     * @deprecated
     */
    end() {
        this.disconnect();
    }

    /**
     * Create a new instance with the same options as the current one.
     *
     * @example
     * ```js
     * var redis = new Redis(6380);
     * var anotherRedis = redis.duplicate();
     * ```
     *
     * @public
     */
    duplicate(override) {
        return new Redis(Object.assign(adone.vendor.lodash.cloneDeep(this.options), override || {}));
    }

    /**
     * Flush offline queue and command queue with error.
     *
     * @param {Error} error - The error object to send to the commands
     * @param {object} options
     * @private
     */
    flushQueue(error, options) {
        options = adone.vendor.lodash.defaults({}, options, {
            offlineQueue: true,
            commandQueue: true
        });

        let item;
        if (options.offlineQueue) {
            while (this.offlineQueue.length > 0) {
                item = this.offlineQueue.shift();
                item.command.reject(error);
            }
        }

        if (options.commandQueue) {
            if (this.commandQueue.length > 0) {
                if (this.stream) {
                    this.stream.removeAllListeners("data");
                }
                while (this.commandQueue.length > 0) {
                    item = this.commandQueue.shift();
                    item.command.reject(error);
                }
            }
        }
    }

    /**
     * Check whether Redis has finished loading the persistent data and is able to
     * process commands.
     *
     * @param {Function} callback
     * @private
     */
    _readyCheck(callback) {
        this.info((err, res) => {
            if (err) {
                return callback(err);
            }
            if (typeof res !== "string") {
                return callback(null, res);
            }

            const info = {};

            const lines = res.split("\r\n");
            for (const line of lines) {
                const parts = line.split(":");
                if (parts[1]) {
                    info[parts[0]] = parts[1];
                }
            }

            if (!info.loading || info.loading === "0") {
                callback(null, info);
            } else {
                const retryTime = (info.loading_eta_seconds || 1) * 1000;
                setTimeout(() => {
                    this._readyCheck(callback);
                }, retryTime);
            }
        });
    }

    /**
     * Emit only when there's at least one listener.
     *
     * @param {string} eventName - Event to emit
     * @param {...*} arguments - Arguments
     * @return {boolean} Returns true if event had listeners, false otherwise.
     * @private
     */
    silentEmit(eventName) {
        let error;
        if (eventName === "error") {
            error = arguments[1];

            if (this.status === "end") {
                return;
            }

            if (this.manuallyClosing) {
                // ignore connection related errors when manually disconnecting
                if (
                    error instanceof Error &&
                    (
                        error.message === imports.utils.CONNECTION_CLOSED_ERROR_MSG ||
                        error.syscall === "connect" ||
                        error.syscall === "read"
                    )
                ) {
                    return;
                }
            }
        }
        if (this.listeners(eventName).length > 0) {
            return this.emit.apply(this, arguments);
        }
        if (error && error instanceof Error) {
            adone.error("[ioredis] Unhandled error event:", error.stack);
        }
        return false;
    }

    /**
     * Listen for all requests received by the server in real time.
     *
     * This command will create a new connection to Redis and send a
     * MONITOR command via the new connection in order to avoid disturbing
     * the current connection.
     *
     * @param {function} [callback] The callback function. If omit, a promise will be returned.
     * @example
     * ```js
     * var redis = new Redis();
     * redis.monitor(function (err, monitor) {
     *   // Entering monitoring mode.
     *   monitor.on('monitor', function (time, args, source, database) {
     *     console.log(time + ": " + util.inspect(args));
     *   });
     * });
     *
     * // supports promise as well as other commands
     * redis.monitor().then(function (monitor) {
     *   monitor.on('monitor', function (time, args, source, database) {
     *     console.log(time + ": " + util.inspect(args));
     *   });
     * });
     * ```
     * @public
     */
    monitor(callback) {
        const monitorInstance = this.duplicate({
            monitor: true,
            lazyConnect: false
        });

        return adone.promise.nodeify(new Promise((resolve) => {
            monitorInstance.once("monitoring", () => {
                resolve(monitorInstance);
            });
        }), callback);
    }

    /**
     * Send a command to Redis
     *
     * This method is used internally by the `Redis#set`, `Redis#lpush` etc.
     * Most of the time you won't invoke this method directly.
     * However when you want to send a command that is not supported by ioredis yet,
     * this command will be useful.
     *
     * @method sendCommand
     * @memberOf Redis#
     * @param {Command} command - The Command instance to send.
     * @see {@link Command}
     * @example
     * ```js
     * var redis = new Redis();
     *
     * // Use callback
     * var get = new Command('get', ['foo'], 'utf8', function (err, result) {
     *   console.log(result);
     * });
     * redis.sendCommand(get);
     *
     * // Use promise
     * var set = new Command('set', ['foo', 'bar'], 'utf8');
     * set.promise.then(function (result) {
     *   console.log(result);
     * });
     * redis.sendCommand(set);
     * ```
     * @private
     */
    sendCommand(command, stream) {
        if (this.status === "wait") {
            this.connect().catch(adone.noop);
        }
        if (this.status === "end") {
            command.reject(new adone.x.Exception(imports.utils.CONNECTION_CLOSED_ERROR_MSG));
            return command.promise;
        }
        if (this.condition.subscriber && !imports.Command.checkFlag("VALID_IN_SUBSCRIBER_MODE", command.name)) {
            command.reject(new adone.x.Exception("Connection in subscriber mode, only subscriber commands may be used"));
            return command.promise;
        }

        let writable = (this.status === "ready") ||
            (!stream && (this.status === "connect") && imports.commands.hasFlag(command.name, "loading"));
        if (!this.stream) {
            writable = false;
        } else if (!this.stream.writable) {
            writable = false;
        } else if (this.stream._writableState && this.stream._writableState.ended) {
            writable = false;
        }

        if (!writable && !this.options.enableOfflineQueue) {
            command.reject(new adone.x.Exception("Stream isn't writeable and enableOfflineQueue options is false"));
            return command.promise;
        }

        if (writable) {
            (stream || this.stream).write(command.toWritable());

            this.commandQueue.push({
                command,
                stream,
                select: this.condition.select
            });

            if (imports.Command.checkFlag("WILL_DISCONNECT", command.name)) {
                this.manuallyClosing = true;
            }
        } else if (this.options.enableOfflineQueue) {
            this.offlineQueue.push({
                command,
                stream,
                select: this.condition.select
            });
        }

        if (command.name === "select" && imports.utils.isInt(command.args[0])) {
            const db = parseInt(command.args[0], 10);
            if (this.condition.select !== db) {
                this.condition.select = db;
                this.emit("select", db);
            }
        }

        return command.promise;
    }

    pipeline(commands) {
        const pipeline = new imports.Pipeline(this);
        if (adone.is.array(commands)) {
            pipeline.addBatch(commands);
        }
        return pipeline;
    }

    multi(commands, options) {
        const { is } = adone;
        if (is.undefined(options) && !is.array(commands)) {
            options = commands;
            commands = null;
        }
        if (options && options.pipeline === false) {
            return super.multi();
        }
        const pipeline = new imports.Pipeline(this);
        pipeline.multi();
        if (is.array(commands)) {
            pipeline.addBatch(commands);
        }
        const exec = pipeline.exec;
        pipeline.exec = function (callback) {
            if (this._transactions > 0) {
                exec.call(pipeline);
            }
            return adone.promise.nodeify(exec.call(pipeline).then((result) => {
                const execResult = result[result.length - 1];
                if (execResult[0]) {
                    execResult[0].previousErrors = [];
                    for (const res of result) {
                        if (res[0]) {
                            execResult[0].previousErrors.push(res[0]);
                        }
                    }
                    throw execResult[0];
                }
                return imports.utils.wrapMultiResult(execResult[1]);
            }), callback);
        };

        const execBuffer = pipeline.execBuffer;
        pipeline.execBuffer = function (callback) {
            if (this._transactions > 0) {
                execBuffer.call(pipeline);
            }
            return pipeline.exec(callback);
        };
        return pipeline;
    }

    exec(callback) {
        return adone.promise.nodeify(super.exec().then((results) => {
            if (adone.is.array(results)) {
                results = imports.utils.wrapMultiResult(results);
            }
            return results;
        }), callback);
    }
}

/**
 * Default options
 *
 * @var defaultOptions
 * @protected
 */
Redis.defaultOptions = {
    // Connection
    port: 6379,
    host: "localhost",
    family: 4,
    connectTimeout: 3000,
    retryStrategy: (times) => Math.min(times * 2, 2000),
    keepAlive: 0,
    noDelay: true,
    connectionName: null,
    // Sentinel
    sentinels: null,
    name: null,
    role: "master",
    sentinelRetryStrategy: (times) => Math.min(times * 10, 1000),
    // Status
    password: null,
    db: 0,
    // Others
    parser: null,
    dropBufferSupport: false,
    enableOfflineQueue: true,
    enableReadyCheck: true,
    autoResubscribe: true,
    autoResendUnfulfilledCommands: true,
    lazyConnect: false,
    keyPrefix: "",
    reconnectOnError: null,
    readOnly: false,
    stringNumbers: false
};

for (const command of ["scan", "sscan", "hscan", "zscan", "scanBuffer", "sscanBuffer", "hscanBuffer", "zscanBuffer"]) {
    Redis.prototype[command + "Stream"] = function (key, options) {
        if (command === "scan" || command === "scanBuffer") {
            options = key;
            key = null;
        }
        return new imports.ScanStream(adone.vendor.lodash.defaults({
            objectMode: true,
            key,
            redis: this,
            command
        }, options));
    };
}

adone.lazify({
    initParser: () => imports.parser.initParser,
    returnError: () => imports.parser.returnError,
    returnReply: () => imports.parser.returnReply
}, Redis.prototype);
