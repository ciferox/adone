const multicodec = require("../multicodec");

const {
    is,
    crypto: { Identity },
    multi,
    stream: { pull },
    net: { p2p: { PeerInfo } },
    lodash: { assignInWith }
} = adone;

const __ = adone.private(adone.net.p2p.circuit);

export default class Hop extends adone.event.Emitter {
    /**
     * Construct a Circuit object
     *
     * This class will handle incoming circuit connections and
     * either start a relay or hand the relayed connection to
     * the switch
     *
     * @param {Switch} sw
     * @param {Object} options
     */
    constructor(sw, options) {
        super();
        this.switch = sw;
        this.peerInfo = this.switch._peerInfo;
        this.utils = __.utils(sw);
        this.config = assignInWith(
            {
                active: false,
                enabled: false
            },
            options,
            (orig, src) => is.undefined(src) ? false : src);

        this.active = this.config.active;
    }

    /**
     * Handle the relay message
     *
     * @param {CircuitRelay} message
     * @param {StreamHandler} streamHandler
     * @returns {*}
     */
    handle(message, streamHandler) {
        if (!this.config.enabled) {
            return this.utils.writeResponse(streamHandler, __.protocol.CircuitRelay.Status.HOP_CANT_SPEAK_RELAY);
        }

        // check if message is `CAN_HOP`
        if (message.type === __.protocol.CircuitRelay.Type.CAN_HOP) {
            return this.utils.writeResponse(streamHandler, __.protocol.CircuitRelay.Status.SUCCESS);
        }

        // This is a relay request - validate and create a circuit
        const srcPeerId = Identity.createFromBytes(message.dstPeer.id);
        if (srcPeerId.asBase58() === this.peerInfo.id.asBase58()) {
            return this.utils.writeResponse(streamHandler, __.protocol.CircuitRelay.Status.HOP_CANT_RELAY_TO_SELF);
        }

        const dstPeerId = Identity.createFromBytes(message.dstPeer.id).asBase58();
        if (!message.dstPeer.addrs.length) {
            // TODO: use encapsulate here
            const addr = multi.address.create(`/p2p-circuit/ipfs/${dstPeerId}`).buffer;
            message.dstPeer.addrs.push(addr);
        }

        this.utils.validateAddrs(message, streamHandler, __.protocol.CircuitRelay.Type.HOP, (err) => {
            if (err) {
                return;
            }

            let dstPeer;
            try {
                dstPeer = this.switch._peerBook.get(dstPeerId);
                if (!dstPeer.isConnected() && !this.active) {
                    throw new Error("No Connection to peer");
                }
            } catch (err) {
                if (!this.active) {
                    setImmediate(() => this.emit("circuit:error", err));
                    return this.utils.writeResponse(streamHandler, __.protocol.CircuitRelay.Status.HOP_NO_CONN_TO_DST);
                }
            }

            return this._circuit(streamHandler.rest(), message, (err) => {
                if (err) {
                    setImmediate(() => this.emit("circuit:error", err));
                }
                setImmediate(() => this.emit("circuit:success"));
            });
        });
    }

    /**
     * Attempt to make a circuit from A <-> R <-> B where R is this relay
     *
     * @param {Connection} conn - the source connection
     * @param {CircuitRelay} message - the message with the src and dst entries
     * @param {Function} cb - callback to signal success or failure
     * @returns {void}
     * @private
     */
    _circuit(conn, message, cb) {
        this._dialPeer(message.dstPeer, (err, dstConn) => {
            const srcStreamHandler = new __.StreamHandler(conn);
            if (err) {
                this.utils.writeResponse(srcStreamHandler, __.protocol.CircuitRelay.Status.HOP_CANT_DIAL_DST);
                pull(pull.empty(), srcStreamHandler.rest());
                return cb(err);
            }

            return this.utils.writeResponse(srcStreamHandler, __.protocol.CircuitRelay.Status.SUCCESS, (err) => {
                if (err) {
                    return cb(err);
                }

                const streamHandler = new __.StreamHandler(dstConn);
                const stopMsg = Object.assign({}, message, {
                    type: __.protocol.CircuitRelay.Type.STOP // change the message type
                });
                streamHandler.write(__.protocol.CircuitRelay.encode(stopMsg), (err) => {
                    if (err) {
                        const errStreamHandler = new __.StreamHandler(conn);
                        this.utils.writeResponse(errStreamHandler, __.protocol.CircuitRelay.Status.HOP_CANT_OPEN_DST_STREAM);
                        pull(pull.empty(), errStreamHandler.rest());

                        return cb(err);
                    }

                    streamHandler.read((err, msg) => {
                        if (err) {
                            return cb(err);
                        }

                        const message = __.protocol.CircuitRelay.decode(msg);
                        const srcConn = srcStreamHandler.rest();
                        if (message.code === __.protocol.CircuitRelay.Status.SUCCESS) {
                            // circuit the src and dst streams
                            pull(
                                srcConn,
                                streamHandler.rest(),
                                srcConn
                            );

                            cb();
                        } else {
                            // close/end the source stream if there was an error
                            pull(
                                pull.empty(),
                                srcConn
                            );
                        }
                    });
                });
            });
        });
    }

    /**
     * Dial the dest peer and create a circuit
     *
     * @param {Multiaddr} dstPeer
     * @param {Function} callback
     * @returns {Function|void}
     * @private
     */
    _dialPeer(dstPeer, callback) {
        const peerInfo = new PeerInfo(Identity.createFromBytes(dstPeer.id));
        dstPeer.addrs.forEach((a) => peerInfo.multiaddrs.add(a));
        this.switch.connect(peerInfo, multicodec.relay).catch(callback).then((conn) => callback(null, conn));
    }
}
