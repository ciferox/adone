import Listener from "./listener";

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
        //
    }

    const url = `${proto}://${maStrSplit[2]}${(port && (port !== 80 || port !== 443) ? `:${port}` : "")}`;

    return url;
};

export default class WS {
    connect(ma) {
        return new Promise((resolve, reject) => {
            const url = maToUrl(ma);
            const socket = pull.ws.connect(url, {
                binary: true,
                onConnect: (err) => {
                    if (err) {
                        return reject(err);
                    }

                    const conn = new Connection(socket);
                    conn.getObservedAddrs = (cb) => cb(null, [ma]);
                    conn.close = (cb) => socket.close(cb);
                    resolve(conn);
                }
            });
        });
    }

    createListener(handler) {
        return new Listener(handler);
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

WS.maToUrl = maToUrl;
