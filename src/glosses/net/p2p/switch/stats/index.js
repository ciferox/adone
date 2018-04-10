import Stat from "./stat";

const {
    event: { Emitter }
} = adone;

const defaultOptions = {
    computeThrottleMaxQueueSize: 1000,
    computeThrottleTimeout: 2000,
    movingAverageIntervals: [
        60 * 1000, // 1 minute
        5 * 60 * 1000, // 5 minutes
        15 * 60 * 1000 // 15 minutes
    ],
    maxOldPeersRetention: 50
};

const initialCounters = [
    "dataReceived",
    "dataSent"
];

const directionToEvent = {
    in: "dataReceived",
    out: "dataSent"
};

module.exports = (observer, _options) => {
    const options = Object.assign({}, defaultOptions, _options);
    const globalStats = new Stat(initialCounters, options);

    const oldPeers = new adone.collection.FastLRU({
        maxSize: options.maxOldPeersRetention
    });
    const peerStats = new Map();
    const transportStats = new Map();
    const protocolStats = new Map();

    const stop = function () {
        globalStats.stop();
        for (const peerStat of peerStats.values()) {
            peerStat.stop();
        }
        for (const transportStat of transportStats.values()) {
            transportStat.stop();
        }
    };

    const stats = Object.assign(new Emitter(), {
        stop,
        global: globalStats,
        peers: () => Array.from(peerStats.keys()),
        forPeer: (peerId) => {
            return peerStats.get(peerId) || oldPeers.get(peerId);
        },
        transports: () => Array.from(transportStats.keys()),
        forTransport: (transport) => transportStats.get(transport),
        protocols: () => Array.from(protocolStats.keys()),
        forProtocol: (protocol) => protocolStats.get(protocol)
    });

    const propagateChange = function () {
        stats.emit("update");
    };

    globalStats.on("update", propagateChange);

    observer.on("message", (peerId, transportTag, protocolTag, direction, bufferLength) => {
        const event = directionToEvent[direction];

        if (transportTag) {
            // because it has a transport tag, this message is at the global level, so we account this
            // traffic as global.
            globalStats.push(event, bufferLength);

            // peer stats
            let peer = peerStats.get(peerId);
            if (!peer) {
                peer = oldPeers.get(peerId);
                if (peer) {
                    oldPeers.delete(peerId);
                } else {
                    peer = new Stat(initialCounters, options);
                }
                peer.on("update", propagateChange);
                peer.start();
                peerStats.set(peerId, peer);
            }
            peer.push(event, bufferLength);
        }

        // transport stats
        if (transportTag) {
            let transport = transportStats.get(transportTag);
            if (!transport) {
                transport = new Stat(initialCounters, options);
                transport.on("update", propagateChange);
                transportStats.set(transportTag, transport);
            }
            transport.push(event, bufferLength);
        }

        // protocol stats
        if (protocolTag) {
            let protocol = protocolStats.get(protocolTag);
            if (!protocol) {
                protocol = new Stat(initialCounters, options);
                protocol.on("update", propagateChange);
                protocolStats.set(protocolTag, protocol);
            }
            protocol.push(event, bufferLength);
        }
    });

    observer.on("peer:closed", (peerId) => {
        const peer = peerStats.get(peerId);
        if (peer) {
            peer.removeListener("update", propagateChange);
            peer.stop();
            peerStats.delete(peerId);
            oldPeers.set(peerId, peer);
        }
    });

    return stats;
};
