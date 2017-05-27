const { is, std: { tls, net } } = adone;
const Connection = require("mqtt-connection");

const setupConnection = function (duplex) {
    const connection = new Connection(duplex);
    this.emit("client", connection);
};

export class MqttServer extends net.Server {
    constructor(listener) {
        super();

        this.on("connection", setupConnection);

        if (listener) {
            this.on("client", listener);
        }
    }
}

export class MqttSecureServer extends tls.Server {
    constructor(opts, listener) {
        if (is.function(opts)) {
            listener = opts;
            opts = {};
        }

        super(opts);

        if (listener) {
            this.on("client", listener);
        }

        this.on("secureConnection", setupConnection);
    }
}
