const {
    multi,
    noop,
    netron2: { Connection },
    std: { os },
    stream: { pull },
    vendor: { lodash: { includes } }
} = adone;

export default class Listener extends pull.ws.Server {
    constructor(handler) {
        super((socket) => {
            socket.getObservedAddrs = (callback) => {
                // TODO research if we can reuse the address in anyway
                return callback(null, []);
            };

            handler(new Connection(socket));
        });
    }

    listen(ma, callback) {
        callback = callback || noop;
        this.listeningAddr = ma;

        if (includes(ma.protoNames(), "ipfs")) {
            ma = ma.decapsulate("ipfs");
        }

        super.listen(ma.toOptions(), callback);
    }

    getAddrs(callback) {
        const multiaddrs = [];
        const address = this.address();

        if (!address) {
            return callback(new Error("Listener is not ready yet"));
        }

        const ipfsId = this.listeningAddr.getPeerId();

        // Because TCP will only return the IPv6 version we need to capture from the passed multiaddr
        if (this.listeningAddr.toString().includes("ip4")) {
            let m = this.listeningAddr.decapsulate("tcp");
            m = m.encapsulate(`/tcp/${address.port}/ws`);
            if (this.listeningAddr.getPeerId()) {
                m = m.encapsulate(`/ipfs/${ipfsId}`);
            }

            if (m.toString().includes("0.0.0.0")) {
                const netInterfaces = os.networkInterfaces();
                Object.keys(netInterfaces).forEach((niKey) => {
                    netInterfaces[niKey].forEach((ni) => {
                        if (ni.family === "IPv4") {
                            multiaddrs.push(multi.address.create(m.toString().replace("0.0.0.0", ni.address)));
                        }
                    });
                });
            } else {
                multiaddrs.push(m);
            }
        }

        callback(null, multiaddrs);
    }
}
