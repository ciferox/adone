const {
    is,
    crypto: { Identity },
    multi,
    stream: { pull },
    net: { p2p: { PeerInfo } },
    lodash: { assignInWith }
} = adone;

const {
    utils,
    protocol,
    multicodec,
    StreamHandler
} = adone.private(adone.net.p2p.circuit);

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
        this.utils = utils(sw);
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
            return this.utils.writeResponse(streamHandler, protocol.CircuitRelay.Status.HOP_CANT_SPEAK_RELAY);
        }

        // check if message is `CAN_HOP`
        if (message.type === protocol.CircuitRelay.Type.CAN_HOP) {
            return this.utils.writeResponse(streamHandler, protocol.CircuitRelay.Status.SUCCESS);
        }

        // This is a relay request - validate and create a circuit
        const srcPeerId = Identity.createFromBytes(message.dstPeer.id);
        if (srcPeerId.asBase58() === this.peerInfo.id.asBase58()) {
            return this.utils.writeResponse(streamHandler, protocol.CircuitRelay.Status.HOP_CANT_RELAY_TO_SELF);
        }

        const dstPeerId = Identity.createFromBytes(message.dstPeer.id).asBase58();
        if (!message.dstPeer.addrs.length) {
            // TODO: use encapsulate here
            const addr = multi.address.create(`//p2p-circuit//p2p/${dstPeerId}`).buffer;
            message.dstPeer.addrs.push(addr);
        }

        try {
            this.utils.validateAddrs(message, streamHandler, protocol.CircuitRelay.Type.HOP);

            let dstPeer;
            try {
                dstPeer = this.switch._peerBook.get(dstPeerId);
                if (!dstPeer.isConnected() && !this.active) {
                    throw new Error("No Connection to peer");
                }
            } catch (err) {
                if (!this.active) {
                    setImmediate(() => this.emit("circuit:error", err));
                    return this.utils.writeResponse(streamHandler, protocol.CircuitRelay.Status.HOP_NO_CONN_TO_DST);
                }
            }

            return this._circuit(streamHandler.rest(), message, (err) => {
                if (err) {
                    setImmediate(() => this.emit("circuit:error", err));
                }
                setImmediate(() => this.emit("circuit:success"));
            });
        } catch (err) {
            //
        }
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
            const srcStreamHandler = new StreamHandler(conn);
            if (err) {
                this.utils.writeResponse(srcStreamHandler, protocol.CircuitRelay.Status.HOP_CANT_DIAL_DST);
                pull(pull.empty(), srcStreamHandler.rest());
                return cb(err);
            }

            try {
                this.utils.writeResponse(srcStreamHandler, protocol.CircuitRelay.Status.SUCCESS);

                const streamHandler = new StreamHandler(dstConn);
                const stopMsg = Object.assign({}, message, {
                    type: protocol.CircuitRelay.Type.STOP // change the message type
                });
                streamHandler.write(protocol.CircuitRelay.encode(stopMsg), (err) => {
                    if (err) {
                        const errStreamHandler = new StreamHandler(conn);
                        this.utils.writeResponse(errStreamHandler, protocol.CircuitRelay.Status.HOP_CANT_OPEN_DST_STREAM);
                        pull(pull.empty(), errStreamHandler.rest());

                        return cb(err);
                    }

                    streamHandler.read((err, msg) => {
                        if (err) {
                            return cb(err);
                        }

                        const message = protocol.CircuitRelay.decode(msg);
                        const srcConn = srcStreamHandler.rest();
                        if (message.code === protocol.CircuitRelay.Status.SUCCESS) {
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
            } catch (err) {
                return cb(err);
            }
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
