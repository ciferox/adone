const identify = require("../identify");
const waterfall = require("async/waterfall");
const protocolMuxer = require("./protocol_muxer");
const plaintext = require("./plaintext");

const {
    net: { p2p: { circuit: { Circuit }, multistream } }
} = adone;

export default class ConnectionManager {
    constructor(sw) {
        this.switch = sw;
    }

    addUpgrade() {

    }

    addStreamMuxer(muxer) {
        // for dialing
        this.switch.muxers[muxer.multicodec] = muxer;

        // for listening
        this.switch.handle(muxer.multicodec, async (protocol, conn) => {
            const muxedConn = muxer.listener(conn);

            muxedConn.on("stream", (conn) => {
                protocolMuxer(this.switch.protocols, conn);
            });

            // If identify is enabled
            //   1. overload getPeerInfo
            //   2. call getPeerInfo
            //   3. add this conn to the pool
            if (this.switch.identify) {
                // overload peerInfo to use Identify instead
                conn.getPeerInfo = () => {
                    return new Promise((resolve, reject) => {
                        const conn = muxedConn.newStream();
                        const ms = new multistream.Dialer();

                        waterfall([
                            (cb) => ms.handle(conn, cb),
                            (cb) => ms.select(identify.multicodec, cb),
                            (conn, cb) => identify.dialer(conn, cb),
                            (peerInfo, observedAddrs, cb) => {
                                observedAddrs.forEach((oa) => {
                                    this.switch._peerInfo.multiaddrs.addSafe(oa);
                                });
                                cb(null, peerInfo);
                            }
                        ], (err, peerInfo) => {
                            if (err) {
                                reject(err);
                            }
                            resolve(peerInfo);
                        });
                    });
                };

                try {
                    let peerInfo = await conn.getPeerInfo();
                    const b58Str = peerInfo.id.asBase58();

                    this.switch.muxedConns[b58Str] = { muxer: muxedConn };

                    if (peerInfo.multiaddrs.size > 0) {
                        // with incomming conn and through identify, going to pick one
                        // of the available multiaddrs from the other peer as the one
                        // I'm connected to as we really can't be sure at the moment
                        // TODO add this consideration to the connection abstraction!
                        peerInfo.connect(peerInfo.multiaddrs.toArray()[0]);
                    } else {
                        // for the case of websockets in the browser, where peers have
                        // no addr, use just their IPFS id
                        peerInfo.connect(`//p2p/${b58Str}`);
                    }
                    peerInfo = this.switch._peerBook.set(peerInfo);

                    muxedConn.on("close", () => {
                        delete this.switch.muxedConns[b58Str];
                        peerInfo.disconnect();
                        peerInfo = this.switch._peerBook.set(peerInfo);
                        setImmediate(() => this.switch.emit("peer:mux:closed", peerInfo));
                    });

                    setImmediate(() => this.switch.emit("peer:mux:established", peerInfo));
                } catch (err) {
                    return adone.log("Identify not successful");
                }
            }

            // return conn;
        });
    }

    reuse() {
        this.switch.identify = true;
        this.switch.handle(identify.multicodec, (protocol, conn) => {
            identify.listener(conn, this.switch._peerInfo);
        });
    }

    enableCircuitRelay(config) {
        config = config || {};

        if (config.enabled) {
            if (!config.hop) {
                Object.assign(config, { hop: { enabled: false, active: false } });
            }

            // TODO: should we enable circuit listener and dialer by default?
            this.switch.tm.add(Circuit.tag, new Circuit(this.switch, config));
        }
    }

    crypto(tag, encrypt) {
        if (!tag && !encrypt) {
            tag = plaintext.tag;
            encrypt = plaintext.encrypt;
        }

        this.switch.unhandle(this.switch.crypto.tag);
        this.switch.handle(tag, (protocol, conn) => {
            const myId = this.switch._peerInfo.id;
            const secure = encrypt(myId, conn, undefined, () => {
                protocolMuxer(this.switch.protocols, secure);
            });
        });

        this.switch.crypto = { tag, encrypt };
    }
}
