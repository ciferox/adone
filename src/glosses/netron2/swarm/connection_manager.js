const identify = require("../identify");
const waterfall = require("async/waterfall");
const protocolMuxer = require("./protocol_muxer");
const plaintext = require("./plaintext");

const {
    netron2: { circuit: { Circuit }, multistream }
} = adone;

export default class ConnectionManager {
    constructor(swarm) {
        this.swarm = swarm;
    }

    addUpgrade() {

    }

    addStreamMuxer(muxer) {
        // for dialing
        this.swarm.muxers[muxer.multicodec] = muxer;

        // for listening
        this.swarm.handle(muxer.multicodec, (protocol, conn) => {
            const muxedConn = muxer.listener(conn);

            muxedConn.on("stream", (conn) => {
                protocolMuxer(this.swarm.protocols, conn);
            });

            // If identify is enabled
            //   1. overload getPeerInfo
            //   2. call getPeerInfo
            //   3. add this conn to the pool
            if (this.swarm.identify) {
                // overload peerInfo to use Identify instead
                conn.getPeerInfo = (cb) => {
                    const conn = muxedConn.newStream();
                    const ms = new multistream.Dialer();

                    waterfall([
                        (cb) => ms.handle(conn, cb),
                        (cb) => ms.select(identify.multicodec, cb),
                        (conn, cb) => identify.dialer(conn, cb),
                        (peerInfo, observedAddrs, cb) => {
                            observedAddrs.forEach((oa) => {
                                this.swarm._peerInfo.multiaddrs.addSafe(oa);
                            });
                            cb(null, peerInfo);
                        }
                    ], cb);
                };

                conn.getPeerInfo((err, peerInfo) => {
                    if (err) {
                        return adone.log("Identify not successful");
                    }
                    const b58Str = peerInfo.id.asBase58();

                    this.swarm.muxedConns[b58Str] = { muxer: muxedConn };

                    if (peerInfo.multiaddrs.size > 0) {
                        // with incomming conn and through identify, going to pick one
                        // of the available multiaddrs from the other peer as the one
                        // I'm connected to as we really can't be sure at the moment
                        // TODO add this consideration to the connection abstraction!
                        peerInfo.connect(peerInfo.multiaddrs.toArray()[0]);
                    } else {
                        // for the case of websockets in the browser, where peers have
                        // no addr, use just their IPFS id
                        peerInfo.connect(`/ipfs/${b58Str}`);
                    }
                    peerInfo = this.swarm._peerBook.set(peerInfo);

                    muxedConn.on("close", () => {
                        delete this.swarm.muxedConns[b58Str];
                        peerInfo.disconnect();
                        peerInfo = this.swarm._peerBook.set(peerInfo);
                        setImmediate(() => this.swarm.emit("peer-mux-closed", peerInfo));
                    });

                    setImmediate(() => this.swarm.emit("peer-mux-established", peerInfo));
                });
            }

            return conn;
        });
    }

    reuse() {
        this.swarm.identify = true;
        this.swarm.handle(identify.multicodec, (protocol, conn) => {
            identify.listener(conn, this.swarm._peerInfo);
        });
    }

    enableCircuitRelay(config) {
        config = config || {};

        if (config.enabled) {
            if (!config.hop) {
                Object.assign(config, { hop: { enabled: false, active: false } });
            }

            // TODO: should we enable circuit listener and dialer by default?
            this.swarm.tm.add(Circuit.tag, new Circuit(this.swarm, config));
        }
    }

    crypto(tag, encrypt) {
        if (!tag && !encrypt) {
            tag = plaintext.tag;
            encrypt = plaintext.encrypt;
        }

        this.swarm.unhandle(this.swarm.crypto.tag);
        this.swarm.handle(tag, (protocol, conn) => {
            const myId = this.swarm._peerInfo.id;
            const secure = encrypt(myId, conn, undefined, () => {
                protocolMuxer(this.swarm.protocols, secure);
            });
        });

        this.swarm.crypto = { tag, encrypt };
    }
}
