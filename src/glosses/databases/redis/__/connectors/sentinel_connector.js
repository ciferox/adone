const {
    database: { redis },
    exception,
    is,
    std,
    util,
    noop,
    promise
} = adone;
const __ = adone.private(redis);

const isSentinelEql = (a, b) => ((a.host || "127.0.0.1") === (b.host || "127.0.0.1")) && ((a.port || 26379) === (b.port || 26379));

export default class SentinelConnector extends __.Connector {
    constructor(options) {
        super(options);
        if (this.options.sentinels.length === 0) {
            throw new exception.InvalidArgument("Requires at least one sentinel to connect to.");
        }
        if (!this.options.name) {
            throw new exception.InvalidArgument("Requires the name of master.");
        }
    }

    check(info) {
        if (info.role && this.options.role !== info.role) {
            return false;
        }
        return true;
    }

    async connect(eventEmitter) {
        this.connecting = true;
        this.retryAttempts = 0;

        if (!is.number(this.currentPoint)) {
            this.currentPoint = -1;
        }
        if (!is.array(this.sentinels)) {
            this.sentinels = this.options.sentinels;
        }

        let lastError;

        for (; ;) {
            while (++this.currentPoint !== this.sentinels.length) {
                const endpoint = this.sentinels[this.currentPoint];
                let err;
                let resolved;
                try {
                    resolved = await this.resolve(endpoint);
                } catch (_err) {
                    err = _err;
                }
                if (!this.connecting) {
                    throw new exception.Exception(__.util.CONNECTION_CLOSED_ERROR_MSG);
                }
                if (resolved) {
                    this.stream = std.net.createConnection(resolved);
                    return this.stream;
                }
                const endpointAddress = `${endpoint.host}:${endpoint.port}`;
                const errorMsg = err
                    ? `failed to connect to sentinel ${endpointAddress} because ${err.message}`
                    : `connected to sentinel ${endpointAddress} successfully, but got an invalid reply: ${resolved}`;

                eventEmitter("sentinelError", new Error(errorMsg));

                if (err) {
                    lastError = err;
                }
            }

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
                eventEmitter("error", error);
                await promise.delay(retryDelay);
            } else {
                throw error;
            }
        }
    }

    async updateSentinels(client) {
        const result = await client.sentinel("sentinels", this.options.name);
        if (!is.array(result)) {
            return;
        }
        for (const i of result) {
            const sentinel = __.util.packObject(i);
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

    async resolveMaster(client) {
        try {
            const result = await client.sentinel("get-master-addr-by-name", this.options.name);
            await this.updateSentinels(client);
            return is.array(result) ? { host: result[0], port: result[1] } : null;
        } finally {
            client.disconnect();
        }
    }

    async resolveSlave(client) {
        let result;
        try {
            result = await client.sentinel("slaves", this.options.name);
        } finally {
            client.disconnect();
        }
        let selectedSlave;
        if (is.array(result)) {
            const availableSlaves = [];
            for (const i of result) {
                const slave = __.util.packObject(i);
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
            return { host: selectedSlave.ip, port: selectedSlave.port };
        }
        return null;
    }

    async resolve(endpoint) {
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
            return this.resolveSlave(client);
        }
        return this.resolveMaster(client);
    }
}
