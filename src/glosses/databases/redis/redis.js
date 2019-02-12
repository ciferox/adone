const {
    database: { redis },
    event,
    collection,
    noop,
    is,
    error,
    promise,
    util,
    lazify
} = adone;

const __ = adone.private(redis);

export default class Redis extends __.Commander.mixin(event.Emitter) {
    constructor(port, host, options) {
        super();
        this.parseOptions(port, host, options);
        this.resetCommandQueue();
        this.resetOfflineQueue();

        if (this.options.sentinels) {
            this.connector = new __.SentinelConnector(this.options);
        } else {
            this.connector = new __.Connector(this.options);
        }

        this.retryAttempts = 0;

        // end(or wait) -> connecting -> connect -> ready -> end
        if (this.options.lazyConnect) {
            this.setStatus("wait");
        } else {
            this.connect().catch(noop);
        }
    }

    resetCommandQueue() {
        this.commandQueue = new collection.LinkedList();
    }

    resetOfflineQueue() {
        this.offlineQueue = new collection.LinkedList();
    }

    parseOptions(...args) {
        this.options = {};
        for (const arg of args) {
            if (is.nil(arg)) {
                continue;
            }
            if (is.object(arg)) {
                this.options = { ...arg, ...this.options };
            } else if (is.string(arg)) {
                this.options = { ...__.util.parseURL(arg), ...this.options };
            } else if (is.number(arg)) {
                this.options.port = arg;
            } else {
                throw new error.InvalidArgumentException(arg);
            }
        }
        const _dropBufferSupport = "dropBufferSupport" in this.options;
        this.options = { ...Redis.defaultOptions, ...this.options };
        if (!_dropBufferSupport) {
            if (this.options.parser !== "javascript") {
                this.options.dropBufferSupport = true;
            }
        }

        if (is.string(this.options.port)) {
            this.options.port = parseInt(this.options.port, 10);
        }
        if (is.string(this.options.db)) {
            this.options.db = parseInt(this.options.db, 10);
        }
    }

    setStatus(status, arg) {
        this.status = status;
        process.nextTick(() => this.emit(status, arg));
    }

    async connect() {
        if (this.status === "connecting" || this.status === "connect" || this.status === "ready") {
            throw new error.IllegalStateException("Redis is already connecting/connected");
        }
        this.setStatus("connecting");

        this.condition = {
            select: this.options.db,
            auth: this.options.password,
            subscriber: false
        };

        let stream;
        try {
            stream = await this.connector.connect((type, err) => {
                this.silentEmit(type, err);
            });
        } catch (err) {
            this.flushQueue(err);
            this.silentEmit("error", err);
            this.setStatus("end");
            throw err;
        }
        this.stream = stream;
        if (is.number(this.options.keepAlive)) {
            stream.setKeepAlive(true, this.options.keepAlive);
        }
        const CONNECT_EVENT = this.options.tls ? "secureConnect" : "connect";
        stream.once(CONNECT_EVENT, __.eventHandler.connectHandler(this));
        stream.once("error", __.eventHandler.errorHandler(this));
        stream.once("close", __.eventHandler.closeHandler(this));
        stream.on("data", __.eventHandler.dataHandler(this));
        if (this.options.connectTimeout) {
            stream.setTimeout(this.options.connectTimeout, () => {
                stream.setTimeout(0);
                stream.destroy();

                const err = new error.TimeoutException("connect ETIMEDOUT");
                err.errorno = "ETIMEDOUT";
                err.code = "ETIMEDOUT";
                err.syscall = "connect";
                __.eventHandler.errorHandler(this)(err);
            });
            stream.once(CONNECT_EVENT, () => stream.setTimeout(0));
        }

        if (this.options.noDelay) {
            stream.setNoDelay(true);
        }

        return new Promise((resolve, reject) => {
            const connectionConnectHandler = () => {
                this.removeListener("close", connectionCloseHandler); // eslint-disable-line no-use-before-define
                resolve();
            };

            const connectionCloseHandler = () => {
                this.removeListener(CONNECT_EVENT, connectionConnectHandler);
                reject(new error.Exception(__.util.CONNECTION_CLOSED_ERROR_MSG));
            };
            this.once(CONNECT_EVENT, connectionConnectHandler);
            this.once("close", connectionCloseHandler);
        });
    }

    disconnect(reconnect) {
        if (!reconnect) {
            this.manuallyClosing = true;
        }
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        if (this.status === "wait") {
            __.eventHandler.closeHandler(this)();
        } else {
            this.connector.disconnect();
        }
    }

    duplicate(override = {}) {
        return new Redis({ ...util.clone(this.options), ...override });
    }

    flushQueue(error, options) {
        options = {
            offlineQueue: true,
            commandQueue: true,
            ...options
        };

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

    async _readyCheck() {
        for (; ; ) {
            const result = await this.info();

            if (!is.string(result)) {
                return result;
            }

            const info = {};

            const lines = result.split("\r\n");
            for (const line of lines) {
                const parts = line.split(":");
                if (parts[1]) {
                    info[parts[0]] = parts[1];
                }
            }

            if (!info.loading || info.loading === "0") {
                return info;
            }
            const retryTime = (info.loading_eta_seconds || 1) * 1000;
            await promise.delay(retryTime);
        }
    }

    silentEmit(eventName, ...args) {
        let error;
        if (eventName === "error") {
            [error] = args;

            if (this.status === "end") {
                return;
            }

            if (this.manuallyClosing) {
                // ignore connection related errors when manually disconnecting
                if (is.error(error) &&
                    (error.message === __.util.CONNECTION_CLOSED_ERROR_MSG ||
                        error.syscall === "connect" ||
                        error.syscall === "read")) {
                    return;
                }
            }
        }
        if (this.listeners(eventName).length > 0) {
            return this.emit(eventName, ...args);
        }
        if (error && is.error(error)) {
            adone.logError("[redis] Unhandled error event:", error.stack);
        }
        return false;
    }

    monitor() {
        const monitorInstance = this.duplicate({
            monitor: true,
            lazyConnect: false
        });
        return new Promise((resolve) => {
            monitorInstance.once("monitoring", () => {
                resolve(monitorInstance);
            });
        });
    }

    sendCommand(command, stream) {
        if (this.status === "wait") {
            this.connect().catch(noop);
        }
        if (this.status === "end") {
            command.reject(new error.Exception(__.util.CONNECTION_CLOSED_ERROR_MSG));
            return command.promise;
        }
        if (this.condition.subscriber && !__.Command.checkFlag("VALID_IN_SUBSCRIBER_MODE", command.name)) {
            command.reject(new error.InvalidArgumentException("Connection in subscriber mode, only subscriber commands may be used"));
            return command.promise;
        }

        let writable = (this.status === "ready") ||
            (!stream &&
                this.status === "connect" &&
                __.commands.hasFlag(command.name, "loading"));
        if (!this.stream) {
            writable = false;
        } else if (!this.stream.writable) {
            writable = false;
        } else if (this.stream._writableState && this.stream._writableState.ended) {
            writable = false;
        }

        if (!writable && !this.options.enableOfflineQueue) {
            command.reject(new error.IllegalStateException("Stream isn't writeable and enableOfflineQueue options is false"));
            return command.promise;
        }

        if (writable) {
            (stream || this.stream).write(command.toWritable());

            this.commandQueue.push({
                command,
                stream,
                select: this.condition.select
            });

            if (__.Command.checkFlag("WILL_DISCONNECT", command.name)) {
                this.manuallyClosing = true;
            }
        } else if (this.options.enableOfflineQueue) {
            this.offlineQueue.push({
                command,
                stream,
                select: this.condition.select
            });
        }

        if (command.name === "select" && __.util.isInt(command.args[0])) {
            const db = parseInt(command.args[0], 10);
            if (this.condition.select !== db) {
                this.condition.select = db;
                this.emit("select", db);
            }
        }

        return command.promise;
    }

    pipeline(commands) {
        const pipeline = new __.Pipeline(this);
        if (is.array(commands)) {
            pipeline.addBatch(commands);
        }
        return pipeline;
    }

    multi(commands, options) {
        if (is.undefined(options) && !is.array(commands)) {
            options = commands;
            commands = null;
        }
        if (options && options.pipeline === false) {
            return super.multi();
        }
        const pipeline = new __.Pipeline(this);
        pipeline.multi();
        if (is.array(commands)) {
            pipeline.addBatch(commands);
        }
        const { exec } = pipeline;
        pipeline.exec = function (callback) {
            if (this._transactions > 0) {
                exec.call(pipeline);
            }
            return promise.nodeify(exec.call(pipeline).then((result) => {
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
                return __.util.wrapMultiResult(execResult[1]);
            }), callback);
        };

        const { execBuffer } = pipeline;
        pipeline.execBuffer = function (callback) {
            if (this._transactions > 0) {
                execBuffer.call(pipeline);
            }
            return pipeline.exec(callback);
        };
        return pipeline;
    }

    async exec() {
        const results = await super.exec();
        if (is.array(results)) {
            return __.util.wrapMultiResult(results);
        }
        return results;
    }
}

Redis.defaultOptions = {
    // Connection
    port: 6379,
    host: "localhost",
    family: 4,
    connectTimeout: 10000,
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
    Redis.prototype[`${command}Stream`] = function (key, options) {
        if (command === "scan" || command === "scanBuffer") {
            options = key;
            key = null;
        }
        return new __.ScanStream({
            ...options,
            objectMode: true,
            key,
            redis: this,
            command
        });
    };
}

lazify({
    initParser: () => __.parser.initParser,
    returnError: () => __.parser.returnError,
    returnReply: () => __.parser.returnReply
}, Redis.prototype);
