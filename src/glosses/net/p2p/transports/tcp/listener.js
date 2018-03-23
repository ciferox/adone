const {
    is,
    multi,
    net: { p2p: { Connection } },
    std: { net, os },
    stream: { pull }
} = adone;

const P2P_CODE = 420;
const CLOSE_TIMEOUT = 2000;

const getMultiaddr = (socket) => {
    let ma;

    if (socket.remoteFamily === "IPv6") {
        const addr = new adone.net.ip.IP6(socket.remoteAddress);

        if (addr.v4) {
            const ip4 = addr.to4().correctForm();
            ma = multi.address.create(`//ip4/${ip4}//tcp/${socket.remotePort}`);
        } else {
            ma = multi.address.create(`//ip6/${socket.remoteAddress}//tcp/${socket.remotePort}`);
        }
    } else {
        ma = multi.address.create(`//ip4/${socket.remoteAddress}//tcp/${socket.remotePort}`);
    }

    return ma;
};


const getP2pId = (ma) => {
    return ma.stringTuples().filter((tuple) => {
        return tuple[0] === P2P_CODE;
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

    listen(ma) {
        this.listeningAddr = ma;
        if (ma.protoNames().includes("p2p")) {
            this.p2pId = getP2pId(ma);
            this.listeningAddr = ma.decapsulate("p2p");
        }

        const lOpts = this.listeningAddr.toOptions();
        return new Promise((resolve, reject) => {
            this.on("error", reject);
            this.server.listen(lOpts.port, lOpts.host, () => {
                this.removeListener("error", reject);
                resolve();
            });
        });
    }

    close(options = {}) {
        if (!this.server.listening) {
            return;
        }

        let closed = false;
        return new Promise((resolve, reject) => {
            let timer;
            this.server.close((err) => {
                if (err) {
                    return reject(err);
                }

                closed = true;
                timer && clearTimeout(timer);
                resolve();
            });

            timer = setTimeout(() => {
                timer = undefined;
                if (closed) {
                    return;
                }

                // unable to close graciously, destroying conns
                for (const key of Object.keys(this.server.__connections)) {
                    this.server.__connections[key].destroy();
                }
            }, options.timeout || CLOSE_TIMEOUT);
        });
    }

    getAddrs() {
        const multiaddrs = [];
        const address = this.server.address();

        if (!address) {
            throw new Error("Listener is not ready yet");
        }

        // Because TCP will only return the IPv6 version we need to capture from the passed multiaddr
        if (this.listeningAddr.toString().includes("ip4")) {
            let m = this.listeningAddr.decapsulate("tcp");
            m = m.encapsulate(`//tcp/${address.port}`);
            if (this.p2pId) {
                m = m.encapsulate(`//p2p/${this.p2pId}`);
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
            let ma = multi.address.create(`//ip6/${address.address}//tcp/${address.port}`);
            if (this.p2pId) {
                ma = ma.encapsulate(`//p2p/${this.p2pId}`);
            }

            multiaddrs.push(ma);
        }

        return multiaddrs;
    }
}
