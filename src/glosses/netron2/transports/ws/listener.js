const {
    is,
    multi,
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

            is.function(handler) && handler(new Connection(socket));
        });
    }

    listen(ma) {
        this.listeningAddr = ma;

        if (includes(ma.protoNames(), "ipfs")) {
            ma = ma.decapsulate("ipfs");
        }

        return new Promise((resolve, reject) => {
            super.listen(ma.toOptions(), (err) => {
                err ? reject(err) : resolve();
            });
        });
    }

    close() {
        return new Promise((resolve, reject) => {
            super.close(resolve);
        });
    }

    getAddrs() {
        const multiaddrs = [];
        const address = this.address();

        if (!address) {
            throw new Error("Listener is not ready yet");
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

        return multiaddrs;
    }
}
