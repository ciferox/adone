import adone from "adone";

const imports = adone.lazify({
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
            connectionOptions = adone.vendor.lodash.pick(this.options, ["path"]);
        } else {
            connectionOptions = adone.vendor.lodash.pick(this.options, ["port", "host", "family"]);
        }
        if (this.options.tls) {
            Object.assign(connectionOptions, this.options.tls);
        }

        process.nextTick(() => {
            if (!this.connecting) {
                callback(new Error(imports.utils.CONNECTION_CLOSED_ERROR_MSG));
                return;
            }
            let stream;

            try {
                if (this.options.tls) {
                    stream = adone.std.tls.connect(connectionOptions);
                } else {
                    stream = adone.std.net.createConnection(connectionOptions);
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