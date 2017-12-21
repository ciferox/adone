const {
    netron2: { PeerId, PeerInfo }
} = adone;

export default class Railing extends adone.event.EventEmitter {
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

                const peerId = PeerId.createFromB58String(ma.getPeerId());

                PeerInfo.create(peerId, (err, peerInfo) => {
                    if (err) {
                        return adone.error("Invalid bootstrap peer id", err);
                    }

                    peerInfo.multiaddrs.add(ma);

                    this.emit("peer", peerInfo);
                });
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
