
const { o, x, std: { tls, net } } = adone;

const lazy = adone.lazify({
    utils: "../utils"
}, null, require);

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
                callback(new x.Exception(lazy.utils.CONNECTION_CLOSED_ERROR_MSG));
                return;
            }
            let stream;

            try {
                if (this.options.tls) {
                    stream = tls.connect(connectionOptions);
                } else {
                    stream = net.createConnection(connectionOptions);
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
