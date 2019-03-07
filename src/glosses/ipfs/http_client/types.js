const {
    p2p: { PeerId, PeerInfo },
    multiformat: { CID, multiaddr, multibase, multihash }
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
