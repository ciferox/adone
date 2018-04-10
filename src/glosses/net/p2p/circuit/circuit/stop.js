const {
    is,
    crypto: { Identity },
    net: { p2p: { Connection, PeerInfo } }
} = adone;

const {
    protocol,
    utils
} = adone.private(adone.net.p2p.circuit);

const peerIdFromId = function (id) {
    if (is.string(id)) {
        return Identity.createFromBase58(id);
    }

    return Identity.createFromBytes(id);
};

export default class Stop extends adone.event.Emitter {
    constructor(sw) {
        super();
        this.switch = sw;
        this.utils = utils(sw);
    }

    handle(message, streamHandler, callback) {
        callback = callback || (() => { });

        try {
            this.utils.validateAddrs(message, streamHandler, protocol.CircuitRelay.Type.STOP);
            this.utils.writeResponse(streamHandler, protocol.CircuitRelay.Status.Success);
            
            const peerInfo = new PeerInfo(peerIdFromId(message.srcPeer.id));
            message.srcPeer.addrs.forEach((addr) => peerInfo.multiaddrs.add(addr));
            const newConn = new Connection(streamHandler.rest());
            newConn.setPeerInfo(peerInfo);
            setImmediate(() => this.emit("connection", newConn));
            callback(newConn);
        } catch (err) {
            callback();
        }
    }
}
