/* eslint-disable func-style */
const TCP = require("libp2p-tcp");
const SPDY = require("libp2p-spdy");
const MPLEX = require("libp2p-mplex");
const PULLMPLEX = require("pull-mplex");
const defaultsDeep = require("@nodeutils/defaults-deep");

function mapMuxers(list) {
    return list.map((pref) => {
        if (typeof pref !== "string") {
            return pref;
        }
        switch (pref.trim().toLowerCase()) {
            case "spdy": return SPDY;
            case "mplex": return MPLEX;
            case "pullmplex": return PULLMPLEX;
            default:
                throw new Error(`${pref} muxer not available`);
        }
    });
}

function getMuxers(muxers) {
    const muxerPrefs = process.env.LIBP2P_MUXER;
    if (muxerPrefs && !muxers) {
        return mapMuxers(muxerPrefs.split(","));
    } else if (muxers) {
        return mapMuxers(muxers);
    }
    return [PULLMPLEX, MPLEX, SPDY];
}

class Node extends adone.netron.ipc.Node {
    constructor(_options) {
        const defaults = {
            modules: {
                transport: [
                    TCP
                ],
                streamMuxer: getMuxers(_options.muxer)
            },
            config: {
            }
        };

        super(defaultsDeep(_options, defaults));
    }
}

module.exports = Node;
