import Listener from "./listener";

const {
    is,
    multi,
    net: { p2p: { Connection } },
    std: { net },
    stream: { pull }
} = adone;

export default class TCP {
    connect(ma) {
        return new Promise((resolve, reject) => {
            const cOpts = ma.toOptions();

            const rawSocket = net.connect(cOpts);

            rawSocket.once("timeout", () => reject(new Error("Timeout")));
            rawSocket.once("error", reject);

            rawSocket.once("connect", () => {
                rawSocket.removeListener("error", reject);

                const socket = pull.fromStream.duplex(rawSocket);
                const conn = new Connection(socket);
                conn.getObservedAddrs = (cb) => cb(null, [ma]);
                resolve(conn);
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

            return multi.address.validator.TCP.matches(ma);
        });
    }
}
