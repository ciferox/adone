const PULLMPLEX = require("pull-mplex");
const defaultsDeep = require("@nodeutils/defaults-deep");

const {
    is,
    p2p: { Node, KadDHT, TCP, WS, MulticastDNS, Bootstrap, secio: SECIO, spdy, multiplex }
} = adone;

const mapMuxers = function (list) {
    return list.map((pref) => {
        if (!is.string(pref)) {
            return pref;
        }
        switch (pref.trim().toLowerCase()) {
            case "spdy": return spdy;
            case "mplex": return multiplex;
            case "pullmplex": return PULLMPLEX;
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
    return [PULLMPLEX, multiplex, spdy];

};

class TestNode extends Node {
    constructor(_options) {
        const defaults = {
            modules: {
                transport: [
                    TCP,
                    WS
                ],
                streamMuxer: getMuxers(_options.muxer),
                connEncryption: [
                    SECIO
                ],
                peerDiscovery: [
                    MulticastDNS,
                    Bootstrap
                ],
                dht: KadDHT
            },
            config: {
                peerDiscovery: {
                    mdns: {
                        interval: 10000,
                        enabled: false
                    },
                    bootstrap: {
                        interval: 10000,
                        enabled: false,
                        list: _options.bootstrapList
                    }
                },
                relay: {
                    enabled: false,
                    hop: {
                        enabled: false,
                        active: false
                    }
                },
                dht: {
                    kBucketSize: 20,
                    randomWalk: {
                        enabled: true
                    },
                    enabled: true
                },
                EXPERIMENTAL: {
                    pubsub: false
                }
            }
        };

        super(defaultsDeep(_options, defaults));
    }
}

module.exports = TestNode;
