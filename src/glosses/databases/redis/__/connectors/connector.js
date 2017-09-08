const {
    std
} = adone;

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

    async connect() {
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
            connectionOptions = { ...connectionOptions, ...this.options.tls };
        }

        let stream;

        if (this.options.tls) {
            stream = std.tls.connect(connectionOptions);
        } else {
            stream = std.net.createConnection(connectionOptions);
        }

        this.stream = stream;
        return stream;
    }
}
