const {
    is,
    multi,
    netron2: { Connection },
    std: { net, os },
    stream: { pull }
} = adone;

const IPFS_CODE = 421;
const CLOSE_TIMEOUT = 2000;

const getMultiaddr = (socket) => {
    let mh;

    if (socket.remoteFamily === "IPv6") {
        const addr = new adone.net.ip.IP6(socket.remoteAddress);
        if (addr.v4) {
            const ip4 = addr.to4().correctForm();
            mh = multi.address.create(`/ip4/${ip4}/tcp/${socket.remotePort}`);
        } else {
            mh = multi.address.create(`/ip6/${socket.remoteAddress}/tcp/${socket.remotePort}`);
        }
    } else {
        mh = multi.address.create(`/ip4/${socket.remoteAddress}/tcp/${socket.remotePort}`);
    }

    return mh;
};


const getIpfsId = (ma) => {
    return ma.stringTuples().filter((tuple) => {
        return tuple[0] === IPFS_CODE;
    })[0][1];
};

const trackSocket = (server, socket) => {
    const key = `${socket.remoteAddress}:${socket.remotePort}`;
    server.__connections[key] = socket;

    socket.on("close", () => {
        delete server.__connections[key];
    });
};

export default class Listener extends adone.event.Emitter {
    constructor(handler) {
        super();

        this.server = net.createServer((socket) => {
            // Avoid uncaught errors cause by unstable connections
            socket.on("error", adone.noop);

            const addr = getMultiaddr(socket);

            const s = pull.fromStream.duplex(socket);

            s.getObservedAddrs = (cb) => {
                cb(null, [addr]);
            };

            trackSocket(this.server, socket);

            const conn = new Connection(s);
            is.function(handler) && handler(conn);
            this.emit("connection", conn);
        });

        this.server.on("listening", () => this.emit("listening"));
        this.server.on("error", (err) => this.emit("error", err));
        this.server.on("close", () => this.emit("close"));

        // Keep track of open connections to destroy in case of timeout
        this.server.__connections = {};
    }

    close(options, callback) {
        if (is.function(options)) {
            callback = options;
            options = {};
        }
        callback = callback || adone.noop;
        options = options || {};

        let closed = false;
        this.server.close(callback);

        this.server.once("close", () => {
            closed = true;
        });
        setTimeout(() => {
            if (closed) {
                return;
            }

            // unable to close graciously, destroying conns
            Object.keys(this.server.__connections).forEach((key) => {
                this.server.__connections[key].destroy();
            });
        }, options.timeout || CLOSE_TIMEOUT);
    }

    listen(ma, callback) {
        this.listeningAddr = ma;
        if (ma.protoNames().includes("ipfs")) {
            this.ipfsId = getIpfsId(ma);
            this.listeningAddr = ma.decapsulate("ipfs");
        }

        const lOpts = this.listeningAddr.toOptions();
        return this.server.listen(lOpts.port, lOpts.host, callback);
    }

    getAddrs(callback) {
        const multiaddrs = [];
        const address = this.server.address();

        if (!address) {
            return callback(new Error("Listener is not ready yet"));
        }

        // Because TCP will only return the IPv6 version
        // we need to capture from the passed multiaddr
        if (this.listeningAddr.toString().includes("ip4")) {
            let m = this.listeningAddr.decapsulate("tcp");
            m = m.encapsulate(`/tcp/${address.port}`);
            if (this.ipfsId) {
                m = m.encapsulate(`/ipfs/${this.ipfsId}`);
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

        if (address.family === "IPv6") {
            let ma = multi.address.create(`/ip6/${address.address}/tcp/${address.port}`);
            if (this.ipfsId) {
                ma = ma.encapsulate(`/ipfs/${this.ipfsId}`);
            }

            multiaddrs.push(ma);
        }

        callback(null, multiaddrs);
    }
}
