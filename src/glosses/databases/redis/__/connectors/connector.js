const { database: { redis: { __ } }, o, x, std } = adone;

export default class Connector {
    constructor(options) {
        this.options = options;
    }

    check() {
        return true;
    }

    disconnect() {
        this.connecting = false;
        if (this.stream) {
            this.stream.end();
        }
    }

    connect(callback) {
        this.connecting = true;
        let connectionOptions;
        if (this.options.path) {
            connectionOptions = { path: this.options.path };
        } else {
            connectionOptions = {
                port: this.options.port,
                host: this.options.host,
                family: this.options.family
            };
        }
        if (this.options.tls) {
            connectionOptions = o(connectionOptions, this.options.tls);
        }

        process.nextTick(() => {
            if (!this.connecting) {
                callback(new x.Exception(__.util.CONNECTION_CLOSED_ERROR_MSG));
                return;
            }
            let stream;

            try {
                if (this.options.tls) {
                    stream = std.tls.connect(connectionOptions);
                } else {
                    stream = std.net.createConnection(connectionOptions);
                }
            } catch (err) {
                callback(err);
                return;
            }

            this.stream = stream;
            callback(null, stream);
        });
    }
}
