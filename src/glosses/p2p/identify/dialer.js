const multiaddr = require("multiaddr");
const msg = require("./message");

const {
    is,
    p2p: { PeerId, PeerInfo },
    stream: { pull2: pull }
} = adone;
const { take, collect, lengthPrefixed: lp } = pull;

const hasObservedAddr = (input) => input.observedAddr && input.observedAddr.length > 0;
const getObservedAddrs = (input) => {
    if (!hasObservedAddr(input)) {
        return [];
    }

    let addrs = input.observedAddr;

    if (!is.array(addrs)) {
        addrs = [addrs];
    }

    return addrs.map((oa) => multiaddr(oa));
};

module.exports = (conn, expectedPeerInfo, callback) => {
    if (is.function(expectedPeerInfo)) {
        callback = expectedPeerInfo;
        expectedPeerInfo = null;
        console.warn("WARNING: no expected peer info was given, identify will not be able to verify peer integrity");
    }

    pull(
        conn,
        lp.decode(),
        take(1),
        collect((err, data) => {
            if (err) {
                return callback(err);
            }

            // connection got closed graciously
            if (data.length === 0) {
                return callback(new Error("conn was closed, did not receive data"));
            }

            const input = msg.decode(data[0]);

            PeerId.createFromPubKey(input.publicKey, (err, id) => {
                if (err) {
                    return callback(err);
                }

                const peerInfo = new PeerInfo(id);
                if (expectedPeerInfo && expectedPeerInfo.id.toB58String() !== id.toB58String()) {
                    return callback(new Error("invalid peer"));
                }

                try {
                    input.listenAddrs
                        .map(multiaddr)
                        .forEach((ma) => peerInfo.multiaddrs.add(ma));
                } catch (err) {
                    return callback(err);
                }

                let observedAddr;

                try {
                    observedAddr = getObservedAddrs(input);
                } catch (err) {
                    return callback(err);
                }

                callback(null, peerInfo, observedAddr);
            });
        })
    );
};
