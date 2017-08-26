const {
    database: { redis },
    is,
    x,
    noop,
    collection,
    promise,
    util,
    event: { EventEmitter }
} = adone;
const { __ } = redis;

const isRejectOverwritten = Symbol("is reject overwritten");

export default class Cluster extends __.Commander.mixin(EventEmitter) {
    constructor(startupNodes, options) {
        super();
        this.options = { ...Cluster.defaultOptions, ...options };

        // validate options
        if (
            !is.function(this.options.scaleReads) &&
            this.options.scaleReads !== "all" &&
            this.options.scaleReads !== "master" &&
            this.options.scaleReads !== "slave"
        ) {

            throw new x.Exception(`Invalid option scaleReads ${this.options.scaleReads}. Expected "all", "master", "slave" or a custom function`);
        }

        this.connectionPool = new __.ConnectionPool(this.options.redisOptions);
        this.startupNodes = startupNodes;

        this.connectionPool.on("-node", (instance) => {
            if (this.status !== "disconnecting" && this.subscriber === instance) {
                this.selectSubscriber();
            }
            this.emit("-node", instance);
        });
        this.connectionPool.on("+node", (instance) => {
            this.emit("+node", instance);
        });
        this.connectionPool.on("drain", () => {
            this.setStatus("close");
        });
        this.connectionPool.on("nodeError", (error) => {
            this.emit("node error", error);
        });

        this.slots = [];
        this.retryAttempts = 0;

        this.resetOfflineQueue();
        this.delayQueue = new __.DelayQueue();

        this.subscriber = null;

        if (this.options.lazyConnect) {
            this.setStatus("wait");
        } else {
            this.connect().catch(noop);
        }
    }

    resetOfflineQueue() {
        this.offlineQueue = new collection.LinkedList();
    }

    connect() {
        const readyHandler = () => {
            this.setStatus("ready");
            this.retryAttempts = 0;
            this.executeOfflineCommands();
        };

        return new Promise((resolve, reject) => {
            if (this.status === "connecting" || this.status === "connect" || this.status === "ready") {
                reject(new x.IllegalState("Redis is already connecting/connected"));
                return;
            }
            this.setStatus("connecting");

            if (!is.array(this.startupNodes) || this.startupNodes.length === 0) {
                throw new x.InvalidArgument("`startupNodes` should contain at least one node.");
            }

            this.connectionPool.reset(this.startupNodes);

            const closeListener = () => {
                this.removeListener("refresh", refreshListener); // eslint-disable-line no-use-before-define
                reject(new x.Exception("None of startup nodes is available"));
            };

            const refreshListener = () => {
                this.removeListener("close", closeListener);
                this.manuallyClosing = false;
                this.setStatus("connect");
                if (this.options.enableReadyCheck) {
                    this._readyCheck().then((fail) => {
                        if (fail) {
                            this.disconnect(true);
                        } else {
                            readyHandler();
                        }
                    }, () => {
                        this.disconnect(true);
                    });
                } else {
                    readyHandler();
                }
                resolve();
            };

            this.once("refresh", refreshListener);
            this.once("close", closeListener);
            this.once("close", this._handleCloseEvent.bind(this));

            this.refreshSlotsCache().catch((err) => {
                if (err.message === "Failed to refresh slots cache.") {
                    redis.Redis.prototype.silentEmit.call(this, "error", err);
                    this.connectionPool.reset([]);
                }
            });
            this.selectSubscriber();
        });
    }

    _handleCloseEvent() {
        let retryDelay;
        if (!this.manuallyClosing && is.function(this.options.clusterRetryStrategy)) {
            retryDelay = this.options.clusterRetryStrategy.call(this, ++this.retryAttempts);
        }
        if (is.number(retryDelay)) {
            this.setStatus("reconnecting");
            this.reconnectTimeout = setTimeout(() => {
                this.reconnectTimeout = null;
                this.connect().catch(noop);
            }, retryDelay);
        } else {
            this.setStatus("end");
            this.flushQueue(new x.IllegalState("None of startup nodes is available"));
        }
    }

    disconnect(reconnect) {
        const { status } = this;
        this.setStatus("disconnecting");

        if (!reconnect) {
            this.manuallyClosing = true;
        }
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (status === "wait") {
            this.setStatus("close");
            this._handleCloseEvent();
        } else {
            this.connectionPool.reset([]);
        }
    }

    async quit() {
        const { status } = this;
        this.setStatus("disconnecting");

        this.manuallyClosing = true;

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        if (status === "wait") {
            // use setImmediate to make sure "close" event
            // being emitted after quit() is returned
            setImmediate(() => {
                this.setStatus("close");
                this._handleCloseEvent();
            });

            return "OK";
        }

        await Promise.all(this.nodes().map((node) => node.quit()));

        return "OK";
    }

    nodes(role = "all") {
        if (role !== "all" && role !== "master" && role !== "slave") {
            throw new x.InvalidArgument(`Invalid role "${role}. Expected "all", "master" or "slave"`);
        }
        return util.values(this.connectionPool.nodes[role]);
    }

    selectSubscriber() {
        this.subscriber = util.randomChoice(this.nodes());
        if (!this.subscriber) {
            return;
        }
        // Re-subscribe previous channels
        const previousChannels = { subscribe: [], psubscribe: [] };
        if (this.lastActiveSubscriber && this.lastActiveSubscriber.prevCondition) {
            const subscriber = this.lastActiveSubscriber.prevCondition.subscriber;
            if (subscriber) {
                previousChannels.subscribe = subscriber.channels("subscribe");
                previousChannels.psubscribe = subscriber.channels("psubscribe");
            }
        }
        if (previousChannels.subscribe.length || previousChannels.psubscribe.length) {
            let pending = 0;
            const cb = () => {
                if (!--pending) {
                    this.lastActiveSubscriber = this.subscriber;
                }
            };
            for (const type of ["subscribe", "psubscribe"]) {
                const channels = previousChannels[type];
                if (channels.length) {
                    pending += 1;
                    this.subscriber[type](channels).then(cb, noop);
                }
            }
        } else {
            if (this.subscriber.status === "wait") {
                this.subscriber.connect().catch(noop);
            }
            this.lastActiveSubscriber = this.subscriber;
        }
        for (const event of ["message", "messageBuffer"]) {
            this.subscriber.on(event, (arg1, arg2) => {
                this.emit(event, arg1, arg2);
            });
        }
        for (const event of ["pmessage", "pmessageBuffer"]) {
            this.subscriber.on(event, (arg1, arg2, arg3) => {
                this.emit(event, arg1, arg2, arg3);
            });
        }
    }

    setStatus(status) {
        this.status = status;
        process.nextTick(() => this.emit(status));
    }

    async refreshSlotsCache() {
        if (this.isRefreshing) {
            return;
        }
        this.isRefreshing = true;

        try {
            const keys = util.shuffleArray(util.keys(this.connectionPool.nodes.all));
            let lastNodeError;
            for (const key of keys) {
                try {
                    await this.getInfoFromNode(this.connectionPool.nodes.all[key]);
                } catch (err) {
                    if (this.status === "END") {
                        throw new x.Exception("Cluster is disconnected.");
                    }
                    this.emit("node error", err);
                    lastNodeError = err;
                    continue;
                }
                if (this.status === "END") {
                    throw new x.Exception("Cluster is disconnected.");
                }
                this.emit("refresh");
                return;
            }
            const error = new x.Exception("Failed to refresh slots cache.");
            error.lastNodeError = lastNodeError;
            throw error;
        } finally {
            this.isRefreshing = false;
        }
    }

    flushQueue(error) {
        while (this.offlineQueue.length > 0) {
            const item = this.offlineQueue.shift();
            item.command.reject(error);
        }
    }

    executeOfflineCommands() {
        if (this.offlineQueue.length) {
            const offlineQueue = this.offlineQueue;
            this.resetOfflineQueue();
            while (offlineQueue.length > 0) {
                const item = offlineQueue.shift();
                this.sendCommand(item.command, item.stream, item.node);
            }
        }
    }

    sendCommand(command, stream, node) {
        if (this.status === "wait") {
            this.connect().catch(noop);
        }
        if (this.status === "end") {
            command.reject(new x.Exception(__.util.CONNECTION_CLOSED_ERROR_MSG));
            return command.promise;
        }
        let to = this.options.scaleReads;
        if (to !== "master") {
            const isCommandReadOnly = __.commands.exists(command.name) && __.commands.hasFlag(command.name, "readonly");
            if (!isCommandReadOnly) {
                to = "master";
            }
        }

        const targetSlot = node ? node.slot : command.getSlot();
        const ttl = {};
        const tryConnection = (random, asking) => {
            if (this.status === "end") {
                command.reject(new x.Exception("Cluster is ended."));
                return;
            }
            let instance;
            if (this.status === "ready" || (command.name === "cluster")) {
                if (node && node.redis) {
                    instance = node.redis;
                } else if (__.Command.checkFlag("ENTER_SUBSCRIBER_MODE", command.name) ||
                    __.Command.checkFlag("EXIT_SUBSCRIBER_MODE", command.name)) {
                    instance = this.subscriber;
                } else {
                    if (!random) {
                        if (is.number(targetSlot) && this.slots[targetSlot]) {
                            const nodeKeys = this.slots[targetSlot];
                            if (is.function(to)) {
                                const nodes = nodeKeys.map((key) => {
                                    return this.connectionPool.nodes.all[key];
                                });
                                instance = to(nodes, command);
                                if (is.array(instance)) {
                                    instance = util.randomChoice(instance);
                                }
                                if (!instance) {
                                    instance = nodes[0];
                                }
                            } else {
                                let key;
                                if (to === "all") {
                                    key = util.randomChoice(nodeKeys);
                                } else if (to === "slave" && nodeKeys.length > 1) {
                                    key = util.randomChoice(nodeKeys, 1);
                                } else {
                                    key = nodeKeys[0];
                                }
                                instance = this.connectionPool.nodes.all[key];
                            }
                        }
                        if (asking) {
                            instance = this.connectionPool.nodes.all[asking];
                            instance.asking();
                        }
                    }
                    if (!instance) {
                        instance = util.randomChoice(util.values(this.connectionPool.nodes[to]));
                        if (!instance) {
                            instance = util.randomChoice(
                                util.values(this.connectionPool.nodes.all)
                            );
                        }
                    }
                }
                if (node && !node.redis) {
                    node.redis = instance;
                }
            }
            if (instance) {
                instance.sendCommand(command, stream);
            } else if (this.options.enableOfflineQueue) {
                this.offlineQueue.push({ command, stream, node });
            } else {
                command.reject(new x.Exception("Cluster isn't ready and enableOfflineQueue options is false"));
            }
        };
        if (!node && !command[isRejectOverwritten]) {
            command[isRejectOverwritten] = true;
            const { reject } = command;
            command.reject = (err) => {
                const partialTry = (...args) => tryConnection(true, ...args);
                this.handleError(err, ttl, {
                    moved: (slot, key) => {
                        if (this.slots[slot]) {
                            this.slots[slot][0] = key;
                        } else {
                            this.slots[slot] = [key];
                        }
                        const splitKey = key.split(":");
                        this.connectionPool.findOrCreate({
                            host: splitKey[0],
                            port: Number(splitKey[1])
                        });
                        tryConnection();
                        this.refreshSlotsCache();
                    },
                    ask: (slot, key) => {
                        const splitKey = key.split(":");
                        this.connectionPool.findOrCreate({
                            host: splitKey[0],
                            port: Number(splitKey[1])
                        });
                        tryConnection(false, key);
                    },
                    tryagain: partialTry,
                    clusterDown: partialTry,
                    connectionClosed: partialTry,
                    maxRedirections: (redirectionError) => {
                        reject.call(command, redirectionError);
                    },
                    defaults: () => void reject.call(command, err)
                });
            };
        }
        tryConnection();
        return command.promise;
    }

    handleError(error, ttl, handlers) {
        if (is.undefined(ttl.value)) {
            ttl.value = this.options.maxRedirections;
        } else {
            ttl.value -= 1;
        }
        if (ttl.value <= 0) {
            handlers.maxRedirections(new x.Exception(`Too many Cluster redirections. Last error: ${error}`));
            return;
        }
        const errv = error.message.split(" ");
        if (errv[0] === "MOVED" || errv[0] === "ASK") {
            handlers[errv[0] === "MOVED" ? "moved" : "ask"](errv[1], errv[2]);
        } else if (errv[0] === "TRYAGAIN") {
            this.delayQueue.push("tryagain", handlers.tryagain, {
                timeout: this.options.retryDelayOnTryAgain
            });
        } else if (errv[0] === "CLUSTERDOWN" && this.options.retryDelayOnClusterDown > 0) {
            this.delayQueue.push("clusterdown", handlers.connectionClosed, {
                timeout: this.options.retryDelayOnClusterDown,
                callback: this.refreshSlotsCache.bind(this)
            });
        } else if (error.message === __.util.CONNECTION_CLOSED_ERROR_MSG &&
                   this.options.retryDelayOnFailover > 0) {
            this.delayQueue.push("failover", handlers.connectionClosed, {
                timeout: this.options.retryDelayOnFailover,
                callback: this.refreshSlotsCache.bind(this)
            });
        } else {
            handlers.defaults();
        }
    }

    async getInfoFromNode(instance) {
        if (!instance) {
            throw new x.Exception("Node is disconnected");
        }
        let result;
        try {
            result = await promise.timeout(instance.cluster("slots"), this.options.slotsRefreshTimeout);
        } catch (err) {
            instance.disconnect();
            throw err;
        }
        const nodes = [];

        for (let i = 0; i < result.length; ++i) {
            const items = result[i];
            const slotRangeStart = items[0];
            const slotRangeEnd = items[1];

            const keys = [];
            for (let j = 2; j < items.length; j++) {
                items[j] = { host: items[j][0], port: items[j][1] };
                items[j].readOnly = j !== 2;
                nodes.push(items[j]);
                keys.push(`${items[j].host}:${items[j].port}`);
            }

            for (let slot = slotRangeStart; slot <= slotRangeEnd; slot++) {
                this.slots[slot] = keys;
            }
        }

        this.connectionPool.reset(nodes);
    }

    async _readyCheck() {
        const result = await this.cluster("info");
        if (!is.string(result)) {
            return;
        }

        let state;
        const lines = result.split("\r\n");
        for (const line of lines) {
            const parts = line.split(":");
            if (parts[0] === "cluster_state") {
                state = parts[1];
                break;
            }
        }

        if (state === "fail") {
            return state;
        }
    }
}


Cluster.defaultOptions = {
    clusterRetryStrategy: (times) => Math.min(100 + times * 2, 2000),
    enableOfflineQueue: true,
    enableReadyCheck: true,
    scaleReads: "master",
    maxRedirections: 16,
    retryDelayOnFailover: 100,
    retryDelayOnClusterDown: 100,
    retryDelayOnTryAgain: 100,
    slotsRefreshTimeout: 1000
};

for (const command of ["sscan", "hscan", "zscan", "sscanBuffer", "hscanBuffer", "zscanBuffer"]) {
    Cluster.prototype[`${command}Stream`] = function (key, options) {
        return new __.ScanStream({
            objectMode: true,
            key,
            redis: this,
            command,
            ...options
        });
    };
}

// transaction support
adone.lazify({
    pipeline: () => redis.Redis.prototype.pipeline,
    multi: () => redis.Redis.prototype.multi,
    exec: () => redis.Redis.prototype.exec
}, Cluster.prototype);
