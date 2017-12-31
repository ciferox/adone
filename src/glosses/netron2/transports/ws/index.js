const debug = require("debug");
const log = debug("libp2p:websockets:dialer");
const createListener = require("./listener");

const {
    is,
    multi,
    netron2: { Connection },
    stream: { pull }
} = adone;

const maToUrl = function (ma) {
    const maStrSplit = ma.toString().split("/");

    let proto;
    try {
        proto = ma.protoNames().filter((proto) => {
            return proto === "ws" || proto === "wss";
        })[0];
    } catch (e) {
        log(e);
        throw new Error("Not a valid websocket address", e);
    }

    let port;
    try {
        port = ma.stringTuples().filter((tuple) => {
            if (tuple[0] === ma.protos().filter((proto) => {
                return proto.name === "tcp";
            })[0].code) {
                return true;
            }
        })[0][1];
    } catch (e) {
        log("No port, skipping");
    }

    const url = `${proto}://${maStrSplit[2]}${(port && (port !== 80 || port !== 443) ? `:${port}` : "")}`;

    return url;
};

export default class WebSockets {
    dial(ma, options, callback) {
        if (is.function(options)) {
            callback = options;
            options = {};
        }

        callback = callback || function () { };

        const url = maToUrl(ma);
        log("dialing %s", url);
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

            return multi.address.validator.WebSocket.matches(ma) || multi.address.validator.WebSocketSecure.matches(ma);
        });
    }
}

WebSockets.maToUrl = maToUrl;
