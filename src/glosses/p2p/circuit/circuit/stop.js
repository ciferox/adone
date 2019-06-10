const utilsFactory = require("./utils");
const proto = require("../protocol").CircuitRelay;

const {
    async: { setImmediate, series },
    event: { Emitter },
    p2p: { Connection, PeerInfo }
} = adone;

const debug = require("debug");

const log = debug("libp2p:circuit:stop");
log.err = debug("libp2p:circuit:error:stop");

class Stop extends Emitter {
    constructor(swarm) {
        super();
        this.swarm = swarm;
        this.utils = utilsFactory(swarm);
    }

    /**
     * Handle the incoming STOP message
     *
     * @param {{}} msg  - the parsed protobuf message
     * @param {StreamHandler} sh  - the stream handler wrapped connection
     * @param {Function} callback  - callback
     * @returns {undefined}
     */
    handle(msg, sh, callback) {
        callback = callback || (() => { });

        series([
            (cb) => this.utils.validateAddrs(msg, sh, proto.Type.STOP, cb),
            (cb) => this.utils.writeResponse(sh, proto.Status.Success, cb)
        ], (err) => {
            if (err) {
                // we don't return the error here,
                // since multistream select don't expect one
                callback();
                return log(err);
            }

            const peerInfo = new PeerInfo(this.utils.peerIdFromId(msg.srcPeer.id));
            msg.srcPeer.addrs.forEach((addr) => peerInfo.multiaddrs.add(addr));
            const newConn = new Connection(sh.rest());
            newConn.setPeerInfo(peerInfo);
            setImmediate(() => this.emit("connection", newConn));
            callback(newConn);
        });
    }
}

module.exports = Stop;
