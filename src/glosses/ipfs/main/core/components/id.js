const promisify = require("promisify-es6");

const {
    async: { setImmediate }, 
    is
} = adone;

module.exports = function id(self) {
    return promisify((opts, callback) => {
        if (is.function(opts)) {
            callback = opts;
            opts = {};
        }

        setImmediate(() => callback(null, {
            id: self._peerInfo.id.toB58String(),
            publicKey: self._peerInfo.id.pubKey.bytes.toString("base64"),
            addresses: self._peerInfo.multiaddrs
                .toArray()
                .map((ma) => ma.toString())
                .filter((ma) => ma.includes("ipfs"))
                .sort(),
            agentVersion: `js-ipfs/${adone.ipfs.version}`,
            protocolVersion: "9000"
        }));
    });
};
