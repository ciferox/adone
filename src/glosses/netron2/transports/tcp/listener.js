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


export default (handler) => {
    const listener = new adone.event.EventEmitter();

    const server = net.createServer((socket) => {
        // Avoid uncaught errors cause by unstable connections
        socket.on("error", adone.noop);

        const addr = getMultiaddr(socket);
        adone.log("new connection", addr.toString());

        const s = pull.fromStream.duplex(socket);

        s.getObservedAddrs = (cb) => {
            cb(null, [addr]);
        };

        trackSocket(server, socket);

        const conn = new Connection(s);
        handler(conn);
        listener.emit("connection", conn);
    });

    server.on("listening", () => listener.emit("listening"));
    server.on("error", (err) => listener.emit("error", err));
    server.on("close", () => listener.emit("close"));

    // Keep track of open connections to destroy in case of timeout
    server.__connections = {};

    listener.close = (options, callback) => {
        if (is.function(options)) {
            callback = options;
            options = {};
        }
        callback = callback || adone.noop;
        options = options || {};

        let closed = false;
        server.close(callback);

        server.once("close", () => {
            closed = true;
        });
        setTimeout(() => {
            if (closed) {
                return;
            }

            adone.log("unable to close graciously, destroying conns");
            Object.keys(server.__connections).forEach((key) => {
                adone.log("destroying %s", key);
                server.__connections[key].destroy();
            });
        }, options.timeout || CLOSE_TIMEOUT);
    };

    let ipfsId;
    let listeningAddr;

    listener.listen = (ma, callback) => {
        listeningAddr = ma;
        if (ma.protoNames().includes("ipfs")) {
            ipfsId = getIpfsId(ma);
            listeningAddr = ma.decapsulate("ipfs");
        }

        const lOpts = listeningAddr.toOptions();
        adone.log("Listening on %s %s", lOpts.port, lOpts.host);
        return server.listen(lOpts.port, lOpts.host, callback);
    };

    listener.getAddrs = (callback) => {
        const multiaddrs = [];
        const address = server.address();

        if (!address) {
            return callback(new Error("Listener is not ready yet"));
        }

        // Because TCP will only return the IPv6 version
        // we need to capture from the passed multiaddr
        if (listeningAddr.toString().indexOf("ip4") !== -1) {
            let m = listeningAddr.decapsulate("tcp");
            m = m.encapsulate(`/tcp/${address.port}`);
            if (ipfsId) {
                m = m.encapsulate(`/ipfs/${ipfsId}`);
            }

            if (m.toString().indexOf("0.0.0.0") !== -1) {
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
            if (ipfsId) {
                ma = ma.encapsulate(`/ipfs/${ipfsId}`);
            }

            multiaddrs.push(ma);
        }

        callback(null, multiaddrs);
    };

    return listener;
};
