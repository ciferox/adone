const {
    is,
    lodash: { uniqBy },
    multi,
    crypto: { Identity },
    util
} = adone;

const ensureMultiaddr = (ma) => {
    if (multi.address.isMultiaddr(ma)) {
        return ma;
    }

    return multi.address.create(ma);
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
    // Multiaddr explosion is when you connect to a bunch of nodes and every node
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
        util.arrify(existing).forEach((m) => this.delete(m));
        util.arrify(fresh).forEach((m) => this.add(m));
    }

    clear() {
        this._multiaddrs = [];
    }

    // this only really helps make ip6 and ip4 multiaddrs distinct if they are
    // different
    // TODO this is not an ideal solution, probably this code should just be
    // in transport.tcp
    // VERY BAD METHOD !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    distinct() {
        // return uniqBy(this._multiaddrs, (ma) => {
        //     return [ma.toOptions().port, ma.toOptions().transport].join();
        // });
        return this._multiaddrs;
    }
}


// Peer represents a peer on the IPFS network
export default class PeerInfo {
    constructor(peerId) {
        if (!peerId) {
            throw new adone.error.InvalidArgument("Missing peerId. Use Peer.create() to create one");
        }

        this.id = peerId;
        this.multiaddrs = new MultiaddrSet();
        this.protocols = new Set();
        this._connectedMultiaddr = undefined;
    }

    // only stores the current multiaddr being used
    connect(ma) {
        ma = ensureMultiaddr(ma);
        if (!this.multiaddrs.has(ma) && ma.toString() !== `/ipfs/${this.id.asBase58()}`) {
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

    toString() {
        return this.id.toString();
    }

    static create(val) {
        if (!val) {
            return new PeerInfo(Identity.create());
        } else if (is.identity(val)) {
            return new PeerInfo(val);
        } else if (is.p2pPeerInfo(val)) {
            return val;
        } else if (is.plainObject(val)) {
            return new PeerInfo(Identity.createFromJSON(val));
        }
        throw new adone.error.NotValid(`Invalid type of input for PeerInfo: ${adone.meta.typeOf(val)}`);
    }
}
adone.tag.add(PeerInfo, "P2P_PEER_INFO");
