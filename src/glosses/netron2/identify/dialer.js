const msg = require("./message");

const {
    is,
    multi,
    netron2: { PeerId, PeerInfo },
    stream: { pull }
} = adone;

const hasObservedAddr = (input) => input.observedAddr && input.observedAddr.length > 0;

const getObservedAddrs = (input) => {
    if (!hasObservedAddr(input)) {
        return [];
    }

    let addrs = input.observedAddr;

    if (!is.array(input.observedAddr)) {
        addrs = [addrs];
    }

    return addrs.map((oa) => multi.address.create(oa));
};

module.exports = (conn, callback) => {
    pull(
        conn,
        pull.lengthPrefixed.decode(),
        pull.take(1),
        pull.collect((err, data) => {
            if (err) {
                return callback(err);
            }

            // connection got closed graciously
            if (data.length === 0) {
                return callback(new Error("conn was closed, did not receive data"));
            }

            const input = msg.decode(data[0]);

            try {
                const id = PeerId.createFromPubKey(input.publicKey);
    
                const peerInfo = new PeerInfo(id);
                input.listenAddrs.map(multi.address.create).forEach((ma) => peerInfo.multiaddrs.add(ma));
    
                callback(null, peerInfo, getObservedAddrs(input));
            } catch (err) {
                callback(err);
            }
        })
    );
};
