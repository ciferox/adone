const { database: { redis }, x, is, std, util, noop } = adone;
const { __ } = redis;

const isSentinelEql = (a, b) => ((a.host || "127.0.0.1") === (b.host || "127.0.0.1")) && ((a.port || 26379) === (b.port || 26379));

export default class SentinelConnector extends __.Connector {
    constructor(options) {
        super(options);
        if (this.options.sentinels.length === 0) {
            throw new x.InvalidArgument("Requires at least one sentinel to connect to.");
        }
        if (!this.options.name) {
            throw new x.InvalidArgument("Requires the name of master.");
        }
    }

    check(info) {
        if (info.role && this.options.role !== info.role) {
            return false;
        }
        return true;
    }

    connect(callback, eventEmitter) {
        this.connecting = true;
        this.retryAttempts = 0;

        if (!is.number(this.currentPoint)) {
            this.currentPoint = -1;
        }
        if (!is.array(this.sentinels)) {
            this.sentinels = this.options.sentinels;
        }

        let lastError;

        const connectToNext = () => {
            this.currentPoint += 1;
            if (this.currentPoint === this.sentinels.length) {
                this.currentPoint = -1;

                const retryDelay = is.function(this.options.sentinelRetryStrategy)
                    ? this.options.sentinelRetryStrategy(++this.retryAttempts)
                    : null;

                let errorMsg = !is.number(retryDelay)
                    ? "All sentinels are unreachable and retry is disabled."
                    : `All sentinels are unreachable. Retrying from scratch after ${retryDelay}ms`;

                if (lastError) {
                    errorMsg += ` Last error: ${lastError.message}`;
                }

                const error = new Error(errorMsg);
                if (is.number(retryDelay)) {
                    setTimeout(connectToNext, retryDelay);
                    eventEmitter("error", error);
                } else {
                    callback(error);
                }
                return;
            }

            const endpoint = this.sentinels[this.currentPoint];
            this.resolve(endpoint, (err, resolved) => {
                if (!this.connecting) {
                    callback(new x.Exception(__.util.CONNECTION_CLOSED_ERROR_MSG));
                    return;
                }
                if (resolved) {
                    this.stream = std.net.createConnection(resolved);
                    callback(null, this.stream);
                } else {
                    const endpointAddress = `${endpoint.host}:${endpoint.port}`;
                    const errorMsg = err
                        ? `failed to connect to sentinel ${endpointAddress} because ${err.message}`
                        : `connected to sentinel ${endpointAddress} successfully, but got an invalid reply: ${resolved}`;

                    eventEmitter("sentinelError", new Error(errorMsg));

                    if (err) {
                        lastError = err;
                    }
                    connectToNext();
                }
            });
        };

        connectToNext();
    }

    updateSentinels(client, callback) {
        client.sentinel("sentinels", this.options.name, (err, result) => {
            if (err) {
                client.disconnect();
                return callback(err);
            }
            if (is.array(result)) {
                for (let i = 0; i < result.length; ++i) {
                    const sentinel = __.util.packObject(result[i]);
                    const flags = sentinel.flags ? sentinel.flags.split(",") : [];
                    if (!flags.includes("disconnected") && sentinel.ip && sentinel.port) {
                        const endpoint = { host: sentinel.ip, port: parseInt(sentinel.port, 10) };
                        const isDuplicate = this.sentinels.some((a, b) => isSentinelEql(a, b));
                        if (!isDuplicate) {
                            this.sentinels.push(endpoint);
                        }
                    }
                }
            }
            callback(null);
        });
    }

    resolveMaster(client, callback) {
        client.sentinel("get-master-addr-by-name", this.options.name, (err, result) => {
            if (err) {
                client.disconnect();
                return callback(err);
            }
            this.updateSentinels(client, (err) => {
                client.disconnect();
                if (err) {
                    return callback(err);
                }
                callback(null, is.array(result) ? { host: result[0], port: result[1] } : null);
            });
        });
    }

    resolveSlave(client, callback) {
        client.sentinel("slaves", this.options.name, (err, result) => {
            client.disconnect();
            if (err) {
                return callback(err);
            }
            let selectedSlave;
            if (is.array(result)) {
                const availableSlaves = [];
                for (let i = 0; i < result.length; ++i) {
                    const slave = __.util.packObject(result[i]);
                    if (slave.flags && !slave.flags.match(/(disconnected|s_down|o_down)/)) {
                        availableSlaves.push(slave);
                    }
                }
                // allow the options to prefer particular slave(s)
                if (this.options.preferredSlaves) {
                    let preferredSlaves = this.options.preferredSlaves;
                    switch (typeof preferredSlaves) {
                        case "function": {
                            // use function from options to filter preferred slave
                            selectedSlave = this.options.preferredSlaves(availableSlaves);
                            break;
                        }
                        case "object": {
                            if (!is.array(preferredSlaves)) {
                                preferredSlaves = [preferredSlaves];
                            } else {
                                // sort by priority
                                preferredSlaves.sort((a, b) => {
                                    // default the priority to 1
                                    if (!a.prio) {
                                        a.prio = 1;
                                    }
                                    if (!b.prio) {
                                        b.prio = 1;
                                    }

                                    // lowest priority first
                                    if (a.prio < b.prio) {
                                        return -1;
                                    }
                                    if (a.prio > b.prio) {
                                        return 1;
                                    }
                                    return 0;
                                });
                            }
                            // loop over preferred slaves and return the first match
                            for (const preferred of preferredSlaves) {
                                for (const available of availableSlaves) {
                                    if (available.ip === preferred.ip &&
                                        available.port === preferred.port) {
                                        selectedSlave = available;
                                    }
                                }
                                if (selectedSlave) {
                                    break;
                                }
                            }
                            // if none of the preferred slaves are available, a random available slave is returned
                            break;
                        }
                    }
                }
                if (!selectedSlave) {
                    // get a random available slave
                    selectedSlave = util.randomChoice(availableSlaves);
                }
            }
            if (selectedSlave) {
                callback(null, { host: selectedSlave.ip, port: selectedSlave.port });
            } else {
                callback(null, null);
            }
        });
    }

    resolve(endpoint, callback) {
        const client = new redis.Redis({
            port: endpoint.port || 26379,
            host: endpoint.host,
            family: endpoint.family || this.options.family,
            retryStrategy: null,
            enableReadyCheck: false,
            connectTimeout: this.options.connectTimeout,
            dropBufferSupport: true
        });

        // ignore the errors since resolve* methods will handle them
        client.on("error", noop);

        if (this.options.role === "slave") {
            this.resolveSlave(client, callback);
        } else {
            this.resolveMaster(client, callback);
        }
    }
}
