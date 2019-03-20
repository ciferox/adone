const withIs = require("class-is");

const debug = require("debug");
const log = debug("libp2p:websockets:dialer");

const createListener = require("./listener");

const {
    multiformat: { mafmt, multiaddrToUri: toUri },
    is,
    p2p: { Connection },
    stream: { pull: { ws: { connect } } }
} = adone;

class WebSockets {
    dial(ma, options, callback) {
        if (is.function(options)) {
            callback = options;
            options = {};
        }

        callback = callback || function () { };

        const url = toUri(ma);
        log("dialing %s", url);
        const socket = connect(url, {
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

            return mafmt.WebSockets.matches(ma) ||
                mafmt.WebSocketsSecure.matches(ma);
        });
    }
}

module.exports = withIs(WebSockets, { className: "WebSockets", symbolName: "@libp2p/js-libp2p-websockets/websockets" });
