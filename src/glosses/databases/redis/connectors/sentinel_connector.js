import Connector from "./connector";
import adone from "adone";
const { x, is, std: { net }, util, noop } = adone;

const lazy = adone.lazify({
    utils: "../utils",
    Redis: "../redis"
}, null, require);

const isSentinelEql = (a, b) => ((a.host || "127.0.0.1") === (b.host || "127.0.0.1")) && ((a.port || 6379) === (b.port || 6379));

export default class SentinelConnector extends Connector {
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

    connect(callback) {
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

                let retryDelay;
                if (is.function(this.options.sentinelRetryStrategy)) {
                    retryDelay = this.options.sentinelRetryStrategy(++this.retryAttempts);
                }
                if (!is.number(retryDelay)) {
                    let error = "All sentinels are unreachable.";
                    if (lastError) {
                        error += ` Last error: ${lastError.message}`;
                    }
                    return callback(new x.Exception(error));
                }
                setTimeout(connectToNext, retryDelay);
                return;
            }

            const endpoint = this.sentinels[this.currentPoint];
            this.resolve(endpoint, (err, resolved) => {
                if (!this.connecting) {
                    callback(new x.Exception(lazy.utils.CONNECTION_CLOSED_ERROR_MSG));
                    return;
                }
                if (resolved) {
                    this.stream = net.createConnection(resolved);
                    callback(null, this.stream);
                } else if (err) {
                    lastError = err;
                    connectToNext();
                } else {
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
                    const sentinel = lazy.utils.packObject(result[i]);
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
                    const slave = lazy.utils.packObject(result[i]);
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
                                    if (available.ip === preferred.ip && available.port === preferred.port) {
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
            callback(null, selectedSlave ? { host: selectedSlave.ip, port: selectedSlave.port } : null);
        });
    }

    resolve(endpoint, callback) {
        const client = new lazy.Redis({
            port: endpoint.port,
            host: endpoint.host,
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
