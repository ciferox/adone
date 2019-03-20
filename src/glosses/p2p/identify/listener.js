const msg = require("./message");

const {
    stream: { pull }
} = adone;
const { values, lengthPrefixed: lp } = pull;

module.exports = (conn, pInfoSelf) => {
    // send what I see from the other + my Info
    conn.getObservedAddrs((err, observedAddrs) => {
        if (err) {
            return;
        }
        observedAddrs = observedAddrs[0];

        let publicKey = Buffer.alloc(0);
        if (pInfoSelf.id.pubKey) {
            publicKey = pInfoSelf.id.pubKey.bytes;
        }

        const msgSend = msg.encode({
            protocolVersion: "ipfs/0.1.0",
            agentVersion: "na",
            publicKey,
            listenAddrs: pInfoSelf.multiaddrs.toArray().map((ma) => ma.buffer),
            observedAddr: observedAddrs ? observedAddrs.buffer : Buffer.from("")
        });

        pull(
            values([msgSend]),
            lp.encode(),
            conn
        );
    });
};
