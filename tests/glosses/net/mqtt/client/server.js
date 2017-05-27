const Connection = require("mqtt-connection");

const { is, std: { tls, net } } = adone;

const setupConnection = function (duplex) {
    const connection = new Connection(duplex);
    this.emit("client", connection);
};

class MqttServer extends net.Server {
    constructor(listener) {
        super();

        this.on("connection", setupConnection);

        if (listener) {
            this.on("client", listener);
        }
    }
}

class MqttSecureServer extends tls.Server {
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

module.exports = { MqttServer, MqttSecureServer };
