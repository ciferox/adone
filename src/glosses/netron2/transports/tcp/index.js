import createListener from "./listener";

const {
    is,
    multi,
    netron2: { Connection },
    std: { net },
    util: { once },
    stream: { pull }
} = adone;

export default class TCP {
    dial(ma, options, callback) {
        if (is.function(options)) {
            callback = options;
            options = {};
        }

        callback = callback || adone.noop;

        callback = once(callback);
        const cOpts = ma.toOptions();
        adone.log("Connecting to %s %s", cOpts.port, cOpts.host);

        const rawSocket = net.connect(cOpts);

        rawSocket.once("timeout", () => {
            adone.log("timeout");
            rawSocket.emit("error", new Error("Timeout"));
        });

        rawSocket.once("error", callback);

        rawSocket.once("connect", () => {
            rawSocket.removeListener("error", callback);
            callback();
        });

        const socket = pull.fromStream.duplex(rawSocket);

        const conn = new Connection(socket);

        conn.getObservedAddrs = (callback) => {
            return callback(null, [ma]);
        };

        return conn;
    }

    createListener(options, handler) {
        if (is.function(options)) {
            handler = options;
            options = {};
        }

        handler = handler || adone.noop;

        return createListener(handler);
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

            return multi.address.validator.TCP.matches(ma);
        });
    }
}
