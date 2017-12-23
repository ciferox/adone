const maToUrl = require("./ma-to-url");
const createListener = require("./listener");

const {
    is,
    multi: { address: { validator } },
    netron2: { Connection },
    stream: { pull }
} = adone;

export default class WSTransport {
    dial(ma, options, callback) {
        if (is.function(options)) {
            callback = options;
            options = {};
        }

        callback = callback || function () { };

        const url = maToUrl(ma);
        adone.log("dialing %s", url);
        const socket = pull.ws.connect(url, {
            binary: true,
            onConnect: (err) => {
                callback(err);
            }
        });

        const conn = new Connection(socket);
        conn.getObservedAddrs = (cb) => cb(null, [ma]);
        conn.close = (cb) => socket.close(cb);

        return conn;
    }

    createListener(options, handler) {
        if (is.function(options)) {
            handler = options;
            options = {};
        }

        return createListener(options, handler);
    }

    filter(multiaddrs) {
        if (!is.array(multiaddrs)) {
            multiaddrs = [multiaddrs];
        }

        return multiaddrs.filter((ma) => {
            if (ma.protoNames().includes("p2p-circuit")) {
                return false;
            }

            if (ma.protoNames().includes("ipfs")) {
                ma = ma.decapsulate("ipfs");
            }

            return validator.WebSocket.matches(ma) || validator.WebSocketSecure.matches(ma);
        });
    }
}

// For tests
WSTransport.maToUrl = maToUrl;
