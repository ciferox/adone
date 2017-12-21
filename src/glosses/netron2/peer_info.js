const {
    is,
    vendor: { lodash: { uniqBy } },
    netron2: { PeerId }
} = adone;

const ensureMultiaddr = (ma) => {
    if (adone.multi.address.isMultiaddr(ma)) {
        return ma;
    }

    return adone.multi.address.create(ma);
};

// Because JavaScript doesn't let you overload the compare in Set()..
class MultiaddrSet {
    constructor(multiaddrs) {
        this._multiaddrs = multiaddrs || [];
        this._observedMultiaddrs = [];
    }

    add(ma) {
        ma = ensureMultiaddr(ma);

        if (!this.has(ma)) {
            this._multiaddrs.push(ma);
        }
    }

    // addSafe - prevent multiaddr explosion™
    // Multiaddr explosion is when you dial to a bunch of nodes and every node
    // gives you a different observed address and you start storing them all to
    // share with other peers. This seems like a good idea until you realize that
    // most of those addresses are unique to the subnet that peer is in and so,
    // they are completely worthless for all the other peers. This method is
    // exclusively used by identify.
    addSafe(ma) {
        ma = ensureMultiaddr(ma);

        const check = this._observedMultiaddrs.some((m, i) => {
            if (m.equals(ma)) {
                this.add(ma);
                this._observedMultiaddrs.splice(i, 1);
                return true;
            }
        });
        if (!check) {
            this._observedMultiaddrs.push(ma);
        }
    }

    toArray() {
        return this._multiaddrs.slice();
    }

    get size() {
        return this._multiaddrs.length;
    }

    forEach(fn) {
        return this._multiaddrs.forEach(fn);
    }

    has(ma) {
        ma = ensureMultiaddr(ma);
        return this._multiaddrs.some((m) => m.equals(ma));
    }

    delete(ma) {
        ma = ensureMultiaddr(ma);

        this._multiaddrs.some((m, i) => {
            if (m.equals(ma)) {
                this._multiaddrs.splice(i, 1);
                return true;
            }
        });
    }

    // replaces selected existing multiaddrs with new ones
    replace(existing, fresh) {
        if (!is.array(existing)) {
            existing = [existing];
        }
        if (!is.array(fresh)) {
            fresh = [fresh];
        }
        existing.forEach((m) => this.delete(m));
        fresh.forEach((m) => this.add(m));
    }

    clear() {
        this._multiaddrs = [];
    }

    // this only really helps make ip6 and ip4 multiaddrs distinct if they are
    // different
    // TODO this is not an ideal solution, probably this code should just be
    // in transport.tcp
    distinct() {
        return uniqBy(this._multiaddrs, (ma) => {
            return [ma.toOptions().port, ma.toOptions().transport].join();
        });
    }
}


// Peer represents a peer on the IPFS network
export default class PeerInfo {
    constructor(peerId) {
        if (!peerId) {
            throw new adone.x.InvalidArgument("Missing peerId. Use Peer.create(cb) to create one");
        }

        this.id = peerId;
        this.multiaddrs = new MultiaddrSet();
        this.protocols = new Set();
        this._connectedMultiaddr = undefined;
    }

    // only stores the current multiaddr being used
    connect(ma) {
        ma = ensureMultiaddr(ma);
        if (!this.multiaddrs.has(ma) && ma.toString() !== `/ipfs/${this.id.toB58String()}`) {
            throw new Error("can't be connected to missing multiaddr from set");
        }
        this._connectedMultiaddr = ma;
    }

    disconnect() {
        this._connectedMultiaddr = undefined;
    }

    isConnected() {
        return this._connectedMultiaddr;
    }

    static create(peerId, callback) {
        if (is.function(peerId)) {
            callback = peerId;
            peerId = null;

            PeerId.create((err, id) => {
                if (err) {
                    return callback(err);
                }

                callback(null, new PeerInfo(id));
            });
            return;
        }

        // Already a PeerId instance
        if (is.function(peerId.toJSON)) {
            return callback(null, new PeerInfo(peerId));
        }
        PeerId.createFromJSON(peerId, (err, id) => callback(err, new PeerInfo(id)));
    }

    static isPeerInfo(peerInfo) {
        return Boolean(typeof peerInfo === "object" && peerInfo.id && peerInfo.multiaddrs);
    }
}
