import adone from "adone";

const imports = adone.lazify({
    Redis: "../redis",
    utils: "../utils",
    ScanStream: "../scan_stream",
    Commander: "../commander",
    Command: "../command",
    commands: "../commands",
    ConnectionPool: "./connection_pool",
    DelayQueue: "./delay_queue"
}, null, require);

/**
 * Creates a Redis Cluster instance
 *
 * @constructor
 * @param {Object[]} startupNodes - An array of nodes in the cluster, [{ port: number, host: string }]
 * @param {Object} options
 * @param {function} [options.clusterRetryStrategy] - See "Quick Start" section
 * @param {boolean} [options.enableOfflineQueue=true] - See Redis class
 * @param {boolean} [options.enableReadyCheck=true] - When enabled, ioredis only emits "ready" event when `CLUSTER INFO`
 * command reporting the cluster is ready for handling commands.
 * @param {string} [options.scaleReads=master] - Scale reads to the node with the specified role.
 * Available values are "master", "slave" and "all".
 * @param {number} [options.maxRedirections=16] - When a MOVED or ASK error is received, client will redirect the
 * command to another node. This option limits the max redirections allowed to send a command.
 * @param {number} [options.retryDelayOnFailover=100] - When an error is received when sending a command(e.g.
 * "Connection is closed." when the target Redis node is down),
 * @param {number} [options.retryDelayOnClusterDown=100] - When a CLUSTERDOWN error is received, client will retry
 * if `retryDelayOnClusterDown` is valid delay time.
 * @param {number} [options.retryDelayOnTryAgain=100] - When a TRYAGAIN error is received, client will retry
 * if `retryDelayOnTryAgain` is valid delay time.
 * @param {Object} [options.redisOptions] - Passed to the constructor of `Redis`.
 * @extends [EventEmitter](http://nodejs.org/api/events.html#events_class_events_eventemitter)
 * @extends Commander
 */
export default class Cluster extends imports.Commander.mixin(adone.EventEmitter) {
    constructor(startupNodes, options) {
        super();
        this.options = adone.vendor.lodash.defaults(this.options, options, Cluster.defaultOptions);

        // validate options
        if (!adone.is.function(this.options.scaleReads) &&
            this.options.scaleReads !== "all" &&
            this.options.scaleReads !== "master" &&
            this.options.scaleReads !== "slave") {

            throw new adone.x.Exception([
                `Invalid option scaleReads ${this.options.scaleReads}.`,
                "Expected \"all\", \"master\", \"slave\" or a custom function"
            ].join(" "));
        }

        this.connectionPool = new imports.ConnectionPool(this.options.redisOptions);
        this.startupNodes = startupNodes;

        this.connectionPool.on("-node", (redis) => {
            if (this.status !== "disconnecting" && this.subscriber === redis) {
                this.selectSubscriber();
            }
            this.emit("-node", redis);
        });
        this.connectionPool.on("+node", (redis) => {
            this.emit("+node", redis);
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
        this.delayQueue = new imports.DelayQueue();

        this.subscriber = null;

        if (this.options.lazyConnect) {
            this.setStatus("wait");
        } else {
            this.connect().catch(adone.noop);
        }
    }

    resetOfflineQueue() {
        this.offlineQueue = new adone.collection.LinkedList();
    }

    /**
     * Connect to a cluster
     *
     * @return {Promise}
     * @public
     */
    connect() {
        const readyHandler = () => {
            this.setStatus("ready");
            this.retryAttempts = 0;
            this.executeOfflineCommands();
        };

        return new Promise((resolve, reject) => {
            if (this.status === "connecting" || this.status === "connect" || this.status === "ready") {
                reject(new Error("Redis is already connecting/connected"));
                return;
            }
            this.setStatus("connecting");

            if (!adone.is.array(this.startupNodes) || this.startupNodes.length === 0) {
                throw new adone.x.InvalidArgument("`startupNodes` should contain at least one node.");
            }

            this.connectionPool.reset(this.startupNodes);

            const refreshListener = () => {
                this.removeListener("close", closeListener);
                this.manuallyClosing = false;
                this.setStatus("connect");
                if (this.options.enableReadyCheck) {
                    this._readyCheck((err, fail) => {
                        if (err || fail) {
                            this.disconnect(true);
                        } else {
                            readyHandler();
                        }
                    });
                } else {
                    readyHandler();
                }
                resolve();
            };

            const closeListener = () => {
                this.removeListener("refresh", refreshListener);
                reject(new adone.x.Exception("None of startup nodes is available"));
            };

            this.once("refresh", refreshListener);
            this.once("close", closeListener);
            this.once("close", this._handleCloseEvent.bind(this));

            this.refreshSlotsCache((err) => {
                if (err && err.message === "Failed to refresh slots cache.") {
                    imports.Redis.prototype.silentEmit.call(this, "error", err);
                    this.connectionPool.reset([]);
                }
            });
            this.selectSubscriber();
        });
    }

    /**
     * Called when closed to check whether a reconnection should be made
     * @private
     */
    _handleCloseEvent() {
        let retryDelay;
        if (!this.manuallyClosing && adone.is.function(this.options.clusterRetryStrategy)) {
            retryDelay = this.options.clusterRetryStrategy.call(this, ++this.retryAttempts);
        }
        if (adone.is.number(retryDelay)) {
            this.setStatus("reconnecting");
            this.reconnectTimeout = setTimeout(() => {
                this.reconnectTimeout = null;
                this.connect().catch(adone.noop);
            }, retryDelay);
        } else {
            this.setStatus("end");
            this.flushQueue(new Error("None of startup nodes is available"));
        }
    }

    /**
     * Disconnect from every node in the cluster.
     *
     * @public
     */
    disconnect(reconnect) {
        const status = this.status;
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

    /**
     * Quit the cluster gracefully.
     *
     * @param {function} callback
     * @return {Promise} return 'OK' if successfully
     * @public
     */
    quit(callback) {
        const status = this.status;
        this.setStatus("disconnecting");

        this.manuallyClosing = true;

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        if (status === "wait") {
            const ret = adone.promise.nodeify(Promise.resolve("OK"), callback);

            // use setImmediate to make sure "close" event
            // being emitted after quit() is returned
            setImmediate(() => {
                this.setStatus("close");
                this._handleCloseEvent();
            });

            return ret;
        }
        return adone.promise.nodeify(Promise.all(this.nodes().map(function (node) {
            return node.quit();
        })).then(() => "OK"), callback);
    }

    /**
     * Get nodes with the specified role
     *
     * @param {string} [role=all] - role, "master", "slave" or "all"
     * @return {Redis[]} array of nodes
     * @public
     */
    nodes(role) {
        role = role || "all";
        if (role !== "all" && role !== "master" && role !== "slave") {
            throw new adone.x.InvalidArgument(`Invalid role "${role}. Expected "all", "master" or "slave"`);
        }
        return adone.vendor.lodash.values(this.connectionPool.nodes[role]);
    }

    /**
     * Select a subscriber from the cluster
     *
     * @private
     */
    selectSubscriber() {
        this.subscriber = adone.vendor.lodash.sample(this.nodes());
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
            for (const type of ["subscribe", "psubscribe"]) {
                const channels = previousChannels[type];
                if (channels.length) {
                    pending += 1;
                    this.subscriber[type](channels).then(() => {
                        if (!--pending) {
                            this.lastActiveSubscriber = this.subscriber;
                        }
                    }).catch(adone.noop);
                }
            }
        } else {
            if (this.subscriber.status === "wait") {
                this.subscriber.connect().catch(adone.noop);
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

    /**
     * Change cluster instance's status
     *
     * @param {string} status
     * @private
     */
    setStatus(status) {
        this.status = status;
        process.nextTick(() => this.emit(status));
    }

    /**
     * Refresh the slot cache
     *
     * @param {function} callback
     * @private
     */
    refreshSlotsCache(callback) {
        if (this.isRefreshing) {
            if (adone.is.function(callback)) {
                process.nextTick(callback);
            }
            return;
        }
        this.isRefreshing = true;

        const wrapper = (...args) => {
            this.isRefreshing = false;
            if (adone.is.function(callback)) {
                callback(...args);
            }
        };

        const keys = adone.vendor.lodash.shuffle(Object.keys(this.connectionPool.nodes.all));

        let lastNodeError = null;

        const tryNode = (index) => {
            if (index === keys.length) {
                const error = new adone.x.Exception("Failed to refresh slots cache.");
                error.lastNodeError = lastNodeError;
                return wrapper(error);
            }
            this.getInfoFromNode(this.connectionPool.nodes.all[keys[index]], (err) => {
                if (this.status === "end") {
                    return wrapper(new adone.x.Exception("Cluster is disconnected."));
                }
                if (err) {
                    this.emit("node error", err);
                    lastNodeError = err;
                    tryNode(index + 1);
                } else {
                    this.emit("refresh");
                    wrapper();
                }
            });
        };

        tryNode(0);
    }

    /**
     * Flush offline queue with error.
     *
     * @param {Error} error - The error object to send to the commands
     * @private
     */
    flushQueue(error) {
        let item;
        while (this.offlineQueue.length > 0) {
            item = this.offlineQueue.shift();
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
            this.connect().catch(adone.noop);
        }
        if (this.status === "end") {
            command.reject(new adone.x.Exception(imports.util.CONNECTION_CLOSED_ERROR_MSG));
            return command.promise;
        }
        let to = this.options.scaleReads;
        if (to !== "master") {
            const isCommandReadOnly = imports.commands.exists(command.name) && imports.commands.hasFlag(command.name, "readonly");
            if (!isCommandReadOnly) {
                to = "master";
            }
        }

        const targetSlot = node ? node.slot : command.getSlot();
        const ttl = {};
        if (!node && !command.__is_reject_overwritten) {
            command.__is_reject_overwritten = true;
            const reject = command.reject;
            command.reject = (err) => {
                const partialTry = adone.vendor.lodash.partial(tryConnection, true);
                this.handleError(err, ttl, {
                    moved: (slot, key) => {
                        if (this.slots[slot]) {
                            this.slots[slot][0] = key;
                        } else {
                            this.slots[slot] = [key];
                        }
                        const splitKey = key.split(":");
                        this.connectionPool.findOrCreate({ host: splitKey[0], port: Number(splitKey[1]) });
                        tryConnection();
                        this.refreshSlotsCache();
                    },
                    ask: (slot, key) => {
                        const splitKey = key.split(":");
                        this.connectionPool.findOrCreate({ host: splitKey[0], port: Number(splitKey[1]) });
                        tryConnection(false, key);
                    },
                    tryagain: partialTry,
                    clusterDown: partialTry,
                    connectionClosed: partialTry,
                    maxRedirections: (redirectionError) => void reject.call(command, redirectionError),
                    defaults: () => void reject.call(command, err)
                });
            };
        }
        const tryConnection = (random, asking) => {
            if (this.status === "end") {
                command.reject(new adone.x.Exception("Cluster is ended."));
                return;
            }
            let redis;
            if (this.status === "ready" || (command.name === "cluster")) {
                if (node && node.redis) {
                    redis = node.redis;
                } else if (imports.Command.checkFlag("ENTER_SUBSCRIBER_MODE", command.name) ||
                    imports.Command.checkFlag("EXIT_SUBSCRIBER_MODE", command.name)) {
                    redis = this.subscriber;
                } else {
                    if (!random) {
                        if (adone.is.number(targetSlot) && this.slots[targetSlot]) {
                            const nodeKeys = this.slots[targetSlot];
                            if (adone.is.function(to)) {
                                const nodes = nodeKeys.map((key) => this.connectionPool.nodes.all[key]);
                                redis = to(nodes, command);
                                if (adone.is.array(redis)) {
                                    redis = adone.vendor.lodash.sample(redis);
                                }
                                if (!redis) {
                                    redis = nodes[0];
                                }
                            } else {
                                let key;
                                if (to === "all") {
                                    key = adone.vendor.lodash.sample(nodeKeys);
                                } else if (to === "slave" && nodeKeys.length > 1) {
                                    key = adone.vendor.lodash.sample(nodeKeys, 1);
                                } else {
                                    key = nodeKeys[0];
                                }
                                redis = this.connectionPool.nodes.all[key];
                            }
                        }
                        if (asking) {
                            redis = this.connectionPool.nodes.all[asking];
                            redis.asking();
                        }
                    }
                    if (!redis) {
                        redis = adone.vendor.lodash.sample(this.connectionPool.nodes[to]) || adone.vendor.lodash.sample(this.connectionPool.nodes.all);
                    }
                }
                if (node && !node.redis) {
                    node.redis = redis;
                }
            }
            if (redis) {
                redis.sendCommand(command, stream);
            } else if (this.options.enableOfflineQueue) {
                this.offlineQueue.push({ command, stream, node });
            } else {
                command.reject(new adone.x.Exception("Cluster isn't ready and enableOfflineQueue options is false"));
            }
        };
        tryConnection();
        return command.promise;
    }

    handleError(error, ttl, handlers) {
        if (adone.is.undefined(ttl.value)) {
            ttl.value = this.options.maxRedirections;
        } else {
            ttl.value -= 1;
        }
        if (ttl.value <= 0) {
            handlers.maxRedirections(new adone.x.Exception(`Too many Cluster redirections. Last error: ${error}`));
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
        } else if (error.message === imports.utils.CONNECTION_CLOSED_ERROR_MSG && this.options.retryDelayOnFailover > 0) {
            this.delayQueue.push("failover", handlers.connectionClosed, {
                timeout: this.options.retryDelayOnFailover,
                callback: this.refreshSlotsCache.bind(this)
            });
        } else {
            handlers.defaults();
        }
    }

    getInfoFromNode(redis, callback) {
        if (!redis) {
            return callback(new adone.x.Exception("Node is disconnected"));
        }
        redis.cluster("slots", imports.utils.timeout((err, result) => {
            if (err) {
                redis.disconnect();
                return callback(err);
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
            callback();
        }, 1000));
    }

    /**
     * Check whether Cluster is able to process commands
     *
     * @param {Function} callback
     * @private
     */
    _readyCheck(callback) {
        this.cluster("info", (err, res) => {
            if (err) {
                return callback(err);
            }
            if (!adone.is.string(res)) {
                return callback();
            }

            let state;
            const lines = res.split("\r\n");
            for (const line of lines) {
                const parts = line.split(":");
                if (parts[0] === "cluster_state") {
                    state = parts[1];
                    break;
                }
            }

            if (state === "fail") {
                callback(null, state);
            } else {
                callback();
            }
        });
    }
}


/**
 * Default options
 *
 * @var defaultOptions
 * @protected
 */
Cluster.defaultOptions = {
    clusterRetryStrategy: (times) => Math.min(100 + times * 2, 2000),
    enableOfflineQueue: true,
    enableReadyCheck: true,
    scaleReads: "master",
    maxRedirections: 16,
    retryDelayOnFailover: 100,
    retryDelayOnClusterDown: 100,
    retryDelayOnTryAgain: 100
};

for (const command of ["sscan", "hscan", "zscan", "sscanBuffer", "hscanBuffer", "zscanBuffer"]) {
    Cluster.prototype[command + "Stream"] = function (key, options) {
        return new imports.ScanStream(adone.vendor.lodash.defaults({
            objectMode: true,
            key,
            redis: this,
            command
        }, options));
    };
}

// transaction support
adone.lazify({
    pipeline: () => imports.Redis.prototype.pipeline,
    multi: () => imports.Redis.prototype.multi,
    exec: () => imports.Redis.prototype.exec
}, Cluster.prototype);
