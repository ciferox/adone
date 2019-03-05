const net = require("net");
const mafmt = require("mafmt");
const withIs = require("class-is");
const once = require("once");
const debug = require("debug");
const log = debug("libp2p:tcp:dial");

const createListener = require("./listener");

const {
    is,
    lodash: { includes, isFunction },
    noop,
    p2p: { Connection },
    stream: { pull2: { streamToPullStream } }
} = adone;

class TCP {
    dial(ma, options, callback) {
        if (isFunction(options)) {
            callback = options;
            options = {};
        }

        callback = once(callback || noop);

        const cOpts = ma.toOptions();
        log("Connecting to %s %s", cOpts.port, cOpts.host);

        const rawSocket = net.connect(cOpts);

        rawSocket.once("timeout", () => {
            log("timeout");
            rawSocket.emit("error", new Error("Timeout"));
        });

        rawSocket.once("error", callback);

        rawSocket.once("connect", () => {
            rawSocket.removeListener("error", callback);
            callback();
        });

        const socket = streamToPullStream.duplex(rawSocket);

        const conn = new Connection(socket);

        conn.getObservedAddrs = (callback) => {
            return callback(null, [ma]);
        };

        return conn;
    }

    createListener(options, handler) {
        if (isFunction(options)) {
            handler = options;
            options = {};
        }

        handler = handler || noop;

        return createListener(handler);
    }

    filter(multiaddrs) {
        if (!is.array(multiaddrs)) {
            multiaddrs = [multiaddrs];
        }

        return multiaddrs.filter((ma) => {
            if (includes(ma.protoNames(), "p2p-circuit")) {
                return false;
            }

            if (includes(ma.protoNames(), "ipfs")) {
                ma = ma.decapsulate("ipfs");
            }

            return mafmt.TCP.matches(ma);
        });
    }
}

module.exports = withIs(TCP, { className: "TCP", symbolName: "@libp2p/js-libp2p-tcp/tcp" });
