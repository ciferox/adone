const {
    is,
    netron2: { Node, secio, multiplex, MulticastDNS, spdy, dht: { KadDHT }, Railing, transport: { TCP, WS } }
} = adone;

const mapMuxers = function (list) {
    return list.map((pref) => {
        if (!is.string(pref)) {
            return pref;
        }
        switch (pref.trim().toLowerCase()) {
            case "spdy": return spdy;
            case "multiplex": return multiplex;
            default:
                throw new Error(`${pref} muxer not available`);
        }
    });
};

const getMuxers = function (muxers) {
    const muxerPrefs = process.env.LIBP2P_MUXER;
    if (muxerPrefs && !muxers) {
        return mapMuxers(muxerPrefs.split(","));
    } else if (muxers) {
        return mapMuxers(muxers);
    }
    return [multiplex, spdy];
};

export default class TestNode extends Node {
    constructor(peerInfo, peerBook, options) {
        options = options || {};

        const modules = {
            transport: [
                new TCP(),
                new WS()
            ],
            connection: {
                muxer: getMuxers(options.muxer),
                crypto: [secio]
            },
            discovery: []
        };

        if (options.dht) {
            modules.DHT = KadDHT;
        }

        if (options.mdns) {
            const mdns = new MulticastDNS(peerInfo, "ipfs.local");
            modules.discovery.push(mdns);
        }

        if (options.bootstrap) {
            const r = new Railing(options.bootstrap);
            modules.discovery.push(r);
        }

        if (options.modules && options.modules.transport) {
            options.modules.transport.forEach((t) => modules.transport.push(t));
        }

        if (options.modules && options.modules.discovery) {
            options.modules.discovery.forEach((d) => modules.discovery.push(d));
        }

        super(modules, peerInfo, peerBook, options);
    }
}
