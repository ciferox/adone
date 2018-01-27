const series = require("async/series");

const {
    netron2: { Connection, PeerInfo }
} = adone;

const __ = adone.private(adone.netron2.circuit);

export default class Stop extends adone.event.Emitter {
    constructor(swarm) {
        super();
        this.swarm = swarm;
        this.utils = __.utils(swarm);
    }

    handle(message, streamHandler, callback) {
        callback = callback || (() => { });

        series([
            (cb) => this.utils.validateAddrs(message, streamHandler, __.protocol.CircuitRelay.Type.STOP, cb),
            (cb) => this.utils.writeResponse(streamHandler, __.protocol.CircuitRelay.Status.Success, cb)
        ], (err) => {
            if (err) {
                callback(); // we don't return the error here, since multistream select don't expect one
                return;
            }

            const peerInfo = new PeerInfo(message.srcPeer.id);
            message.srcPeer.addrs.forEach((addr) => peerInfo.multiaddrs.add(addr));
            const newConn = new Connection(streamHandler.rest());
            newConn.setPeerInfo(peerInfo);
            setImmediate(() => this.emit("connection", newConn));
            callback(newConn);
        });
    }
}
