const {
    net: { p2p: { PeerId, PeerInfo } }
} = adone;

export default class Railing extends adone.event.Emitter {
    constructor(bootstrapers) {
        super();
        this.bootstrapers = bootstrapers;
        this.interval = null;
    }

    start(callback) {
        setImmediate(() => callback());
        if (this.interval) {
            return;
        }

        this.interval = setInterval(() => {
            this.bootstrapers.forEach((candidate) => {
                const ma = adone.multi.address.create(candidate);

                const peerId = PeerId.createFromBase58(ma.getPeerId());

                try {
                    const peerInfo = PeerInfo.create(peerId);
                    peerInfo.multiaddrs.add(ma);
                    this.emit("peer", peerInfo);
                } catch (err) {
                    return adone.error("Invalid bootstrap peer id", err);
                }

            });
        }, 10000);
    }

    stop(callback) {
        setImmediate(callback);
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}
