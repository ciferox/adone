const CID = require("cids");
const multiaddr = require("multiaddr");
const multibase = require("multibase");
const multihash = require("multihashes");

const {
    p2p: { PeerId, PeerInfo }
} = adone;

module.exports = () => ({
    Buffer,
    CID,
    multiaddr,
    multibase,
    multihash,
    PeerId,
    PeerInfo
});
