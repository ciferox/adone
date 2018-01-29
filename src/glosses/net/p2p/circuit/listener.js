const {
    multi
} = adone;

const __ = adone.private(adone.net.p2p.circuit);

export default class Listener extends adone.event.Emitter {
    constructor(swarm, connHandler, options) {
        super();

        this.swarm = swarm;
        this.options = options;
        this.connHandler = connHandler;

        this.utils = __.utils(swarm);

        this.stopHandler = new __.Stop(swarm);
        this.hopHandler = new __.Hop(swarm, options.hop);
    }

    /**
     * Add swarm handler and listen for incoming connections
     *
     * @param {Multiaddr} ma
     */
    listen(ma) {
        this.swarm.handle(__.multicodec.relay, (relayProto, conn) => {
            const streamHandler = new __.StreamHandler(conn);

            streamHandler.read((err, msg) => {
                if (err) {
                    return;
                }

                let request = null;
                try {
                    request = __.protocol.CircuitRelay.decode(msg);
                } catch (err) {
                    return this.utils.writeResponse(streamHandler, __.protocol.CircuitRelay.Status.MALFORMED_MESSAGE);
                }

                switch (request.type) {
                    case __.protocol.CircuitRelay.Type.CAN_HOP:
                    case __.protocol.CircuitRelay.Type.HOP: {
                        return this.hopHandler.handle(request, streamHandler);
                    }

                    case __.protocol.CircuitRelay.Type.STOP: {
                        return this.stopHandler.handle(request, streamHandler, this.connHandler);
                    }

                    default: {
                        return this.utils.writeResponse(streamHandler, __.protocol.CircuitRelay.Status.INVALID_MSG_TYPE);
                    }
                }
            });
        });

        setImmediate(() => this.emit("listen"));
    }

    /**
     * Remove swarm listener
     */
    close() {
        this.swarm.unhandle(__.multicodec.stop);
        setImmediate(() => this.emit("close"));
    }

    /**
     * Get fixed up multiaddrs
     *
     * NOTE: This method will grab the peers multiaddrs and expand them such that:
     *
     * a) If it's an existing /p2p-circuit address for a specific relay i.e.
     *    `/ip4/0.0.0.0/tcp/0/ipfs/QmRelay/p2p-circuit` this method will expand the
     *    address to `/ip4/0.0.0.0/tcp/0/ipfs/QmRelay/p2p-circuit/ipfs/QmPeer` where
     *    `QmPeer` is this peers id
     * b) If it's not a /p2p-circuit address, it will encapsulate the address as a /p2p-circuit
     *    addr such that dials a relay uses that address to connect this peer
     *
     */
    getAddrs() {
        let addrs = this.swarm._peerInfo.multiaddrs.toArray();

        // get all the explicit relay addrs excluding self
        const p2pAddrs = addrs.filter((addr) => {
            return multi.address.validator.Circuit.matches(addr) &&
                !addr.toString().includes(this.swarm._peerInfo.id.asBase58());
        });

        // use the explicit relays instead of any relay
        if (p2pAddrs.length) {
            addrs = p2pAddrs;
        }

        const listenAddrs = [];
        addrs.forEach((addr) => {
            const peerMa = `/p2p-circuit/ipfs/${this.swarm._peerInfo.id.asBase58()}`;
            if (addr.toString() === peerMa) {
                listenAddrs.push(multi.address.create(peerMa));
                return;
            }

            if (!multi.address.validator.Circuit.matches(addr)) {
                if (addr.getPeerId()) {
                    // by default we're reachable over any relay
                    listenAddrs.push(multi.address.create("/p2p-circuit").encapsulate(addr));
                } else {
                    listenAddrs.push(multi.address.create("/p2p-circuit").encapsulate(`${addr}/ipfs/${this.swarm._peerInfo.id.asBase58()}`));
                }
            } else {
                listenAddrs.push(addr.encapsulate(`/ipfs/${this.swarm._peerInfo.id.asBase58()}`));
            }
        });

        return listenAddrs;
    }
}
