const {
    database: { redis: { __ } },
    util,
    promise,
    is,
    collection: { ByteArray }
} = adone;

export default class Pipeline extends __.Commander {
    constructor(redis) {
        super();
        this.redis = redis;
        this.isCluster = this.redis.constructor.name === "Cluster";
        this.options = redis.options;
        this._queue = [];
        this._result = [];
        this._transactions = 0;
        this._shaToScript = {};

        if (redis.scriptsSet) {
            for (const [name, script] of util.entries(redis.scriptsSet)) {
                this._shaToScript[script.sha] = script;
                this[name] = redis[name];
                this[`${name}Buffer`] = redis[`${name}Buffer`];
            }
        }

        const defer = promise.defer();
        this.promise = defer.promise;
        this.resolve = defer.resolve;
        this.reject = defer.reject;
    }

    get length() {
        return this._queue.length;
    }

    fillResult(value, position) {
        if (this._queue[position].name === "exec" && is.array(value[1])) {
            const { length: execLength } = value[1];
            for (let i = 0; i < execLength; i++) {
                if (value[1][i] instanceof Error) {
                    continue;
                }
                const cmd = this._queue[position - (execLength - i)];
                try {
                    value[1][i] = cmd.transformReply(value[1][i]);
                } catch (err) {
                    value[1][i] = err;
                }
            }
        }
        this._result[position] = value;

        if (--this.replyPending) {
            return;
        }

        if (this.isCluster) {
            let retriable = true;
            let commonError;
            let inTransaction;
            for (let i = 0; i < this._result.length; ++i) {
                const error = this._result[i][0];
                const command = this._queue[i];
                if (command.name === "multi") {
                    inTransaction = true;
                } else if (command.name === "exec") {
                    inTransaction = false;
                }
                if (error) {
                    if (command.name === "exec" &&
                        error.message === "EXECABORT Transaction discarded because of previous errors.") {
                        continue;
                    }
                    if (!commonError) {
                        commonError = {
                            name: error.name,
                            message: error.message
                        };
                    } else if (commonError.name !== error.name ||
                        commonError.message !== error.message) {
                        retriable = false;
                        break;
                    }
                } else if (!inTransaction) {
                    const isReadOnly = __.commands.exists(command.name) &&
                        __.commands.hasFlag(command.name, "readonly");
                    if (!isReadOnly) {
                        retriable = false;
                        break;
                    }
                }
            }
            if (commonError && retriable) {
                const errv = commonError.message.split(" ");
                const queue = this._queue;
                inTransaction = false;
                this._queue = [];
                for (let i = 0; i < queue.length; ++i) {
                    if (errv[0] === "ASK" && !inTransaction &&
                        queue[i].name !== "asking" &&
                        (!queue[i - 1] || queue[i - 1].name !== "asking")) {
                        const asking = new __.Command("asking");
                        asking.ignore = true;
                        this.sendCommand(asking);
                    }
                    queue[i].initPromise();
                    this.sendCommand(queue[i]);
                    if (queue[i].name === "multi") {
                        inTransaction = true;
                    } else if (queue[i].name === "exec") {
                        inTransaction = false;
                    }
                }

                let matched = true;
                if (is.undefined(this.leftRedirections)) {
                    this.leftRedirections = {};
                }
                const exec = () => this.exec();
                this.redis.handleError(commonError, this.leftRedirections, {
                    moved: (slot, key) => {
                        this.preferKey = key;
                        this.redis.slots[errv[1]] = [key];
                        this.redis.refreshSlotsCache();
                        this.exec();
                    },
                    ask: (slot, key) => {
                        this.preferKey = key;
                        this.exec();
                    },
                    tryagain: exec,
                    clusterDown: exec,
                    connectionClosed: exec,
                    maxRedirections() {
                        matched = false;
                    },
                    defaults() {
                        matched = false;
                    }
                });
                if (matched) {
                    return;
                }
            }
        }

        let ignoredCount = 0;
        for (let i = 0; i < this._queue.length - ignoredCount; ++i) {
            if (this._queue[i + ignoredCount].ignore) {
                ignoredCount += 1;
            }
            this._result[i] = this._result[i + ignoredCount];
        }
        this.resolve(this._result.slice(0, this._result.length - ignoredCount));
    }

    sendCommand(command) {
        const { _queue } = this;
        const { length: position } = _queue;

        command.promise.then((result) => {
            this.fillResult([null, result], position);
        }, (error) => {
            this.fillResult([error], position);
        });

        _queue.push(command);

        return this;
    }

    addBatch(commands) {
        for (let i = 0; i < commands.length; ++i) {
            const [commandName, ...args] = commands[i];
            this[commandName].apply(this, args);
        }

        return this;
    }

    multi(...args) {
        this._transactions += 1;
        return super.multi(...args);
    }

    exec(...args) {
        const [callback] = args;
        if (this._transactions > 0) {
            this._transactions -= 1;
            if (this.options.dropBufferSupport) {
                return super.exec(...args);
            }
            return super.execBuffer(...args);
        }
        if (!this.nodeifiedPromise) {
            this.nodeifiedPromise = true;
            promise.nodeify(this.promise, callback);
        }
        if (this._queue.length === 0) {
            this.resolve([]);
        }
        let pipelineSlot;
        if (this.isCluster) {
            // List of the first key for each command
            const sampleKeys = [];
            for (let i = 0; i < this._queue.length; i++) {
                const keys = this._queue[i].getKeys();
                if (keys.length) {
                    sampleKeys.push(keys[0]);
                }
            }

            if (sampleKeys.length) {
                pipelineSlot = __.calculateSlot.generateMulti(sampleKeys);
                if (pipelineSlot < 0) {
                    this.reject(new Error("All keys in the pipeline should belong to the same slot"));
                    return this.promise;
                }
            } else {
                // Send the pipeline to a random node
                pipelineSlot = Math.random() * 16384 | 0;
            }
        }

        // Check whether scripts exists
        const scripts = [];
        for (let i = 0; i < this._queue.length; ++i) {
            const item = this._queue[i];
            if (this.isCluster && item.isCustomCommand) {
                this.reject(new Error("Sending custom commands in pipeline is not supported in Cluster mode."));
                return this.promise;
            }
            if (item.name !== "evalsha") {
                continue;
            }
            const script = this._shaToScript[item.args[0]];
            if (!script) {
                continue;
            }
            scripts.push(script);
        }

        const execPipeline = () => {
            let data = "";
            let writePending = this.replyPending = this._queue.length;

            let node;
            if (this.isCluster) {
                node = {
                    slot: pipelineSlot,
                    redis: this.redis.connectionPool.nodes.all[this.preferKey]
                };
            }
            let bufferMode = false;
            const stream = {
                write: (writable) => {
                    if (is.buffer(writable)) {
                        bufferMode = true;
                    }
                    if (bufferMode) {
                        if (is.string(data)) {
                            const flexBuffer = new ByteArray(0);
                            flexBuffer.write(data);
                            data = flexBuffer;
                        }
                        data.write(writable);
                    } else {
                        data += writable;
                    }
                    if (!--writePending) {
                        if (bufferMode) {
                            data = data.flip().toBuffer();
                        }
                        if (this.isCluster) {
                            node.redis.stream.write(data);
                        } else {
                            this.redis.stream.write(data);
                        }

                        // Reset writePending for resending
                        writePending = this._queue.length;
                        data = "";
                        bufferMode = false;
                    }
                }
            };

            for (let i = 0; i < this._queue.length; ++i) {
                this.redis.sendCommand(this._queue[i], stream, node);
            }
            return this.promise;
        };

        if (!scripts.length) {
            return execPipeline();
        }

        return this.redis.script("exists", scripts.map((item) => {
            return item.sha;
        })).then((results) => {
            const pending = [];
            for (let i = 0; i < results.length; ++i) {
                if (!results[i]) {
                    pending.push(scripts[i]);
                }
            }
            return Promise.all(pending.map((script) => {
                return this.redis.script("load", script.lua);
            }));
        }).then(execPipeline);
    }

    execBuffer(...args) {
        if (this._transactions > 0) {
            this._transactions -= 1;
        }
        return super.execBuffer(...args);
    }
}
